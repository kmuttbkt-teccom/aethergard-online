/**
 * AETHERGARD ONLINE — NPC3DManager
 * Manages interactive 3D town NPCs with floating name badges,
 * idle animations, raycasting interaction, and contextual dialogue.
 */
import * as THREE from 'three';
import { ModelAssetManager } from './ModelAssetManager.js';
import { sound } from '../engine/Sound.js';
import { NPC_DEFS } from '../../../server/src/GameData.js';
export class NPC3DManager {
    static _instance = null;
    scene = null;
    npcs = new Map();
    onNpcInteractCallback;
    static getInstance() {
        if (!this._instance) {
            this._instance = new NPC3DManager();
        }
        return this._instance;
    }
    async initNpcs(scene) {
        this.scene = scene;
        this.npcs.clear();
        const modelManager = ModelAssetManager.getInstance();
        for (const def of NPC_DEFS) {
            const group = new THREE.Group();
            group.position.set(def.x, 0, def.z);
            group.rotation.y = def.facing;
            group.name = `npc_${def.id}`;
            // Create floating 3D Name Tag billboard
            const nameTag = this._createNameTag(def.name, def.role, def.badge);
            nameTag.position.set(0, 2.35, 0);
            group.add(nameTag);
            // Create clickable invisible bounding cylinder for easy touch/mouse clicking
            const clickGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.2, 8);
            const clickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
            const clickHitbox = new THREE.Mesh(clickGeo, clickMat);
            clickHitbox.position.y = 1.1;
            clickHitbox.userData = { isNpc: true, npcId: def.id };
            group.add(clickHitbox);
            scene.add(group);
            const instance = {
                def,
                group,
                nameTag,
                interactRadius: 3.5
            };
            this.npcs.set(def.id, instance);
            // Async load 3D GLTF model
            if (def.modelId === 'procedural') {
                this._buildProceduralNpc(group, def);
                continue;
            }
            try {
                const asset = await modelManager.loadModel(def.modelId, 1.8);
                group.add(asset.scene);
                asset.play('idle', true);
                instance.asset = asset;
            }
            catch {
                // Fallback: stylish procedural NPC pedestal & figure
                this._buildProceduralNpc(group, def);
            }
        }
    }
    _createNameTag(name, role, badge) {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        // Rounded Box Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(10, 10, 364, 108, 16);
        ctx.fill();
        ctx.stroke();
        // Badge Title
        ctx.font = 'bold 22px "Noto Sans Thai", Arial, sans-serif';
        ctx.fillStyle = '#ffd166';
        ctx.textAlign = 'center';
        ctx.fillText(badge, 192, 42);
        // Name
        ctx.font = 'bold 28px "Noto Sans Thai", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, 192, 78);
        // Role Subtitle
        ctx.font = '18px "Noto Sans Thai", Arial, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(role, 192, 104);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.4, 0.8, 1);
        return sprite;
    }
    _buildProceduralNpc(group, def) {
        const robeMat = new THREE.MeshStandardMaterial({ color: def.robeColor, roughness: 0.7 });
        const bodyGeo = new THREE.CylinderGeometry(0.28, 0.42, 1.3, 10);
        const body = new THREE.Mesh(bodyGeo, robeMat);
        body.position.y = 0.65;
        body.castShadow = true;
        group.add(body);
        const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdfba });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.45;
        head.castShadow = true;
        group.add(head);
        // Golden halo or hat
        const hatGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 16);
        hatGeo.rotateX(Math.PI / 2);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.4 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.75;
        group.add(hat);
    }
    update(time, dt) {
        this.npcs.forEach(({ group, asset, nameTag }) => {
            // Subtle idle breathing animation
            group.position.y = Math.sin(time * 2 + group.position.x) * 0.02;
            // Bob name tag slightly
            nameTag.position.y = 2.35 + Math.sin(time * 2.5 + group.position.x) * 0.04;
            // Update glTF animations
            if (asset?.mixer) {
                asset.mixer.update(dt);
            }
        });
    }
    /**
     * Raycast check for clicking an NPC
     */
    checkRaycast(raycaster) {
        const hitboxMeshes = [];
        this.npcs.forEach(({ group }) => {
            group.traverse((child) => {
                if (child.userData?.isNpc)
                    hitboxMeshes.push(child);
            });
        });
        const hits = raycaster.intersectObjects(hitboxMeshes, false);
        if (hits.length > 0) {
            const npcId = hits[0].object.userData.npcId;
            const instance = this.npcs.get(npcId);
            if (instance)
                return instance.def;
        }
        return null;
    }
    /**
     * Trigger NPC interaction modal
     */
    openDialogue(npc, onAction) {
        sound.playNpc();
        let modal = document.getElementById('npc-dialogue-win');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'npc-dialogue-win';
            modal.className = 'ro-window interactive npc-dialogue-win';
            modal.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 540px;
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid #ffd166;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(255, 209, 102, 0.3);
        z-index: 10000;
        color: #fff;
        padding: 16px;
        font-family: 'Noto Sans Thai', Arial, sans-serif;
        display: block;
      `;
            document.body.appendChild(modal);
        }
        const optionsHtml = npc.options.map((opt, idx) => `
      <button class="npc-opt-btn" data-index="${idx}" style="
        width: 100%;
        padding: 9px 14px;
        margin-bottom: 6px;
        background: linear-gradient(180deg, #1e293b, #0f172a);
        border: 1px solid #475569;
        border-radius: 8px;
        color: #f8fafc;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      ">
        <span style="font-size: 16px;">${opt.icon}</span>
        <span>${opt.label}</span>
      </button>
    `).join('');
        modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 22px;">🧙‍♂️</span>
          <div>
            <div style="font-size: 15px; font-weight: bold; color: #ffd166;">${npc.name}</div>
            <div style="font-size: 11px; color: #94a3b8;">${npc.role}</div>
          </div>
        </div>
        <button id="npc-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px;">✕</button>
      </div>

      <div style="font-size: 13px; line-height: 1.6; color: #e2e8f0; background: rgba(0,0,0,0.3); padding: 10px 12px; border-radius: 8px; margin-bottom: 14px;">
        ${npc.greeting}
      </div>

      <div style="font-size: 11px; font-weight: bold; color: #94a3b8; margin-bottom: 6px;">เลือกบทสนทนาหรือคำสั่ง:</div>
      <div id="npc-options-list">
        ${optionsHtml}
      </div>
    `;
        modal.style.display = 'block';
        // Hook buttons
        document.getElementById('npc-close-btn')?.addEventListener('click', () => {
            if (modal)
                modal.style.display = 'none';
        });
        modal.querySelectorAll('.npc-opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const option = npc.options[Number(e.currentTarget.dataset.index)];
                if (modal)
                    modal.style.display = 'none';
                if (option)
                    onAction(option);
            });
        });
    }
}
