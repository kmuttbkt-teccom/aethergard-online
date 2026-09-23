/**
 * AETHERGARD ONLINE • Mobile Touch & Virtual Controller System
 * Provides on-screen analog joystick, touch action buttons, PWA installation & haptics
 */

export interface TouchInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attack: boolean;
  jump: boolean;
  skillBash: boolean;
  skill4: boolean;
  skill5: boolean;
  loot: boolean;
  potion1: boolean;
  potion2: boolean;
  analogX: number; // -1.0 to 1.0
  analogY: number; // -1.0 to 1.0
}

export class MobileControls {
  public isMobile: boolean = false;
  public inputState: TouchInputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    jump: false,
    skillBash: false,
    skill4: false,
    skill5: false,
    loot: false,
    potion1: false,
    potion2: false,
    analogX: 0,
    analogY: 0
  };

  private joystickBase: HTMLElement | null = null;
  private joystickThumb: HTMLElement | null = null;
  private joystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private baseCenter: { x: number; y: number } = { x: 0, y: 0 };
  private maxRadius: number = 48; // max drag radius in px

  private deferredInstallPrompt: any = null;
  private onActionCallback?: (action: string) => void;

  constructor(onAction?: (action: string) => void) {
    this.onActionCallback = onAction;
    this.detectDevice();
    this.initPwaInstallPrompt();
    this.setupElements();
  }

  private detectDevice() {
    const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallTouch = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) && window.innerWidth <= 1024;
    this.isMobile = isMobileUA || isSmallTouch;

    if (this.isMobile) {
      document.body.classList.add('is-mobile-device');
    }
  }

  public initPwaInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.showInstallButtons(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.showInstallButtons(false);
      console.log('🎉 AETHERGARD ONLINE has been installed to Home Screen!');
    });
  }

  public promptInstall() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      this.deferredInstallPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        this.deferredInstallPrompt = null;
        this.showInstallButtons(false);
      });
    } else {
      alert('📲 สามารถเพิ่มเกมนี้ลงหน้าจอหลัก (Home Screen) ผ่านเมนูเบราว์เซอร์: \n\n• บน Chrome/Android: กดจุด 3 จุดมุมขวาบน > เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"\n• บน Safari/iOS: กดปุ่ม Share > เลือก "Add to Home Screen"');
    }
  }

  public showInstallButtons(show: boolean) {
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => {
      (btn as HTMLElement).style.display = show ? 'inline-flex' : 'none';
    });
  }

  public isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  public toggleFullscreen() {
    const isIOS = this.isIOS();
    // iOS Safari on iPhone does not support the Fullscreen API; prompt to Add to Home Screen
    if (isIOS && !document.fullscreenEnabled && !(document as any).webkitFullscreenEnabled) {
      const modal = document.getElementById('modal-ios-fullscreen');
      if (modal) {
        modal.classList.remove('hidden');
      }
      return;
    }

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {
          if (isIOS) document.getElementById('modal-ios-fullscreen')?.classList.remove('hidden');
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else {
        if (isIOS) document.getElementById('modal-ios-fullscreen')?.classList.remove('hidden');
      }
    } else {
      const doc = document as any;
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  }

  private triggerHaptic(duration: number = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch (e) {}
    }
  }

  private setupElements() {
    this.joystickBase = document.getElementById('virtual-joystick-base');
    this.joystickThumb = document.getElementById('virtual-joystick-thumb');

    if (this.joystickBase && this.joystickThumb) {
      this.initJoystickEvents();
    }

    this.bindTouchButtons();
    this.setupIOSModalAndHints();
  }

  private setupIOSModalAndHints() {
    const closeIosModal = () => {
      document.getElementById('modal-ios-fullscreen')?.classList.add('hidden');
      this.triggerHaptic(15);
    };
    document.getElementById('btn-close-ios-fs')?.addEventListener('click', closeIosModal);
    document.getElementById('btn-dismiss-ios-fs')?.addEventListener('click', closeIosModal);

    const rotateHint = document.getElementById('mobile-rotate-hint');
    document.getElementById('btn-dismiss-rotate')?.addEventListener('click', () => {
      rotateHint?.classList.add('hidden');
      this.triggerHaptic(15);
    });

    const checkOrientation = () => {
      if (!rotateHint) return;
      if (this.isMobile && window.innerHeight > window.innerWidth && window.innerWidth <= 600) {
        rotateHint.classList.remove('hidden');
      } else {
        rotateHint.classList.add('hidden');
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.visualViewport?.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 200);
    });
  }

  private initJoystickEvents() {
    if (!this.joystickBase || !this.joystickThumb) return;

    const base = this.joystickBase;
    const thumb = this.joystickThumb;

    const onPointerDown = (e: PointerEvent) => {
      this.joystickActive = true;
      this.joystickTouchId = e.pointerId;
      base.setPointerCapture(e.pointerId);

      const rect = base.getBoundingClientRect();
      this.baseCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      this.updateJoystick(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.joystickActive || e.pointerId !== this.joystickTouchId) return;
      this.updateJoystick(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== this.joystickTouchId) return;
      this.resetJoystick();
    };

    base.addEventListener('pointerdown', onPointerDown);
    base.addEventListener('pointermove', onPointerMove);
    base.addEventListener('pointerup', onPointerUp);
    base.addEventListener('pointercancel', onPointerUp);
  }

  private updateJoystick(clientX: number, clientY: number) {
    if (!this.joystickThumb) return;

    const dx = clientX - this.baseCenter.x;
    const dy = clientY - this.baseCenter.y;
    const distance = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(this.maxRadius, distance);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    this.joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

    // Deadzone check
    const deadzone = 10;
    if (distance < deadzone) {
      this.inputState.left = false;
      this.inputState.right = false;
      this.inputState.up = false;
      this.inputState.down = false;
      this.inputState.analogX = 0;
      this.inputState.analogY = 0;
      return;
    }

    const normX = dx / Math.max(1, distance);
    const normY = dy / Math.max(1, distance);

    this.inputState.analogX = thumbX / this.maxRadius;
    this.inputState.analogY = thumbY / this.maxRadius;

    // Thresholds for directional booleans
    this.inputState.left = normX < -0.35;
    this.inputState.right = normX > 0.35;
    this.inputState.up = normY < -0.35;
    this.inputState.down = normY > 0.35;
  }

  private resetJoystick() {
    this.joystickActive = false;
    this.joystickTouchId = null;
    if (this.joystickThumb) {
      this.joystickThumb.style.transform = 'translate(0px, 0px)';
    }
    this.inputState.left = false;
    this.inputState.right = false;
    this.inputState.up = false;
    this.inputState.down = false;
    this.inputState.analogX = 0;
    this.inputState.analogY = 0;
  }

  private bindTouchButtons() {
    const bindBtn = (id: string, actionKey: keyof TouchInputState, actionName: string, isContinuous: boolean = false) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      const activate = (e: Event) => {
        e.preventDefault();
        (this.inputState[actionKey] as boolean) = true;
        btn.classList.add('active');
        this.triggerHaptic(20);
        if (this.onActionCallback) {
          this.onActionCallback(actionName);
        }
      };

      const deactivate = (e: Event) => {
        e.preventDefault();
        (this.inputState[actionKey] as boolean) = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('pointerdown', activate);
      btn.addEventListener('pointerup', deactivate);
      btn.addEventListener('pointercancel', deactivate);
      btn.addEventListener('pointerleave', deactivate);
    };

    bindBtn('m-btn-attack', 'attack', 'ATTACK_NORMAL');
    bindBtn('m-btn-jump', 'jump', 'JUMP');
    bindBtn('m-btn-bash', 'skillBash', 'ATTACK_BASH');
    bindBtn('m-btn-skill4', 'skill4', 'SKILL_4');
    bindBtn('m-btn-skill5', 'skill5', 'SKILL_5');
    bindBtn('m-btn-loot', 'loot', 'LOOT');
    bindBtn('m-btn-potion1', 'potion1', 'POTION_1');
    bindBtn('m-btn-potion2', 'potion2', 'POTION_2');

    // Utility touch buttons
    const btnFullscreen = document.getElementById('m-btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.onclick = () => {
        this.toggleFullscreen();
        this.triggerHaptic(15);
      };
    }

    const btnMap = document.getElementById('m-btn-worldmap');
    if (btnMap) {
      btnMap.onclick = () => {
        if (this.onActionCallback) this.onActionCallback('TOGGLE_MAP');
        this.triggerHaptic(15);
      };
    }

    const btnToggleCtrls = document.getElementById('m-btn-toggle-ctrls');
    if (btnToggleCtrls) {
      btnToggleCtrls.onclick = () => {
        const overlay = document.getElementById('mobile-controls-overlay');
        if (overlay) {
          const isHidden = overlay.classList.toggle('minimized');
          btnToggleCtrls.textContent = isHidden ? '🎮' : '✖';
          btnToggleCtrls.title = isHidden ? 'เปิดปุ่มควบคุมมือถือ' : 'ย่อปุ่มควบคุม';
        }
        this.triggerHaptic(15);
      };
    }

    const btnChatToggle = document.getElementById('m-btn-chat-toggle');
    if (btnChatToggle) {
      btnChatToggle.onclick = () => {
        const chatWin = document.querySelector('.chat-window');
        chatWin?.classList.toggle('mobile-expanded');
        this.triggerHaptic(15);
      };
    }

    const btnMenuDrawer = document.getElementById('m-btn-menu-drawer');
    if (btnMenuDrawer) {
      btnMenuDrawer.onclick = () => {
        if (this.onActionCallback) this.onActionCallback('TOGGLE_MENU');
        this.triggerHaptic(15);
      };
    }
  }

  public setVisible(show: boolean) {
    const container = document.getElementById('mobile-controls-overlay');
    if (container) {
      container.style.display = show ? 'block' : 'none';
    }
  }
}
