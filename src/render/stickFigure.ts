// Stick figure renderer (Flash-era style) — visual-only, rollback-safe.
// Uses keyed clips + deterministic pose sampling + analytic 2-bone IK.
import type { FighterState } from '../sim/types';
import type { Camera } from './camera';
import { worldToScreen, worldScaleToPixels } from './camera';
import { sampleFighterPose } from './anim/driver';
import { solveTwoBoneIK } from './anim/ik';
import type { Pose, TwoBoneSolution, Vec2 } from './anim/types';

const PLAYER_COLORS = ['#4ab4ff', '#ff8844']; // blue, orange
const INK = '#f7f9ff';                        // bright on dark background
const OUTLINE = '#000000';

type Pt = { x: number; y: number };

function add(a: Pt, b: Pt): Pt { return { x: a.x + b.x, y: a.y + b.y }; }
function sub(a: Pt, b: Pt): Pt { return { x: a.x - b.x, y: a.y - b.y }; }
function mul(a: Pt, s: number): Pt { return { x: a.x * s, y: a.y * s }; }

function rot(v: Pt, ang: number): Pt {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function toPt(v: Vec2, U: number): Pt { return { x: v.x * U, y: v.y * U }; }

function pickSolution(
  root: Pt,
  target: Pt,
  lenA: number,
  lenB: number,
  hint: 'knee' | 'elbow',
): TwoBoneSolution {
  const a = solveTwoBoneIK(root, target, lenA, lenB, 1);
  const b = solveTwoBoneIK(root, target, lenA, lenB, -1);

  // In our coordinate space: y increases downward (screen space).
  // Rule 1 (both): never put the joint above the root (air-elbows / backward knees).
  // Rule 2 (knee): bias the knee slightly forward (positive x in local-facing space).
  function score(sol: TwoBoneSolution): number {
    let s = 0;
    if (sol.joint.y < root.y) s += 1000 + (root.y - sol.joint.y) * 10;
    if (hint === 'knee') {
      if (sol.joint.x < root.x) s += 200 + (root.x - sol.joint.x) * 5;
    } else {
      // elbows look best slightly "down/back" for stick silhouettes
      if (sol.joint.x > root.x) s += 80 + (sol.joint.x - root.x) * 3;
    }
    // Prefer the solution that keeps the joint closer to the root->target line (avoids wild flares).
    const mid = { x: (root.x + target.x) * 0.5, y: (root.y + target.y) * 0.5 };
    const dx = sol.joint.x - mid.x;
    const dy = sol.joint.y - mid.y;
    s += (dx * dx + dy * dy) * 0.0001;
    return s;
  }

  return score(a) <= score(b) ? a : b;
}

function drawChain(ctx: CanvasRenderingContext2D, root: Pt, sol: TwoBoneSolution): void {
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.lineTo(sol.joint.x, sol.joint.y);
  ctx.lineTo(sol.end.x, sol.end.y);
  ctx.stroke();
}

function drawHead(ctx: CanvasRenderingContext2D, head: Pt, r: number, lw: number): void {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(2, lw * 0.9);
  ctx.stroke();
  ctx.restore();
}

function getWeaponLenPx(weapon: FighterState['weapon'], U: number, reach: number): number {
  if (weapon === 'sword') return U * 2.2 * reach;
  if (weapon === 'staff') return U * 2.8 * reach;
  return U * 1.7 * reach;
}

function poseWeaponOffhandGrip(
  pose: Pose,
  weapon: FighterState['weapon'],
  shoulder: Pt,
  torsoLean: number,
  U: number,
  dir: 1 | -1,
): { pose: Pose; offhandWorld: Pt | null } {
  if (weapon === 'sword') return { pose, offhandWorld: null };

  // Convert current right-hand target into a *world* hand target.
  const rHandWorld = add(shoulder, rot(toPt(pose.rHandTarget, U), torsoLean));

  const len = getWeaponLenPx(weapon, U, pose.weaponReach);
  const gripOffset = rot(toPt(pose.weaponGripOffset, U), torsoLean);
  // Because we mirror the whole fighter with ctx.scale(dir, 1),
  // rotation handedness flips too. Compensate so the off-hand grip
  // stays on the correct side of the weapon when facing left.
  const weaponAng = pose.weaponAngle * dir;

  // Offhand holds nearer the back of the weapon.
  const off = rot({ x: -len * 0.25, y: 0 }, weaponAng);
  const offWorld = add(add(rHandWorld, off), gripOffset);

  // Convert back into lHandTarget local (relative to shoulder, in U units).
  const local = rot(sub(offWorld, shoulder), -torsoLean);
  const lHandTarget: Vec2 = { x: local.x / U, y: local.y / U };

  return { pose: { ...pose, lHandTarget }, offhandWorld: offWorld };
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  alpha: number,
  prevF: FighterState,
  cam: Camera,
  playerIdx: number,
  cw: number,
  ch: number,
  globalFrame: number,
  crowd: number,
  isForeground = false,
): void {
  // Visual-only sub-frame interpolation — purely cosmetic, never stored.
  const vx = prevF.pos.x + (f.pos.x - prevF.pos.x) * alpha;
  const vy = prevF.pos.y + (f.pos.y - prevF.pos.y) * alpha;
  const [sx, sy] = worldToScreen(cam, vx, vy, cw, ch);

  // U: base unit — all proportions scale with camera zoom.
  const U = worldScaleToPixels(cam, 380);
  const dir = f.facing; // 1 = right, -1 = left
  const col = PLAYER_COLORS[playerIdx];
  const crowdClamped = Math.max(0, Math.min(1, crowd));

  // Anatomy lengths.
  const upperLegLen = U * 1.15;
  const lowerLegLen = U * 0.90;
  const upperArmLen = U * 1.02;
  const lowerArmLen = U * 0.86;
  const torsoLen = U * 1.45;
  const headR = U * 0.48;
  const neckLen = U * 0.25;
  const hipW = U * 0.18;
  const shoulderW = U * 0.22;

  // Sample pose from keyed clips (deterministic) + exaggeration metadata.
  const sampled = sampleFighterPose(prevF, f, alpha, globalFrame);
  let pose = sampled.pose;
  const ex = sampled.ex;

  // Local frame: origin at floor contact under fighter.
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(dir, 1);

  // Compute torso anchors (y up is negative in local space).
  const hipBase: Pt = { x: 0, y: -(upperLegLen + lowerLegLen) };
  const hip = add(hipBase, toPt(pose.hipOffset, U));
  const torsoTop = add(hip, rot({ x: 0, y: -torsoLen }, pose.torsoLean));
  const shoulderCenter = add(torsoTop, rot(toPt(pose.shoulderOffset, U), pose.torsoLean));
  const head = add(
    shoulderCenter,
    rot(add({ x: 0, y: -(neckLen + headR) }, toPt(pose.headOffset, U)), pose.torsoLean),
  );

  // Weapon-aware offhand placement (visual-only).
  const weaponAdjusted = poseWeaponOffhandGrip(pose, f.weapon, shoulderCenter, pose.torsoLean, U, dir);
  pose = weaponAdjusted.pose;

  const rShoulder = add(shoulderCenter, rot({ x: shoulderW, y: 0 }, pose.torsoLean));
  const lShoulder = add(shoulderCenter, rot({ x: -shoulderW, y: 0 }, pose.torsoLean));
  const rHip = add(hip, rot({ x: hipW, y: 0 }, pose.torsoLean));
  const lHip = add(hip, rot({ x: -hipW, y: 0 }, pose.torsoLean));

  // Targets.
  const rHand = add(rShoulder, rot(toPt(pose.rHandTarget, U), pose.torsoLean));
  const lHand = add(lShoulder, rot(toPt(pose.lHandTarget, U), pose.torsoLean));
  const rFoot = toPt(pose.rFootTarget, U);
  const lFoot = toPt(pose.lFootTarget, U);

  // Solve IK (choose the solution with joints biased forward for knees, backward for elbows).
  // Stretch/squash: tiny limb stretch on impacts (visual-only).
  const armUpper = upperArmLen * ex.armStretch;
  const armLower = lowerArmLen * ex.armStretch;

  const rLeg = pickSolution(rHip, rFoot, upperLegLen, lowerLegLen, 'knee');
  const lLeg = pickSolution(lHip, lFoot, upperLegLen, lowerLegLen, 'knee');
  const rArm = pickSolution(rShoulder, rHand, armUpper, armLower, 'elbow');
  const lArm = pickSolution(lShoulder, lHand, armUpper, armLower, 'elbow');

  // Line widths (silhouette separation in close-range).
  const baseLw = Math.max(1.4, U * 0.075);
  const fgBoost = isForeground && crowdClamped > 0.35 ? (1 + crowdClamped * 0.35) : 1;
  const lw = baseLw * fgBoost;

  // Shadow.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, -lw * 0.2, U * 0.55, U * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Electric Man body glow ───────────────────────────────────────────────────
  // Build the entire body as one Path2D so we can stroke it twice (outer spread +
  // bright core) with zero shadowBlur — shadowBlur is per-stroke and kills perf.
  const glowAlpha = (() => {
    if (f.fsm === 'lightAtk' || f.fsm === 'heavyAtk' || f.fsm === 'weaponSpecial') return 0.55;
    if (f.fsm === 'hitStun' || f.fsm === 'knockdown') return 0.12;
    if (f.fsm === 'block' || f.fsm === 'blockStun') return 0.16;
    return 0.28;
  })();
  const glowFade = glowAlpha * (1 - crowdClamped * 0.45);

  const gp = new Path2D();
  gp.moveTo(hip.x, hip.y); gp.lineTo(shoulderCenter.x, shoulderCenter.y);
  gp.moveTo(rHip.x, rHip.y); gp.lineTo(rLeg.joint.x, rLeg.joint.y); gp.lineTo(rLeg.end.x, rLeg.end.y);
  gp.moveTo(lHip.x, lHip.y); gp.lineTo(lLeg.joint.x, lLeg.joint.y); gp.lineTo(lLeg.end.x, lLeg.end.y);
  gp.moveTo(rShoulder.x, rShoulder.y); gp.lineTo(rArm.joint.x, rArm.joint.y); gp.lineTo(rArm.end.x, rArm.end.y);
  gp.moveTo(lShoulder.x, lShoulder.y); gp.lineTo(lArm.joint.x, lArm.joint.y); gp.lineTo(lArm.end.x, lArm.end.y);
  gp.arc(head.x, head.y, headR + lw * 0.8, 0, Math.PI * 2);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Outer spread — wide, faint
  ctx.lineWidth = lw * 7;
  ctx.globalAlpha = glowFade * 0.28;
  ctx.stroke(gp);
  // Core glow — narrower, brighter
  ctx.lineWidth = lw * 2.8;
  ctx.globalAlpha = glowFade * 0.72;
  ctx.stroke(gp);
  ctx.restore();

  // Draw outline pass then ink pass.
  const outlineW = lw + (crowdClamped > 0.35 ? 2.0 : 1.4);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outline
  ctx.save();
  ctx.strokeStyle = OUTLINE;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = outlineW;
  // Torso
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(shoulderCenter.x, shoulderCenter.y);
  ctx.stroke();
  drawChain(ctx, rHip, rLeg);
  drawChain(ctx, lHip, lLeg);
  drawChain(ctx, rShoulder, rArm);
  drawChain(ctx, lShoulder, lArm);
  drawHead(ctx, head, headR, outlineW);
  ctx.restore();

  // Ink
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(shoulderCenter.x, shoulderCenter.y);
  ctx.stroke();
  drawChain(ctx, rHip, rLeg);
  drawChain(ctx, lHip, lLeg);
  drawChain(ctx, rShoulder, rArm);
  drawChain(ctx, lShoulder, lArm);
  drawHead(ctx, head, headR, lw);

  // Weapon: anchored at right-hand end effector.
  if (f.fsm !== 'knockdown' && f.fsm !== 'dead' && f.fsm !== 'getup') {
    const attacking = f.fsm === 'lightAtk' || f.fsm === 'heavyAtk' || f.fsm === 'weaponSpecial';
    drawWeapon(ctx, f.weapon, pose.weaponAngle * dir, pose.weaponReach, rArm.end.x, rArm.end.y, U, attacking ? col : null);

    // For staff/nunchucks, hint the off-hand grip with a tiny touch mark (improves readability).
    if (f.weapon !== 'sword' && weaponAdjusted.offhandWorld) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath();
      ctx.moveTo(weaponAdjusted.offhandWorld.x - U * 0.06, weaponAdjusted.offhandWorld.y - U * 0.03);
      ctx.lineTo(weaponAdjusted.offhandWorld.x + U * 0.06, weaponAdjusted.offhandWorld.y + U * 0.03);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}


function drawWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: string,
  angle: number,
  reach: number,
  handX: number,
  handY: number,
  U: number,
  trailColor: string | null,
): void {
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);

  const lw = Math.max(1.2, U * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;

  if (weapon === 'sword') {
    const blade = U * 2.2 * reach;
    const grip = U * 0.55;

    if (trailColor) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = trailColor;
      ctx.shadowColor = trailColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = lw * 3.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(blade, 0); ctx.stroke();
      ctx.restore();
    }

    // Outline.
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 1.25;
    ctx.beginPath(); ctx.moveTo(-grip, 0); ctx.lineTo(blade, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -U * 0.22); ctx.lineTo(0, U * 0.22); ctx.stroke();

    // Inner sheen.
    ctx.strokeStyle = '#dbe7f7';
    ctx.lineWidth = lw * 0.65;
    ctx.beginPath(); ctx.moveTo(0, -lw * 0.1); ctx.lineTo(blade, -lw * 0.1); ctx.stroke();

    // Tiny tip glint.
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lw * 0.45;
    ctx.beginPath(); ctx.moveTo(blade * 0.9, -lw * 0.25); ctx.lineTo(blade, 0); ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (weapon === 'staff') {
    const len = U * 2.8 * reach;

    if (trailColor) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = trailColor;
      ctx.shadowColor = trailColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = lw * 3.0;
      ctx.beginPath(); ctx.moveTo(-len * 0.38, 0); ctx.lineTo(len * 0.62, 0); ctx.stroke();
      ctx.restore();
    }

    // Outline.
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 1.15;
    ctx.beginPath(); ctx.moveTo(-len * 0.38, 0); ctx.lineTo(len * 0.62, 0); ctx.stroke();

    // Slight inner highlight.
    ctx.strokeStyle = '#9aa6b5';
    ctx.lineWidth = lw * 0.55;
    ctx.beginPath(); ctx.moveTo(-len * 0.30, -lw * 0.12); ctx.lineTo(len * 0.55, -lw * 0.12); ctx.stroke();
  } else {
    // Nunchucks.
    const seg = U * 0.85 * reach;
    const gap = U * 0.35;

    if (trailColor) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = trailColor;
      ctx.shadowColor = trailColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = lw * 2.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(seg, 0); ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(seg, 0); ctx.stroke();
    // Chain (dashed).
    ctx.setLineDash([U * 0.06, U * 0.06]);
    ctx.lineWidth = lw * 0.55;
    ctx.beginPath(); ctx.moveTo(seg, 0); ctx.lineTo(seg + gap, -U * 0.28); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(seg + gap, -U * 0.28);
    ctx.lineTo(seg + gap + seg * 0.8, -U * 0.28);
    ctx.stroke();
  }

  ctx.restore();
}
