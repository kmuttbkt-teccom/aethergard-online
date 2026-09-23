export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isOneWay: boolean;
}

export interface Ladder {
  x: number;
  topY: number;
  bottomY: number;
  w: number;
}

export class GameMap {
  public width = 2600;
  public height = 720;
  public platforms: Platform[] = [];
  public ladders: Ladder[] = [];

  constructor() {
    this.buildMap();
  }

  private buildMap() {
    // Solid Ground
    this.platforms.push({ x: 0, y: 560, w: this.width, h: 160, isOneWay: false });

    // Town Platforms (Zone 1: Prontera Suburbs, 0 - 900)
    this.platforms.push({ x: 180, y: 460, w: 220, h: 16, isOneWay: true });
    this.platforms.push({ x: 380, y: 360, w: 260, h: 16, isOneWay: true });
    this.platforms.push({ x: 620, y: 440, w: 220, h: 16, isOneWay: true });

    // Payon Forest Ledges (Zone 2: 900 - 1800)
    this.platforms.push({ x: 950, y: 460, w: 180, h: 16, isOneWay: true });
    this.platforms.push({ x: 1120, y: 370, w: 240, h: 16, isOneWay: true });
    this.platforms.push({ x: 1350, y: 280, w: 200, h: 16, isOneWay: true });
    this.platforms.push({ x: 1540, y: 390, w: 220, h: 16, isOneWay: true });
    this.platforms.push({ x: 1400, y: 480, w: 240, h: 16, isOneWay: true });

    // MVP Sanctuary / Ruins (Zone 3: 1800 - 2600)
    this.platforms.push({ x: 1850, y: 460, w: 200, h: 16, isOneWay: true });
    this.platforms.push({ x: 2040, y: 360, w: 320, h: 16, isOneWay: true });
    this.platforms.push({ x: 2350, y: 450, w: 180, h: 16, isOneWay: true });

    // Ladders and Ropes
    this.ladders.push({ x: 420, topY: 360, bottomY: 460, w: 24 });
    this.ladders.push({ x: 1200, topY: 370, bottomY: 460, w: 24 });
    this.ladders.push({ x: 1450, topY: 280, bottomY: 480, w: 24 });
    this.ladders.push({ x: 2150, topY: 360, bottomY: 560, w: 24 });
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewW: number, viewH: number) {
    // 1. Parallax Sky & Mountains
    this.renderBackground(ctx, cameraX, cameraY, viewW, viewH);

    // 2. Render Ladders / Ropes
    this.renderLadders(ctx);

    // 3. Render Platforms & Ground
    this.renderPlatforms(ctx);

    // 4. Render Map Decoration (Signs, Trees, Lamps)
    this.renderDecorations(ctx);
  }

  private renderBackground(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewW: number, viewH: number) {
    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
    skyGrad.addColorStop(0, '#68b8f8');
    skyGrad.addColorStop(0.6, '#b6e0fe');
    skyGrad.addColorStop(1, '#e3f3ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(cameraX, cameraY, viewW, viewH);

    // Distant Mountains (Parallax factor 0.15)
    ctx.save();
    ctx.fillStyle = '#9cbbe3';
    const mtnOffset = cameraX * 0.15;
    ctx.beginPath();
    ctx.moveTo(cameraX, 560);
    for (let x = cameraX - 100; x < cameraX + viewW + 200; x += 250) {
      const peakX = x - (mtnOffset % 250) + 120;
      ctx.lineTo(peakX, 320 + Math.sin(x) * 40);
      ctx.lineTo(x + 250 - (mtnOffset % 250), 560);
    }
    ctx.closePath();
    ctx.fill();

    // Mid Hills (Parallax factor 0.3)
    ctx.fillStyle = '#7dbb84';
    const hillOffset = cameraX * 0.3;
    ctx.beginPath();
    ctx.moveTo(cameraX, 560);
    for (let x = cameraX - 100; x < cameraX + viewW + 200; x += 180) {
      const peakX = x - (hillOffset % 180) + 90;
      ctx.lineTo(peakX, 420 + Math.cos(x * 0.5) * 30);
      ctx.lineTo(x + 180 - (hillOffset % 180), 560);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderLadders(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.ladders.forEach(ladder => {
      const x = ladder.x;
      const top = ladder.topY;
      const btm = ladder.bottomY;

      // Rope / Ladder Rails
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x - 10, top, 4, btm - top);
      ctx.fillRect(x + 6, top, 4, btm - top);

      // Steps
      ctx.fillStyle = '#d2a679';
      for (let y = top + 10; y < btm; y += 14) {
        ctx.fillRect(x - 10, y, 20, 3);
      }
    });
    ctx.restore();
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.platforms.forEach(p => {
      if (p.isOneWay) {
        // Floating Wooden/Stone Maple Platform
        ctx.fillStyle = '#4a2e18';
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Grass top cap
        ctx.fillStyle = '#55a630';
        ctx.fillRect(p.x, p.y - 4, p.w, 6);

        // Flower/Grass fringe dots
        ctx.fillStyle = '#2b9348';
        for (let gx = p.x + 4; gx < p.x + p.w; gx += 12) {
          ctx.fillRect(gx, p.y + 2, 4, 3);
        }

        // Border
        ctx.strokeStyle = '#2d1808';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y - 4, p.w, p.h + 4);
      } else {
        // Main Ground (Dirt & Grass)
        const groundGrad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        groundGrad.addColorStop(0, '#805b38');
        groundGrad.addColorStop(1, '#53381e');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Lush grass top
        ctx.fillStyle = '#38b000';
        ctx.fillRect(p.x, p.y - 6, p.w, 10);

        ctx.fillStyle = '#007200';
        for (let gx = p.x; gx < p.x + p.w; gx += 8) {
          ctx.fillRect(gx, p.y + 4, 4, 4);
        }

        ctx.strokeStyle = '#1b4332';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x + p.w, p.y - 6);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  private renderDecorations(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Town Signpost at x: 80
    this.renderSign(ctx, 100, 560, 'Prontera Suburbs');

    // Town Lamp Post
    this.renderLamp(ctx, 240, 560);
    this.renderLamp(ctx, 700, 560);

    // Forest Signpost at x: 960
    this.renderSign(ctx, 940, 560, 'Payon Spore Forest');

    // Portal / Gateway at x: 2500
    this.renderPortal(ctx, 2480, 560);

    ctx.restore();
  }

  private renderSign(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    // Post
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 20, y - 40, 6, 40);

    // Wooden Board
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(x - 20, y - 65, 85, 25);
    ctx.strokeStyle = '#582f0e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 20, y - 65, 85, 25);

    // Text
    ctx.fillStyle = '#331800';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + 22, y - 48);
  }

  private renderLamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y - 70, 4, 70);
    ctx.fillRect(x - 8, y - 75, 20, 5);

    // Light
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(x + 2, y - 68, 6, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    ctx.fillStyle = 'rgba(255, 243, 176, 0.2)';
    ctx.beginPath();
    ctx.arc(x + 2, y - 68, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderPortal(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Magic RO/Maple blue portal
    const time = Date.now() * 0.003;
    const pulse = Math.sin(time) * 4;

    const grad = ctx.createRadialGradient(x, y - 45, 5, x, y - 45, 35 + pulse);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.4, 'rgba(100, 200, 255, 0.7)');
    grad.addColorStop(1, 'rgba(0, 80, 220, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y - 45, 20 + pulse * 0.5, 45 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DUNGEON PORTAL', x, y - 100);
  }
}
