// GLSL for the city. Rules learnt on tower (ANGLE/Metal): smoothstep edges must be increasing, never pow() a value
// that can go negative, and clamp anything that feeds the bloom pass, or NaNs smear into black blocks.

const COMMON = /* glsl */ `
float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
// 1 between a and b (any units), soft by e on each side.
float band(float f, float a, float b, float e) { return smoothstep(a - e, a + e, f) * (1.0 - smoothstep(b - e, b + e, f)); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 fogIt(vec3 col, float camD, vec3 fogC, float fogD, float keep) {
  float k = camD * fogD;
  float f = 1.0 - exp(-k * k);
  return mix(col, fogC, f * (1.0 - keep));
}
`;

export const BLDG_VERT = /* glsl */ `
attribute vec4 aA; // x, z, rotation, seed
attribute vec4 aB; // width, depth, height, kind
attribute vec4 aC; // occupancy, group, distance from centre, drop (0 standing .. 1 gone)
uniform float uHide;
varying vec3 vL;
varying vec3 vN;
varying vec3 vW;
varying vec4 vA;
varying vec4 vB;
varying vec4 vC;
void main() {
  float hFull = aB.z;
  float shown = hFull * (1.0 - clamp(aC.w, 0.0, 1.0));
  vec3 L = vec3(position.x * aB.x, position.y * shown, position.z * aB.y);
  if (abs(aC.y - uHide) < 0.5) L *= 0.0;
  float c = cos(aA.z);
  float s = sin(aA.z);
  vec3 Wp = vec3(c * L.x + s * L.z, L.y, -s * L.x + c * L.z) + vec3(aA.x, 0.0, aA.y);
  vL = vec3(L.x, L.y + (hFull - shown), L.z);
  vN = normal;
  vW = Wp;
  vA = aA;
  vB = aB;
  vC = aC;
  gl_Position = projectionMatrix * viewMatrix * vec4(Wp, 1.0);
}
`;

