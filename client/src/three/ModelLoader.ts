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
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';

export interface ModelManifest {
  generated: string;
  total: number;
  models: Array<{ file: string; size: number; type: string }>;
}

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  mixer?: AnimationMixer;
  /** Call this in your render loop: mixer.update(dt) */
  actions: Map<string, THREE.AnimationAction>;
  /** Start a named animation clip (fuzzy match) */
  play: (name: string, loop?: boolean) => void;
}

export class ModelLoader {
  private static _instance: ModelLoader | null = null;
  private _loader = new GLTFLoader();
  private _cache  = new Map<string, LoadedModel>();
  public  manifest: ModelManifest | null = null;
  private _manifestLoaded = false;

  private constructor() {}

  /** Singleton — also pre-loads the manifest */
  public static async getInstance(): Promise<ModelLoader> {
    if (!ModelLoader._instance) {
      ModelLoader._instance = new ModelLoader();
      await ModelLoader._instance._loadManifest();
    }
    return ModelLoader._instance;
  }

  private async _loadManifest() {
    try {
      const res  = await fetch('/models/manifest.json');
      if (res.ok) {
        this.manifest = await res.json() as ModelManifest;
        console.log(`[ModelLoader] Manifest loaded: ${this.manifest.total} models`);
      }
    } catch {
      console.warn('[ModelLoader] No manifest.json found — using procedural models only');
    }
    this._manifestLoaded = true;
  }

  /** Returns true if a GLB file exists in the manifest */
  public has(filename: string): boolean {
    return !!this.manifest?.models.some(m => m.file === filename);
  }

  /** Returns all models of a given type */
  public byType(type: 'character' | 'monster' | 'environment' | 'prop'): string[] {
    return (this.manifest?.models ?? [])
      .filter(m => m.type === type)
      .map(m => m.file);
  }

  /**
   * Load a GLB by filename.
   * Returns a LoadedModel with built-in AnimationMixer controls.
   */
  public async load(filename: string): Promise<LoadedModel> {
    if (this._cache.has(filename)) {
      return this._deepClone(this._cache.get(filename)!);
    }

    return new Promise((resolve, reject) => {
      this._loader.load(
        `/models/${filename}`,
        (gltf: GLTF) => {
          const model = this._wrapGLTF(gltf);
          this._cache.set(filename, model);
          resolve(this._deepClone(model));
        },
        undefined,
        (err: unknown) => reject(err)
      );
    });
  }

  /** Load with fallback — returns null if loading fails */
  public async tryLoad(filename: string): Promise<LoadedModel | null> {
    if (!this.has(filename)) return null;
    try {
      return await this.load(filename);
    } catch {
      console.warn(`[ModelLoader] Failed to load ${filename}`);
      return null;
    }
  }

  /**
   * Automatically normalizes the scale of any loaded 3D model so its height equals `targetHeight`,
   * its horizontal center is aligned at (0, 0), and its base/feet rest cleanly on y = 0.
   */
  public normalizeModel(group: THREE.Group, targetHeight = 1.6) {
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

  private _wrapGLTF(gltf: GLTF): LoadedModel {
    const scene      = gltf.scene as THREE.Group;
    const animations = gltf.animations;
    const actions    = new Map<string, THREE.AnimationAction>();
    let   mixer: AnimationMixer | undefined;

    // Enable shadows on all meshes
    scene.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow    = true;
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

    const play = (name: string, loop = true) => {
      if (!mixer) return;
      // Fuzzy match (e.g. 'walk' matches 'Walking', 'idle' matches 'Idle')
      const lname = name.toLowerCase();
      let action = actions.get(lname);
      if (!action) {
        for (const [key, act] of actions) {
          if (key.includes(lname) || lname.includes(key)) { action = act; break; }
        }
      }
      if (!action && actions.size > 0) action = actions.values().next().value;
      if (!action) return;
      actions.forEach(a => a.fadeOut(0.2));
      action.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(0.2).play();
    };

    return { scene, animations, mixer, actions, play };
  }

  /** Clone a cached model so each use gets independent mixer */
  private _deepClone(src: LoadedModel): LoadedModel {
    const clonedScene = src.scene.clone(true) as THREE.Group;
    const clonedClips = src.animations;
    const actions     = new Map<string, THREE.AnimationAction>();
    let   mixer: AnimationMixer | undefined;

    if (clonedClips.length > 0) {
      mixer = new AnimationMixer(clonedScene);
      for (const clip of clonedClips) {
        actions.set(clip.name.toLowerCase(), mixer.clipAction(clip));
      }
    }

    const play = (name: string, loop = true) => {
      if (!mixer) return;
      const lname = name.toLowerCase();
      let action = actions.get(lname);
      if (!action) {
        for (const [key, act] of actions) {
          if (key.includes(lname) || lname.includes(key)) { action = act; break; }
        }
      }
      if (!action && actions.size > 0) action = actions.values().next().value;
      if (!action) return;
      actions.forEach(a => a.fadeOut(0.2));
      action.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(0.2).play();
    };

    return { scene: clonedScene, animations: clonedClips, mixer, actions, play };
  }
}
