export class Camera {
    x = 0;
    y = 0;
    viewportW = 800;
    viewportH = 600;
    constructor(viewportW, viewportH) {
        this.viewportW = viewportW;
        this.viewportH = viewportH;
    }
    resize(w, h) {
        this.viewportW = w;
        this.viewportH = h;
    }
    follow(targetX, targetY, mapW, mapH, dt) {
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