export const BLDG_FRAG = /* glsl */ `
uniform float uTime;
uniform float uNight;
uniform float uLights;
uniform vec3 uFogC;
uniform float uFogD;
uniform vec3 uSkyHor;
uniform float uDarkR;
uniform float uDarkAmt;
uniform float uPatch;
uniform float uElev;
uniform float uElevAge;
uniform float uDim; // whole layer dimmed (behind the hero in close-ups)
#ifdef HERO
uniform sampler2D uHH; // 4 x 33 households: r lit, g voted yes, b voted no, a gone
uniform float uXray;
uniform float uAge;
uniform float uVote;
uniform float uPeelY;
uniform float uFireY;
uniform float uFire;
#endif
varying vec3 vL;
varying vec3 vN;
varying vec3 vW;
varying vec4 vA;
varying vec4 vB;
varying vec4 vC;
${COMMON}

vec3 lampColour(float r) {
  if (r < 0.55) return vec3(1.0, 0.66, 0.36);
  if (r < 0.86) return vec3(1.0, 0.84, 0.62);
  return vec3(0.7, 0.82, 1.0);
}

void main() {
  vec3 n = normalize(vN);
  float seed = vA.w;
  float w = vB.x;
  float d = vB.y;
  float hgt = vB.z;
  float kind = vB.w;
  float occ = vC.x;
  float grp = vC.y;
  float dist = vC.z;
  float camD = length(vW - cameraPosition);
  float night = uNight;

  // wall paint: pale greys and beiges for housing, darker brick-grey for walk-ups, blue-grey glass for offices
  vec3 paint = mix(vec3(0.5, 0.49, 0.47), vec3(0.6, 0.55, 0.48), h11(seed * 13.7));
  if (kind > 0.5 && kind < 1.5) paint = mix(vec3(0.4, 0.34, 0.31), vec3(0.48, 0.44, 0.4), h11(seed * 5.3));
  if (kind > 1.5 && kind < 2.5) paint = vec3(0.14, 0.17, 0.21);
  if (kind > 4.5) paint = vec3(0.64, 0.6, 0.54);
  float amb = mix(0.11, 0.006, night);
  vec3 sunDir = normalize(vec3(-0.8, 0.35, 0.3));
  float sun = clamp(dot(n, sunDir), 0.0, 1.0) * 0.3 * (1.0 - night) * (1.0 - night);

  // lights: share of homes lit tonight
  float ring = 1.0 - uDarkAmt * smoothstep(uDarkR - 450.0, uDarkR + 450.0, dist);
  vec2 blk = floor(vA.xy / 300.0);
  float patchOff = uPatch * step(h21(blk + 3.7), 0.42);
  float litP = clamp(uLights * occ * ring * (1.0 - patchOff), 0.0, 1.0);

  vec3 col;
  float alpha = 1.0;
  if (n.y > 0.5) {
    // roof: dark, a parapet edge, a little sky
    col = paint * (amb * 0.5) + uSkyHor * 0.02;
    float edge = 1.0 - smoothstep(0.4, 1.2, min(0.5 * w - abs(vL.x), 0.5 * d - abs(vL.z)));
    col += paint * edge * amb * 0.8;
  } else if (kind > 3.5 && kind < 4.5) {
    // lift machine rooms and tanks on the roofs: plain walls
    col = paint * (amb * 0.8 + sun) + uSkyHor * 0.012;
    col = fogIt(col, camD, uFogC, uFogD, 0.0) * uDim;
    gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), alpha);
    return;
  } else {
    bool longF = abs(n.z) > 0.5;
#ifdef HERO
    // the cut-open tower: the south wall above the cut is gone
    if (longF && n.z > 0.0 && vL.y > uPeelY) discard;
#endif
    float u = longF ? vL.x + 0.5 * w : vL.z + 0.5 * d;
    float faceW = longF ? w : d;
    float south = (longF && n.z > 0.0) ? 1.0 : 0.0;
    float office = (kind > 1.5 && kind < 2.5) ? 1.0 : 0.0;
    float walkup = (kind > 0.5 && kind < 1.5) ? 1.0 : 0.0;
    float fh = office > 0.5 ? 4.0 : 3.0;
    float y = vL.y;
    float fl = floor(y / fh);
    float fy = fract(y / fh);
    float floors = floor(hgt / fh + 0.01);
    float eu = max(fwidth(u), 0.001);
    float ey = max(fwidth(y), 0.001);
    float far = clamp((max(eu, ey) - 0.2) / 0.8, 0.0, 1.0); // window detail below a pixel
    float far2 = clamp((ey - 1.2) / 2.5, 0.0, 1.0); // whole flats below a pixel
    float ef = ey / fh;

    // the flat this point belongs to: 11 m flats across the slab
    float unitW = office > 0.5 ? 9.0 : 11.0;
    float nU = max(1.0, floor(faceW / unitW + 0.5));
    float uw = faceW / nU;
    float ui = floor(u / uw);
    float uu = u - ui * uw;
    if (!longF) { ui = (n.x > 0.0 ? nU + 7.0 : nU + 9.0); uu = u; }

    float glass = 0.0; // window mask
    float rail = 0.0; // balcony railing (glass panel in front of the lower door)
    float frame = 0.0; // mullions and rails
    float slabE = 0.0; // balcony slab edge
    float acBox = 0.0; // air-conditioner boxes
    float room = 0.0; // which room (for per-room lights)
    float pil = 0.0; // pilaster between flats
    if (office > 0.5) {
      float cw = 3.0;
      float fu = fract(u / cw);
      glass = band(fu, 0.05, 0.95, eu / cw) * band(fy, 0.1, 0.94, ef);
      room = floor(u / (cw * 3.0));
    } else if (longF) {
      pil = band(uu, -0.1, 0.35, eu) + band(uu, uw - 0.35, uw + 0.1, eu);
      if (south > 0.5 && walkup < 0.5) {
        float door = band(uu, 1.2, 5.4, eu) * band(fy, 0.07, 0.9, ef);
        float bed = band(uu, 6.6, 9.0, eu) * band(fy, 0.32, 0.86, ef);
        glass = door + bed;
        rail = band(uu, 0.9, 5.7, eu) * band(fy, 0.07, 0.38, ef);
        frame = door * (band(uu, 2.56, 2.66, eu) + band(uu, 3.96, 4.06, eu)) + bed * band(uu, 7.75, 7.85, eu);
        frame += band(uu, 0.9, 5.7, eu) * band(fy, 0.37, 0.4, ef); // top rail
        slabE = band(uu, 0.8, 5.8, eu) * band(fy, 0.0, 0.075, ef);
        acBox = band(uu, 9.4, 10.4, eu) * band(fy, 0.1, 0.34, ef);
        room = bed > 0.0 ? 1.0 : 0.0;
      } else if (south > 0.5) {
        glass = (band(uu, 1.5, 4.5, eu) + band(uu, 6.2, 8.8, eu)) * band(fy, 0.3, 0.84, ef);
        rail = band(uu, 1.2, 4.8, eu) * band(fy, 0.06, 0.36, ef) * step(0.5, h11(seed + ui));
        frame = band(uu, 2.95, 3.05, eu) * glass + band(uu, 7.45, 7.55, eu) * glass;
        acBox = band(uu, 9.3, 10.2, eu) * band(fy, 0.15, 0.38, ef) * step(0.4, h11(seed * 3.0 + ui + fl));
        room = uu > 5.5 ? 1.0 : 0.0;
      } else {
        float k1 = band(uu, 1.4, 3.0, eu) * band(fy, 0.38, 0.82, ef);
        float k2 = band(uu, 4.0, 4.8, eu) * band(fy, 0.56, 0.82, ef);
        float k3 = band(uu, 6.4, 8.4, eu) * band(fy, 0.32, 0.84, ef);
        glass = k1 + k2 + k3;
        frame = band(uu, 7.35, 7.45, eu) * k3;
        acBox = band(uu, 8.9, 9.8, eu) * band(fy, 0.12, 0.34, ef);
        room = k1 > 0.0 ? 2.0 : (k2 > 0.0 ? 3.0 : 4.0);
      }
    } else {
      // gable ends: a column of small windows on most slabs, a painted stripe
      float has = step(0.35, h11(seed * 7.1));
      glass = has * band(u, 0.5 * faceW - 0.7, 0.5 * faceW + 0.7, eu) * band(fy, 0.45, 0.8, ef);
      pil = band(u, 0.5 * faceW - 2.2, 0.5 * faceW - 1.7, eu) + band(u, 0.5 * faceW + 1.7, 0.5 * faceW + 2.2, eu);
      room = 5.0;
    }
    float inBody = step(0.5, fl) * step(fl, floors - 0.5);
    if (office > 0.5) inBody = step(fl, floors - 0.5);
    glass *= inBody;
    rail *= inBody;
    frame *= inBody;
    slabE *= inBody;
    acBox *= inBody;

    // lit or not: the flat is lived in and someone is home; each room has its own lamp
    float home = h31(vec3(ui, fl, seed * 97.0));
    float lit = step(home, litP);
    float roomP = room < 0.5 ? 0.9 : 0.62;
    lit *= step(h31(vec3(ui * 3.1 + room, fl, seed * 31.0)), roomP);
    float tone = h31(vec3(ui, fl, seed * 17.0));
    float curtain = step(h31(vec3(ui + room, fl, seed * 5.0)), 0.35);

#ifdef HERO
    // the hero: households read from the state texture
    float hhU = clamp(ui, 0.0, 3.0);
    vec4 hh = texture2D(uHH, vec2((hhU + 0.5) / 4.0, (clamp(fl, 0.0, 32.0) + 0.5) / 33.0));
    if (inBody > 0.5 && longF) lit = hh.r * step(h31(vec3(ui * 3.1 + room, fl, seed * 31.0)), room < 0.5 ? 0.97 : 0.75);
#endif

    // lamp: warm 2700 K mostly, some neutral, a few cool; brighter at the ceiling; curtains glow and fold
    vec3 lamp = tone < 0.55 ? vec3(1.0, 0.58, 0.28) : (tone < 0.85 ? vec3(1.0, 0.76, 0.48) : vec3(0.68, 0.8, 1.0));
    lamp *= 0.55 + 0.45 * h31(vec3(ui, fl + 0.5, seed));
    lamp *= 0.7 + 0.45 * smoothstep(0.35, 0.95, fy);
    lamp *= mix(1.0, 0.42 * (0.8 + 0.2 * sin(u * 11.0)), curtain);
    if (tone > 0.97) lamp *= 0.75 + 0.3 * sin(uTime * 9.0 + home * 60.0); // a television

    // far away: window detail averages out, and further still whole flats do
    float share = office > 0.5 ? 0.8 : (longF ? (south > 0.5 ? 0.5 : 0.22) : 0.04);
    glass = mix(glass, share * inBody, far);
    rail *= 1.0 - far;
    frame *= 1.0 - far;
    acBox *= 1.0 - far;
    // far away, keep the city sparkling: whole groups of flats are lit or dark together
    float litF = step(h31(vec3(floor(ui / 2.0), floor(fl / 3.0), seed * 53.0)), litP * 0.85);
    lit = mix(lit, litF, far2);
    lamp = mix(lamp, vec3(1.0, 0.66, 0.36) * (0.55 + 0.6 * h31(vec3(floor(ui / 2.0), floor(fl / 3.0), seed * 7.0))), far2);
    glass = mix(glass, glass * 0.75, far2);

    vec3 wall = paint * (amb + sun) + uSkyHor * 0.015;
    wall += vec3(1.0, 0.55, 0.28) * 0.035 * night * exp(-y / 12.0); // street light from below
    wall *= 1.0 - 0.25 * pil * (1.0 - far);
    wall = mix(wall, paint * (amb * 1.9 + sun * 1.2) + vec3(0.01), slabE * (1.0 - far));
    wall = mix(wall, vec3(0.05, 0.05, 0.055) * (amb * 6.0 + 0.1), acBox * 0.85);
    // housing crowns: the top two floors in an accent colour, as on most estates
    if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) {
      float pick = h11(seed * 41.0);
      vec3 accent = pick < 0.35 ? vec3(0.34, 0.15, 0.09) : (pick < 0.7 ? vec3(0.17, 0.21, 0.28) : vec3(0.66, 0.62, 0.53));
      float crownC = step(floors - 2.0, fl) * step(y, hgt) * (1.0 - far2 * 0.5);
      wall = mix(wall, accent * (amb * 1.4 + sun) + vec3(0.004), crownC * 0.85);
    }
#ifdef HERO
    // the hero: a terracotta crown on the top two floors and a stripe between flats
    float crown = step(31.0, fl) * step(y, hgt);
    wall = mix(wall, vec3(0.36, 0.14, 0.08) * (amb * 1.6 + sun + 0.01), crown * 0.9);
    wall = mix(wall, vec3(0.36, 0.14, 0.08) * (amb * 1.6 + sun + 0.01), pil * 0.6 * (longF ? 1.0 : 0.0));
#endif

    vec3 dark = vec3(0.006, 0.008, 0.012) + uSkyHor * (0.06 + 0.1 * fy) * (1.2 - night);
    vec3 win = mix(dark, lamp, lit);
    // railing: tinted glass in front of the lower door; the room light shows through it, dimmer
    win = mix(win, win * 0.45 + wall * 0.35, rail * 0.8);
    win = mix(win, wall * 0.7 + lamp * lit * 0.06, frame);
    col = mix(wall, win, clamp(glass, 0.0, 1.0));
    // a little light falls on the balcony slab under a lit room
    col += lamp * lit * slabE * 0.12;

    // lobby on the ground floor
    float lobby = (1.0 - step(0.5, fl)) * band(u, 0.5 * faceW - 3.0, 0.5 * faceW + 3.0, eu) * band(fy, 0.05, 0.8, ef) * south;
    col = mix(col, vec3(1.0, 0.8, 0.56) * 0.75, lobby * night);
    // stairwell windows on the north side of the core: always lit, cool and dim
    float stair = (1.0 - south) * (longF ? 1.0 : 0.0) * band(u, 0.5 * faceW + 3.6, 0.5 * faceW + 5.0, eu) * band(fy, 0.45, 0.7, ef) * inBody * (1.0 - far);
    col = mix(col, vec3(0.75, 0.85, 0.9) * 0.35, stair * night * step(0.3, litP));

    // elevators drawn through the walls, city-wide (one shaft per slab, a car riding it)
    if (uElev > 0.001 && longF && office < 0.5) {
      float cu = 0.5 * faceW;
      float shaft = band(u, cu - 0.35, cu + 0.35, eu) * step(y, hgt);
      float sp = 0.18 + 0.2 * h11(seed * 3.3);
      float carY = (0.5 + 0.5 * sin(uTime * sp + seed * 40.0)) * (hgt - 3.0) + 1.5;
      float dd = length(vec2((u - cu) * 1.6, (y - carY) * 0.7));
      float car = 1.0 - smoothstep(0.0, 3.2 + eu * 4.0, dd);
      vec3 ec = mix(vec3(0.75, 0.95, 1.0), vec3(1.0, 0.55, 0.15), step(h11(seed * 9.7 + 0.3), uElevAge));
      col = mix(col, col * 0.3, uElev * 0.7);
      col += ec * (shaft * 0.3 + car * 1.8) * uElev;
    }

#ifdef HERO
    // ageing: water stains under the windows, patches of tiles gone
    float age = uAge;
    float streak = vnoise(vec2(u * 1.3, y * 0.08)) * vnoise(vec2(u * 0.4 + 7.0, y * 0.5));
    float under = band(fy, 0.0, 0.3, 0.05);
    float stain = clamp(streak * 2.2 * age * (0.45 + 0.55 * under), 0.0, 0.9);
    float tiles = step(h21(floor(vec2(u, y) / 0.9)), age * 0.1) * (1.0 - glass);
    col *= 1.0 - stain * 0.8 * (1.0 - glass);
    col = mix(col, col * 0.3, tiles);
    col = mix(col, vec3(dot(col, vec3(0.33))) * vec3(0.9, 0.92, 0.96), age * 0.35 * (1.0 - glass));
    // the vote: every home takes the colour of its answer (windows glow in it, walls tint)
    vec4 hh2 = texture2D(uHH, vec2((clamp(ui, 0.0, 3.0) + 0.5) / 4.0, (clamp(fl, 0.0, 32.0) + 0.5) / 33.0));
    float cell = longF ? inBody * band(uu, 0.3, uw - 0.3, eu) * band(fy, 0.05, 0.95, ef) : 0.0;
    vec3 vc = hh2.g * vec3(0.12, 0.62, 0.36) + hh2.b * vec3(0.95, 0.16, 0.18);
    float va = clamp(hh2.g + hh2.b, 0.0, 1.0) * cell * uVote;
    col = mix(col, vc * mix(0.1, 1.15, clamp(glass, 0.0, 1.0)), va);
    // a home that has gone: glass dark, nobody in
    col = mix(col, mix(wall * 0.7, dark * 0.6, glass), hh2.a * inBody * (longF ? 1.0 : 0.0));
    // X-ray: the skin goes dark and thin, floor lines stay
    float fline = band(fy, 0.0, 0.035, ef) + band(fy, 0.965, 1.0, ef);
    vec3 xr = vec3(0.008, 0.02, 0.03) + vec3(0.25, 0.75, 0.95) * fline * 0.18 + win * glass * lit * 0.22;
    col = mix(col, xr, uXray);
    alpha = mix(1.0, 0.3, uXray);
#endif

#ifdef HERO
    // glowing cut edge while the wall peels away
    float cutE = (1.0 - smoothstep(0.0, 0.35, abs(y - uPeelY))) * step(uPeelY, hgt - 0.05) * (longF ? 1.0 : 0.0);
    col += vec3(1.0, 0.78, 0.45) * cutE * 1.6;
    // floors above the reach of a ladder truck
    col = mix(col, col * 0.45 + vec3(0.42, 0.05, 0.04), uFire * step(uFireY, y) * 0.65);
#endif
    float isLight = clamp(glass * lit, 0.0, 1.0);
    col = fogIt(col, camD, uFogC, uFogD, isLight * 0.5);
    col *= uDim;
    gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), alpha);
    return;
  }
  col = fogIt(col, camD, uFogC, uFogD, 0.0) * uDim;
  gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), alpha);
}
`;

