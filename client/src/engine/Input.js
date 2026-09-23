export class InputManager {
    keys = new Map();
    justPressedKeys = new Set();
    isChatFocused = false;
    constructor() {
        window.addEventListener('keydown', (e) => {
            // Don't intercept game keys if typing in chat, unless it's Enter or Escape
            if (this.isChatFocused && e.key !== 'Enter' && e.key !== 'Escape') {
                return;
            }
            if (!this.keys.get(e.code)) {
                this.justPressedKeys.add(e.code);
            }
            this.keys.set(e.code, true);
            // Prevent scrolling page with arrows or spacebar
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
            this.justPressedKeys.delete(e.code);
        });
    }
    isDown(code) {
        if (this.isChatFocused)
            return false;
        return !!this.keys.get(code);
    }
    isJustPressed(code) {
        if (this.isChatFocused)
            return false;
        const pressed = this.justPressedKeys.has(code);
        if (pressed) {
            this.justPressedKeys.delete(code);
        }
        return pressed;
    }
    // Common movement queries
    isLeft() {
        return this.isDown('ArrowLeft') || this.isDown('KeyA');
    }
    isRight() {
        return this.isDown('ArrowRight') || this.isDown('KeyD');
    }
    isUp() {
        return this.isDown('ArrowUp') || this.isDown('KeyW');
    }
    isDownDir() {
        return this.isDown('ArrowDown') || this.isDown('KeyS');
    }
    isJumpJustPressed() {
        return this.isJustPressed('Space') || this.isJustPressed('AltLeft') || this.isJustPressed('KeyC');
    }
    isAttackJustPressed() {
        return this.isJustPressed('KeyZ') || this.isJustPressed('ControlLeft');
    }
    isSkill1JustPressed() {
        return this.isJustPressed('KeyX');
    }
    isPickupJustPressed() {
        return this.isJustPressed('KeyV');
    }
    isHotbar1() {
        return this.isJustPressed('Digit1');
    }
    isHotbar2() {
        return this.isJustPressed('Digit2');
    }
    isHotbar3() {
        return this.isJustPressed('Digit3');
    }
    clearJustPressed() {
        this.justPressedKeys.clear();
    }
}
