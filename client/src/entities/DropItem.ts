import { DropItemData } from '../../../server/src/types.js';

export class ClientDropItem {
  public data: DropItemData;
  public bounceTimer: number = Math.random() * 5;

  constructor(data: DropItemData) {
    this.data = data;
  }

  public update(dt: number) {
    this.bounceTimer += dt * 4;
  }

  public render(ctx: CanvasRenderingContext2D, playerX: number, playerY: number) {
    const bounce = Math.sin(this.bounceTimer) * 4;
    const drawX = this.data.x;
    const drawY = this.data.groundY - 10 + bounce;

    ctx.save();

    // Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(drawX, this.data.groundY - 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Icon / Item
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data.icon, drawX, drawY);

    // Glowing aura if it is a Card or Equip
    if (this.data.type === 'card' || this.data.type === 'equip') {
      const glowGrad = ctx.createRadialGradient(drawX, drawY, 2, drawX, drawY, 18);
      glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // If player is nearby (within 80px), show pickup label
    const dist = Math.hypot(playerX - drawX, playerY - this.data.groundY);
    if (dist < 85) {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';

      // Background tag
      const label = `[V] ${this.data.name}`;
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(drawX - textW / 2 - 4, drawY - 26, textW + 8, 15);

      ctx.fillStyle = this.data.type === 'card' ? '#ffd700' : '#ffffff';
      ctx.fillText(label, drawX, drawY - 15);
    }

    ctx.restore();
  }
}
