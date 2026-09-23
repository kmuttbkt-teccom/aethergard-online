import { escapeHtml } from './escape.js';
export class AuthUI {
    callbacks;
    token = null;
    account = null;
    characters = [];
    selectedCharacter = null;
    selectedSlotForCreate = 0;
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.token = localStorage.getItem('midgard_token');
        this.setupListeners();
        this.checkAutoLogin();
    }
    async checkAutoLogin() {
        if (this.token) {
            try {
                const res = await fetch('/api/characters', {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.account = data.account;
                    this.characters = data.characters;
                    this.showCharSelectScreen();
                    return;
                }
            }
            catch (e) {
                console.error('Auto login check failed:', e);
            }
            this.token = null;
            localStorage.removeItem('midgard_token');
        }
        this.showLoginScreen();
    }
    showLoginScreen() {
        const boot = document.getElementById('screen-boot');
        if (boot && !boot.classList.contains('hidden')) {
            document.getElementById('screen-login')?.classList.add('hidden');
        }
        else {
            document.getElementById('screen-login')?.classList.remove('hidden');
        }
        document.getElementById('screen-char-select')?.classList.add('hidden');
        document.getElementById('ui-overlay')?.classList.add('hidden');
        document.getElementById('game-container')?.classList.add('hidden');
    }
    showCharSelectScreen() {
        document.getElementById('screen-boot')?.classList.add('hidden');
        document.getElementById('screen-login')?.classList.add('hidden');
        document.getElementById('screen-char-select')?.classList.remove('hidden');
        document.getElementById('ui-overlay')?.classList.add('hidden');
        document.getElementById('game-container')?.classList.add('hidden');
        this.renderAccountInfo();
        this.renderCharacterSlots();
    }
    showGameScreen() {
        document.getElementById('screen-login')?.classList.add('hidden');
        document.getElementById('screen-char-select')?.classList.add('hidden');
        document.getElementById('ui-overlay')?.classList.remove('hidden');
        document.getElementById('game-container')?.classList.remove('hidden');
    }
    renderAccountInfo() {
        const accNameEl = document.getElementById('account-display-name');
        const accTypeEl = document.getElementById('account-type-badge');
        if (accNameEl && this.account) {
            accNameEl.textContent = this.account.displayName;
        }
        if (accTypeEl && this.account) {
            accTypeEl.textContent = this.account.provider.toUpperCase();
        }
    }
    renderCharacterSlots() {
        const container = document.getElementById('character-slots-container');
        if (!container)
            return;
        container.innerHTML = '';
        this.selectedCharacter = null;
        this.updateActionButtons();
        for (let slot = 0; slot < 4; slot++) {
            const char = this.characters.find(c => c.slot === slot);
            const slotEl = document.createElement('div');
            slotEl.className = `char-slot-card ${char ? 'occupied' : 'empty'}`;
            if (char) {
                slotEl.innerHTML = `
          <div class="slot-badge">ช่องที่ ${slot + 1}</div>
          <div class="char-preview-avatar">
            <div style="font-size: 38px;">${char.gender === 'female' ? '🧙‍♀️' : '⚔️'}</div>
          </div>
          <div class="char-slot-name">${escapeHtml(char.name)}</div>
          <div class="char-slot-job">[${char.job}]</div>
          <div class="char-slot-level">Base Lv.${char.baseLevel} / Job Lv.${char.jobLevel}</div>
          <div class="char-slot-stats">
            <span>STR ${char.stats.str}</span>
            <span>AGI ${char.stats.agi}</span>
            <span>VIT ${char.stats.vit}</span>
            <span>INT ${char.stats.int}</span>
            <span>DEX ${char.stats.dex}</span>
            <span>LUK ${char.stats.luk}</span>
          </div>
        `;
                slotEl.addEventListener('click', () => {
                    document.querySelectorAll('.char-slot-card').forEach(el => el.classList.remove('selected'));
                    slotEl.classList.add('selected');
                    this.selectedCharacter = char;
                    this.updateActionButtons();
                });
                // Auto select first occupied
                if (!this.selectedCharacter) {
                    slotEl.classList.add('selected');
                    this.selectedCharacter = char;
                }
            }
            else {
                slotEl.innerHTML = `
          <div class="slot-badge">ช่องที่ ${slot + 1}</div>
          <div class="empty-slot-plus">+</div>
          <div style="color: #94a3b8; font-size: 13px; font-weight: bold;">สร้างตัวละครใหม่</div>
        `;
                slotEl.addEventListener('click', () => {
                    this.selectedSlotForCreate = slot;
                    this.openCreateModal();
                });
            }
            container.appendChild(slotEl);
        }
        this.updateActionButtons();
    }
    updateActionButtons() {
        const playBtn = document.getElementById('btn-play-character');
        const delBtn = document.getElementById('btn-delete-character');
        if (playBtn) {
            playBtn.disabled = !this.selectedCharacter;
            playBtn.style.opacity = this.selectedCharacter ? '1' : '0.4';
        }
        if (delBtn) {
            delBtn.disabled = !this.selectedCharacter;
            delBtn.style.opacity = this.selectedCharacter ? '1' : '0.4';
        }
    }
    openCreateModal() {
        const modal = document.getElementById('modal-create-character');
        const nameInput = document.getElementById('new-char-name');
        if (modal)
            modal.classList.remove('hidden');
        if (nameInput) {
            nameInput.value = `Novice_${Math.floor(Math.random() * 899 + 100)}`;
            nameInput.focus();
        }
    }
    closeCreateModal() {
        document.getElementById('modal-create-character')?.classList.add('hidden');
    }
    setupListeners() {
        // 1. Guest Login
        document.getElementById('btn-login-guest')?.addEventListener('click', async () => {
            const guestId = localStorage.getItem('midgard_guest_id') || undefined;
            const guestSecret = localStorage.getItem('midgard_guest_secret') || undefined;
            const res = await fetch('/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId, guestSecret })
            });
            const data = await res.json();
            if (data.success) {
                this.token = data.token;
                this.account = data.account;
                localStorage.setItem('midgard_token', data.token);
                localStorage.setItem('midgard_guest_id', data.account.id);
                // The secret is only sent once, when the guest account is created or upgraded
                if (data.guestSecret)
                    localStorage.setItem('midgard_guest_secret', data.guestSecret);
                await this.loadCharacters();
                this.showCharSelectScreen();
            }
        });
        // 2. Tab switching between Login and Register
        document.getElementById('tab-to-login')?.addEventListener('click', () => {
            document.getElementById('form-login')?.classList.remove('hidden');
            document.getElementById('form-register')?.classList.add('hidden');
            document.getElementById('tab-to-login')?.classList.add('active');
            document.getElementById('tab-to-register')?.classList.remove('active');
        });
        document.getElementById('tab-to-register')?.addEventListener('click', () => {
            document.getElementById('form-login')?.classList.add('hidden');
            document.getElementById('form-register')?.classList.remove('hidden');
            document.getElementById('tab-to-register')?.classList.add('active');
            document.getElementById('tab-to-login')?.classList.remove('active');
        });
        // 3. Local Login
        document.getElementById('btn-submit-login')?.addEventListener('click', async () => {
            const user = document.getElementById('login-username')?.value.trim();
            const pass = document.getElementById('login-password')?.value;
            const errEl = document.getElementById('login-error-msg');
            if (!user || !pass) {
                if (errEl)
                    errEl.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
                return;
            }
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (data.success) {
                if (errEl)
                    errEl.textContent = '';
                this.token = data.token;
                this.account = data.account;
                localStorage.setItem('midgard_token', data.token);
                await this.loadCharacters();
                this.showCharSelectScreen();
            }
            else {
                if (errEl)
                    errEl.textContent = data.error || 'เข้าสู่ระบบล้มเหลว';
            }
        });
        // 4. Local Register
        document.getElementById('btn-submit-register')?.addEventListener('click', async () => {
            const user = document.getElementById('reg-username')?.value.trim();
            const pass = document.getElementById('reg-password')?.value;
            const name = document.getElementById('reg-display-name')?.value.trim();
            const errEl = document.getElementById('register-error-msg');
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass, displayName: name })
            });
            const data = await res.json();
            if (data.success) {
                if (errEl)
                    errEl.textContent = '';
                this.token = data.token;
                this.account = data.account;
                localStorage.setItem('midgard_token', data.token);
                await this.loadCharacters();
                this.showCharSelectScreen();
            }
            else {
                if (errEl)
                    errEl.textContent = data.error || 'ลงทะเบียนล้มเหลว';
            }
        });
        // 5. Social Login (Google & Facebook)
        const handleSocialLogin = async (provider) => {
            const defaultName = provider === 'google' ? 'Google Adventurer' : 'Facebook Adventurer';
            const promptName = prompt(`จำลองเชื่อมต่อบัญชี ${provider.toUpperCase()}:\nกรุณากรอกชื่อบัญชีที่ต้องการ:`, defaultName);
            if (!promptName)
                return;
            const profile = {
                id: `mock_${provider}_${Math.floor(Math.random() * 89999 + 10000)}`,
                name: promptName,
                email: `${promptName.toLowerCase().replace(/\s+/g, '_')}@${provider}.com`
            };
            const res = await fetch('/api/auth/oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, profile })
            });
            const data = await res.json();
            if (data.success) {
                this.token = data.token;
                this.account = data.account;
                localStorage.setItem('midgard_token', data.token);
                await this.loadCharacters();
                this.showCharSelectScreen();
            }
            else if (data.error) {
                alert(data.error);
            }
        };
        document.getElementById('btn-social-google')?.addEventListener('click', () => handleSocialLogin('google'));
        document.getElementById('btn-social-facebook')?.addEventListener('click', () => handleSocialLogin('facebook'));
        // 6. Character Select Actions
        document.getElementById('btn-play-character')?.addEventListener('click', () => {
            if (this.token && this.selectedCharacter) {
                this.showGameScreen();
                this.callbacks.onStartGame(this.token, this.selectedCharacter);
            }
        });
        document.getElementById('btn-delete-character')?.addEventListener('click', async () => {
            if (!this.selectedCharacter || !this.token)
                return;
            if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบตัวละคร [${this.selectedCharacter.name}]? ข้อมูลจะไม่สามารถกู้คืนได้!`)) {
                return;
            }
            const res = await fetch(`/api/characters/${this.selectedCharacter.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                await this.loadCharacters();
                this.renderCharacterSlots();
            }
        });
        document.getElementById('btn-logout-account')?.addEventListener('click', () => {
            this.token = null;
            this.account = null;
            this.characters = [];
            this.selectedCharacter = null;
            localStorage.removeItem('midgard_token');
            this.showLoginScreen();
        });
        // 7. Modal Create Character Actions
        document.getElementById('btn-close-create-modal')?.addEventListener('click', () => this.closeCreateModal());
        document.getElementById('btn-confirm-create-char')?.addEventListener('click', async () => {
            const name = document.getElementById('new-char-name')?.value.trim();
            const gender = document.querySelector('input[name="char-gender"]:checked')?.value || 'male';
            const hairStyle = parseInt(document.getElementById('new-char-hairstyle')?.value || '0');
            const hairColor = document.getElementById('new-char-haircolor')?.value || '#9a031e';
            const errEl = document.getElementById('create-char-error');
            const res = await fetch('/api/characters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    slot: this.selectedSlotForCreate,
                    name,
                    gender,
                    hairStyle,
                    hairColor
                })
            });
            const data = await res.json();
            if (data.success) {
                if (errEl)
                    errEl.textContent = '';
                this.closeCreateModal();
                await this.loadCharacters();
                this.renderCharacterSlots();
            }
            else {
                if (errEl)
                    errEl.textContent = data.error || 'สร้างตัวละครล้มเหลว';
            }
        });
    }
    async loadCharacters() {
        if (!this.token)
            return;
        try {
            const res = await fetch('/api/characters', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.characters = data.characters || [];
                this.account = data.account || this.account;
            }
        }
        catch (e) {
            console.error('Error loading characters:', e);
        }
    }
}
