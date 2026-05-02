// Stick Showdown — WebSocket signaling server
// Handles room creation, peer discovery, SDP/ICE relay ONLY.
// Has zero knowledge of match state or game inputs.

const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3001;

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map(); // roomCode → { host: ws, guest: ws | null }

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? makeCode() : code;
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws) => {
  ws._room = null;

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const code = makeCode();
        ws._room = code;
        ws._isHost = true;
        rooms.set(code, { host: ws, guest: null });
        send(ws, { type: 'room_created', roomCode: code, playerId: ws._id = Math.random().toString(36).slice(2) });
        console.log(`Room ${code} created`);
        break;
      }

      case 'join_room': {
        const code = msg.roomCode?.toUpperCase();
        const room = rooms.get(code);
        if (!room) { send(ws, { type: 'error', message: 'Room not found' }); return; }
        if (room.guest) { send(ws, { type: 'error', message: 'Room is full' }); return; }

        room.guest = ws;
        ws._room   = code;
        ws._isHost = false;
        ws._id     = Math.random().toString(36).slice(2);

        send(ws, { type: 'room_joined', roomCode: code, playerId: ws._id });
        // Notify host that a peer has joined
        send(room.host, { type: 'peer_joined', peerId: ws._id });
        console.log(`Room ${code} — guest joined`);
        break;
      }

      // Relay SDP/ICE between peers — server does not inspect content
      case 'offer':
      case 'answer':
      case 'ice': {
        const room = rooms.get(ws._room);
        if (!room) return;
        const peer = ws._isHost ? room.guest : room.host;
        if (peer) send(peer, { ...msg, peerId: ws._id });
        break;
      }
    }
  });

  ws.on('close', () => {
    const code = ws._room;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    const peer = ws._isHost ? room.guest : room.host;
    if (peer) send(peer, { type: 'peer_left' });
    rooms.delete(code);
    console.log(`Room ${code} closed`);
  });
});

console.log(`Signaling server listening on ws://localhost:${PORT}`);
