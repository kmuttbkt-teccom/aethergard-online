import { sound } from '../engine/Sound.js';
export class ClientPlayer {
    data;
    isSelf = false;
    // Visual render positions & interpolation
    renderX;
    renderY;
    // Physics states
    isJumping = false;
    canDoubleJump = false;
    isClimbing = false;
    isAttacking = false;
    attackTimer = 0;
    attackSkill = 'NORMAL';
    flashJumpPuff = null;
    levelUpEffect = null;
    // Chat bubble
    chatBubble = null;
    // Animation timers
    animTimer = 0;
    blinkTimer = 2.0;
    constructor(data, isSelf = false) {
        this.data = data;
        this.isSelf = isSelf;
        this.renderX = data.x;
        this.renderY = data.y;
    }
    updatePhysics(dt, map, keys) {
        if (!this.isSelf) {
            // Remote player: smooth interpolation
            this.renderX += (this.data.x - this.renderX) * 0.3;
            this.renderY += (this.data.y - this.renderY) * 0.3;
            return;
        }
        const prevY = this.data.y;
        // Check ladders
        const nearLadder = map.ladders.find(l => Math.abs(this.data.x - l.x) < 20 && this.data.y >= l.topY - 10 && this.data.y <= l.bottomY + 10);
        if (nearLadder && (keys.up || (keys.down && !this.data.isGrounded))) {
            this.isClimbing = true;
            this.data.x = nearLadder.x; // Snap to ladder
            this.data.vx = 0;
        }
        if (this.isClimbing) {
            this.data.vy = 0;
            if (keys.up) {
                this.data.y -= 140 * dt;
                if (nearLadder && this.data.y < nearLadder.topY) {
                    this.data.y = nearLadder.topY;
                    this.isClimbing = false;
                }
            }
            else if (keys.down) {
                this.data.y += 140 * dt;
                if (nearLadder && this.data.y > nearLadder.bottomY) {
                    this.data.y = nearLadder.bottomY;
                    this.isClimbing = false;
                }
            }
            if (keys.jump) {
                this.isClimbing = false;
                this.data.vy = -380;
                sound.playJump();
            }
        }
        else {
            // Normal Platformer Movement
            const moveSpeed = 210 + (this.data.stats.agi * 1.5);
            if (keys.left) {
                this.data.vx = -moveSpeed;
                this.data.facing = 'left';
                this.data.anim = 'walk';
            }
            else if (keys.right) {
                this.data.vx = moveSpeed;
                this.data.facing = 'right';
                this.data.anim = 'walk';
            }
            else {
                this.data.vx = 0;
                this.data.anim = 'idle';
            }
            // Jump and Double Jump (Flash Jump)
            if (keys.jump) {
                if (this.data.isGrounded) {
                    this.data.vy = -430;
                    this.data.isGrounded = false;
                    this.canDoubleJump = true;
                    this.data.anim = 'jump';
                    sound.playJump();
                }
                else if (this.canDoubleJump) {
                    // Double Jump!
                    this.data.vy = -380;
                    this.data.vx = this.data.facing === 'right' ? moveSpeed * 1.8 : -moveSpeed * 1.8;
                    this.canDoubleJump = false;
                    this.flashJumpPuff = { x: this.data.x, y: this.data.y, timer: 0.35 };
                    sound.playDoubleJump();
                }
            }
            // Gravity
            this.data.vy += 980 * dt;
            if (this.data.vy > 650)
                this.data.vy = 650;
            // Apply velocity
            this.data.x += this.data.vx * dt;
            this.data.y += this.data.vy * dt;
            // Clamp map edges
            this.data.x = Math.max(30, Math.min(map.width - 30, this.data.x));
            // Platform Collisions
            this.data.isGrounded = false;
            for (const p of map.platforms) {
                if (p.isOneWay) {
                    // Can drop down with Down + Jump
                    if (keys.dropDown && prevY <= p.y + 2) {
                        continue;
                    }
                    if (this.data.x >= p.x &&
                        this.data.x <= p.x + p.w &&
                        prevY <= p.y + 4 &&
                        this.data.y >= p.y &&
                        this.data.vy >= 0) {
                        this.data.y = p.y;
                        this.data.vy = 0;
                        this.data.isGrounded = true;
                        this.canDoubleJump = false;
                        break;
                    }
                }
                else {
                    // Solid Ground
                    if (this.data.y >= p.y && this.data.x >= p.x && this.data.x <= p.x + p.w) {
                        this.data.y = p.y;
                        this.data.vy = 0;
                        this.data.isGrounded = true;
                        this.canDoubleJump = false;
                        break;
                    }
                }
            }
            if (!this.data.isGrounded) {
                this.data.anim = 'jump';
            }
        }
        this.renderX = this.data.x;
        this.renderY = this.data.y;
    }
    updateTimers(dt) {
        this.animTimer += dt * 8;
        // Blink timer
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            this.blinkTimer = 2.5 + Math.random() * 2;
        }
        // Attack cooldown / anim
        if (this.isAttacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }
        // Flash jump puff
        if (this.flashJumpPuff) {
            this.flashJumpPuff.timer -= dt;
            if (this.flashJumpPuff.timer <= 0) {
                this.flashJumpPuff = null;
            }
        }
        // Level up effect
        if (this.levelUpEffect) {
            this.levelUpEffect.timer -= dt;
            if (this.levelUpEffect.timer <= 0) {
                this.levelUpEffect = null;
            }
        }
        // Chat bubble
        if (this.chatBubble) {
            this.chatBubble.timer -= dt;
            if (this.chatBubble.timer <= 0) {
                this.chatBubble = null;
            }
        }
    }
    triggerAttack(skill = 'NORMAL') {
        this.isAttacking = true;
        this.attackTimer = 0.22;
        this.attackSkill = skill;
    }
    triggerLevelUp() {
        this.levelUpEffect = { timer: 2.0 };
        sound.playLevelUp();
    }
    showChat(text) {
        this.chatBubble = { text, timer: 5.0 };
    }
    render(ctx) {
        ctx.save();
        ctx.translate(this.renderX, this.renderY);
        // Double Jump Air Smoke Puff
        if (this.flashJumpPuff) {
            ctx.save();
            const puffAlpha = Math.max(0, this.flashJumpPuff.timer / 0.35);
            ctx.fillStyle = `rgba(240, 248, 255, ${puffAlpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(0, -8, 16 * (1 - puffAlpha + 0.5), 0, Math.PI * 2);
            ctx.arc(-10, -12, 10 * (1 - puffAlpha + 0.5), 0, Math.PI * 2);
            ctx.arc(10, -12, 10 * (1 - puffAlpha + 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // Level Up Golden Pillar & Stars
        if (this.levelUpEffect) {
            this.renderLevelUpAnimation(ctx);
        }
        // Flip if facing left
        if (this.data.facing === 'left') {
            ctx.scale(-1, 1);
        }
        // 1. Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, -2, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 2. Chibi Character Paperdoll Layers
        this.renderPaperdoll(ctx);
        // 3. Attack Slash Effect
        if (this.isAttacking) {
            this.renderAttackSwipe(ctx);
        }
        ctx.restore();
        // Render Name, Job, and Chat Bubble (No Flip)
        this.renderOverheadInfo(ctx);
    }
    renderPaperdoll(ctx) {
        const isMoving = this.data.anim === 'walk';
        const walkBob = isMoving ? Math.sin(this.animTimer) * 2 : 0;
        const legSwing = isMoving ? Math.sin(this.animTimer) * 5 : 0;
        // Legs / Shoes
        ctx.fillStyle = '#4a4e69';
        ctx.fillRect(-8 + legSwing, -12 + walkBob, 6, 12);
        ctx.fillRect(2 - legSwing, -12 + walkBob, 6, 12);
        // Shoes (Brown Boots)
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(-10 + legSwing, -4 + walkBob, 9, 5);
        ctx.fillRect(1 - legSwing, -4 + walkBob, 9, 5);
        // Body / Shirt (Novice Blue or Class Colors)
        let bodyColor = '#4361ee'; // Novice Blue
        if (this.data.job === 'Swordman')
            bodyColor = '#d90429';
        if (this.data.job === 'Magician')
            bodyColor = '#7209b7';
        if (this.data.job === 'Archer')
            bodyColor = '#2b9348';
        if (this.data.job === 'Thief')
            bodyColor = '#212529';
        if (this.data.job === 'Acolyte')
            bodyColor = '#ffd166';
        if (this.data.job === 'Merchant')
            bodyColor = '#f77f00';
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-10, -28 + walkBob, 20, 18, [4, 4, 2, 2]);
        ctx.fill();
        // Belt
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-10, -14 + walkBob, 20, 3);
        // Head / Face
        ctx.fillStyle = '#ffe0bd'; // Skin
        ctx.beginPath();
        ctx.arc(0, -38 + walkBob, 13, 0, Math.PI * 2);
        ctx.fill();
        // Eyes (Anime Maple style)
        const isBlinking = this.blinkTimer < 0.15;
        if (isBlinking) {
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(2, -37 + walkBob);
            ctx.lineTo(8, -37 + walkBob);
            ctx.stroke();
        }
        else {
            // Big friendly eye
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.ellipse(5, -38 + walkBob, 3, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye glint
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(4, -40 + walkBob, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        // Cute Blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.45)';
        ctx.beginPath();
        ctx.arc(7, -33 + walkBob, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Hair (Spiky / Anime Hair)
        ctx.fillStyle = '#9a031e'; // Auburn hair
        ctx.beginPath();
        ctx.arc(0, -42 + walkBob, 14, Math.PI * 0.9, Math.PI * 2.1);
        ctx.lineTo(12, -36 + walkBob);
        ctx.lineTo(8, -44 + walkBob);
        ctx.lineTo(2, -49 + walkBob);
        ctx.lineTo(-4, -46 + walkBob);
        ctx.lineTo(-11, -40 + walkBob);
        ctx.closePath();
        ctx.fill();
        // Headband / Cap
        ctx.fillStyle = '#ffbe0b';
        ctx.fillRect(-11, -46 + walkBob, 22, 4);
        // Weapon
        ctx.save();
        ctx.translate(6, -24 + walkBob);
        if (this.isAttacking) {
            ctx.rotate(0.8);
        }
        // Dagger / Blade
        ctx.fillStyle = '#adb5bd';
        ctx.fillRect(2, -14, 4, 18);
        ctx.fillStyle = '#ffb703'; // Guard
        ctx.fillRect(0, 0, 8, 3);
        ctx.fillStyle = '#6c584c'; // Hilt
        ctx.fillRect(2, 3, 4, 6);
        ctx.restore();
    }
    renderAttackSwipe(ctx) {
        const progress = 1 - (this.attackTimer / 0.22);
        const radius = 38;
        ctx.save();
        if (this.attackSkill === 'BASH') {
            // Golden/Red Fierce Bash Arc
            const grad = ctx.createRadialGradient(10, -25, 10, 10, -25, radius + 8);
            grad.addColorStop(0, 'rgba(255, 230, 0, 0.9)');
            grad.addColorStop(0.5, 'rgba(255, 80, 0, 0.7)');
            grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.arc(8, -26, radius, -Math.PI * 0.4 + progress * 0.5, Math.PI * 0.4 + progress * 0.5);
            ctx.stroke();
        }
        else {
            // Crisp Maple Slash Arc
            const grad = ctx.createRadialGradient(10, -25, 10, 10, -25, radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.6, 'rgba(100, 200, 255, 0.7)');
            grad.addColorStop(1, 'rgba(0, 100, 255, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(8, -26, radius, -Math.PI * 0.35 + progress * 0.4, Math.PI * 0.35 + progress * 0.4);
            ctx.stroke();
        }
        ctx.restore();
    }
    renderLevelUpAnimation(ctx) {
        const alpha = Math.min(1, this.levelUpEffect.timer / 0.5);
        const time = Date.now() * 0.006;
        ctx.save();
        // Golden Pillar
        const grad = ctx.createLinearGradient(0, 0, 0, -140);
        grad.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.6})`);
        grad.addColorStop(0.5, `rgba(255, 255, 200, ${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(255, 215, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(-22, -140, 44, 140);
        // Floating Sparkles
        for (let i = 0; i < 6; i++) {
            const sx = Math.sin(time + i * 1.2) * 24;
            const sy = -((time * 30 + i * 22) % 130);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // LEVEL UP Text banner
        ctx.font = '900 13px "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffea00';
        ctx.strokeStyle = '#9d0208';
        ctx.lineWidth = 3;
        ctx.strokeText('★ LEVEL UP! ★', 0, -110);
        ctx.fillText('★ LEVEL UP! ★', 0, -110);
        ctx.restore();
    }
    renderOverheadInfo(ctx) {
        ctx.save();
        const tagY = this.renderY - 58;
        // Chat Bubble
        if (this.chatBubble) {
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            const textW = ctx.measureText(this.chatBubble.text).width;
            const bubbleW = textW + 16;
            const bubbleH = 22;
            const bubbleY = tagY - 32;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            // Bubble box
            ctx.beginPath();
            ctx.roundRect(this.renderX - bubbleW / 2, bubbleY, bubbleW, bubbleH, [6]);
            ctx.fill();
            ctx.stroke();
            // Tail
            ctx.beginPath();
            ctx.moveTo(this.renderX - 4, bubbleY + bubbleH);
            ctx.lineTo(this.renderX, bubbleY + bubbleH + 5);
            ctx.lineTo(this.renderX + 4, bubbleY + bubbleH);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#111111';
            ctx.fillText(this.chatBubble.text, this.renderX, bubbleY + 15);
        }
        // Name & Job Tag
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        const jobColor = this.isSelf ? '#ffe600' : '#80ed99';
        const tag = `[${this.data.job}] ${this.data.name} (Lv.${this.data.baseLevel})`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(tag, this.renderX, tagY);
        ctx.fillStyle = jobColor;
        ctx.fillText(tag, this.renderX, tagY);
        // Overhead Mini HP Bar (for other players or self)
        const barW = 38;
        const barH = 4;
        const barX = this.renderX - barW / 2;
        const barY = tagY + 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barW, barH);
        const hpRatio = Math.max(0, Math.min(1, this.data.hp / this.data.maxHp));
        ctx.fillStyle = hpRatio > 0.4 ? '#38b000' : '#e63946';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.restore();
    }
}
