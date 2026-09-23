/**
 * AETHERGARD ONLINE — ModelLoader
 * Auto-loads GLB/GLTF models from /models/manifest.json
 * Falls back to procedural Three.js geometry if model not found.
 *
 * Usage:
 *   const loader = await ModelLoader.getInstance();
 *   const gltf   = await loader.load('monster_soldier.glb');
 *   scene.add(gltf.scene);
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
export class ModelLoader {
    static _instance = null;
    _loader = new GLTFLoader();
    _cache = new Map();
    manifest = null;
    _manifestLoaded = false;
    constructor() { }
    /** Singleton — also pre-loads the manifest */
    static async getInstance() {
        if (!ModelLoader._instance) {
            ModelLoader._instance = new ModelLoader();
            await ModelLoader._instance._loadManifest();
        }
        return ModelLoader._instance;
    }
    async _loadManifest() {
        try {
            const res = await fetch('/models/manifest.json');
            if (res.ok) {
                this.manifest = await res.json();
                console.log(`[ModelLoader] Manifest loaded: ${this.manifest.total} models`);
            }
        }
        catch {
            console.warn('[ModelLoader] No manifest.json found — using procedural models only');
        }
        this._manifestLoaded = true;
    }
    /** Returns true if a GLB file exists in the manifest */
    has(filename) {
        return !!this.manifest?.models.some(m => m.file === filename);
    }
    /** Returns all models of a given type */
    byType(type) {
        return (this.manifest?.models ?? [])
            .filter(m => m.type === type)
            .map(m => m.file);
    }
    /**
     * Load a GLB by filename.
     * Returns a LoadedModel with built-in AnimationMixer controls.
     */
    async load(filename) {
        if (this._cache.has(filename)) {
            return this._deepClone(this._cache.get(filename));
        }
        return new Promise((resolve, reject) => {
            this._loader.load(`/models/${filename}`, (gltf) => {
                const model = this._wrapGLTF(gltf);
                this._cache.set(filename, model);
                resolve(this._deepClone(model));
            }, undefined, (err) => reject(err));
        });
    }
    /** Load with fallback — returns null if loading fails */
    async tryLoad(filename) {
        if (!this.has(filename))
            return null;
        try {
            return await this.load(filename);
        }
        catch {
            console.warn(`[ModelLoader] Failed to load ${filename}`);
            return null;
        }
    }
    /**
     * Automatically normalizes the scale of any loaded 3D model so its height equals `targetHeight`,
     * its horizontal center is aligned at (0, 0), and its base/feet rest cleanly on y = 0.
     */
    normalizeModel(group, targetHeight = 1.6) {
        const box = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.y > 0.001) {
            const scale = targetHeight / size.y;
            group.scale.set(scale, scale, scale);
            // Adjust offset so base touches y = 0
            const scaledBox = new THREE.Box3().setFromObject(group);
            group.position.y -= scaledBox.min.y;
            // Center horizontally
            const center = new THREE.Vector3();
            scaledBox.getCenter(center);
            group.position.x -= center.x;
            group.position.z -= center.z;
        }
    }
    _wrapGLTF(gltf) {
        const scene = gltf.scene;
        const animations = gltf.animations;
        const actions = new Map();
        let mixer;
        // Enable shadows on all meshes
        scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        if (animations.length > 0) {
            mixer = new AnimationMixer(scene);
            for (const clip of animations) {
                const action = mixer.clipAction(clip);
                actions.set(clip.name.toLowerCase(), action);
            }
        }
        const play = (name, loop = true) => {
            if (!mixer)
                return;
            // Fuzzy match (e.g. 'walk' matches 'Walking', 'idle' matches 'Idle')
            const lname = name.toLowerCase();
            let action = actions.get(lname);
            if (!action) {
                for (const [key, act] of actions) {
                    if (key.includes(lname) || lname.includes(key)) {
                        action = act;
                        break;
                    }
                }
            }
            if (!action && actions.size > 0)
                action = actions.values().next().value;
            if (!action)
                return;
            actions.forEach(a => a.fadeOut(0.2));
            action.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(0.2).play();
        };
        return { scene, animations, mixer, actions, play };
    }
    /** Clone a cached model so each use gets independent mixer */
    _deepClone(src) {
        const clonedScene = src.scene.clone(true);
        const clonedClips = src.animations;
        const actions = new Map();
        let mixer;
        if (clonedClips.length > 0) {
            mixer = new AnimationMixer(clonedScene);
            for (const clip of clonedClips) {
                actions.set(clip.name.toLowerCase(), mixer.clipAction(clip));
            }
        }
        const play = (name, loop = true) => {
            if (!mixer)
                return;
            const lname = name.toLowerCase();
            let action = actions.get(lname);
            if (!action) {
                for (const [key, act] of actions) {
                    if (key.includes(lname) || lname.includes(key)) {
                        action = act;
                        break;
                    }
                }
            }
            if (!action && actions.size > 0)
                action = actions.values().next().value;
            if (!action)
                return;
            actions.forEach(a => a.fadeOut(0.2));
            action.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(0.2).play();
        };
        return { scene: clonedScene, animations: clonedClips, mixer, actions, play };
    }
}
