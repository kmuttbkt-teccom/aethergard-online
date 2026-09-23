export class AuthoritativePhysics {
    static MAP_WIDTH = 14400;
    static MAP_HEIGHT = 720;
    static GRAVITY = 980;
    static MAX_FALL_SPEED = 650;
    static BASE_MOVE_SPEED = 210;
    static PLATFORMS = [
        // Main Ground across all 3 zones
        { x: 0, y: 560, w: 14400, h: 160, isOneWay: false },
        // Floating Ledges Zone 1, 2, 3
        { x: 180, y: 460, w: 220, h: 16, isOneWay: true },
        { x: 420, y: 360, w: 250, h: 16, isOneWay: true },
        { x: 700, y: 450, w: 220, h: 16, isOneWay: true },
        { x: 920, y: 370, w: 220, h: 16, isOneWay: true },
        { x: 1250, y: 460, w: 240, h: 16, isOneWay: true },
        { x: 1480, y: 350, w: 220, h: 16, isOneWay: true },
        { x: 1720, y: 270, w: 200, h: 16, isOneWay: true },
        { x: 1950, y: 380, w: 240, h: 16, isOneWay: true },
        { x: 2180, y: 470, w: 200, h: 16, isOneWay: true },
        { x: 2480, y: 450, w: 220, h: 18, isOneWay: true },
        { x: 2730, y: 360, w: 250, h: 18, isOneWay: true },
        { x: 3020, y: 440, w: 320, h: 20, isOneWay: true },
        { x: 3100, y: 330, w: 180, h: 18, isOneWay: true }
    ];
    /**
     * Run authoritative physics step on server for a player
     */
    static step(player, input, dt) {
        const prevY = player.y;
        const speedMult = player.speedMultiplier || 1.0;
        const moveSpeed = (this.BASE_MOVE_SPEED + (player.stats.agi * 1.5)) * speedMult;
        // 1. Horizontal velocity
        if (input.left) {
            player.vx = -moveSpeed;
            player.facing = 'left';
            player.anim = 'walk';
        }
        else if (input.right) {
            player.vx = moveSpeed;
            player.facing = 'right';
            player.anim = 'walk';
        }
        else {
            player.vx = 0;
            player.anim = 'idle';
        }
        // 2. Jump
        if (input.jump && player.isGrounded) {
            player.vy = -430;
            player.isGrounded = false;
            player.anim = 'jump';
        }
        // 3. Gravity
        player.vy += this.GRAVITY * dt;
        if (player.vy > this.MAX_FALL_SPEED)
            player.vy = this.MAX_FALL_SPEED;
        // 4. Position integration
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        // 5. World Bounds Clamping
        player.x = Math.max(30, Math.min(this.MAP_WIDTH - 30, player.x));
        // 6. Platform Collisions
        player.isGrounded = false;
        for (const p of this.PLATFORMS) {
            if (p.isOneWay) {
                // One-way platform: only collide when falling down and player was previously above platform
                if (player.x >= p.x &&
                    player.x <= p.x + p.w &&
                    prevY <= p.y + 4 &&
                    player.y >= p.y &&
                    player.vy >= 0) {
                    player.y = p.y;
                    player.vy = 0;
                    player.isGrounded = true;
                    break;
                }
            }
            else {
                // Solid Ground
                if (player.y >= p.y && player.x >= p.x && player.x <= p.x + p.w) {
                    player.y = p.y;
                    player.vy = 0;
                    player.isGrounded = true;
                    break;
                }
            }
        }
        if (!player.isGrounded) {
            player.anim = 'jump';
        }
        return player;
    }
}
