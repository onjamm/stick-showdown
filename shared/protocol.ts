// Wire message types — shared between client and server

export type MsgType =
  | 'create_room'
  | 'join_room'
  | 'room_created'
  | 'room_joined'
  | 'peer_joined'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'peer_left'
  | 'error';

export interface SignalMsg {
  type: MsgType;
  roomCode?: string;
  playerId?: string;
  peerId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
}

// Input bitmask layout
export const INPUT_LEFT       = 0b00000001;
export const INPUT_RIGHT      = 0b00000010;
export const INPUT_LIGHT_ATK  = 0b00000100;
export const INPUT_HEAVY_ATK  = 0b00001000;
export const INPUT_BLOCK       = 0b00010000;

export interface InputMsg {
  frame:    number;  // uint32 simulation frame
  input:    number;  // uint8 bitmask
  checksum: number;  // uint16 FNV-32 of GameState (piggybacked every 60 frames, else 0)
}
