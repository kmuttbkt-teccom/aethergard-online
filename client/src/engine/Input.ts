export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private justPressedKeys: Set<string> = new Set();
  public isChatFocused: boolean = false;

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

  public isDown(code: string): boolean {
    if (this.isChatFocused) return false;
    return !!this.keys.get(code);
  }

  public isJustPressed(code: string): boolean {
    if (this.isChatFocused) return false;
    const pressed = this.justPressedKeys.has(code);
    if (pressed) {
      this.justPressedKeys.delete(code);
    }
    return pressed;
  }

  // Common movement queries
  public isLeft(): boolean {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  }

  public isRight(): boolean {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  }

  public isUp(): boolean {
    return this.isDown('ArrowUp') || this.isDown('KeyW');
  }

  public isDownDir(): boolean {
    return this.isDown('ArrowDown') || this.isDown('KeyS');
  }

  public isJumpJustPressed(): boolean {
    return this.isJustPressed('Space') || this.isJustPressed('AltLeft') || this.isJustPressed('KeyC');
  }

  public isAttackJustPressed(): boolean {
    return this.isJustPressed('KeyZ') || this.isJustPressed('ControlLeft');
  }

  public isSkill1JustPressed(): boolean {
    return this.isJustPressed('KeyX');
  }

  public isPickupJustPressed(): boolean {
    return this.isJustPressed('KeyV');
  }

  public isHotbar1(): boolean {
    return this.isJustPressed('Digit1');
  }

  public isHotbar2(): boolean {
    return this.isJustPressed('Digit2');
  }

  public isHotbar3(): boolean {
    return this.isJustPressed('Digit3');
  }

  public clearJustPressed() {
    this.justPressedKeys.clear();
  }
}
