/**
 * The evening half of the Blask sky (GLSL, spliced into skyShader after the ribbon): the ground,
 * the beam and the blinds, ported with their structure, parameters and motion and recoloured
 * into the palette. Relies on the sky's uniforms, colour constants, `hash11`, `hash21` and
 * `noise`.
 */
export const nocLight = /* glsl */ `
/* ---------------------------------------------------------------------------------------- */
/* The ground: paper, a long dusk into the night that then holds to the end                 */
/* ---------------------------------------------------------------------------------------- */

// 0 on paper, 1 in the night. The edges bow (the sides go first) and drift slowly.
float depthAt(vec2 uv, float aspect) {
  float bow = pow((uv.x - 0.5) * aspect, 2.0) * 0.03;
  float drift = (noise(vec2(uv.x * aspect * 1.4, uv.y * 1.2) + uTime * 0.02) - 0.5) * 0.06;
  float y = uv.y - bow + drift;
  float a = clamp((uDusk.x - y) / max(uDusk.x - uDusk.y, 0.001), 0.0, 1.0);
  return smoothstep(0.0, 1.0, a);
}

// Paper, mist, haze, periwinkle, a violet evening, dusk, the raised night, the night.
vec3 groundAt(float d) {
  vec3 evening = mix(LAVENDER, IRIS, 0.42) * 0.78;
  vec3 c = mix(PAPER, MIST, smoothstep(0.0, 0.16, d));
  c = mix(c, HAZE, smoothstep(0.08, 0.3, d));
  c = mix(c, PERI, smoothstep(0.22, 0.44, d));
  c = mix(c, evening, smoothstep(0.36, 0.58, d));
  c = mix(c, DUSK, smoothstep(0.5, 0.76, d));
  c = mix(c, NIGHT_RAISED, smoothstep(0.7, 0.9, d));
  return mix(c, NIGHT, smoothstep(0.84, 1.0, d));
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

/* ---------------------------------------------------------------------------------------- */
/* The beam, in the palette                                                                 */
/* ---------------------------------------------------------------------------------------- */

const vec3 C_CORE = PEARL;
const vec3 C_GLOW = LAVENDER;
const vec3 C_HAZE = vec3(0.2, 0.26, 0.86);
const vec3 C_LILAC = MOON;
const vec3 C_SHADOW = vec3(0.03, 0.045, 0.16);
const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);

float fogFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = OCT * p;
    a *= 0.5;
  }
  return v;
}

float fogFbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = OCT * p;
    a *= 0.5;
  }
  return v;
}

// One layer of thin streaks rising around the beam.
float sparks(vec2 p, float cols, float seed, float spread, float t) {
  float cx = p.x * cols;
  float id = floor(cx);
  float fx = fract(cx) - 0.5;
  float h = hash11(id * 1.37 + seed);
  float near = exp(-abs(p.x) / spread);
  float alive = step(h, near * 0.9 + 0.006);
  float speed = 0.06 + 0.22 * hash11(id + 3.1 + seed);
  float len = 0.03 + 0.12 * hash11(id + 7.7 + seed);
  float s = fract(p.y * 0.9 - t * speed + h * 13.0);
  float seg = smoothstep(len, 0.0, s) * step(0.0, s);
  seg *= smoothstep(0.0, len * 0.25, s);
  float width = exp(-fx * fx * 40.0);
  float bright = 0.35 + 0.65 * hash11(id + 11.3 + seed);
  return alive * seg * width * bright * (0.3 + 0.7 * near);
}

// The beam's light (before tone mapping) and, through 'occlusion', how much its fog hides the
// ground. Its frame: x in screen heights from the axis, y with the ground at 0.1,
// so the whole scene (fog, sparks, streaks, splash) scrolls away with the ground.
vec3 shadeBeam(vec2 uv, float aspect, out float occlusion) {
  occlusion = 0.0;
  float t = uTime;
  const float IMPACT = 0.1;
  vec2 p = vec2((uv.x - uBeamX) * aspect, uv.y - uImpact + IMPACT);
  float ax = abs(p.x);

  // Ground streaks first: their derivatives must be taken before any early exit.
  float gy = max(p.y - (IMPACT - 0.16), 0.0005);
  float gx = max(ax, 0.0005);
  float fam = (log(gx) + 0.85 * log(gy)) * 13.0;
  float fw = fwidth(fam);
  // Far below its ground the scene has nothing left to give.
  if (p.y < -0.32) return vec3(0.0);

  float landed = smoothstep(0.82, 1.0, uIgnite);
  // From the strand both ways: down to the ground, up past the top of the frame.
  float down = mix(uOffsetY, uImpact, uIgnite);
  float up = mix(uOffsetY, 1.12, uIgnite);
  float reach = smoothstep(down - 0.004, down + 0.07, uv.y)
    * smoothstep(up + 0.004, up - 0.07, uv.y)
    * smoothstep(IMPACT - 0.03, IMPACT + 0.01, p.y);

  // Beam profile: a hard core, a soft glow and a wide haze; the base spreads near the ground.
  float wob = (noise(vec2(uv.y * 5.0, t * 0.6)) - 0.5) * 0.0024;
  float dx = p.x + wob;
  float base = smoothstep(0.42, IMPACT, p.y);
  float sCore = 0.0016 + 0.004 * base * base;
  float core = exp(-dx * dx / (sCore * sCore));
  float glow = exp(-abs(dx) / (0.011 + 0.035 * base * base));
  float haze = exp(-abs(dx) / (0.08 + 0.12 * base));
  float wide = exp(-abs(dx) / 0.42);
  float shimmer = 0.72 + 0.28 * noise(vec2(uv.y * 34.0 - t * 5.0, 3.0))
    + 0.18 * noise(vec2(uv.y * 140.0 + t * 9.0, 7.0));
  float topFade = mix(0.5, 1.0, smoothstep(1.0, 0.45, uv.y));

  vec3 col = vec3(0.0);
  // Large ambient haze lit by the beam (present only once it is burning).
  float lit = reach * topFade;
  col += C_HAZE * wide * 0.16 * mix(lit, landed, 0.6);

  // Fog: domain-warped fbm drifting up, denser near the ground, lit by the beam; it stays with
  // its ground and thins out below it.
  vec2 fp = vec2(p.x * 1.15, p.y * 0.95) * 2.4;
  fp.y -= t * 0.045;
  vec2 warp = vec2(fogFbm3(fp + vec2(0.0, t * 0.02)), fogFbm3(fp + vec2(5.2, 1.3) - t * 0.015));
  vec2 q = fp + 1.7 * warp;
  float d = fogFbm(q);
  // Self-shadowing: compare with a sample taken toward the beam.
  float d2 = fogFbm(q + vec2(-sign(p.x) * 0.22, -0.08));
  float rim = clamp((d - d2) * 3.2 + 0.5, 0.0, 1.0);
  float ground = mix(1.35, 0.55, smoothstep(0.05, 0.85, p.y)) * smoothstep(-0.3, 0.04, p.y);
  float density = smoothstep(0.36, 0.8, d) * ground;
  float light = 1.0 / (1.0 + 7.0 * ax) * (0.25 + 0.75 * lit) * mix(0.35, 1.0, landed);
  vec3 fogLit = mix(C_HAZE * 0.9, C_LILAC, rim * light);
  occlusion = density * 0.7;
  col += mix(C_SHADOW * 0.9, fogLit, light) * density * (0.35 + 1.2 * light);

  // The beam itself.
  vec3 beam = C_CORE * core * 2.6 * shimmer + C_GLOW * glow * 1.25 * shimmer + C_HAZE * haze * 0.5;
  col += beam * lit;
  // Its ends while it is still reaching: points of light running out of the strand.
  float tips = exp(-pow((uv.y - down) / 0.035, 2.0)) + 0.6 * exp(-pow((uv.y - up) / 0.035, 2.0));
  col += C_CORE * tips * exp(-ax / 0.02) * (1.0 - landed) * step(0.01, uIgnite) * 2.0;

  // Rising sparks: thin vertical streaks, denser near the beam.
  float sp = sparks(p, 260.0, 0.0, 0.09, t);
  sp += sparks(p + vec2(0.0019, 0.0), 420.0, 17.0, 0.05, t * 1.3) * 0.8;
  if (uDetail > 0.5) sp += sparks(p + vec2(0.0007, 0.0), 160.0, 41.0, 0.12, t * 0.8) * 0.6;
  float spMask = smoothstep(IMPACT - 0.02, IMPACT + 0.1, p.y) * mix(1.0, 0.35, smoothstep(0.3, 1.0, uv.y));
  col += mix(C_GLOW, C_CORE, 0.5) * sp * spMask * lit * 1.7;

  // Ground: curved streaks that leave the impact flat along the floor and bend up into the beam.
  float side = step(0.0, p.x);
  float sid = floor(fam) + side * 97.0;
  float sf = fract(fam) - 0.5;
  float line = smoothstep(0.06 + fw, 0.06 - fw * 0.5, abs(sf)) * 0.6 + exp(-sf * sf * 80.0) * 0.4;
  float along = log(gx) - 0.7 * log(gy);
  float hs = hash11(sid * 3.7);
  float slen = 0.25 + 0.5 * hash11(sid + 5.0);
  float ss = fract(along * 0.55 - t * (0.12 + 0.2 * hs) + hs * 9.0);
  float seg = smoothstep(0.0, 0.08, ss) * smoothstep(slen, slen * 0.4, ss);
  float gfade = exp(-ax / 0.42) * smoothstep(0.42, 0.06, p.y) * smoothstep(0.0012, 0.02, ax)
    * smoothstep(-0.06, 0.04, p.y);
  float streaks = line * seg * gfade * (0.35 + 0.65 * hash11(sid + 2.0));
  col += mix(C_HAZE, C_LILAC, 0.55) * streaks * 1.3 * landed;

  // Lit floor and the splash where the beam lands.
  float dy = p.y - IMPACT;
  float floorGlow = exp(-ax / 0.38) * smoothstep(IMPACT + 0.08, 0.0, p.y) * smoothstep(-0.24, 0.0, p.y);
  col += mix(C_HAZE, C_LILAC, 0.4) * floorGlow * 0.55 * landed;
  float splash = exp(-(dx * dx) / (0.07 * 0.07) - (dy * dy) / (0.018 * 0.018));
  float splashWide = exp(-(dx * dx) / (0.3 * 0.3) - (dy * dy) / (0.06 * 0.06));
  float pulse = 0.92 + 0.08 * sin(t * 2.1) + 0.05 * noise(vec2(t * 3.0, 1.0));
  col += C_CORE * splash * (1.6 * landed * pulse + uFlare * 2.2);
  col += C_GLOW * splashWide * (0.5 * landed * pulse + uFlare * 1.1);

  occlusion *= uBeamLevel;
  return col * uBeamLevel;
}

/* ---------------------------------------------------------------------------------------- */
/* The blinds, in iris, lavender and pearl light                                            */
/* ---------------------------------------------------------------------------------------- */

// Light that one slat lets through: a soft window along the slat, offset per slat.
float window(float along, float center, float id, float halfLen, float soft) {
  float jitter = (hash11(id * 7.31) - 0.5) * 0.14 + (hash11(id * 1.9 + 4.0) - 0.5) * 0.05;
  float a = abs(along - center - jitter);
  return smoothstep(halfLen + soft, halfLen - soft, a);
}

// The rank stage's own frame: 0–1 up its height; 'mask' fades its top and bottom edges.
vec3 shadeBlinds(vec2 uv, float aspect, out float mask) {
  float t = uTime;
  float sweep = uBlinds.z;
  float pulse = uBlinds.w;
  vec2 bu = vec2(uv.x, (uv.y - uBlinds.x) / max(uBlinds.y - uBlinds.x, 0.001));
  mask = smoothstep(0.0, 0.12, bu.y) * smoothstep(1.0, 0.88, bu.y);
  vec2 p = (bu - 0.5) * vec2(aspect, 1.0);

  // Slats run from top-left to bottom-right; "across" climbs from bottom-left to top-right.
  const float R = 0.70710678;
  float along = dot(p, vec2(R, -R));
  float across = dot(p, vec2(R, R));

  float period = mix(0.07, 0.085, step(1.0, aspect));
  float k = across / period;
  float id = floor(k);
  float f = fract(k);
  float soft = 0.05 + 0.05 * hash11(id + 2.0);
  float slat = smoothstep(0.02, 0.02 + soft * 2.0, f) * smoothstep(0.98, 0.98 - soft * 2.5, f);
  // A faint bevel: the upper edge of each slat catches a little more light.
  float bevel = smoothstep(0.55, 0.9, f) * slat;

  // The beam crosses the slats with the sweep, from left to right on wide screens and more
  // steeply on tall ones, so it always passes through the visible frame.
  float rise = mix(0.3, 0.14, smoothstep(0.6, 1.4, aspect));
  vec2 centre = mix(vec2(-0.58 * aspect, rise), vec2(0.4 * aspect, -rise), sweep);
  float c = dot(centre, vec2(R, -R));
  float ac = dot(centre, vec2(R, R));
  float breath = 0.03 * sin(t * 0.7);
  float spread = 0.26 + 0.12 * pulse;

  float beam = window(along, c + breath, id, 0.15 + 0.06 * pulse, 0.07);
  beam *= exp(-pow((across - ac) / spread, 2.0));
  // A weaker echo higher up the blinds.
  float echo = window(along, c - 0.48, id + 31.0, 0.1, 0.06);
  echo *= exp(-pow((across - ac - 0.32) / 0.16, 2.0)) * 0.7;

  float through = (beam + echo) * slat;
  float intensity = through * (1.0 + pulse * 0.9);
  // Light scattered in the air between the slats: the slight blur of the reference.
  float halo = exp(-pow((along - c) / 0.32, 2.0) - pow((across - ac) / (spread * 1.6), 2.0));
  float halo2 = exp(-pow((along - c + 0.48) / 0.22, 2.0) - pow((across - ac - 0.32) / 0.24, 2.0));

  vec3 slatCol = NIGHT_RAISED * 1.25;
  vec3 deep = mix(IRIS, COBALT, 0.3) * 0.7;
  vec3 col = NIGHT * (0.75 + 0.25 * noise(p * 3.0 + t * 0.05));
  col = mix(col, slatCol, slat * 0.32);
  col += slatCol * bevel * 0.18;
  col += deep * (halo * 0.48 + halo2 * 0.24) * (1.0 + pulse);
  // Through the slats the light runs iris at its edges, lavender, then pearl where it is hot.
  col = mix(col, mix(IRIS, LAVENDER, 0.25), clamp(intensity * 1.5, 0.0, 1.0));
  col = mix(col, LAVENDER, smoothstep(0.35, 0.95, intensity));
  col += LAVENDER * smoothstep(0.6, 1.4, intensity) * 0.3;
  col = mix(col, PEARL, smoothstep(0.82, 1.45, intensity + halo * 0.25));

  // Darken toward the corners and lay heavy grain over everything.
  vec2 v = bu - 0.5;
  col *= 1.0 - dot(v, v) * 1.1;
  float grain = hash21(gl_FragCoord.xy + fract(t * 11.0) * 431.0) - 0.5;
  col += grain * 0.09;
  col *= 0.94 + 0.06 * hash21(floor(gl_FragCoord.xy / 2.0) + 17.0);
  return max(col, vec3(0.0));
}
`
