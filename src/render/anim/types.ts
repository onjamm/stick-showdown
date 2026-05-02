export interface Vec2 {
  x: number;
  y: number;
}

// A pose is defined by *targets* and offsets (in U units, not pixels).
// It is sampled deterministically from clips (no randomness).
export interface Pose {
  hipOffset: Vec2;        // relative to default hip (U)
  torsoLean: number;      // radians
  shoulderOffset: Vec2;   // relative to torso top (U)
  headOffset: Vec2;       // relative to shoulder point (U)

  // Targets are in local fighter space.
  // Hands are relative to the shoulder anchor (U).
  rHandTarget: Vec2;
  lHandTarget: Vec2;

  // Feet are relative to the floor origin (U): y=0 is the sim floor.
  rFootTarget: Vec2;
  lFootTarget: Vec2;

  weaponGripOffset: Vec2; // small per-weapon tweak (U)
  weaponAngle: number;    // radians
  weaponReach: number;    // 0..1
}

export type PosePatch = Partial<Pose>;

export interface Keyframe {
  frame: number; // in clip frames
  pose: PosePatch;
}

export interface Clip {
  id: string;
  length: number;
  loop: boolean;
  keys: Keyframe[];
}

export interface TwoBoneSolution {
  joint: Vec2;
  end: Vec2;
}

