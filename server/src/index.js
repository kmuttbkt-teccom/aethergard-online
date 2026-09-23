import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GameRoom } from './Room.js';
import { db, publicAccount } from './db.js';
import * as fs from 'fs';
import * as path from 'path';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const distDir = path.resolve(process.cwd(), 'dist');
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.glb': 'model/gltf-binary',
    '.webmanifest': 'application/manifest+json'
};
const MAX_BODY_BYTES = 16 * 1024;
/**
 * WebSocket abuse limits: messages per rolling second, and hard payload cap.
 * The 2D client sends an INPUT packet every frame, so this must stay above
 * high-refresh displays (240 Hz) — a real flood is thousands per second.
 */
const MAX_MSGS_PER_SEC = 300;
const MAX_WS_PAYLOAD = 16 * 1024;
const ALLOW_MOCK_OAUTH = process.env.ALLOW_MOCK_OAUTH === '1';
function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        let tooLarge = false;
        req.on('data', chunk => {
            if (tooLarge)
                return;
            body += chunk;
            if (body.length > MAX_BODY_BYTES) {
                tooLarge = true;
                body = '';
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                resolve(parsed && typeof parsed === 'object' ? parsed : {});
            }
            catch {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}
function authResponse(result) {
    return { success: true, token: result.token, account: publicAccount(result.account), guestSecret: result.guestSecret };
}
function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}
function getAuthAccount(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return null;
    const token = authHeader.substring(7);
    return db.verifyToken(token);
}
const server = createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    // --- REST APIs ---
    if (pathname === '/api/auth/guest' && req.method === 'POST') {
        const body = await readBody(req);
        const result = db.loginGuest(typeof body.guestId === 'string' ? body.guestId : undefined, typeof body.guestSecret === 'string' ? body.guestSecret : undefined);
        return sendJson(res, 200, authResponse(result));
    }
    if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await readBody(req);
        const result = db.registerLocal(String(body.username || ''), String(body.password || ''), body.displayName ? String(body.displayName) : undefined);
        if (result.error) {
            return sendJson(res, 400, { error: result.error });
        }
        return sendJson(res, 200, authResponse(result));
    }
    if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readBody(req);
        const result = db.loginLocal(String(body.username || ''), String(body.password || ''));
        if (result.error) {
            return sendJson(res, 401, { error: result.error });
        }
        return sendJson(res, 200, authResponse(result));
    }
    if (pathname === '/api/auth/oauth' && req.method === 'POST') {
        // The social login is a local mock that trusts the browser's profile id,
        // so it is only available when explicitly enabled for development.
        if (!ALLOW_MOCK_OAUTH) {
            return sendJson(res, 501, { error: 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google/Facebook บนเซิร์ฟเวอร์นี้' });
        }
        const body = await readBody(req);
        if ((body.provider !== 'google' && body.provider !== 'facebook') || !body.profile || typeof body.profile.id !== 'string') {
            return sendJson(res, 400, { error: 'Invalid OAuth payload' });
        }
        const result = db.loginOAuth(body.provider, {
            id: String(body.profile.id).slice(0, 64),
            name: String(body.profile.name || '').slice(0, 20),
            email: String(body.profile.email || '').slice(0, 80)
        });
        return sendJson(res, 200, authResponse(result));
    }
    if (pathname === '/api/characters' && req.method === 'GET') {
        const account = getAuthAccount(req);
        if (!account) {
            return sendJson(res, 401, { error: 'Unauthorized' });
        }
        const characters = db.getCharactersByAccount(account.id);
        return sendJson(res, 200, { characters, account: publicAccount(account) });
    }
    if (pathname === '/api/characters' && req.method === 'POST') {
        const account = getAuthAccount(req);
        if (!account) {
            return sendJson(res, 401, { error: 'Unauthorized' });
        }
        const body = await readBody(req);
        const hairColor = typeof body.hairColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.hairColor) ? body.hairColor : '#9a031e';
        const hairStyle = Number.isInteger(body.hairStyle) && body.hairStyle >= 0 && body.hairStyle <= 9 ? body.hairStyle : 0;
        const result = db.createCharacter(account.id, Number(body.slot ?? 0), String(body.name || ''), body.gender === 'female' ? 'female' : 'male', hairStyle, hairColor);
        if (result.error) {
            return sendJson(res, 400, { error: result.error });
        }
        return sendJson(res, 200, { success: true, character: result.character });
    }
    if (pathname.startsWith('/api/characters/') && req.method === 'DELETE') {
        const account = getAuthAccount(req);
        if (!account) {
            return sendJson(res, 401, { error: 'Unauthorized' });
        }
        const charId = pathname.replace('/api/characters/', '');
        const success = db.deleteCharacter(account.id, charId);
        return sendJson(res, 200, { success });
    }
    // --- Static Files Serving ---
    const filePath = path.resolve(distDir, '.' + (pathname === '/' ? '/index.html' : pathname));
    const insideDist = filePath === distDir || filePath.startsWith(distDir + path.sep);
    if (insideDist && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
    }
    sendJson(res, 200, {
        status: 'online',
        game: 'Aethergard Online (Maple x Ragnarok MMORPG)',
        clients: room.clients.size,
        time: new Date().toISOString()
    });
});
const wss = new WebSocketServer({ server, maxPayload: MAX_WS_PAYLOAD });
const room = new GameRoom();
wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const characterId = url.searchParams.get('characterId');
    if (!token || !characterId) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Missing token or characterId' }));
        ws.close();
        return;
    }
    const account = db.verifyToken(token);
    if (!account) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid or expired token' }));
        ws.close();
        return;
    }
    const character = db.getCharacterById(characterId);
    if (!character || character.accountId !== account.id) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Character not found or unauthorized' }));
        ws.close();
        return;
    }
    // One live session per character: a second login kicks the first, which is
    // saved before the new session loads (prevents duplicating items via two saves)
    room.kickCharacter(character.id);
    console.log(`[+] Character logged in: ${character.name} (Account: ${account.displayName})`);
    const player = room.addClient(ws, character);
    let windowStart = Date.now();
    let windowCount = 0;
    let strikes = 0;
    ws.on('message', (raw) => {
        const now = Date.now();
        if (now - windowStart >= 1000) {
            windowStart = now;
            windowCount = 0;
        }
        if (++windowCount > MAX_MSGS_PER_SEC) {
            // Drop the flood; disconnect clients that keep doing it
            if (windowCount === MAX_MSGS_PER_SEC + 1 && ++strikes >= 5) {
                console.warn(`[!] Disconnecting ${player.name}: message flood`);
                ws.close(1008, 'rate limit');
            }
            return;
        }
        try {
            const data = JSON.parse(raw.toString());
            if (data && typeof data === 'object' && typeof data.type === 'string') {
                room.handleMessage(ws, data);
            }
        }
        catch (err) {
            console.error('Error handling message:', err);
        }
    });
    ws.on('close', () => {
        console.log(`[-] Character disconnected: ${player.name}`);
        room.removeClient(ws);
    });
    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});
server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`⚔️  Aethergard Online Server (Authoritative MMORPG)`);
    console.log(`🌐 Play in Browser: http://localhost:${PORT}`);
    console.log(`🎮 WebSocket Gateway: ws://localhost:${PORT}`);
    console.log(`=================================================`);
});
