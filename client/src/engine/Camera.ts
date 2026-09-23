export class Camera {
  public x: number = 0;
  public y: number = 0;
  public viewportW: number = 800;
  public viewportH: number = 600;

  constructor(viewportW: number, viewportH: number) {
    this.viewportW = viewportW;
    this.viewportH = viewportH;
  }

  public resize(w: number, h: number) {
    this.viewportW = w;
    this.viewportH = h;
  }

  public follow(targetX: number, targetY: number, mapW: number, mapH: number, dt: number) {
    const targetCamX = targetX - this.viewportW / 2;
    const targetCamY = targetY - this.viewportH / 2 - 40;

    // Smooth lerp
    this.x += (targetCamX - this.x) * 0.12;
    this.y += (targetCamY - this.y) * 0.12;

    // Clamp within map bounds
    this.x = Math.max(0, Math.min(this.x, mapW - this.viewportW));
    this.y = Math.max(0, Math.min(this.y, mapH - this.viewportH));
  }
}