export const GROUND_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const GROUND_FRAG = /* glsl */ `
uniform float uTime;
uniform float uNight;
uniform float uTraffic;
uniform vec3 uFogC;
uniform float uFogD;
uniform vec3 uSkyHor;
uniform float uP;
uniform float uRoadW;
uniform float uDarkR;
uniform float uDarkAmt;
uniform float uDim;
uniform float uSea; // x of the coast line at the 美孚新邨 site (south of z = uSeaZ is water)
uniform float uSeaZ;
uniform vec2 uSiteC;
uniform float uSiteR;
uniform float uRiver;
varying vec3 vW;
${COMMON}

// Lamps along a road: pool of light at distance "across" from the kerb, lamps every 34 m "along".
float pools(float along, float across) {
  float ds = (fract(along / 34.0) - 0.5) * 34.0;
  return exp(-(ds * ds + across * across) / 70.0);
}

void main() {
  vec2 p = vW.xz;
  float camD = length(vW - cameraPosition);
  float night = uNight;
  float ex = max(fwidth(p.x), 0.001);
  float far = clamp((ex - 0.6) / 3.0, 0.0, 1.0);

  // distance to the nearest road centre line along each axis
  float PP = uP;
  float fx = fract(p.x / PP - 0.5);
  float fz = fract(p.y / PP - 0.5);
  float dx = min(fx, 1.0 - fx) * PP;
  float dz = min(fz, 1.0 - fz) * PP;
  float hw = uRoadW * 0.5 * clamp(PP / 300.0, 0.45, 1.0);
  float roadX = 1.0 - smoothstep(hw - 0.8 - ex, hw + 0.8 + ex, dx); // road running north-south
  float roadZ = 1.0 - smoothstep(hw - 0.8 - ex, hw + 0.8 + ex, dz); // road running east-west
  float road = max(roadX, roadZ);

  float distC = length(p - uSiteC);
  float ring = 1.0 - uDarkAmt * smoothstep(uDarkR - 450.0, uDarkR + 450.0, distC);
  float urban = 1.0 - smoothstep(uSiteR, uSiteR * 1.45, length(p - uSiteC));

  vec3 grass = mix(vec3(0.03, 0.045, 0.035), vec3(0.05, 0.06, 0.045), vnoise(p * 0.02));
  vec3 paving = vec3(0.05, 0.05, 0.052);
  vec3 ground = mix(grass, paving, 0.35 + 0.3 * vnoise(p * 0.05));
  ground *= mix(0.9, 0.18, night);
  vec3 asphalt = vec3(0.022, 0.023, 0.026) * mix(1.6, 0.6, night);
  vec3 col = mix(ground, asphalt, road * urban);

  // street lights: warm pools along every road, at both kerbs
  float poolX = pools(p.y, dx - hw + 2.0) + pools(p.y + 17.0, -(dx - hw + 2.0) + 0.0);
  float poolZ = pools(p.x, dz - hw + 2.0);
  float lamps = (poolX * roadX + poolZ * roadZ) * urban * ring;
  col += vec3(1.0, 0.6, 0.3) * lamps * 0.16 * night;
  col += vec3(1.0, 0.6, 0.3) * road * urban * ring * 0.012 * night;

  // traffic: headlights one way, tail lights the other, on every road
  if (uTraffic > 0.001) {
    float laneZ = dz; // east-west roads
    float sideZ = sign(fract(p.y / PP - 0.5) - 0.5);
    float rid = floor(p.y / PP - 0.5);
    float along = p.x * sideZ;
    float sp = 14.0;
    float phase = fract((along - uTime * sp) / 46.0 + h11(rid * 3.7 + sideZ));
    float car = band(phase * 46.0, 20.0, 23.5, 0.4 + ex) * (band(laneZ, 3.6, 4.4, 0.3 + ex) + band(laneZ, 6.6, 7.4, 0.3 + ex));
    float ridX = floor(p.x / PP - 0.5);
    float sideX = sign(fract(p.x / PP - 0.5) - 0.5);
    float phase2 = fract((p.y * sideX - uTime * sp) / 52.0 + h11(ridX * 5.1 + sideX));
    float car2 = band(phase2 * 52.0, 20.0, 23.5, 0.4 + ex) * (band(dx, 3.6, 4.4, 0.3 + ex) + band(dx, 6.6, 7.4, 0.3 + ex));
    vec3 head = vec3(1.0, 0.92, 0.8);
    vec3 tail = vec3(1.0, 0.12, 0.08);
    vec3 cc = car * mix(head, tail, step(0.0, sideZ)) + car2 * mix(head, tail, step(0.0, sideX));
    col += cc * 1.5 * uTraffic * urban * ring * (1.0 - far * 0.7);
  }

  // the river through the city (matches riverZ in city.ts)
  if (uRiver > 0.5) {
    float rz = 1150.0 + 380.0 * sin(p.x / 1500.0 + 0.6) + 120.0 * sin(p.x / 530.0);
    float off = abs(p.y - rz);
    float wet = 1.0 - smoothstep(104.0 - ex, 112.0 + ex, off);
    float bridge = (1.0 - smoothstep(9.0, 11.0 + ex, dx)) * (1.0 - step(0.5, h11(floor(p.x / uP - 0.5) * 7.3) * 2.0 - 0.6));
    vec3 water = vec3(0.004, 0.008, 0.014) + uSkyHor * 0.12;
    float rip = vnoise(vec2(p.x * 0.05, p.y * 0.6 + uTime * 0.4));
    water += vec3(1.0, 0.62, 0.32) * pow(clamp(rip, 0.0, 1.0), 5.0) * 0.18 * night;
    float bank = band(off, 104.0, 112.0, 1.0 + ex) * 0.6;
    col = mix(col, water, wet * (1.0 - bridge));
    col += vec3(1.0, 0.6, 0.3) * bank * 0.05 * night;
  }

  // the sea in front of 美孚新邨
  if (uSea > 0.5 && p.y > uSeaZ) {
    float shore = smoothstep(uSeaZ, uSeaZ + 30.0, p.y);
    vec3 sea = vec3(0.006, 0.012, 0.02) + uSkyHor * 0.08;
    float glint = vnoise(vec2(p.x * 0.08, p.y * 0.5 + uTime * 0.3));
    sea += vec3(1.0, 0.7, 0.4) * pow(clamp(glint, 0.0, 1.0), 6.0) * 0.25 * (1.0 - smoothstep(0.0, 500.0, p.y - uSeaZ));
    col = mix(col, sea, shore);
  }

  col = fogIt(col, camD, uFogC, uFogD, 0.0) * uDim;
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uZen;
uniform vec3 uMid;
uniform vec3 uHor;
uniform vec3 uGlow;
uniform float uNight;
uniform float uDim;
varying vec3 vDir;
${COMMON}
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  vec3 col = mix(uHor, uMid, smoothstep(-0.02, 0.18, e));
  col = mix(col, uZen, smoothstep(0.18, 0.75, e));
  // sunset glow to the west, city glow on the horizon all round
  float west = clamp(dot(normalize(vec2(d.x, d.z)), normalize(vec2(-0.9, 0.35))), 0.0, 1.0);
  float above = smoothstep(-0.005, 0.04, e);
  col += uGlow * west * west * (1.0 - smoothstep(0.0, 0.35, e)) * (1.0 - uNight * 0.85) * above;
  col += vec3(0.35, 0.18, 0.08) * 0.12 * uNight * (1.0 - smoothstep(-0.02, 0.12, e));
  // a few stars
  vec2 sp = vec2(atan(d.z, d.x) * 180.0, e * 300.0);
  float st = step(0.9965, h21(floor(sp))) * smoothstep(0.08, 0.4, e) * uNight;
  col += vec3(0.9) * st * 0.6;
  col = max(col, vec3(0.0)) * uDim;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Glowing additive parts: the hero's machinery in X-ray, the water riser, the tank. A vertical fill level (uLevel,
// in metres) splits a lit part from a dim part; moving stripes show flow.
export const GLOW_VERT = /* glsl */ `
varying vec3 vW;
varying vec3 vP;
varying vec3 vN;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vP = position;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uOpacity;
uniform float uLevel;
uniform float uFlow;
uniform float uTime;
uniform float uRim;
varying vec3 vW;
varying vec3 vP;
varying vec3 vN;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float rim = 1.0 - abs(dot(normalize(vN), v));
  float below = 1.0 - smoothstep(uLevel - 0.6, uLevel + 0.6, vW.y);
  float stripes = 0.65 + 0.35 * sin((vW.y - uTime * 9.0) * 0.9);
  vec3 col = mix(uColor2, uColor * mix(1.0, stripes, uFlow), below);
  float a = uOpacity * (mix(0.35, 1.0, below) + uRim * rim * rim);
  gl_FragColor = vec4(max(col * a, vec3(0.0)), 1.0);
}
`;

// Coins: gold discs with a bright rim and a top highlight (no scene lights needed).
export const COIN_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const COIN_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  vec3 n = normalize(vN);
  float rim = 1.0 - abs(dot(n, v));
  float top = clamp(n.y, 0.0, 1.0);
  vec3 gold = vec3(1.0, 0.68, 0.18);
  vec3 col = gold * (0.35 + 0.9 * top) + vec3(1.0, 0.9, 0.6) * rim * rim * 1.4;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}
`;

