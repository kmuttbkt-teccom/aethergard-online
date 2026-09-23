export class ClientMonster {
    data;
    renderX;
    renderY;
    animTimer = Math.random() * 10;
    constructor(data) {
        this.data = data;
        this.renderX = data.x;
        this.renderY = data.y;
    }
    update(dt) {
        this.animTimer += dt * 5;
        // Smooth interpolation to server state
        this.renderX += (this.data.x - this.renderX) * 0.25;
        this.renderY += (this.data.y - this.renderY) * 0.25;
    }
    render(ctx) {
        if (this.data.isDead)
            return;
        ctx.save();
        ctx.translate(this.renderX, this.renderY);
        if (this.data.facing === 'right') {
            ctx.scale(-1, 1);
        }
        switch (this.data.type) {
            case 'Poring':
                this.renderPoring(ctx);
                break;
            case 'Fabre':
                this.renderFabre(ctx);
                break;
            case 'Spore':
                this.renderSpore(ctx);
                break;
            case 'PecoPeco':
                this.renderPecoPeco(ctx);
                break;
            case 'BaphometJr':
                this.renderBaphometJr(ctx);
                break;
        }
        ctx.restore();
        // Render Health bar & Name (Do not flip scale)
        this.renderHealthBar(ctx);
    }
    renderPoring(ctx) {
        const squish = Math.sin(this.animTimer) * 0.12;
        const w = 24 * (1 + squish);
        const h = 22 * (1 - squish);
        // Pink Jelly Body
        ctx.fillStyle = '#ff758f';
        ctx.beginPath();
        ctx.ellipse(0, -h / 2, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shiny Highlight
        ctx.fillStyle = '#ffccd5';
        ctx.beginPath();
        ctx.ellipse(-w * 0.35, -h * 0.7, w * 0.3, h * 0.2, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#1c0f13';
        ctx.beginPath();
        ctx.ellipse(-7, -h * 0.5, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(7, -h * 0.5, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye Glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, -h * 0.5 - 1.5, 1, 0, Math.PI * 2);
        ctx.arc(6, -h * 0.5 - 1.5, 1, 0, Math.PI * 2);
        ctx.fill();
        // Cute Mouth
        ctx.strokeStyle = '#800f2f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -h * 0.3, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }
    renderFabre(ctx) {
        const crawl = Math.sin(this.animTimer) * 2;
        // Green caterpillar segments
        const colors = ['#70e000', '#38b000', '#007200'];
        for (let i = 2; i >= 0; i--) {
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.ellipse((i - 1) * 10, -10 + (i === 1 ? crawl : 0), 8, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-14, -12, 2, 0, Math.PI * 2);
        ctx.fill();
        // Little leaf on back
        ctx.fillStyle = '#9ef01a';
        ctx.beginPath();
        ctx.ellipse(0, -20, 6, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    renderSpore(ctx) {
        const bounce = Math.abs(Math.sin(this.animTimer)) * 4;
        // Stem
        ctx.fillStyle = '#ede0d4';
        ctx.fillRect(-6, -12 - bounce, 12, 12);
        // Mushroom Cap
        ctx.fillStyle = '#9c6644';
        ctx.beginPath();
        ctx.arc(0, -14 - bounce, 18, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // White Spots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, -20 - bounce, 3, 0, Math.PI * 2);
        ctx.arc(5, -23 - bounce, 2.5, 0, Math.PI * 2);
        ctx.arc(9, -17 - bounce, 2, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-4, -9 - bounce, 2, 4);
        ctx.fillRect(2, -9 - bounce, 2, 4);
    }
    renderPecoPeco(ctx) {
        const run = Math.sin(this.animTimer * 1.5) * 6;
        // Legs
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.lineTo(-4 + run, 0);
        ctx.moveTo(4, -10);
        ctx.lineTo(4 - run, 0);
        ctx.stroke();
        // Yellow Body
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.ellipse(0, -18, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head and Beak
        ctx.beginPath();
        ctx.arc(-12, -26, 7, 0, Math.PI * 2);
        ctx.fill();
        // Red Comb
        ctx.fillStyle = '#ef476f';
        ctx.beginPath();
        ctx.arc(-12, -33, 4, 0, Math.PI * 2);
        ctx.fill();
        // Orange Beak
        ctx.fillStyle = '#fb8500';
        ctx.beginPath();
        ctx.moveTo(-18, -26);
        ctx.lineTo(-26, -24);
        ctx.lineTo(-18, -22);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-13, -27, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    renderBaphometJr(ctx) {
        const wingFlap = Math.sin(this.animTimer * 2) * 0.3;
        // Demon Aura
        ctx.fillStyle = 'rgba(157, 2, 8, 0.2)';
        ctx.beginPath();
        ctx.arc(0, -25, 32, 0, Math.PI * 2);
        ctx.fill();
        // Bat Wings
        ctx.fillStyle = '#370617';
        ctx.save();
        ctx.translate(6, -28);
        ctx.rotate(wingFlap);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24, -16);
        ctx.lineTo(16, 8);
        ctx.closePath();
        ctx.fill();
        ctx.translate(-12, 0);
        ctx.rotate(-wingFlap * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-24, -16);
        ctx.lineTo(-16, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Dark Body
        ctx.fillStyle = '#240046';
        ctx.beginPath();
        ctx.ellipse(0, -22, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.moveTo(-8, -32);
        ctx.quadraticCurveTo(-18, -48, -12, -50);
        ctx.quadraticCurveTo(-8, -42, -5, -34);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, -32);
        ctx.quadraticCurveTo(18, -48, 12, -50);
        ctx.quadraticCurveTo(8, -42, 5, -34);
        ctx.fill();
        // Glowing Red Eyes
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(-5, -25, 2.5, 0, Math.PI * 2);
        ctx.arc(5, -25, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Mini Scythe
        ctx.strokeStyle = '#5a189a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, -4);
        ctx.lineTo(14, -38);
        ctx.stroke();
        ctx.fillStyle = '#c77dff';
        ctx.beginPath();
        ctx.arc(14, -38, 12, -Math.PI * 0.5, Math.PI * 0.3);
        ctx.lineTo(14, -38);
        ctx.fill();
    }
    renderHealthBar(ctx) {
        const barW = 42;
        const barH = 5;
        const barX = this.renderX - barW / 2;
        const barY = this.renderY - (this.data.type === 'BaphometJr' ? 62 : 42);
        // Name and Lv Tag
        ctx.save();
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        // Label
        ctx.fillStyle = this.data.type === 'BaphometJr' ? '#ff4d6d' : '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        const label = `Lv.${this.data.level} ${this.data.name}`;
        ctx.strokeText(label, this.renderX, barY - 4);
        ctx.fillText(label, this.renderX, barY - 4);
        // Background bar
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX, barY, barW, barH);
        // Health Fill
        const hpRatio = Math.max(0, Math.min(1, this.data.hp / this.data.maxHp));
        ctx.fillStyle = hpRatio > 0.5 ? '#55a630' : hpRatio > 0.25 ? '#ffb703' : '#e63946';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.restore();
    }
}
