/**
 * AETHERGARD ONLINE — Hero Roster & Gacha System
 * Defines 14 Pixel-Art Heroes extracted from game gallery with unique roles,
 * elemental attributes, signature combat skills, Gacha rates, and party formation logic.
 */
export const HERO_ROSTER_DB = {
    sutmes: {
        id: 'sutmes',
        name: 'Sutmes',
        thaiName: 'ซุตเมส',
        title: 'จ้าวแห่งเงาโซ่ยมทูต (Abyssal Harvester)',
        rarity: 5,
        element: 'shadow',
        role: 'Assassin',
        baseHp: 1850,
        baseAtk: 240,
        baseDef: 85,
        aspd: 1.1,
        range: 3.5,
        signatureSkill: {
            id: 'abyssal_chains',
            name: 'Abyssal Chains',
            thaiName: 'โซ่ตรึงวิญญาณ',
            cooldownMs: 7000,
            multiplier: 3.2,
            effectKind: 'chains',
            description: 'ปล่อยโซ่เงาทมิฬรัดเป้าหมายและดูดพลังชีวิต 320% ดาเมจ'
        },
        spriteUrl: '/assets/heroes/sprite_sutmes.png',
        cardUrl: '/assets/heroes/card_sutmes.png',
        iconUrl: '/assets/heroes/icon_sutmes.png',
        colorTheme: '#7b2cbf',
        quote: 'ไม่มีผู้ใดหลบหนีจากเงื้อมมือโซ่แห่งขุมนรกได้...'
    },
    gloria: {
        id: 'gloria',
        name: 'Gloria',
        thaiName: 'กลอเรีย',
        title: 'เทพธิดาแห่งสายฝนและเหมันต์ (Frost Umbrella Mystic)',
        rarity: 5,
        element: 'water',
        role: 'Mage',
        baseHp: 1600,
        baseAtk: 265,
        baseDef: 75,
        aspd: 1.3,
        range: 6.5,
        signatureSkill: {
            id: 'glacial_downpour',
            name: 'Glacial Downpour',
            thaiName: 'สายฝนเหมันต์นิรันดร์',
            cooldownMs: 6500,
            multiplier: 3.5,
            effectKind: 'ice',
            description: 'กางร่มพายุหมุนเรียกฝนน้ำแข็งแช่แข็งศัตรูในรัศมีกว้าง 350% MATK'
        },
        spriteUrl: '/assets/heroes/sprite_gloria.png',
        cardUrl: '/assets/heroes/card_gloria.png',
        iconUrl: '/assets/heroes/icon_gloria.png',
        colorTheme: '#38bdf8',
        quote: 'ให้สายฝนแห่งความเย็นชะล้างความโสมมออกไป'
    },
    cerberus: {
        id: 'cerberus',
        name: 'Cerberus',
        thaiName: 'เซอร์เบอรัส',
        title: 'หมัดเขี้ยวพยัคฆ์สัตว์ป่า (Feral Beast Pugilist)',
        rarity: 5,
        element: 'earth',
        role: 'Berserker',
        baseHp: 2200,
        baseAtk: 230,
        baseDef: 110,
        aspd: 0.9,
        range: 2.2,
        signatureSkill: {
            id: 'beast_fang_rush',
            name: 'Beast Fang Rush',
            thaiName: 'กรงเล็บสังหาร 5 เขี้ยว',
            cooldownMs: 5000,
            multiplier: 3.0,
            effectKind: 'slash',
            description: 'ระดมหมัดกรงเล็บสัตว์ป่าอย่างบ้าคลั่ง 5 ฮิตรวม 300% ATK'
        },
        spriteUrl: '/assets/heroes/sprite_cerberus.png',
        cardUrl: '/assets/heroes/card_cerberus.png',
        iconUrl: '/assets/heroes/icon_cerberus.png',
        colorTheme: '#588157',
        quote: 'ฟันและเล็บของข้า คมกริบพร้อมฉีกกระชากทุกสิ่ง!'
    },
    caroline: {
        id: 'caroline',
        name: 'Caroline',
        thaiName: 'แคโรไลน์',
        title: 'กายกรรมลูกโป่งสุริยา (Festival Prismatic Jester)',
        rarity: 5,
        element: 'light',
        role: 'Support',
        baseHp: 1700,
        baseAtk: 160,
        baseDef: 95,
        aspd: 1.4,
        range: 5.0,
        signatureSkill: {
            id: 'festival_morale',
            name: 'Festival Morale Boost',
            thaiName: 'มนต์ลูกโป่งรื่นเริง',
            cooldownMs: 8000,
            multiplier: 1.5,
            effectKind: 'buff',
            description: 'ปล่อยลูกโป่งเวทมนตร์เพิ่มพลังโจมตีทั้งทีม +30% และเพิ่มความเร็วเดิน +40%'
        },
        spriteUrl: '/assets/heroes/sprite_caroline.png',
        cardUrl: '/assets/heroes/card_caroline.png',
        iconUrl: '/assets/heroes/icon_caroline.png',
        colorTheme: '#ffd166',
        quote: 'ปาร์ตี้เริ่มต้นขึ้นแล้ว มาสนุกด้วยกันเถอะ!'
    },
    krochid: {
        id: 'krochid',
        name: 'Krochid',
        thaiName: 'โครชิด',
        title: 'อัศวินโล่เหล็กกล้าไททัน (Titan Aegis Guardian)',
        rarity: 6,
        element: 'light',
        role: 'Knight',
        baseHp: 3200,
        baseAtk: 180,
        baseDef: 190,
        aspd: 1.2,
        range: 2.0,
        signatureSkill: {
            id: 'titan_aegis_barrier',
            name: 'Titan Aegis Fortress',
            thaiName: 'ปราการโล่ไททันศักดิ์สิทธิ์',
            cooldownMs: 10000,
            multiplier: 2.0,
            effectKind: 'barrier',
            description: 'กระแทกโล่คู่สร้างสนามพลังป้องกัน ลดดาเมจให้ทั้งทีม 40% นาน 6 วินาที'
        },
        spriteUrl: '/assets/heroes/sprite_krochid.png',
        cardUrl: '/assets/heroes/card_krochid.png',
        iconUrl: '/assets/heroes/icon_krochid.png',
        colorTheme: '#e0aaff',
        quote: 'ตราบใดที่ข้ายังยืนอยู่ จะไม่มีศัตรูหน้าไหนผ่านไปได้!'
    },
    lokia: {
        id: 'lokia',
        name: 'Lokia',
        thaiName: 'โลเกีย',
        title: 'ราชันย์มังกรเวหา (Dragonwing Halberdier)',
        rarity: 5,
        element: 'shadow',
        role: 'Knight',
        baseHp: 2450,
        baseAtk: 250,
        baseDef: 130,
        aspd: 1.1,
        range: 3.8,
        signatureSkill: {
            id: 'dragonic_skystrike',
            name: 'Dragonic Skystrike',
            thaiName: 'หอกมังกรดิ่งเวหา',
            cooldownMs: 6500,
            multiplier: 3.6,
            effectKind: 'meteor',
            description: 'สยายปีกมังกรทะยานขึ้นฟ้าแล้วพุ่งหอกลงมาบดขยี้พื้นดิน 360% AOE'
        },
        spriteUrl: '/assets/heroes/sprite_lokia.png',
        cardUrl: '/assets/heroes/card_lokia.png',
        iconUrl: '/assets/heroes/icon_lokia.png',
        colorTheme: '#ffb703',
        quote: 'ปีกแห่งมังกร จะพัดพาเพลิงแห่งการทำลายล้างมาเยือน'
    },
    lita: {
        id: 'lita',
        name: 'Lita',
        thaiName: 'ลิต้า',
        title: 'จอมเวทเอลฟ์ดาราจักร (Celestial Orb Sorceress)',
        rarity: 5,
        element: 'light',
        role: 'Mage',
        baseHp: 1550,
        baseAtk: 285,
        baseDef: 70,
        aspd: 1.25,
        range: 7.0,
        signatureSkill: {
            id: 'celestial_supernova',
            name: 'Celestial Supernova',
            thaiName: 'ดาราจักรซูเปอร์โนวา',
            cooldownMs: 7000,
            multiplier: 3.8,
            effectKind: 'meteor',
            description: 'ปล่อยลูกแก้วดวงดาวระเบิดคลื่นแสงดาราจักร 380% MATK'
        },
        spriteUrl: '/assets/heroes/sprite_lita.png',
        cardUrl: '/assets/heroes/card_lita.png',
        iconUrl: '/assets/heroes/icon_lita.png',
        colorTheme: '#f4a261',
        quote: 'แสงแห่งดวงดาว จักชี้นำทางสู่ชัยชนะ'
    },
    lakhia: {
        id: 'lakhia',
        name: 'Lakhia',
        thaiName: 'ลาเคีย',
        title: 'เพชฌฆาตเคียวโลหิต (Crimson Scythe Berserker)',
        rarity: 6,
        element: 'wind',
        role: 'Berserker',
        baseHp: 2400,
        baseAtk: 295,
        baseDef: 90,
        aspd: 1.0,
        range: 3.0,
        signatureSkill: {
            id: 'blood_harvest_cleave',
            name: 'Blood Harvest Cleave',
            thaiName: 'เคียวโลหิตฟาดฟัน',
            cooldownMs: 5500,
            multiplier: 4.2,
            effectKind: 'slash',
            description: 'ตวัดเคียวเพชฌฆาตยักษ์สร้างคลื่นโลหิตเฉือนศัตรู 420% ATK'
        },
        spriteUrl: '/assets/heroes/sprite_lakhia.png',
        cardUrl: '/assets/heroes/card_lakhia.png',
        iconUrl: '/assets/heroes/icon_lakhia.png',
        colorTheme: '#d90429',
        quote: 'คมเคียวของข้า หิวกระหายเลือดของพวกมัน!'
    },
    nicole_lu: {
        id: 'nicole_lu',
        name: 'Nicole Lu',
        thaiName: 'นิโคล ลู',
        title: 'สตรีทฮู้ดเดอร์เบสบอลหนาม (Street Slugger Rogue)',
        rarity: 4,
        element: 'shadow',
        role: 'Rogue',
        baseHp: 1900,
        baseAtk: 220,
        baseDef: 95,
        aspd: 1.0,
        range: 2.4,
        signatureSkill: {
            id: 'homerun_slugger',
            name: 'Home Run Slugger',
            thaiName: 'โฮมรันพิฆาต',
            cooldownMs: 5000,
            multiplier: 2.8,
            effectKind: 'slash',
            description: 'หวดไม้เบสบอลติดตะปูยักษ์ ซัดมอนสเตอร์กระเด็นและสตัน 2.5 วินาที'
        },
        spriteUrl: '/assets/heroes/sprite_nicole_lu.png',
        cardUrl: '/assets/heroes/card_nicole_lu.png',
        iconUrl: '/assets/heroes/icon_nicole_lu.png',
        colorTheme: '#2ec4b6',
        quote: 'ใครเข้ามาขวางทาง โดนหวดโฮมรันปลิวแน่!'
    },
    napishtim: {
        id: 'napishtim',
        name: 'Napishtim',
        thaiName: 'นาพิชทิม',
        title: 'กัปตันมนตราแห่งห้วงลึก (Void Corsair Admiral)',
        rarity: 5,
        element: 'water',
        role: 'Mage',
        baseHp: 1800,
        baseAtk: 260,
        baseDef: 85,
        aspd: 1.2,
        range: 6.0,
        signatureSkill: {
            id: 'tidal_vortex',
            name: 'Abyssal Tidal Vortex',
            thaiName: 'วังวนน้ำห้วงลึก',
            cooldownMs: 6500,
            multiplier: 3.3,
            effectKind: 'ice',
            description: 'เสกวังวนน้ำลึกดูดมอนสเตอร์ทุกตัวในรัศมีเข้ามากองรวมกัน 330% MATK'
        },
        spriteUrl: '/assets/heroes/sprite_napishtim.png',
        cardUrl: '/assets/heroes/card_napishtim.png',
        iconUrl: '/assets/heroes/icon_napishtim.png',
        colorTheme: '#3a86ff',
        quote: 'ท้องทะเลแห่งมิติอันไร้ก้นบึ้ง จงกลืนกินพวกมันซะ!'
    },
    lycoris: {
        id: 'lycoris',
        name: 'Lycoris',
        thaiName: 'ไลโคริส',
        title: 'นักฆ่าเคียวจันทราคู่ (Crimson Kama Shadowblade)',
        rarity: 5,
        element: 'light',
        role: 'Assassin',
        baseHp: 1750,
        baseAtk: 280,
        baseDef: 75,
        aspd: 0.8,
        range: 2.2,
        signatureSkill: {
            id: 'crimson_crescent',
            name: 'Crimson Crescent Flurry',
            thaiName: 'ระบำเคียวจันทราโลหิต',
            cooldownMs: 4500,
            multiplier: 3.5,
            effectKind: 'slash',
            description: 'พุ่งไขว้ฟันเคียวคู่รูปกากบาท คริติคอลแน่นอน 100% 350% ATK'
        },
        spriteUrl: '/assets/heroes/sprite_lycoris.png',
        cardUrl: '/assets/heroes/card_lycoris.png',
        iconUrl: '/assets/heroes/icon_lycoris.png',
        colorTheme: '#e63946',
        quote: 'รวดเร็วและเงียบงัน... ดั่งกลีบดอกไม้แดงที่ร่วงหล่น'
    },
    clara: {
        id: 'clara',
        name: 'Clara',
        thaiName: 'คลาร่า',
        title: 'แพทย์สนามเข็มฉีดยายักษ์ (Combat Medic Surgeon)',
        rarity: 5,
        element: 'wind',
        role: 'Support',
        baseHp: 1950,
        baseAtk: 170,
        baseDef: 105,
        aspd: 1.3,
        range: 4.5,
        signatureSkill: {
            id: 'miracle_adrenaline',
            name: 'Miracle Adrenaline Injection',
            thaiName: 'ฉีดอะดรีนาลีนปาฏิหาริย์',
            cooldownMs: 7500,
            multiplier: 2.0,
            effectKind: 'heal',
            description: 'พุ่งฉีดเซรุ่มฟื้นฟูเลือดทั้งทีม 40% HP ทันที และลบล้างสถานะผิดปกติทั้งหมด'
        },
        spriteUrl: '/assets/heroes/sprite_clara.png',
        cardUrl: '/assets/heroes/card_clara.png',
        iconUrl: '/assets/heroes/icon_clara.png',
        colorTheme: '#06d6a0',
        quote: 'อยู่นิ่งๆ นะคะ... คุณหมอกำลังจะฉีดยาให้แล้ว!'
    },
    flora: {
        id: 'flora',
        name: 'Flora',
        thaiName: 'ฟลอร่า',
        title: 'ราชินีแห่งบัลลังก์ศิลามนตรา (Archon Empress of Ruin)',
        rarity: 6,
        element: 'shadow',
        role: 'Boss',
        baseHp: 3500,
        baseAtk: 340,
        baseDef: 150,
        aspd: 1.2,
        range: 6.0,
        signatureSkill: {
            id: 'sword_of_ruin_apocalypse',
            name: 'Sword of Ruin Apocalypse',
            thaiName: 'ดาบแห่งการล่มสลายวันสิ้นโลก',
            cooldownMs: 8500,
            multiplier: 5.0,
            effectKind: 'meteor',
            description: 'สั่งการดาบยักษ์ประจำบัลลังก์ศิลาพุ่งลงมาปักกลางสนามรบ 500% ดาเมจมหาศาล'
        },
        spriteUrl: '/assets/heroes/sprite_flora.png',
        cardUrl: '/assets/heroes/card_flora.png',
        iconUrl: '/assets/heroes/icon_flora.png',
        colorTheme: '#7209b7',
        quote: 'จงคุกเข่าต่อหน้าบัลลังก์แห่งการล่มสลาย!'
    },
    erumia: {
        id: 'erumia',
        name: 'Erumia',
        thaiName: 'เอรูเมีย',
        title: 'มหาพุทธินักบวชคัมภีร์ศักดิ์สิทธิ์ (High Scripture Priestess)',
        rarity: 5,
        element: 'earth',
        role: 'Support',
        baseHp: 1900,
        baseAtk: 200,
        baseDef: 110,
        aspd: 1.3,
        range: 5.5,
        signatureSkill: {
            id: 'divine_scripture_halo',
            name: 'Divine Scripture Halo',
            thaiName: 'รัศมีคัมภีร์สวรรค์',
            cooldownMs: 8000,
            multiplier: 2.2,
            effectKind: 'heal',
            description: 'เปิดคัมภีร์ศักดิ์สิทธิ์สวดภาวนา ฮีลเลือดต่อเนื่อง 8% ทุก 1 วินาที เป็นเวลา 5 วินาที'
        },
        spriteUrl: '/assets/heroes/sprite_erumia.png',
        cardUrl: '/assets/heroes/card_erumia.png',
        iconUrl: '/assets/heroes/icon_erumia.png',
        colorTheme: '#48cae4',
        quote: 'ขออำนาจแห่งพระคัมภีร์ คุ้มครองพวกท่านทุกคน'
    }
};
export class HeroRosterManager {
    static instance;
    unlockedHeroIds = new Set();
    partySlots = ['player', null, null, null];
    summonCurrency = 1000; // Starting summon crystals / gems
    constructor() {
        this.loadState();
    }
    static getInstance() {
        if (!HeroRosterManager.instance) {
            HeroRosterManager.instance = new HeroRosterManager();
        }
        return HeroRosterManager.instance;
    }
    loadState() {
        try {
            const savedUnlocked = localStorage.getItem('aethergard_unlocked_heroes');
            if (savedUnlocked) {
                const arr = JSON.parse(savedUnlocked);
                this.unlockedHeroIds = new Set(arr);
            }
            else {
                // Starter unlocked heroes: Krochid (Guardian Tank) and Gloria (Ice Mage)
                this.unlockedHeroIds = new Set(['krochid', 'gloria', 'clara']);
                this.saveState();
            }
            const savedParty = localStorage.getItem('aethergard_hero_party');
            if (savedParty) {
                this.partySlots = JSON.parse(savedParty);
            }
            else {
                // Default party
                this.partySlots = ['player', 'krochid', 'gloria', 'clara'];
                this.saveState();
            }
            const savedCur = localStorage.getItem('aethergard_summon_currency');
            if (savedCur) {
                this.summonCurrency = parseInt(savedCur, 10);
            }
        }
        catch (e) {
            this.unlockedHeroIds = new Set(['krochid', 'gloria', 'clara']);
            this.partySlots = ['player', 'krochid', 'gloria', 'clara'];
        }
    }
    saveState() {
        try {
            localStorage.setItem('aethergard_unlocked_heroes', JSON.stringify(Array.from(this.unlockedHeroIds)));
            localStorage.setItem('aethergard_hero_party', JSON.stringify(this.partySlots));
            localStorage.setItem('aethergard_summon_currency', this.summonCurrency.toString());
        }
        catch (e) { }
    }
    getCurrency() {
        return this.summonCurrency;
    }
    addCurrency(amount) {
        this.summonCurrency += amount;
        this.saveState();
    }
    getUnlockedHeroes() {
        return Array.from(this.unlockedHeroIds)
            .map(id => HERO_ROSTER_DB[id])
            .filter(Boolean);
    }
    isUnlocked(id) {
        return this.unlockedHeroIds.has(id);
    }
    getParty() {
        return [...this.partySlots];
    }
    getPartyHeroes() {
        return this.partySlots.map(id => (id && id !== 'player' ? HERO_ROSTER_DB[id] || null : null));
    }
    setPartySlot(slotIndex, heroId) {
        if (slotIndex >= 1 && slotIndex <= 3) {
            // If hero is already in another slot, remove it from that slot
            if (heroId) {
                for (let i = 1; i <= 3; i++) {
                    if (this.partySlots[i] === heroId) {
                        this.partySlots[i] = null;
                    }
                }
            }
            this.partySlots[slotIndex] = heroId;
            this.saveState();
        }
    }
    /**
     * Summon 1 or 10 heroes with gacha rates
     */
    summon(is10x = false) {
        const cost = is10x ? 900 : 100;
        if (this.summonCurrency < cost) {
            return { results: [], success: false, error: `เพชรอัญเชิญไม่พอ! ต้องการ ${cost} Gems (มี ${this.summonCurrency} Gems)` };
        }
        this.summonCurrency -= cost;
        const count = is10x ? 10 : 1;
        const results = [];
        const allHeroIds = Object.keys(HERO_ROSTER_DB);
        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            let targetRarity = 3;
            if (is10x && i === count - 1) {
                // Guaranteed 5★+ on 10th summon
                targetRarity = rand < 25 ? 6 : 5;
            }
            else {
                if (rand < 5)
                    targetRarity = 6; // 5% UR (Flora, Krochid, Lakhia)
                else if (rand < 30)
                    targetRarity = 5; // 25% SSR
                else if (rand < 70)
                    targetRarity = 4; // 40% SR
                else
                    targetRarity = 3; // 30% R
            }
            // Filter heroes by rarity, or fallback to all
            let candidates = allHeroIds.filter(id => HERO_ROSTER_DB[id].rarity === targetRarity);
            if (candidates.length === 0) {
                candidates = allHeroIds;
            }
            const pickedId = candidates[Math.floor(Math.random() * candidates.length)];
            const hero = HERO_ROSTER_DB[pickedId];
            const isNew = !this.unlockedHeroIds.has(pickedId);
            this.unlockedHeroIds.add(pickedId);
            results.push({ hero, isNew });
        }
        this.saveState();
        return { results, success: true };
    }
    /**
     * Calculate party formation synergy
     */
    getPartySynergy() {
        const heroes = this.getPartyHeroes().filter((h) => h !== null);
        let bonusAtk = 0;
        let bonusDef = 0;
        let bonusRegen = 0;
        const notes = [];
        // Role synergy
        const hasHealer = heroes.some(h => h.role === 'Support');
        const hasTank = heroes.some(h => h.role === 'Knight');
        const hasBoss = heroes.some(h => h.role === 'Boss');
        if (hasHealer) {
            bonusRegen += 15;
            notes.push('💚 มีหมอ/นักบวชในทีม: ฟื้นฟู HP +15 ทุกวินาที');
        }
        if (hasTank) {
            bonusDef += 20;
            notes.push('🛡️ มีอัศวินโล่เหล็ก: พลังป้องกันทั้งทีม +20%');
        }
        if (hasBoss) {
            bonusAtk += 25;
            notes.push('👑 มีราชินีบัลลังก์ศิลา: พลังโจมตีทีม +25%');
        }
        // Element count
        const shadowCount = heroes.filter(h => h.element === 'shadow').length;
        const lightCount = heroes.filter(h => h.element === 'light').length;
        if (shadowCount >= 2) {
            bonusAtk += 15;
            notes.push('🌑 พลังคู่เงา: อัตราคริติคอล +15%');
        }
        if (lightCount >= 2) {
            bonusDef += 15;
            notes.push('✨ พลังคู่แสง: เลือดสูงสุด +15%');
        }
        return {
            title: notes.length > 0 ? `Synergy: ${heroes.length + 1} ตัวละครพร้อมรบ` : 'จัดทีมอย่างน้อย 1 คนเพื่อรับบัฟ',
            desc: notes.join('<br>') || 'จัดทีมเพื่อเสริมพลังความสามารถ',
            bonusAtkPct: bonusAtk,
            bonusDefPct: bonusDef,
            bonusHpRegen: bonusRegen
        };
    }
}
