// NeuroMechFly forward kinematics. Matrices are row-major arrays,
// matching the argument order of THREE.Matrix4.set().

const DEG2RAD = Math.PI / 180;

// MuJoCo (w, x, y, z) quaternion -> 3x3 rotation (row-major, length 9).
export function quatToMatrix(q) {
  let [w, x, y, z] = q;
  const n = Math.hypot(w, x, y, z);
  if (n === 0) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  w /= n;
  x /= n;
  y /= n;
  z /= n;
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - w * z),
    2 * (x * z + w * y),
    2 * (x * y + w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z - w * x),
    2 * (x * z - w * y),
    2 * (y * z + w * x),
    1 - 2 * (x * x + y * y),
  ];
}

// Rotation of `angle` (rad) about a unit `axis` (Rodrigues), 3x3 row-major.
export function axisAngleMatrix(axis, angle) {
  const [ax, ay, az] = axis;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    t = 1 - c;
  return [
    c + t * ax * ax,
    t * ax * ay - s * az,
    t * ax * az + s * ay,
    t * ax * ay + s * az,
    c + t * ay * ay,
    t * ay * az - s * ax,
    t * ax * az - s * ay,
    t * ay * az + s * ax,
    c + t * az * az,
  ];
}

// 3x3 * 3x3 (row-major).
function mat3Mul(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
}

// 4x4 * 4x4 (row-major).
export function mat4Mul(A, B) {
  const C = new Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      C[i * 4 + j] =
        A[i * 4] * B[j] +
        A[i * 4 + 1] * B[4 + j] +
        A[i * 4 + 2] * B[8 + j] +
        A[i * 4 + 3] * B[12 + j];
  return C;
}

// Homogeneous 4x4 from a 3x3 rotation (length 9) and a translation (length 3).
function homogeneous(R, p) {
  return [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
}

// Apply a 4x4 to a 3-vector (treated as a point, w=1) -> length-3 array.
export function mat4ApplyPoint(M, v) {
  return [
    M[0] * v[0] + M[1] * v[1] + M[2] * v[2] + M[3],
    M[4] * v[0] + M[5] * v[1] + M[6] * v[2] + M[7],
    M[8] * v[0] + M[9] * v[1] + M[10] * v[2] + M[11],
  ];
}

// Cache each joint’s axes in model.dofs order; rotation order matters.
function jointDofMap(model) {
  if (model.__jointDofs) return model.__jointDofs;
  const map = {};
  for (const d of model.dofs) {
    const key = `${d.parent}>${d.child}`;
    const axis = Array.isArray(d.axis) ? d.axis : model.axisVector[d.axis];
    (map[key] || (map[key] = [])).push({ name: d.name, axis });
  }
  Object.defineProperty(model, '__jointDofs', { value: map, enumerable: false });
  return map;
}

// Compose hinge rotations in joint order; angles are in radians.
function jointRotation(jointDofs, anglesRad) {
  let rot = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (const { name, axis } of jointDofs) {
    const angle = anglesRad[name] || 0;
    if (angle) rot = mat3Mul(rot, axisAngleMatrix(axis, angle));
  }
  return rot;
}

// Forward kinematics: world (body-frame) 4x4 transform for every segment.
// `anglesRad` maps DOF name -> radians; missing DOFs are 0.
export function segmentTransforms(model, anglesRad) {
  const T = {};
  const dofMap = jointDofMap(model);
  const root = model.rest[model.root];
  T[model.root] = homogeneous(quatToMatrix(root.quat), root.pos);
  for (const [parent, child] of model.joints) {
    const cfg = model.rest[child];
    const rest = homogeneous(quatToMatrix(cfg.quat), cfg.pos);
    const jdofs = dofMap[`${parent}>${child}`] || [];
    const joint = homogeneous(jointRotation(jdofs, anglesRad), [0, 0, 0]);
    T[child] = mat4Mul(mat4Mul(T[parent], rest), joint);
  }
  return T;
}

// World-frame origin (translation) of each segment's joint, {segment: [x,y,z]}.
export function jointPositions(model, anglesRad) {
  const T = segmentTransforms(model, anglesRad);
  const out = {};
  for (const s of model.segments) out[s] = [T[s][3], T[s][7], T[s][11]];
  return out;
}

// A {dof: radians} pose from the model's neutral pose (degrees).
export function neutralPoseRad(model) {
  const a = {};
  for (const d of model.dofs) a[d.name] = (model.neutralDeg[d.name] || 0) * DEG2RAD;
  return a;
}

export function zeroPoseRad(model) {
  const a = {};
  for (const d of model.dofs) a[d.name] = 0;
  return a;
}

// Maximum coordinate error against the bundled neutral-pose reference.
export function validateFK(model) {
  const got = jointPositions(model, neutralPoseRad(model));
  const ref = model.reference.neutralJointPositions;
  let maxErr = 0;
  for (const s of model.segments) {
    for (let i = 0; i < 3; i++) maxErr = Math.max(maxErr, Math.abs(got[s][i] - ref[s][i]));
  }
  return maxErr;
}
