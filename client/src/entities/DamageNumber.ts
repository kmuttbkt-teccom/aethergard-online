export interface DamagePopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  isCrit: boolean;
  isHeal: boolean;
  isMiss: boolean;
  alpha: number;
  life: number;
  maxLife: number;
}

export class DamageNumberManager {
  private popups: DamagePopup[] = [];

  public add(x: number, y: number, damage: number, isCrit: boolean = false, isHeal: boolean = false, isMiss: boolean = false) {
    let text = String(damage);
    if (isMiss) text = 'MISS';
    if (isHeal) text = `+${damage}`;

    this.popups.push({
      x: x + (Math.random() * 20 - 10),
      y: y - 10,
      vy: isCrit ? -4.5 : -3.2,
      text,
      isCrit,
      isHeal,
      isMiss,
      alpha: 1.0,
      life: 0,
      maxLife: 0.9
    });
  }

  public update(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life += dt;
      p.y += p.vy;
      p.vy += 4.5 * dt; // slight downward gravity deceleration

      if (p.life > p.maxLife * 0.5) {
        p.alpha = Math.max(0, 1 - (p.life - p.maxLife * 0.5) / (p.maxLife * 0.5));
      }

      if (p.life >= p.maxLife) {
        this.popups.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.popups.forEach(p => {
      ctx.globalAlpha = p.alpha;

      if (p.isCrit) {
        // MapleStory/RO bold yellow critical text
        ctx.font = '900 20px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'center';

        // Critical banner
        ctx.fillStyle = '#ff2a2a';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('CRITICAL!', p.x, p.y - 18);
        ctx.fillText('CRITICAL!', p.x, p.y - 18);

        // Number
        ctx.fillStyle = '#ffe042';
        ctx.strokeStyle = '#8a0000';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.isHeal) {
        // Green heal numbers
        ctx.font = 'bold 16px "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38b000';
        ctx.strokeStyle = '#003600';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.isMiss) {
        // Grey miss text
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cfd8dc';
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      } else {
        // Normal white/orange damage
        ctx.font = 'bold 17px "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      }
    });
    ctx.restore();
  }
}