// Soft round sprites: aviation lights, lamp heads, dust.
export const DOT_VERT = /* glsl */ `
attribute float aSeed;
attribute float aSize;
uniform float uTime;
uniform float uScale;
uniform float uBlink;
varying float vA;
void main() {
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float b = mix(1.0, step(0.55, fract(uTime * 0.5 + aSeed)), uBlink);
  vA = b;
  gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 1.0, 64.0);
}
`;

export const DOT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, r));
  a = a * a * uOpacity * vA;
  gl_FragColor = vec4(uColor, a);
}
`;

// ---------- the cut-open tower ----------

// One box per flat, drawn from inside (BackSide): floor, ceiling, back and side walls, lit by its own lamp.
export const ROOM_VERT = /* glsl */ `
attribute vec4 aR; // centre x, floor level y, centre z, household index
attribute vec4 aS; // width, height, depth, seed
varying vec3 vP;
varying vec3 vN;
varying vec4 vS;
varying float vU;
varying vec3 vW;
void main() {
  vec3 L = vec3(position.x * aS.x, position.y * aS.y, position.z * aS.z);
  vec3 Wp = L + aR.xyz;
  vP = L;
  vN = normal;
  vS = aS;
  vU = aR.w;
  vW = Wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(Wp, 1.0);
}
`;

export const ROOM_FRAG = /* glsl */ `
uniform sampler2D uHH;  // lit, yes, no, gone
uniform sampler2D uHH2; // tenant, subdivided, noise, mark
uniform float uTime;
uniform float uNight;
uniform float uVote;
uniform float uAge;
uniform float uDim;
uniform vec3 uFogC;
uniform float uFogD;
varying vec3 vP;
varying vec3 vN;
varying vec4 vS;
varying float vU;
varying vec3 vW;
${COMMON}
void main() {
  vec3 n = normalize(vN);
  float unit = mod(vU, 4.0);
  float fl = floor(vU / 4.0 + 0.01);
  vec2 tc = vec2((unit + 0.5) / 4.0, (fl + 0.5) / 33.0);
  vec4 a = texture2D(uHH, tc);
  vec4 b = texture2D(uHH2, tc);
  float lit = a.r;
  float yes = a.g;
  float no = a.b;
  float gone = a.a;
  float tenant = b.r;
  float sub = b.g;
  float noise = b.b;
  float mark = b.a;
  float W = vS.x;
  float Hh = vS.y;
  float D = vS.z;
  float seed = vS.w;
  float face = 3.0; // 0 floor, 1 ceiling, 2 back wall, 3 side wall
  vec2 uv = vec2(vP.z / D + 0.5, vP.y / Hh);
  if (n.y > 0.5) { face = 1.0; uv = vec2(vP.x / W + 0.5, vP.z / D + 0.5); }
  else if (n.y < -0.5) { face = 0.0; uv = vec2(vP.x / W + 0.5, vP.z / D + 0.5); }
  else if (n.z < -0.5) { face = 2.0; uv = vec2(vP.x / W + 0.5, vP.y / Hh); }

  float pickW = h11(seed * 7.3);
  vec3 wallC = pickW < 0.45 ? vec3(0.62, 0.55, 0.46) : (pickW < 0.75 ? vec3(0.5, 0.53, 0.56) : vec3(0.58, 0.47, 0.4));
  vec3 floorC = mix(vec3(0.34, 0.23, 0.15), vec3(0.45, 0.42, 0.38), step(0.5, h11(seed * 3.1)));
  vec3 lampC = mix(vec3(1.0, 0.7, 0.4), vec3(0.82, 0.9, 1.0), tenant);
  vec3 dl = vP - vec3(0.0, Hh - 0.1, 0.0);
  float fall = 1.0 / (1.0 + dot(dl, dl) * 0.11);
  float bright = 0.45 + 0.6 * h11(seed * 13.0 + fl * 0.37);
  float I = lit * bright * (0.25 + 1.05 * fall);
  if (sub > 0.5) {
    float cell = floor(clamp(vP.x / W + 0.5, 0.0, 0.999) * 3.0);
    float on = step(0.3, h11(cell + seed * 9.0 + fl));
    I = on * (0.45 + 0.9 * fall) * max(lit, 0.6);
    lampC = mix(vec3(1.0, 0.86, 0.7), vec3(0.78, 0.9, 1.0), h11(cell * 3.0 + seed));
  }
  vec3 base = face < 0.5 ? floorC : (face < 1.5 ? vec3(0.92, 0.9, 0.86) : wallC);
  vec3 col = base * (0.02 + 0.03 * (1.0 - uNight)) + base * lampC * I * 0.62;
  // depth: the back of the room is darker than the front, where the cut is
  col *= mix(0.62, 1.0, clamp((vP.z / D) + 0.5, 0.0, 1.0));

  if (face > 1.5 && face < 2.5) {
    float x = uv.x;
    float y = uv.y * Hh;
    float furn = (1.0 - 0.75 * tenant) * (1.0 - gone) * (1.0 - sub);
    float sofa = band(x, 0.1 + 0.1 * h11(seed), 0.42, 0.004) * band(y, 0.0, 0.8, 0.01);
    float tv = band(x, 0.62, 0.84, 0.004) * band(y, 0.95, 1.6, 0.01);
    float shelf = band(x, 0.88, 0.96, 0.004) * band(y, 0.0, 2.1, 0.01);
    float pic = band(x, 0.18, 0.32, 0.004) * band(y, 1.35, 1.85, 0.01);
    col = mix(col, col * 0.35, clamp(sofa + shelf, 0.0, 1.0) * furn);
    col = mix(col, vec3(0.03, 0.05, 0.08) + vec3(0.25, 0.4, 0.6) * 0.15 * lit * (0.7 + 0.3 * sin(uTime * 7.0 + seed * 30.0)), tv * furn);
    col = mix(col, col * 0.55 + vec3(0.1, 0.07, 0.04) * lit, pic * furn);
    float outer = step(unit, 0.5) + step(2.5, unit);
    float win = outer * band(x, 0.46, 0.58, 0.004) * band(y, 0.9, 2.2, 0.01);
    col = mix(col, vec3(0.015, 0.02, 0.04) + vec3(0.05, 0.06, 0.1) * (1.0 - uNight), win);
    float p1 = sub * (band(x, 0.325, 0.343, 0.002) + band(x, 0.657, 0.675, 0.002));
    col = mix(col, vec3(0.35, 0.33, 0.3) * (0.15 + 0.5 * I), clamp(p1, 0.0, 1.0));
  }
  if (face > 0.5 && face < 1.5) {
    float r = length(vP.xz);
    col += lampC * lit * bright * (1.0 - smoothstep(0.12, 0.42, r)) * 1.8;
  }
  if (face < 0.5) {
    col += lampC * I * base * 0.25 * (1.0 - smoothstep(0.0, 4.0, length(vP.xz)));
  }
  // a home that has gone dark: bare and dusty
  col = mix(col, base * 0.035 + vec3(0.006), gone);
  // votes, the noise, "you"
  vec3 vc = yes * vec3(0.12, 0.9, 0.48) + no * vec3(1.0, 0.18, 0.2);
  float va = clamp(yes + no, 0.0, 1.0) * uVote;
  float onBack = (face > 1.5 && face < 2.5) ? 0.95 : 0.55;
  col = mix(col, vc * onBack, va * 0.88);
  col += vec3(1.0, 0.22, 0.12) * noise * 1.1;
  col = mix(col, col * 0.7 + vec3(1.0, 0.72, 0.25) * 0.7, mark * 0.8);
  col *= 1.0 - 0.3 * uAge * (1.0 - 0.6 * lit);
  float camD = length(vW - cameraPosition);
  col = fogIt(col, camD, uFogC, uFogD, 0.3) * uDim;
  gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(8.0)), 1.0);
}
`;

// Slabs and party walls of the cut-open tower: bare concrete, the cut faces catch a little light.
export const CONC_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const CONC_FRAG = /* glsl */ `
uniform float uNight;
uniform float uDim;
uniform float uAge;
uniform vec3 uFogC;
uniform float uFogD;
varying vec3 vN;
varying vec3 vW;
${COMMON}
void main() {
  vec3 n = normalize(vN);
  vec3 c = vec3(0.56, 0.54, 0.5) * (1.0 - 0.25 * uAge);
  float front = clamp(n.z, 0.0, 1.0);
  float lightK = 0.05 + 0.1 * (1.0 - uNight) + 0.12 * front + 0.05 * clamp(n.y, 0.0, 1.0);
  vec3 col = c * lightK + vec3(1.0, 0.7, 0.45) * 0.02 * front;
  float camD = length(vW - cameraPosition);
  col = fogIt(col, camD, uFogC, uFogD, 0.0) * uDim;
  gl_FragColor = vec4(col, 1.0);
}
`;

// People: dark silhouettes with a warm rim from the rooms.
export const PERSON_FRAG = /* glsl */ `
uniform float uDim;
uniform float uGrey;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float rim = 1.0 - abs(dot(normalize(vN), v));
  vec3 col = mix(vec3(0.035, 0.03, 0.03), vec3(0.3, 0.29, 0.28), uGrey) + vec3(1.0, 0.68, 0.38) * rim * rim * rim * 0.12;
  gl_FragColor = vec4(col * uDim, 1.0);
}
`;
