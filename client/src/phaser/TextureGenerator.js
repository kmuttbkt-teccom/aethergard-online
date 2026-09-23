export class TextureGenerator {
    static generateAll(scene) {
        if (scene.textures.exists('poring'))
            return;
        // 1. Poring Texture (48x44)
        const poringCanvas = scene.textures.createCanvas('poring', 48, 44);
        if (poringCanvas) {
            const ctx = poringCanvas.getContext();
            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.ellipse(24, 24, 20, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = '#ffccd5';
            ctx.beginPath();
            ctx.ellipse(16, 14, 7, 4, -0.4, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#1c0f13';
            ctx.beginPath();
            ctx.ellipse(18, 22, 2.5, 3.5, 0, 0, Math.PI * 2);
            ctx.ellipse(30, 22, 2.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye Glint
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(17, 20, 1.2, 0, Math.PI * 2);
            ctx.arc(29, 20, 1.2, 0, Math.PI * 2);
            ctx.fill();
            // Mouth
            ctx.strokeStyle = '#800f2f';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(24, 26, 3, 0.2, Math.PI - 0.2);
            ctx.stroke();
            poringCanvas.refresh();
        }
        // 2. Fabre Texture (48x32)
        const fabreCanvas = scene.textures.createCanvas('fabre', 48, 32);
        if (fabreCanvas) {
            const ctx = fabreCanvas.getContext();
            const colors = ['#70e000', '#38b000', '#007200'];
            for (let i = 2; i >= 0; i--) {
                ctx.fillStyle = colors[i];
                ctx.beginPath();
                ctx.ellipse(14 + i * 11, 20, 7, 7, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(12, 18, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#9ef01a';
            ctx.beginPath();
            ctx.ellipse(24, 10, 6, 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            fabreCanvas.refresh();
        }
        // 3. Spore Texture (40x44)
        const sporeCanvas = scene.textures.createCanvas('spore', 40, 44);
        if (sporeCanvas) {
            const ctx = sporeCanvas.getContext();
            ctx.fillStyle = '#ede0d4';
            ctx.fillRect(15, 22, 10, 18);
            ctx.fillStyle = '#9c6644';
            ctx.beginPath();
            ctx.arc(20, 22, 18, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(12, 15, 3, 0, Math.PI * 2);
            ctx.arc(24, 13, 2.5, 0, Math.PI * 2);
            ctx.arc(29, 18, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(16, 26, 2, 4);
            ctx.fillRect(22, 26, 2, 4);
            sporeCanvas.refresh();
        }
        // 4. Baphomet Jr. Texture (64x64)
        const baphometCanvas = scene.textures.createCanvas('baphomet', 64, 64);
        if (baphometCanvas) {
            const ctx = baphometCanvas.getContext();
            ctx.fillStyle = '#240046';
            ctx.beginPath();
            ctx.ellipse(32, 38, 14, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            ctx.fillStyle = '#370617';
            ctx.beginPath();
            ctx.moveTo(38, 30);
            ctx.lineTo(60, 16);
            ctx.lineTo(52, 40);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(26, 30);
            ctx.lineTo(4, 16);
            ctx.lineTo(12, 40);
            ctx.closePath();
            ctx.fill();
            // Horns
            ctx.fillStyle = '#ffb703';
            ctx.beginPath();
            ctx.moveTo(26, 24);
            ctx.quadraticCurveTo(16, 8, 20, 6);
            ctx.quadraticCurveTo(24, 14, 28, 22);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(38, 24);
            ctx.quadraticCurveTo(48, 8, 44, 6);
            ctx.quadraticCurveTo(40, 14, 36, 22);
            ctx.fill();
            // Glowing Eyes
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.arc(28, 34, 2.5, 0, Math.PI * 2);
            ctx.arc(36, 34, 2.5, 0, Math.PI * 2);
            ctx.fill();
            baphometCanvas.refresh();
        }
        // 5. Slash Arc Effect (64x64)
        const slashCanvas = scene.textures.createCanvas('slash_fx', 64, 64);
        if (slashCanvas) {
            const ctx = slashCanvas.getContext();
            const grad = ctx.createRadialGradient(32, 32, 10, 32, 32, 30);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.6, 'rgba(100, 200, 255, 0.8)');
            grad.addColorStop(1, 'rgba(0, 100, 255, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(32, 32, 24, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();
            slashCanvas.refresh();
        }
        // 6. Sunbun (48x48) - Solar Bunny Slime
        const sunbunCanvas = scene.textures.createCanvas('sunbun', 48, 48);
        if (sunbunCanvas) {
            const ctx = sunbunCanvas.getContext();
            // Bunny Ears
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.ellipse(16, 12, 5, 12, -0.2, 0, Math.PI * 2);
            ctx.ellipse(32, 12, 5, 12, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Inner Ears (Pink)
            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.ellipse(16, 12, 2.5, 7, -0.2, 0, Math.PI * 2);
            ctx.ellipse(32, 12, 2.5, 7, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Main Round Body
            ctx.fillStyle = '#ffb703';
            ctx.beginPath();
            ctx.ellipse(24, 30, 20, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            // Solar Glow Highlights
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath();
            ctx.ellipse(18, 22, 6, 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Rosy Cheeks
            ctx.fillStyle = '#ff99c8';
            ctx.beginPath();
            ctx.ellipse(12, 33, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.ellipse(36, 33, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Anime Eyes
            ctx.fillStyle = '#281b16';
            ctx.beginPath();
            ctx.ellipse(18, 29, 2.5, 3.5, 0, 0, Math.PI * 2);
            ctx.ellipse(30, 29, 2.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye Glints
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(17, 27, 1.3, 0, Math.PI * 2);
            ctx.arc(29, 27, 1.3, 0, Math.PI * 2);
            ctx.fill();
            // Smiling mouth
            ctx.strokeStyle = '#d48b00';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(24, 33, 2.5, 0.2, Math.PI - 0.2);
            ctx.stroke();
            sunbunCanvas.refresh();
        }
        // 7. Leafkin (48x44) - Forest Emerald Sprite
        const leafkinCanvas = scene.textures.createCanvas('leafkin', 48, 44);
        if (leafkinCanvas) {
            const ctx = leafkinCanvas.getContext();
            // Leaf Wings
            ctx.fillStyle = 'rgba(112, 224, 0, 0.85)';
            ctx.beginPath();
            ctx.ellipse(10, 18, 9, 5, -0.6, 0, Math.PI * 2);
            ctx.ellipse(38, 18, 9, 5, 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Head sprout / leaf hat
            ctx.fillStyle = '#38b000';
            ctx.beginPath();
            ctx.moveTo(24, 14);
            ctx.quadraticCurveTo(18, 4, 22, 2);
            ctx.quadraticCurveTo(28, 8, 24, 14);
            ctx.fill();
            // Fairy Body
            ctx.fillStyle = '#9ef01a';
            ctx.beginPath();
            ctx.ellipse(24, 26, 12, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            // Sparkles
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(14, 12, 1.5, 0, Math.PI * 2);
            ctx.arc(34, 12, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Big Sparkly Eyes
            ctx.fillStyle = '#004b23';
            ctx.beginPath();
            ctx.ellipse(20, 24, 2.5, 3.5, 0, 0, Math.PI * 2);
            ctx.ellipse(28, 24, 2.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(19, 23, 1, 0, Math.PI * 2);
            ctx.arc(27, 23, 1, 0, Math.PI * 2);
            ctx.fill();
            leafkinCanvas.refresh();
        }
        // 8. Aethercap (44x48) - Bioluminescent Indigo Mushroom
        const aethercapCanvas = scene.textures.createCanvas('aethercap', 44, 48);
        if (aethercapCanvas) {
            const ctx = aethercapCanvas.getContext();
            // Glowing Stem
            ctx.fillStyle = '#7209b7';
            ctx.fillRect(16, 24, 12, 20);
            // Mushroom Cap (Glowing Indigo Gradient)
            const capGrad = ctx.createLinearGradient(0, 4, 0, 26);
            capGrad.addColorStop(0, '#4cc9f0');
            capGrad.addColorStop(0.6, '#4361ee');
            capGrad.addColorStop(1, '#3a0ca3');
            ctx.fillStyle = capGrad;
            ctx.beginPath();
            ctx.arc(22, 25, 20, Math.PI, 0);
            ctx.fill();
            // Glowing Spores Spots
            ctx.fillStyle = '#4cc9f0';
            ctx.beginPath();
            ctx.arc(14, 16, 3, 0, Math.PI * 2);
            ctx.arc(26, 13, 2.5, 0, Math.PI * 2);
            ctx.arc(32, 18, 2, 0, Math.PI * 2);
            ctx.fill();
            // Glowing Eyes
            ctx.fillStyle = '#f72585';
            ctx.beginPath();
            ctx.arc(18, 30, 2, 0, Math.PI * 2);
            ctx.arc(26, 30, 2, 0, Math.PI * 2);
            ctx.fill();
            aethercapCanvas.refresh();
        }
        // 9. Gryphlet (52x48) - Golden Feathered Baby Gryphon
        const gryphletCanvas = scene.textures.createCanvas('gryphlet', 52, 48);
        if (gryphletCanvas) {
            const ctx = gryphletCanvas.getContext();
            // Lion Body
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.ellipse(26, 32, 16, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            // Feathered Wings
            ctx.fillStyle = '#f4a261';
            ctx.beginPath();
            ctx.moveTo(26, 24);
            ctx.lineTo(12, 10);
            ctx.lineTo(18, 28);
            ctx.closePath();
            ctx.fill();
            // Head & Eagle Crest
            ctx.fillStyle = '#e9c46a';
            ctx.beginPath();
            ctx.arc(36, 20, 10, 0, Math.PI * 2);
            ctx.fill();
            // Golden Beak
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.moveTo(44, 20);
            ctx.lineTo(52, 23);
            ctx.lineTo(43, 26);
            ctx.closePath();
            ctx.fill();
            // Sharp Eye
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.arc(38, 17, 2, 0, Math.PI * 2);
            ctx.fill();
            gryphletCanvas.refresh();
        }
        // 10. Solarion, The Eclipse Lord [MVP BOSS] (96x96)
        const solarionCanvas = scene.textures.createCanvas('solarion', 96, 96);
        if (solarionCanvas) {
            const ctx = solarionCanvas.getContext();
            // Fiery Solar Wings (Left & Right)
            const wingGrad = ctx.createLinearGradient(0, 0, 96, 96);
            wingGrad.addColorStop(0, '#f72585');
            wingGrad.addColorStop(0.5, '#7209b7');
            wingGrad.addColorStop(1, '#ffd166');
            ctx.fillStyle = wingGrad;
            // Left Wing
            ctx.beginPath();
            ctx.moveTo(38, 48);
            ctx.lineTo(6, 16);
            ctx.lineTo(2, 44);
            ctx.lineTo(16, 68);
            ctx.lineTo(34, 58);
            ctx.closePath();
            ctx.fill();
            // Right Wing
            ctx.beginPath();
            ctx.moveTo(58, 48);
            ctx.lineTo(90, 16);
            ctx.lineTo(94, 44);
            ctx.lineTo(80, 68);
            ctx.lineTo(62, 58);
            ctx.closePath();
            ctx.fill();
            // Dark Obsidian Armor Body
            ctx.fillStyle = '#10002b';
            ctx.beginPath();
            ctx.ellipse(48, 54, 18, 24, 0, 0, Math.PI * 2);
            ctx.fill();
            // Horned Crown
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.moveTo(36, 32);
            ctx.lineTo(28, 8);
            ctx.lineTo(40, 24);
            ctx.lineTo(48, 12);
            ctx.lineTo(56, 24);
            ctx.lineTo(68, 8);
            ctx.lineTo(60, 32);
            ctx.closePath();
            ctx.fill();
            // Eclipse Core (Chest)
            ctx.fillStyle = '#ff0054';
            ctx.beginPath();
            ctx.arc(48, 52, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(48, 52, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Glowing Eyes
            ctx.fillStyle = '#ff0054';
            ctx.beginPath();
            ctx.arc(43, 36, 2.5, 0, Math.PI * 2);
            ctx.arc(53, 36, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Giant Eclipse Scythe
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(76, 20);
            ctx.lineTo(76, 88);
            ctx.stroke();
            ctx.fillStyle = '#f72585';
            ctx.beginPath();
            ctx.arc(76, 28, 18, -Math.PI * 0.5, Math.PI * 0.2);
            ctx.lineTo(76, 28);
            ctx.closePath();
            ctx.fill();
            solarionCanvas.refresh();
        }
        // 11. Radiant Slash Wave FX (96x64)
        const radCanvas = scene.textures.createCanvas('radiant_slash_fx', 96, 64);
        if (radCanvas) {
            const ctx = radCanvas.getContext();
            const grad = ctx.createRadialGradient(48, 32, 10, 48, 32, 45);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#ffe600');
            grad.addColorStop(0.7, '#ff7700');
            grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(48, 32, 38, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.lineTo(48, 32);
            ctx.closePath();
            ctx.fill();
            radCanvas.refresh();
        }
        // 12. Astral Meteor FX (64x64)
        const meteorCanvas = scene.textures.createCanvas('meteor_fx', 64, 64);
        if (meteorCanvas) {
            const ctx = meteorCanvas.getContext();
            const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, '#b5179e');
            grad.addColorStop(0.8, '#4361ee');
            grad.addColorStop(1, 'rgba(67, 97, 238, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(32, 32, 28, 0, Math.PI * 2);
            ctx.fill();
            meteorCanvas.refresh();
        }
        // 13. GM Golden Crown (36x24)
        const gmCrownCanvas = scene.textures.createCanvas('gm_crown', 36, 24);
        if (gmCrownCanvas) {
            const ctx = gmCrownCanvas.getContext();
            const goldGrad = ctx.createLinearGradient(0, 0, 0, 24);
            goldGrad.addColorStop(0, '#fff3b0');
            goldGrad.addColorStop(0.4, '#ffd700');
            goldGrad.addColorStop(1, '#b8860b');
            ctx.fillStyle = goldGrad;
            ctx.beginPath();
            ctx.moveTo(4, 8);
            ctx.lineTo(10, 14);
            ctx.lineTo(18, 3);
            ctx.lineTo(26, 14);
            ctx.lineTo(32, 8);
            ctx.lineTo(30, 21);
            ctx.lineTo(6, 21);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#7c5800';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // Jewels
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.arc(18, 14, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.fillStyle = '#00b4d8';
            ctx.beginPath();
            ctx.arc(10, 16, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#00b4d8';
            ctx.beginPath();
            ctx.arc(26, 16, 2, 0, Math.PI * 2);
            ctx.fill();
            // Gleam highlight
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(17, 13, 1, 0, Math.PI * 2);
            ctx.fill();
            gmCrownCanvas.refresh();
        }
        // === ZONE 2 EXTRAS ===
        // ForestBoar (48x36)
        TextureGenerator.makeSimpleMonster(scene, 'ForestBoar', 48, 36, (ctx) => {
            ctx.fillStyle = '#5c4033';
            ctx.fillEllipse(24, 20, 40, 28);
            ctx.fillStyle = '#3e2723';
            ctx.fillEllipse(24, 16, 22, 16); // head
            ctx.fillStyle = '#f5f5f5'; // tusks
            ctx.beginPath();
            ctx.moveTo(14, 22);
            ctx.lineTo(8, 30);
            ctx.lineTo(12, 22);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(34, 22);
            ctx.lineTo(40, 30);
            ctx.lineTo(36, 22);
            ctx.fill();
            ctx.fillStyle = '#e53935';
            ctx.fillEllipse(18, 16, 4, 4); // eye
            ctx.fillStyle = '#000';
            ctx.fillEllipse(18, 16, 2, 2);
        });
        // WildWolf (52x40)
        TextureGenerator.makeSimpleMonster(scene, 'WildWolf', 52, 40, (ctx) => {
            ctx.fillStyle = '#78909c';
            ctx.fillEllipse(26, 24, 42, 30); // body
            ctx.fillStyle = '#607d8b';
            ctx.fillEllipse(26, 16, 20, 18); // head
            ctx.fillStyle = '#78909c'; // ears
            ctx.fillTriangle(16, 12, 12, 4, 20, 8);
            ctx.fillTriangle(36, 12, 32, 4, 40, 8);
            ctx.fillStyle = '#e53935';
            ctx.fillEllipse(20, 17, 4, 4);
            ctx.fillStyle = '#000';
            ctx.fillEllipse(20, 17, 2, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(22, 22, 8, 4); // teeth
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(22, 22, 8, 4);
        });
        // === ZONE 3 ===
        // DesertScorpion (56x40)
        TextureGenerator.makeSimpleMonster(scene, 'DesertScorpion', 56, 40, (ctx) => {
            ctx.fillStyle = '#d4a017';
            ctx.fillEllipse(28, 26, 42, 26); // body
            ctx.fillStyle = '#c9a45c'; // claws
            ctx.fillEllipse(8, 26, 14, 10);
            ctx.fillEllipse(48, 26, 14, 10);
            ctx.fillStyle = '#f77f00'; // tail segments
            for (let i = 0; i < 4; i++) {
                ctx.fillEllipse(28 + i * 6 - 6, 10 - i * 4, 8, 8);
            }
            ctx.fillStyle = '#e53935';
            ctx.fillEllipse(18, 18, 5, 5); // eyes
            ctx.fillStyle = '#000';
            ctx.fillEllipse(18, 18, 2.5, 2.5);
        });
        // SandGolem (52x60)
        TextureGenerator.makeSimpleMonster(scene, 'SandGolem', 52, 60, (ctx) => {
            ctx.fillStyle = '#c9a45c';
            ctx.fillEllipse(26, 38, 44, 40); // body
            ctx.fillStyle = '#d4a017';
            ctx.fillEllipse(26, 18, 32, 28); // head
            ctx.fillStyle = '#795548'; // cracks
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(14, 25);
            ctx.lineTo(22, 35);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(30, 20);
            ctx.lineTo(38, 30);
            ctx.stroke();
            ctx.fillStyle = '#ff7043';
            ctx.fillEllipse(20, 18, 7, 7); // eyes glow
            ctx.fillStyle = '#ff3d00';
            ctx.fillEllipse(32, 18, 7, 7);
            ctx.fillStyle = '#000';
            ctx.fillEllipse(20, 18, 3, 3);
            ctx.fillEllipse(32, 18, 3, 3);
        });
        // MummyPharaoh (44x60)
        TextureGenerator.makeSimpleMonster(scene, 'MummyPharaoh', 44, 60, (ctx) => {
            ctx.fillStyle = '#ede0c8';
            ctx.fillEllipse(22, 36, 36, 48); // wrapped body
            ctx.fillStyle = '#d4b896'; // bandage lines
            for (let y = 18; y < 58; y += 7) {
                ctx.fillRect(6, y, 32, 3);
            }
            ctx.fillStyle = '#b5632a';
            ctx.fillEllipse(22, 16, 26, 22); // head
            ctx.fillStyle = '#ffd700'; // pharaoh headdress
            ctx.fillRect(8, 6, 28, 8);
            ctx.fillStyle = '#00e5ff';
            ctx.fillEllipse(17, 18, 6, 6);
            ctx.fillEllipse(27, 18, 6, 6); // glowing eyes
            ctx.fillStyle = '#000';
            ctx.fillEllipse(17, 18, 3, 3);
            ctx.fillEllipse(27, 18, 3, 3);
        });
        // === ZONE 4 ===
        // SkeletonSoldier (44x60)
        TextureGenerator.makeSimpleMonster(scene, 'SkeletonSoldier', 44, 60, (ctx) => {
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(22, 18);
            ctx.lineTo(22, 42);
            ctx.stroke(); // spine
            ctx.beginPath();
            ctx.moveTo(10, 26);
            ctx.lineTo(34, 26);
            ctx.stroke(); // shoulders
            ctx.beginPath();
            ctx.moveTo(10, 26);
            ctx.lineTo(6, 44);
            ctx.stroke(); // left arm
            ctx.beginPath();
            ctx.moveTo(34, 26);
            ctx.lineTo(38, 44);
            ctx.stroke(); // right arm
            ctx.beginPath();
            ctx.moveTo(22, 42);
            ctx.lineTo(14, 58);
            ctx.stroke(); // left leg
            ctx.beginPath();
            ctx.moveTo(22, 42);
            ctx.lineTo(30, 58);
            ctx.stroke(); // right leg
            ctx.fillStyle = '#e0e0e0';
            ctx.fillEllipse(22, 14, 18, 20); // skull
            ctx.fillStyle = '#ff1744';
            ctx.fillEllipse(17, 13, 5, 5);
            ctx.fillEllipse(27, 13, 5, 5); // red eyes
            ctx.fillStyle = '#000';
            ctx.fillEllipse(17, 13, 2.5, 2.5);
            ctx.fillEllipse(27, 13, 2.5, 2.5);
            ctx.fillStyle = '#90a4ae'; // sword
            ctx.fillRect(36, 18, 4, 28);
            ctx.fillRect(30, 26, 16, 4);
        });
        // WraithPhantom (44x56)
        TextureGenerator.makeSimpleMonster(scene, 'WraithPhantom', 44, 56, (ctx) => {
            const grad = ctx.createRadialGradient(22, 28, 4, 22, 28, 22);
            grad.addColorStop(0, 'rgba(180,100,255,0.9)');
            grad.addColorStop(1, 'rgba(60,0,120,0)');
            ctx.fillStyle = grad;
            ctx.fillEllipse(22, 28, 42, 48);
            ctx.fillStyle = 'rgba(220,180,255,0.85)';
            ctx.fillEllipse(22, 18, 24, 22); // face
            ctx.fillStyle = '#ff1744';
            ctx.fillEllipse(16, 17, 6, 7);
            ctx.fillEllipse(28, 17, 6, 7); // evil eyes
            ctx.fillStyle = '#fff';
            ctx.fillEllipse(15, 16, 2.5, 3);
            ctx.fillEllipse(27, 16, 2.5, 3);
            // Wispy trails
            ctx.strokeStyle = 'rgba(180,100,255,0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(10, 38);
            ctx.quadraticCurveTo(8, 52, 14, 56);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(34, 38);
            ctx.quadraticCurveTo(36, 52, 30, 56);
            ctx.stroke();
        });
        // DarkGargoyle (56x52)
        TextureGenerator.makeSimpleMonster(scene, 'DarkGargoyle', 56, 52, (ctx) => {
            ctx.fillStyle = '#37474f';
            ctx.fillEllipse(28, 34, 44, 36); // stone body
            ctx.fillStyle = '#263238';
            ctx.fillEllipse(28, 18, 26, 24); // head
            ctx.fillStyle = '#37474f'; // wings
            ctx.beginPath();
            ctx.moveTo(28, 24);
            ctx.lineTo(4, 14);
            ctx.lineTo(8, 36);
            ctx.lineTo(28, 30);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(28, 24);
            ctx.lineTo(52, 14);
            ctx.lineTo(48, 36);
            ctx.lineTo(28, 30);
            ctx.fill();
            ctx.fillStyle = '#ff1744';
            ctx.fillEllipse(22, 17, 6, 6);
            ctx.fillEllipse(34, 17, 6, 6); // red eyes
            ctx.fillStyle = '#fff';
            ctx.fillEllipse(21, 16, 2.5, 2.5);
            ctx.fillEllipse(33, 16, 2.5, 2.5);
            // horns
            ctx.fillStyle = '#455a64';
            ctx.fillTriangle(20, 10, 16, 2, 24, 8);
            ctx.fillTriangle(36, 10, 32, 2, 40, 8);
        });
        // === ZONE 5 ===
        // FireSalamander (52x44)
        TextureGenerator.makeSimpleMonster(scene, 'FireSalamander', 52, 44, (ctx) => {
            ctx.fillStyle = '#e53935';
            ctx.fillEllipse(26, 28, 46, 34); // body
            ctx.fillStyle = '#ff7043'; // flame pattern
            for (let i = 0; i < 5; i++) {
                ctx.fillEllipse(10 + i * 8, 22, 8, 12);
            }
            ctx.fillStyle = '#d32f2f';
            ctx.fillEllipse(26, 16, 22, 18); // head
            ctx.fillStyle = '#ffeb3b';
            ctx.fillEllipse(20, 14, 6, 6);
            ctx.fillEllipse(32, 14, 6, 6); // eyes
            ctx.fillStyle = '#ff6f00';
            ctx.fillEllipse(20, 14, 3, 3);
            ctx.fillEllipse(32, 14, 3, 3);
            ctx.strokeStyle = '#ff7043';
            ctx.lineWidth = 4; // tail
            ctx.beginPath();
            ctx.moveTo(46, 30);
            ctx.quadraticCurveTo(58, 24, 52, 14);
            ctx.stroke();
        });
        // LavaGolem (56x60)
        TextureGenerator.makeSimpleMonster(scene, 'LavaGolem', 56, 60, (ctx) => {
            ctx.fillStyle = '#212121';
            ctx.fillEllipse(28, 38, 50, 44); // dark stone body
            ctx.fillStyle = '#bf360c';
            ctx.fillEllipse(28, 20, 34, 30); // head
            // Lava cracks
            ctx.strokeStyle = '#ff6d00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(14, 32);
            ctx.lineTo(20, 44);
            ctx.lineTo(28, 38);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(42, 30);
            ctx.lineTo(36, 44);
            ctx.stroke();
            ctx.fillStyle = '#ff6d00';
            ctx.fillEllipse(21, 20, 8, 8);
            ctx.fillEllipse(35, 20, 8, 8); // fire eyes
            ctx.fillStyle = '#fff176';
            ctx.fillEllipse(21, 20, 4, 4);
            ctx.fillEllipse(35, 20, 4, 4);
            ctx.fillStyle = '#ff6d00'; // lava fist
            ctx.fillEllipse(8, 36, 14, 14);
            ctx.fillEllipse(48, 36, 14, 14);
        });
        // NightmareSteed (64x52)
        TextureGenerator.makeSimpleMonster(scene, 'NightmareSteed', 64, 52, (ctx) => {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillEllipse(32, 34, 58, 36); // body
            ctx.fillStyle = '#16213e';
            ctx.fillEllipse(20, 18, 22, 26); // head/neck
            ctx.fillStyle = '#0f3460'; // mane
            ctx.fillTriangle(14, 10, 6, 0, 22, 4);
            ctx.fillTriangle(20, 8, 12, -2, 26, 2);
            ctx.fillStyle = '#e040fb';
            ctx.fillEllipse(16, 16, 7, 7);
            ctx.fillEllipse(26, 16, 7, 7); // purple eyes
            ctx.fillStyle = '#fff';
            ctx.fillEllipse(15, 15, 3, 3);
            ctx.fillEllipse(25, 15, 3, 3);
            // Fire hooves
            ctx.fillStyle = '#ff6d00';
            ctx.fillEllipse(12, 50, 10, 8);
            ctx.fillEllipse(28, 50, 10, 8);
            ctx.fillEllipse(40, 50, 10, 8);
            ctx.fillEllipse(56, 50, 10, 8);
        });
        // === ZONE 6 ===
        // Archangel (52x64)
        TextureGenerator.makeSimpleMonster(scene, 'Archangel', 52, 64, (ctx) => {
            ctx.fillStyle = '#fff9c4';
            ctx.fillEllipse(26, 38, 40, 46); // golden robe body
            ctx.fillStyle = '#ffe082';
            ctx.fillEllipse(26, 18, 22, 24); // head
            // halo
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(26, 8, 12, 0, Math.PI * 2);
            ctx.stroke();
            // wings
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.moveTo(26, 22);
            ctx.lineTo(2, 6);
            ctx.lineTo(4, 36);
            ctx.lineTo(26, 32);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(26, 22);
            ctx.lineTo(50, 6);
            ctx.lineTo(48, 36);
            ctx.lineTo(26, 32);
            ctx.fill();
            ctx.fillStyle = '#64b5f6';
            ctx.fillEllipse(21, 18, 6, 6);
            ctx.fillEllipse(31, 18, 6, 6); // blue eyes
            ctx.fillStyle = '#fff';
            ctx.fillEllipse(20, 17, 2.5, 2.5);
            ctx.fillEllipse(30, 17, 2.5, 2.5);
            // Holy sword
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(24, 36, 4, 28);
            ctx.fillRect(16, 44, 20, 4);
        });
        // LordBaphomet (68x72)
        TextureGenerator.makeSimpleMonster(scene, 'LordBaphomet', 68, 72, (ctx) => {
            ctx.fillStyle = '#1a0030';
            ctx.fillEllipse(34, 46, 56, 52); // dark body
            ctx.fillStyle = '#2d0050';
            ctx.fillEllipse(34, 22, 30, 30); // head
            // massive curved horns
            ctx.strokeStyle = '#4a0080';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(22, 12);
            ctx.quadraticCurveTo(4, -2, 8, 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(46, 12);
            ctx.quadraticCurveTo(64, -2, 60, 14);
            ctx.stroke();
            // bat wings
            ctx.fillStyle = '#1a0030';
            ctx.beginPath();
            ctx.moveTo(34, 28);
            ctx.lineTo(2, 16);
            ctx.lineTo(6, 50);
            ctx.lineTo(34, 44);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(34, 28);
            ctx.lineTo(66, 16);
            ctx.lineTo(62, 50);
            ctx.lineTo(34, 44);
            ctx.fill();
            ctx.fillStyle = '#ff1744';
            ctx.fillEllipse(27, 22, 8, 9);
            ctx.fillEllipse(41, 22, 8, 9); // red eyes
            ctx.fillStyle = '#fff';
            ctx.fillEllipse(26, 21, 3, 3.5);
            ctx.fillEllipse(40, 21, 3, 3.5);
            // pentagram on chest
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(34, 36);
            ctx.lineTo(38, 44);
            ctx.lineTo(28, 38);
            ctx.lineTo(40, 38);
            ctx.lineTo(30, 44);
            ctx.closePath();
            ctx.stroke();
            // scythe
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(60, 20, 5, 48); // handle
            ctx.fillStyle = '#b0bec5'; // blade
            ctx.beginPath();
            ctx.moveTo(65, 20);
            ctx.quadraticCurveTo(80, 28, 62, 38);
            ctx.lineTo(65, 38);
            ctx.closePath();
            ctx.fill();
        });
        // Valkyrie (56x64)
        TextureGenerator.makeSimpleMonster(scene, 'Valkyrie', 56, 64, (ctx) => {
            ctx.fillStyle = '#e3f2fd';
            ctx.fillEllipse(28, 42, 44, 46); // silver armor body
            ctx.fillStyle = '#90caf9';
            ctx.fillEllipse(28, 20, 24, 28); // head
            // winged helm
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(16, 10, 24, 12);
            ctx.fillStyle = '#b0bec5';
            ctx.fillTriangle(16, 10, 6, 2, 14, 14);
            ctx.fillTriangle(40, 10, 50, 2, 42, 14);
            // gold trim
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(16, 10, 24, 12);
            ctx.fillStyle = '#1565c0';
            ctx.fillEllipse(22, 20, 6, 6);
            ctx.fillEllipse(34, 20, 6, 6); // blue eyes
            ctx.fillStyle = '#fff';
            ctx.fillEllipse(21, 19, 2.5, 2.5);
            ctx.fillEllipse(33, 19, 2.5, 2.5);
            // divine wings
            ctx.fillStyle = 'rgba(255,253,231,0.85)';
            ctx.beginPath();
            ctx.moveTo(28, 26);
            ctx.lineTo(2, 12);
            ctx.lineTo(4, 42);
            ctx.lineTo(28, 38);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(28, 26);
            ctx.lineTo(54, 12);
            ctx.lineTo(52, 42);
            ctx.lineTo(28, 38);
            ctx.fill();
            // spear
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(50, 16, 4, 44); // shaft
            ctx.fillStyle = '#ffd700';
            ctx.fillTriangle(52, 14, 46, 26, 58, 26); // tip
        });
    }
    /** Helper: create a canvas texture using a drawing function */
    static makeSimpleMonster(scene, key, w, h, draw) {
        if (scene.textures.exists(key))
            return;
        const canvas = scene.textures.createCanvas(key, w, h);
        if (!canvas)
            return;
        const ctx = canvas.getContext();
        // Polyfills for convenience
        ctx.fillEllipse = (x, y, ew, eh) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(ew / 2, eh / 2);
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.restore();
            ctx.fill();
        };
        ctx.fillTriangle = (x1, y1, x2, y2, x3, y3) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
            ctx.fill();
        };
        draw(ctx);
        canvas.refresh();
    }
}
