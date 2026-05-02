// WebSocket signaling client — SDP/ICE exchange only
import type { SignalMsg } from '../../shared/protocol';

export type SignalingCallbacks = {
  onRoomCreated(roomCode: string, playerId: string): void;
  onRoomJoined(roomCode: string, playerId: string): void;
  onPeerJoined(peerId: string): void;
  onOffer(sdp: RTCSessionDescriptionInit, peerId: string): void;
  onAnswer(sdp: RTCSessionDescriptionInit): void;
  onIceCandidate(candidate: RTCIceCandidateInit): void;
  onPeerLeft(): void;
  onError(msg: string): void;
};

export class SignalingClient {
  private ws: WebSocket | null = null;
  private cb: SignalingCallbacks;
  private playerId = '';

  constructor(cb: SignalingCallbacks) {
    this.cb = cb;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen  = () => resolve();
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));
      this.ws.onmessage = (e) => {
        try {
          const msg: SignalMsg = JSON.parse(e.data);
          this.handleMessage(msg);
        } catch { /* ignore malformed */ }
      };
    });
  }

  private handleMessage(msg: SignalMsg): void {
    switch (msg.type) {
      case 'room_created':
        this.playerId = msg.playerId!;
        this.cb.onRoomCreated(msg.roomCode!, msg.playerId!);
        break;
      case 'room_joined':
        this.playerId = msg.playerId!;
        this.cb.onRoomJoined(msg.roomCode!, msg.playerId!);
        break;
      case 'peer_joined':
        this.cb.onPeerJoined(msg.peerId!);
        break;
      case 'offer':
        this.cb.onOffer(msg.sdp!, msg.peerId!);
        break;
      case 'answer':
        this.cb.onAnswer(msg.sdp!);
        break;
      case 'ice':
        this.cb.onIceCandidate(msg.candidate!);
        break;
      case 'peer_left':
        this.cb.onPeerLeft();
        break;
      case 'error':
        this.cb.onError(msg.message ?? 'Unknown error');
        break;
    }
  }

  createRoom(): void { this.send({ type: 'create_room' }); }
  joinRoom(code: string): void { this.send({ type: 'join_room', roomCode: code }); }

  sendOffer(sdp: RTCSessionDescriptionInit, peerId: string): void {
    this.send({ type: 'offer', sdp, peerId });
  }
  sendAnswer(sdp: RTCSessionDescriptionInit): void {
    this.send({ type: 'answer', sdp });
  }
  sendIce(candidate: RTCIceCandidateInit): void {
    this.send({ type: 'ice', candidate });
  }

  private send(msg: SignalMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
