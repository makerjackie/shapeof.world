// Joint-space envelope measured against the supplied thorax/abdomen meshes.
// Original hinges and meshes are preserved. Angles are in model joint axes.
export const WINGBEAT_HZ = 277;
const clamp = (x) => Math.max(0, Math.min(1, x));
export function wingPose(state, phaseOffset = 0) {
  const extension = clamp(state.wingOpen || 0);
  const amplitude = clamp((extension - 0.7) / 0.3);
  const phase = (state.time || 0) * Math.PI * 2 * WINGBEAT_HZ + phaseOffset;
  const pose = {};
  for (const side of ['l', 'r']) {
    const sign = side === 'l' ? 1 : -1,
      prefix = `c_thorax-${side}_wing-`;
    pose[prefix + 'pitch'] = ((30 - 20 * extension) * Math.PI) / 180;
    pose[prefix + 'roll'] = (-75 * extension * sign * Math.PI) / 180;
    pose[prefix + 'yaw'] =
      ((5 + 15 * extension + 35 * amplitude * Math.sin(phase)) * sign * Math.PI) / 180;
  }
  return pose;
}
