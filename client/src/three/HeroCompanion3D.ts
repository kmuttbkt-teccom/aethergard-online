/**
 * AETHERGARD ONLINE — HeroCompanion3D
 * Renders Pixel-Art 3D Billboard Companions who accompany the player in formation,
 * patrol, attack targeted monsters, and unleash signature elemental skills.
 */

import * as THREE from 'three';
import { HeroDef } from '../systems/HeroRoster.js';
import { SkillEffects3D } from './SkillEffects3D.js';

export class HeroCompanion3D {
  public group: THREE.Group;
  public hero: HeroDef;
  public slotIndex: number; // 1, 2, or 3
  public currentHp: number;
  public maxHp: number;
  public pos: THREE.Vector3;
  public targetPos: THREE.Vector3;
  private spriteMesh!: THREE.Sprite;
  private shadowMesh!: THREE.Mesh;
  private labelTexture!: THREE.CanvasTexture;
  private labelSprite!: THREE.Sprite;
  private labelCtx!: CanvasRenderingContext2D;
  private lastAttackAt: number = 0;
  private lastSkillAt: number = 0;
  private isAttacking: boolean = false;
  private attackAnimT: number = 0;

  constructor(hero: HeroDef, slotIndex: number, startPos: THREE.Vector3, scene: THREE.Scene) {
    this.hero = hero;
    this.slotIndex = slotIndex;
    this.currentHp = hero.baseHp;
    this.maxHp = hero.baseHp;
    this.pos = startPos.clone();
    this.targetPos = startPos.clone();

    this.group = new THREE.Group();
    this.group.name = `companion_${hero.id}_${slotIndex}`;
    this.group.position.copy(this.pos);

    this.initVisuals();
    this.initLabel();
    scene.add(this.group);
  }

