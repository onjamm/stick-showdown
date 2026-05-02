// Room/session lifecycle — peer connection setup using signaling + transport
import { SignalingClient } from './signaling';
import { Transport } from './transport';
import type { InputMsg } from '../../shared/protocol';
import type { Weapon } from '../sim/types';

export type SessionState =
  | 'idle'
  | 'connecting_signal'
  | 'in_lobby'
  | 'connecting_peer'
  | 'in_match'
  | 'disconnected';

export interface SessionCallbacks {
  onStateChange(state: SessionState): void;
  onMatchReady(localPlayerIdx: 0 | 1, p1Weapon: Weapon, p2Weapon: Weapon): void;
  onRemoteInput(msg: InputMsg): void;
  onDisconnect(): void;
  onError(msg: string): void;
}

export class Session {
  private signaling:   SignalingClient;
  private transport:   Transport;
  private state:       SessionState = 'idle';
  private cb:          SessionCallbacks;
  private localIdx:    0 | 1 = 0;
  private roomCode     = '';
  private isHost       = false;
  private p1Weapon:    Weapon = 'sword';
  private p2Weapon:    Weapon = 'sword';

  constructor(cb: SessionCallbacks) {
    this.cb = cb;

    this.transport = new Transport({
      onInput:        (msg) => this.cb.onRemoteInput(msg),
      onConnected:    () => this.onPeerConnected(),
      onDisconnected: () => this.onPeerDisconnected(),
    });

    this.signaling = new SignalingClient({
      onRoomCreated:  (code, id)   => this.handleRoomCreated(code, id),
      onRoomJoined:   (code, id)   => this.handleRoomJoined(code, id),
      onPeerJoined:   (peerId)     => this.handlePeerJoined(peerId),
      onOffer:        (sdp, peer)  => this.handleOffer(sdp, peer),
      onAnswer:       (sdp)        => this.handleAnswer(sdp),
      onIceCandidate: (c)          => this.handleIce(c),
      onPeerLeft:     ()           => this.onPeerDisconnected(),
      onError:        (msg)        => this.cb.onError(msg),
    });
  }

  private setState(s: SessionState): void {
    this.state = s;
    this.cb.onStateChange(s);
  }

  async createRoom(signalingUrl: string, weapon: Weapon): Promise<void> {
    this.p1Weapon = weapon;
    this.isHost = true;
    this.setState('connecting_signal');
    await this.signaling.connect(signalingUrl);
    this.signaling.createRoom();
  }

  async joinRoom(signalingUrl: string, code: string, weapon: Weapon): Promise<void> {
    this.p2Weapon = weapon;
    this.isHost = false;
    this.roomCode = code.toUpperCase();
    this.setState('connecting_signal');
    await this.signaling.connect(signalingUrl);
    this.signaling.joinRoom(this.roomCode);
  }

  sendInput(msg: InputMsg): void {
    this.transport.send(msg);
  }

  get currentState(): SessionState { return this.state; }
  get localPlayerIndex(): 0 | 1    { return this.localIdx; }
  get code(): string                { return this.roomCode; }

  // ── Signaling handlers ────────────────────────────────────────────────────

  private handleRoomCreated(code: string, _id: string): void {
    this.roomCode = code;
    this.localIdx = 0;
    this.setState('in_lobby');
  }

  private handleRoomJoined(code: string, _id: string): void {
    this.roomCode = code;
    this.localIdx = 1;
    this.setState('in_lobby');
  }

  private async handlePeerJoined(peerId: string): Promise<void> {
    // Host initiates WebRTC offer
    if (!this.isHost) return;
    this.setState('connecting_peer');
    const pc = this.transport.createPeerConnection();
    this.transport.createChannel();

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signaling.sendIce(e.candidate.toJSON());
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signaling.sendOffer(offer, peerId);
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit, _peerId: string): Promise<void> {
    this.setState('connecting_peer');
    const pc = this.transport.createPeerConnection();
    this.transport.onRemoteChannel();

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signaling.sendIce(e.candidate.toJSON());
    };

    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.signaling.sendAnswer(answer);
  }

  private async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = (this.transport as any).pc as RTCPeerConnection;
    await pc?.setRemoteDescription(sdp);
  }

  private async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
    const pc = (this.transport as any).pc as RTCPeerConnection;
    try { await pc?.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ok */ }
  }

  private onPeerConnected(): void {
    this.setState('in_match');
    this.cb.onMatchReady(this.localIdx, this.p1Weapon, this.p2Weapon);
  }

  private onPeerDisconnected(): void {
    this.setState('disconnected');
    this.cb.onDisconnect();
    this.signaling.disconnect();
    this.transport.close();
  }

  destroy(): void {
    this.signaling.disconnect();
    this.transport.close();
  }
}
