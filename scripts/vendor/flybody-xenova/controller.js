/** Engineered rate decoder. Body units: mm, seconds, radians; +yaw turns left. */
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const relax = (value, target, dt, tau) => value + (target - value) * (1 - Math.exp(-dt / tau));
export function restPose() {
  return {
    x: 0,
    z: 0,
    y: 0,
    yaw: 0,
    velocity: 0,
    yawRate: 0,
    phase: 0,
    time: 0,
    pitch: 0,
    bank: 0,
    wingOpen: 0,
    flightBlend: 0,
    launch: 0,
    landing: 0,
    behavior: 'At rest',
  };
}
export class FlyController {
  constructor() {
    this.reset();
  }
  reset() {
    Object.assign(this, restPose());
    this.rates = new Float64Array(6);
    this.vy = 0;
    this.distance = 0;
    this.mode = 'ground';
    this.escapeAge = 0;
    this.landingAge = 0;
    this.quietTime = 0;
    this.cooldown = 0;
    this.escapeArmed = true;
    this.takeoffs = 0;
  }
  advance(input, dt) {
    if (
      input.length !== 6 ||
      !Array.from(input).every(Number.isFinite) ||
      !Number.isFinite(dt) ||
      dt <= 0 ||
      dt > 0.05
    )
      throw Error('Invalid neural controller input');
    for (let i = 0; i < 6; i++)
      this.rates[i] = relax(this.rates[i], Math.max(0, input[i]), dt, 0.08);
    const [wl, wr, tl, tr, back, escape] = this.rates;
    const walking = Math.max(0, (wl + wr) / 2 - 6),
      reverse = Math.max(0, back - 25);
    const turn = Math.max(0, tl - 15) - Math.max(0, tr - 15);
    const groundSpeed = 8 * Math.tanh(walking / 30) - 4 * Math.tanh(reverse / 90);
    this.yawRate = relax(this.yawRate, 3.8 * Math.tanh(turn / 45), dt, 0.04);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.mode === 'ground' && escape < 45) this.escapeArmed = true;
    if (this.mode === 'ground' && escape > 100 && this.cooldown === 0 && this.escapeArmed) {
      this.mode = 'escape';
      this.escapeAge = 0;
      this.quietTime = 0;
      this.escapeArmed = false;
      this.vy = 80;
      this.takeoffs++;
    }
    if (this.mode === 'escape') {
      this.escapeAge += dt;
      this.quietTime = escape < 45 ? this.quietTime + dt : 0;
      // Escape activity sustains flight for 0.35–0.9 neural seconds.
      if ((this.escapeAge >= 0.35 && this.quietTime >= 0.06) || this.escapeAge >= 0.9) {
        this.mode = 'landing';
        this.landingAge = 0;
      }
    }
    const airborne = this.mode !== 'ground';
    if (airborne) {
      if (this.mode === 'landing') this.landingAge += dt;
      const landing = this.mode === 'landing';
      const targetHeight = landing ? 0 : 2.2 + 0.8 * clamp(escape / 250, 0, 1);
      this.velocity = relax(
        this.velocity,
        landing ? groundSpeed : 16 + 8 * clamp(escape / 250, 0, 1),
        dt,
        landing ? 0.12 : 0.06,
      );
      // Reduced-order wing lift: critically damped altitude control plus gravity.
      // Substeps resolve takeoff/ground contact independently of the 10 ms readout.
      const parts = Math.ceil(dt / 0.002),
        h = dt / parts;
      for (let k = 0; k < parts; k++) {
        const omega = landing ? 16 : 24;
        const lift = clamp(
          9810 + omega * omega * (targetHeight - this.y) - 2 * omega * this.vy,
          0,
          16000,
        );
        const acceleration = lift - 9810;
        this.y = Math.max(0, this.y + this.vy * h + 0.5 * acceleration * h * h);
        this.vy += acceleration * h;
        if (landing && this.y < 0.025 && this.vy <= 0) {
          this.y = 0;
          this.vy = 0;
          this.mode = 'ground';
          this.cooldown = 0.2;
          break;
        }
      }
    } else this.velocity = relax(this.velocity, groundSpeed, dt, 0.055);
    this.flightBlend = clamp(this.y / 0.65, 0, 1);
    this.launch = this.mode === 'escape' ? clamp(1 - this.escapeAge / 0.06, 0, 1) : 0;
    this.landing = this.mode === 'landing' ? clamp(this.landingAge / 0.08, 0, 1) : 0;
    this.wingOpen = relax(
      this.wingOpen,
      this.mode === 'ground' ? 0 : 1,
      dt,
      this.mode === 'ground' ? 0.065 : 0.022,
    );
    if (this.wingOpen < 0.0001) this.wingOpen = 0;
    const pitchTarget =
      (this.mode === 'landing' ? -0.13 : this.launch > 0 ? -0.24 : -0.06) * this.flightBlend;
    this.pitch = relax(this.pitch, pitchTarget, dt, 0.045);
    this.bank = relax(
      this.bank,
      clamp(-this.yawRate * 0.08, -0.22, 0.22) * this.flightBlend,
      dt,
      0.05,
    );
    this.yaw += this.yawRate * dt;
    this.x += Math.sin(this.yaw) * this.velocity * dt;
    this.z += Math.cos(this.yaw) * this.velocity * dt;
    const gaitSpeed = Math.abs(this.velocity) + Math.abs(this.yawRate) * 0.5;
    this.phase += (gaitSpeed > 0.06 ? Math.min(14, gaitSpeed / 1.4) * Math.PI * 2 : 0) * dt;
    this.distance += Math.abs(this.velocity) * dt;
    this.time += dt;
    this.behavior =
      this.mode === 'landing'
        ? 'Landing'
        : this.mode === 'escape'
          ? this.escapeAge < 0.08
            ? 'Taking off'
            : 'Escape flight'
          : reverse > walking + 5
            ? 'Walking backward'
            : Math.abs(this.yawRate) > 0.3
              ? this.yawRate > 0
                ? 'Turning left'
                : 'Turning right'
              : Math.abs(this.velocity) > 0.15
                ? 'Walking'
                : 'At rest';
    return this.pose();
  }
  pose() {
    return {
      x: this.x,
      z: this.z,
      y: this.y,
      yaw: this.yaw,
      velocity: this.velocity,
      yawRate: this.yawRate,
      phase: this.phase,
      time: this.time,
      pitch: this.pitch,
      bank: this.bank,
      wingOpen: this.wingOpen,
      flightBlend: this.flightBlend,
      launch: this.launch,
      landing: this.landing,
      behavior: this.behavior,
    };
  }
}
