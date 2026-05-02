// WebRTC DataChannel transport — TURN-ready ICE config
import type { InputMsg } from '../../shared/protocol';

// ICE server config is a plain array — add TURN credentials here when available
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN entry (disabled for MVP — wire credentials here to enable):
  // { urls: 'turn:your.turn.server:3478', username: '...', credential: '...' },
];

export type TransportCallbacks = {
  onInput(msg: InputMsg): void;
  onConnected(): void;
  onDisconnected(): void;
};

export class Transport {
  private pc:      RTCPeerConnection | null   = null;
  private channel: RTCDataChannel   | null   = null;
  private cb:      TransportCallbacks;
  private connected = false;

  constructor(cb: TransportCallbacks) {
    this.cb = cb;
  }

  createPeerConnection(): RTCPeerConnection {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'connected')   { this.connected = true;  this.cb.onConnected(); }
      if (this.pc?.connectionState === 'disconnected' ||
          this.pc?.connectionState === 'failed')       { this.connected = false; this.cb.onDisconnected(); }
    };
    return this.pc;
  }

  /** Caller creates the data channel */
  createChannel(): void {
    if (!this.pc) throw new Error('No peer connection');
    // unreliable, ordered=false → UDP semantics; rollback handles late/lost packets
    this.channel = this.pc.createDataChannel('inputs', {
      ordered:         false,
      maxRetransmits:  0,
    });
    this.setupChannel(this.channel);
  }

  /** Callee waits for the data channel */
  onRemoteChannel(): void {
    if (!this.pc) throw new Error('No peer connection');
    this.pc.ondatachannel = (e) => {
      this.channel = e.channel;
      this.setupChannel(this.channel);
    };
  }

  private setupChannel(ch: RTCDataChannel): void {
    ch.binaryType = 'arraybuffer';
    ch.onopen    = () => { /* connection state handles this */ };
    ch.onmessage = (e) => {
      const msg = deserializeInput(e.data as ArrayBuffer);
      if (msg) this.cb.onInput(msg);
    };
    ch.onclose = () => { this.connected = false; this.cb.onDisconnected(); };
  }

  send(msg: InputMsg): void {
    if (!this.channel || this.channel.readyState !== 'open') return;
    this.channel.send(serializeInput(msg));
  }

  get isConnected(): boolean { return this.connected; }

  close(): void {
    this.channel?.close();
    this.pc?.close();
    this.pc      = null;
    this.channel = null;
    this.connected = false;
  }
}

// Wire format: 9 bytes — frame(4) + input(1) + checksum(2) + padding(2)
function serializeInput(msg: InputMsg): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, msg.frame, true);
  view.setUint8(4, msg.input);
  view.setUint16(5, msg.checksum, true);
  return buf;
}

function deserializeInput(buf: ArrayBuffer): InputMsg | null {
  if (buf.byteLength < 8) return null;
  const view = new DataView(buf);
  return {
    frame:    view.getUint32(0, true),
    input:    view.getUint8(4),
    checksum: view.getUint16(5, true),
  };
}