  private initVisuals() {
    // 1. Pixel-Art Billboard Sprite with Nearest Filter for crisp retro look
    const loader = new THREE.TextureLoader();
    const texture = loader.load(this.hero.spriteUrl, (tex) => {
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
    });

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

    this.spriteMesh = new THREE.Sprite(spriteMat);
    // Size calibrated to standard humanoid height in game (~1.9 units high)
    this.spriteMesh.scale.set(1.6, 1.9, 1.0);
    this.spriteMesh.position.y = 0.95;
    this.group.add(this.spriteMesh);

    // 2. Soft Circular Ground Shadow
    const shadowGeo = new THREE.CircleGeometry(0.5, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.y = 0.02;
    this.group.add(this.shadowMesh);
  }

  private initLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    this.labelCtx = canvas.getContext('2d')!;
    this.labelTexture = new THREE.CanvasTexture(canvas);
    this.labelTexture.minFilter = THREE.LinearFilter;

    const labelMat = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthWrite: false
    });

    this.labelSprite = new THREE.Sprite(labelMat);
    this.labelSprite.scale.set(1.8, 0.45, 1.0);
    this.labelSprite.position.y = 2.15;
    this.group.add(this.labelSprite);

    this.updateLabel();
  }

  public updateLabel() {
    const ctx = this.labelCtx;
    ctx.clearRect(0, 0, 256, 64);

    // Hero Name & Stars
    ctx.font = 'bold 20px "Noto Sans Thai", Kanit, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(this.hero.name, 128, 22);
    ctx.fillStyle = this.hero.rarity >= 6 ? '#ffd166' : '#ffffff';
    ctx.fillText(this.hero.name, 128, 22);

    // Stars
    const stars = '★'.repeat(this.hero.rarity);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(stars, 128, 36);

    // HP Bar
    const hpPct = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(48, 42, 160, 10);
    ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(50, 44, 156 * hpPct, 6);

    this.labelTexture.needsUpdate = true;
  }

  /**
   * Update companion position, animation, and AI combat
   */
  public update(
    time: number,
    dt: number,
    playerPos: THREE.Vector3,
    playerFacingAngle: number,
    targetMonster: { id: string; pos: THREE.Vector3; hp: number } | null,
    effects: SkillEffects3D,
    onDealDamage?: (monsterId: string, dmg: number, skillName: string) => void
  ) {
    // 1. Calculate tactical formation slot offset relative to player
    // Slot 1: Left Wing (-1.8, -1.2)
    // Slot 2: Right Wing (+1.8, -1.2)
    // Slot 3: Rear Guard (0.0, -2.4)
    let localOffsetX = 0;
    let localOffsetZ = -1.5;

    if (this.slotIndex === 1) {
      localOffsetX = -1.8;
      localOffsetZ = -1.2;
    } else if (this.slotIndex === 2) {
      localOffsetX = 1.8;
      localOffsetZ = -1.2;
    } else if (this.slotIndex === 3) {
      localOffsetX = 0.0;
      localOffsetZ = -2.4;
    }

    // Rotate offset by player's facing angle
    const cosA = Math.cos(playerFacingAngle);
    const sinA = Math.sin(playerFacingAngle);
    const worldOffsetX = localOffsetX * cosA - localOffsetZ * sinA;
    const worldOffsetZ = localOffsetX * sinA + localOffsetZ * cosA;

    const followTarget = new THREE.Vector3(
      playerPos.x + worldOffsetX,
      playerPos.y,
      playerPos.z + worldOffsetZ
    );

    // 2. Movement logic: Follow or Attack
    const distToPlayer = this.pos.distanceTo(playerPos);
    if (distToPlayer > 18) {
      // Warp to player if fallen too far behind
      this.pos.copy(followTarget);
      this.group.position.copy(this.pos);
    } else if (targetMonster && targetMonster.hp > 0 && distToPlayer < 12) {
      // Monster in combat range: advance towards monster up to companion attack range
      const distToMob = this.pos.distanceTo(targetMonster.pos);
      if (distToMob > this.hero.range) {
        // Step towards mob
        const dir = new THREE.Vector3().subVectors(targetMonster.pos, this.pos).normalize();
        this.pos.addScaledVector(dir, Math.min(distToMob - this.hero.range + 0.5, 4.5 * dt));
      }

      // Check combat trigger
      const now = performance.now();
      if (distToMob <= this.hero.range + 1.0) {
        // Signature Skill (cooldown based)
        if (now - this.lastSkillAt > this.hero.signatureSkill.cooldownMs) {
          this.lastSkillAt = now;
          this.lastAttackAt = now;
          this.triggerSkill(targetMonster, effects, onDealDamage);
        } else if (now - this.lastAttackAt > this.hero.aspd * 1000) {
          // Normal Attack
          this.lastAttackAt = now;
          this.triggerBasicAttack(targetMonster, effects, onDealDamage);
        }
      }
    } else {
      // Peaceful follow
      const distToSlot = this.pos.distanceTo(followTarget);
      if (distToSlot > 0.3) {
        const dir = new THREE.Vector3().subVectors(followTarget, this.pos).normalize();
        const speed = distToSlot > 5 ? 7.0 : 4.0;
        this.pos.addScaledVector(dir, Math.min(distToSlot, speed * dt));
      }
    }

    // Smooth position interpolation
    this.group.position.copy(this.pos);

    // 3. Idle breathing / bounce animation
    const isMoving = this.pos.distanceTo(followTarget) > 0.4;
    const bounce = isMoving ? Math.sin(time * 10 + this.slotIndex) * 0.08 : Math.sin(time * 3 + this.slotIndex) * 0.03;
    this.spriteMesh.position.y = 0.95 + Math.abs(bounce);

    // 4. Attack lunging animation
    if (this.isAttacking) {
      this.attackAnimT -= dt * 4;
      if (this.attackAnimT <= 0) {
        this.isAttacking = false;
        this.spriteMesh.scale.set(1.6, 1.9, 1.0);
      } else {
        const s = 1.0 + Math.sin(this.attackAnimT * Math.PI) * 0.25;
        this.spriteMesh.scale.set(1.6 * s, 1.9 * s, 1.0);
      }
    }
  }

  private triggerBasicAttack(
    target: { id: string; pos: THREE.Vector3 },
    effects: SkillEffects3D,
    onDealDamage?: (monsterId: string, dmg: number, skillName: string) => void
  ) {
    this.isAttacking = true;
    this.attackAnimT = 1.0;

    // Standard basic attack effect
    effects.playSkill('NORMAL', this.pos, 0, target.pos, target.pos, 'sword');

    const dmg = Math.floor(this.hero.baseAtk * (0.9 + Math.random() * 0.25));
    if (onDealDamage) {
      onDealDamage(target.id, dmg, 'ATTACK');
    }
  }

  private triggerSkill(
    target: { id: string; pos: THREE.Vector3 },
    effects: SkillEffects3D,
    onDealDamage?: (monsterId: string, dmg: number, skillName: string) => void
  ) {
    this.isAttacking = true;
    this.attackAnimT = 1.5;

    const skill = this.hero.signatureSkill;
    const kind = skill.effectKind;

    // Trigger visual effect via SkillEffects3D.playSkill
    if (kind === 'slash' || kind === 'whirlwind') {
      effects.playSkill('BASH', this.pos, 0, target.pos, target.pos);
    } else if (kind === 'meteor' || kind === 'chains') {
      effects.playSkill('ASTRAL_METEOR', this.pos, 0, target.pos, target.pos);
    } else if (kind === 'ice') {
      effects.playSkill('FROST_NOVA', this.pos, 0, target.pos, target.pos);
    } else if (kind === 'heal') {
      effects.playSkill('FIRST_AID', this.pos, 0, null, this.pos);
      this.currentHp = Math.min(this.maxHp, this.currentHp + Math.floor(this.maxHp * 0.35));
      this.updateLabel();
    } else if (kind === 'barrier' || kind === 'buff') {
      effects.playSkill('SOLAR_AEGIS', this.pos, 0, null, this.pos);
    } else {
      effects.playSkill('RADIANT_SLASH', this.pos, 0, target.pos, target.pos);
    }

    const totalDmg = Math.floor(this.hero.baseAtk * skill.multiplier * (0.95 + Math.random() * 0.2));
    if (onDealDamage) {
      onDealDamage(target.id, totalDmg, skill.name);
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.group);
    this.labelTexture.dispose();
    (this.labelSprite.material as THREE.SpriteMaterial).dispose();
    (this.spriteMesh.material as THREE.SpriteMaterial).dispose();
    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as THREE.Material).dispose();
  }
}
