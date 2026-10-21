import { neutralPoseRad, segmentTransforms } from './body/fk.js';
import { wingPose } from './wings.js';
export const LEGS = ['lf', 'lm', 'lh', 'rf', 'rm', 'rh'];
/** Damped Jacobian IK with a standing-posture constraint. */
export class Gait {
  constructor(model) {
    this.model = model;
    this.pose = neutralPoseRad(model);
    this.wingModel = {
      ...model,
      segments: [model.root, 'l_wing', 'r_wing'],
      joints: model.joints.filter(([, s]) => s.endsWith('_wing')),
      dofs: model.dofs.filter((d) => d.child.endsWith('_wing')),
    };
    this.legs = LEGS.map((name, i) => {
      const segments = model.segments.filter((s) => s === model.root || s.startsWith(name + '_'));
      const local = {
        ...model,
        segments,
        joints: model.joints.filter(([, s]) => s.startsWith(name + '_')),
        dofs: model.dofs.filter((d) => d.child.startsWith(name + '_')),
      };
      const dofs = local.dofs.filter(
        (d) => d.limitDeg && (!d.child.includes('tarsus') || d.child.endsWith('tarsus1')),
      );
      return {
        name,
        i,
        local,
        dofs,
        tip: name + '_tarsus5',
        neutral: model.reference.neutralJointPositions[name + '_tarsus5'],
      };
    });
    this.update({ phase: 0, velocity: 0, yawRate: 0, y: 0 });
    // Calibrate the standing posture once from the measured skeleton and foot height.
    this.referencePose = { ...this.pose };
  }
  point(leg) {
    const t = segmentTransforms(leg.local, this.pose)[leg.tip];
    return [t[3], t[7], t[11]];
  }
  solve(leg, target, iterations = 10) {
    for (let it = 0; it < iterations; it++) {
      const p = this.point(leg),
        error = target.map((v, k) => v - p[k]);
      // Stop only when both foot position and joint posture have converged.
      if (
        Math.hypot(...error) < 0.001 &&
        (it > 0 ||
          !this.referencePose ||
          leg.dofs.every((d) => Math.abs(this.pose[d.name] - this.referencePose[d.name]) < 0.001))
      )
        break;
      const eps = 0.001,
        J = leg.dofs.map((d) => {
          this.pose[d.name] += eps;
          const q = this.point(leg);
          this.pose[d.name] -= eps;
          return q.map((v, k) => (v - p[k]) / eps);
        });
      // A foot constrains three of seven DOFs. Project the standing-posture
      // correction into the null space once per update to prevent joint drift.
      const preferred = leg.dofs.map((d) =>
        it === 0 && this.referencePose
          ? this.postureGain * (this.referencePose[d.name] - this.pose[d.name])
          : 0,
      );
      for (let k = 0; k < 3; k++)
        error[k] -= J.reduce((sum, col, j) => sum + col[k] * preferred[j], 0);
      const A = [
        [0.001, 0, 0],
        [0, 0.001, 0],
        [0, 0, 0.001],
      ];
      for (const col of J)
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) A[r][c] += col[r] * col[c];
      // Pivoted 3×3 solve, A u = error − J preferred.
      // Joint update = Jᵀ u + preferred, including the projected posture task.
      const mat = A.map((row, r) => [...row, error[r]]);
      for (let k = 0; k < 3; k++) {
        let p = k;
        for (let r = k + 1; r < 3; r++) if (Math.abs(mat[r][k]) > Math.abs(mat[p][k])) p = r;
        [mat[k], mat[p]] = [mat[p], mat[k]];
        const divisor = mat[k][k];
        for (let c = k; c < 4; c++) mat[k][c] /= divisor;
        for (let r = 0; r < 3; r++)
          if (r !== k) {
            const f = mat[r][k];
            for (let c = k; c < 4; c++) mat[r][c] -= f * mat[k][c];
          }
      }
      const u = mat.map((r) => r[3]);
      leg.dofs.forEach((d, j) => {
        const delta = preferred[j] + J[j].reduce((s, v, k) => s + v * u[k], 0);
        const [lo, hi] = d.limitDeg.map((v) => (v * Math.PI) / 180);
        this.pose[d.name] = Math.max(
          lo,
          Math.min(hi, this.pose[d.name] + Math.max(-0.15, Math.min(0.15, delta))),
        );
      });
    }
    return Math.hypot(...this.point(leg).map((v, k) => v - target[k]));
  }
  update(state) {
    const elapsed =
      Number.isFinite(state.time) && Number.isFinite(this.lastTime)
        ? Math.max(0, Math.min(0.05, state.time - this.lastTime))
        : 0.01;
    this.postureGain = 1 - Math.exp(-elapsed / 0.12);
    this.lastTime = state.time;
    const v = state.velocity || 0,
      turn = state.yawRate || 0,
      speed = Math.abs(v) + Math.abs(turn) * 0.5;
    const frequency = Math.max(0.01, Math.min(14, speed / 1.4));
    this.errors = [];
    this.targets = [];
    for (const leg of this.legs) {
      const side = leg.i < 3 ? 1 : -1;
      const phase = (state.phase / (Math.PI * 2) + ([0, 2, 4].includes(leg.i) ? 0 : 0.5)) % 1;
      const duty = 0.65,
        stride = Math.max(
          -1,
          Math.min(1, ((v - side * turn * Math.abs(leg.neutral[1])) / frequency) * duty),
        );
      const swing = Math.max(0, (phase - duty) / (1 - duty));
      const x =
        phase < duty
          ? stride * (0.5 - phase / duty)
          : stride * (-0.5 + swing - Math.sin(swing * 2 * Math.PI) / (2 * Math.PI));
      const lift = Math.sin(swing * Math.PI) * 0.35 * Math.min(1, speed / 0.2);
      const flight = Math.max(0, Math.min(1, state.flightBlend || 0));
      const tuck = flight * (1 - 0.8 * (state.landing || 0));
      const target = [
        leg.neutral[0] + x * (1 - flight) - 0.12 * tuck,
        leg.neutral[1] * (1 - 0.18 * tuck),
        0.11 + lift * (1 - flight) + 0.48 * tuck,
      ];
      this.errors.push(this.solve(leg, target));
      this.targets.push(target);
    }
    Object.assign(this.pose, wingPose(state));
    return segmentTransforms(this.model, this.pose);
  }
  wingTransforms(state, phaseOffset = 0) {
    return segmentTransforms(this.wingModel, wingPose(state, phaseOffset));
  }
}
