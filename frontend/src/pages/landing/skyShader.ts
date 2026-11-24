import { nocLight } from './NocLight'

/**
 * The Blask sky: one full-screen fragment shader for the whole scroll story.
 *
 * The ground: the paper. A long page-space gradient scrolls with the page: the dusk sinks the
 * paper through mist, haze and a violet evening into the night of the ribbon's deepest blue, which
 * then holds to the end. Its edge bows and drifts a little, so it never arrives as a flat line.
 * Dark mode (uNight) makes the whole ground night from the top; the glass then glows on it and
 * deepens, instead of paling, under the hero's text.
 * Paper: the liquid-glass ribbon (domain-warped height field, Fresnel rim, specular streaks,
 * cobalt folds and faint plum reflections) with a thread of light along its crease (pearl core,
 * cobalt glow) and the faintest lavender glint behind it.
 * The beam: the ribbon is drawn together, thins to a strand and stands up on the beam's axis while
 * the dusk falls; from the strand the beam reaches both ways (hard pearl core, lavender glow,
 * wide cobalt haze, domain-warped fog lit by it, thin sparks rising, curved streaks along the
 * ground and a splash where it lands), tone-mapped and screened over the ground.
 * The rank: the blinds (diagonal slats, a broad light crossing them, stepped per slat,
 * heavy grain) painted inside the rank stage's rectangle, in iris, lavender and pearl light.
 *
 * Everything is opaque (paper is painted here too), so the canvas never needs a backdrop, and the
 * expensive parts are skipped when they cannot contribute.
 */
export const skyFragment = /* glsl */ `
uniform float uPhase;      // integrated ribbon time
uniform float uReveal;     // 0–1 pour-in of the ribbon from the left
uniform float uThickness;  // band thickness multiplier (sets the pattern scale)
uniform float uThin;       // extra multiplier of the band's height only (the strand)
uniform float uOffsetY;    // band center, uv y
uniform float uReflection; // lower reflection band
uniform float uPointer;    // 0 until the mouse moves
uniform vec4 uCalm;        // uv rect where text sits: the glass goes pale there
uniform float uRibbon;     // opacity of the glass
uniform float uThread;     // brightness of the thread of light
uniform float uThreadDraw; // 0–1 draw-in of the thread along the band
uniform float uAlong;      // along-band scale: < 1 draws the ribbon together
uniform float uStand;      // 0–1 rotation of the band to vertical around the pivot
uniform float uBeamX;      // uv x of the beam axis
uniform float uPivotX;     // uv x the ribbon gathers to and stands up around (meets uBeamX)
uniform float uGlint;      // faint vertical glint on paper
uniform vec2 uDusk;        // uv y where the dusk leaves the paper and where the night is full
uniform float uIgnite;     // 0–1 reach of the beam from the strand
uniform float uImpact;     // uv y where the beam lands
uniform float uFlare;      // flash of the landing splash (~1.6 at the landing)
uniform float uBeamLevel;  // exposure of the beam's scene (dims as its ground scrolls away)
uniform float uDetail;     // 1 on large screens, 0 on phones (fewer spark layers)
uniform float uGlow;       // 0–1 soft glow of the light's answers (coin, rank)
uniform float uHeadY;      // uv y of the line's head
uniform float uHead;       // 0–1 glow at the head
uniform vec4 uBlinds;      // rank stage: uv y of its bottom and top, sweep 0–1, pulse 0–1
uniform float uNight;      // 0–1 dark mode: the whole ground is night and the glass dims under text

const float PI = 3.14159265;
const vec3 PAPER = vec3(0.9647, 0.9686, 0.9843);
const vec3 MIST = vec3(0.9333, 0.9412, 0.9961);
const vec3 HAZE = vec3(0.8667, 0.8902, 1.0);
const vec3 PERI = vec3(0.6863, 0.7529, 1.0);
const vec3 LAVENDER = vec3(0.5569, 0.6078, 1.0);
const vec3 COBALT = vec3(0.1686, 0.2314, 1.0);
const vec3 IRIS = vec3(0.4235, 0.2314, 0.9569);
const vec3 PEARL = vec3(0.9843, 0.9804, 1.0);
const vec3 MOON = vec3(0.7647, 0.7882, 0.9608);
const vec3 DUSK = vec3(0.1020, 0.1373, 0.4510);
const vec3 NIGHT_RAISED = vec3(0.0471, 0.0706, 0.2510);
const vec3 NIGHT = vec3(0.0235, 0.0392, 0.1686);
const vec3 PLUM = vec3(0.37, 0.13, 0.27);

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}


float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Signed value noise with quintic fade, -1 to 1 (the ribbon's).
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

// Unsigned value noise with cubic fade, 0 to 1.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

const mat2 ROT = mat2(0.8, -0.6, 0.6, 0.8);

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = ROT * p * 2.03 + 11.7;
    a *= 0.42;
  }
  return s;
}

/* ---------------------------------------------------------------------------------------- */
/* Ribbon, with the thread of light                                                         */
/* ---------------------------------------------------------------------------------------- */

float flowField(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.11)), fbm(p + vec2(5.2, 1.3) - t * 0.07));
  vec2 r = vec2(
    fbm(p + 1.6 * q + vec2(1.7, 9.2) + t * 0.13),
    fbm(p + 1.6 * q + vec2(8.3, 2.8) - t * 0.09)
  );
  return fbm(p + 1.9 * r);
}

float revealFront() {
  return mix(-0.3, 1.3, uReveal);
}

float bandX(float x, float aspect) {
  return x * aspect / (0.25 * max(uThickness, 0.05)) / 4.6;
}

// center (uv y), half thickness (uv y), crease position (band units)
vec3 geometry(float xn, float xs, float t) {
  float k = uThickness * uThin / 1.35;
  float c = uOffsetY + k * (
    0.055 * sin(xs * 1.9 + t * 0.21 + 0.6)
    + 0.032 * sin(xs * 4.3 - t * 0.27 + 2.1)
    + 0.022 * fbm(vec2(xs * 1.1, t * 0.06))
  );
  float h = 0.125 + 0.035 * sin(xs * 3.0 + t * 0.17 + 1.0) + 0.02 * sin(xs * 6.7 - t * 0.23);
  float front = revealFront();
  h *= 1.0 + 0.45 * exp(-pow((xn - front) / 0.08, 2.0)) * (1.0 - uReveal);
  // Drawn together, the band narrows to points at both ends instead of ending square.
  float taper = smoothstep(-0.36, 0.0, xn) * (1.0 - smoothstep(front - 0.3, front + 0.02, xn));
  h *= mix(1.0, mix(0.12, 1.0, taper), clamp((1.0 - uAlong) * 3.0, 0.0, 1.0));
  float cr = 0.22 * sin(xs * 2.6 - t * 0.19 + 0.4) + 0.1 * sin(xs * 5.3 + t * 0.13) - 0.06;
  return vec3(c, h * uThickness * uThin, cr);
}

float profile(float v, float cr) {
  if (v > cr) {
    float l = clamp((v - cr) / (1.0 - cr), 0.0, 1.0);
    return sin(PI * pow(l, 0.62));
  }
  float l = clamp((v + 1.0) / (cr + 1.0), 0.0, 1.0);
  return sin(PI * mix(0.22, 1.0, pow(l, 1.15)));
}

float heightAt(vec2 uv, vec2 screen, float t, float aspect, out float v, out vec3 g, out float flow) {
  float xs = bandX(uv.x, aspect);
  g = geometry(uv.x, xs, t);
  v = (uv.y - g.x) / g.y;
  float prof = profile(clamp(v, -1.0, 1.0), g.z);
  vec2 fp = vec2(xs * 2.0 - t * 0.05, v * 0.38 + g.x * 1.5);
  flow = smoothstep(0.18, 0.82, flowField(fp, t) * 0.5 + 0.5);
  float detail = fbm(vec2(fp.x * 3.2, fp.y * 5.5) + flow * 1.8 + t * 0.04);
  vec2 dm = (screen - uMouse) * vec2(aspect, 1.0);
  float md = length(dm);
  float bulge = exp(-md * md / 0.014) * 0.32 + sin(md * 38.0 - t * 3.2) * exp(-md * 8.0) * 0.035;
  return prof * 0.38 + flow * 0.95 - 0.08 + detail * 0.07 + bulge * uPointer * (1.0 - uStand);
}

vec3 ramp(float d) {
  vec3 c = vec3(1.0);
  c = mix(c, vec3(0.80, 0.85, 1.0), smoothstep(0.0, 0.22, d));
  c = mix(c, vec3(0.53, 0.60, 1.0), smoothstep(0.2, 0.42, d));
  c = mix(c, vec3(0.24, 0.29, 0.96), smoothstep(0.4, 0.6, d));
  c = mix(c, vec3(0.17, 0.16, 0.84), smoothstep(0.58, 0.8, d));
  c = mix(c, vec3(0.12, 0.08, 0.48), smoothstep(0.76, 1.0, d));
  return c;
}

float calmAt(vec2 uv) {
  vec2 d = max(uCalm.xy - uv, uv - uCalm.zw);
  float dist = length(max(d, 0.0));
  return (uCalm.z > uCalm.x) ? 1.0 - smoothstep(0.0, 0.07, dist) : 0.0;
}

// The band's own frame: drawn together along its length and stood up around the pivot.
vec2 ribbonSpace(vec2 uv, float aspect) {
  vec2 pivot = vec2(uPivotX, uOffsetY);
  vec2 q = (uv - pivot) * vec2(aspect, 1.0);
  float th = uStand * 0.5 * PI;
  float c = cos(th);
  float s = sin(th);
  vec2 r = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  r.x /= max(uAlong, 0.02);
  return pivot + r / vec2(aspect, 1.0);
}

// Glass (premultiplied) in .rgba and the thread (premultiplied) returned through 'thread'.
vec4 shadeRibbon(vec2 uv, vec2 screen, float t, float aspect, out vec4 thread) {
  thread = vec4(0.0);
  float v;
  vec3 g;
  float flow;
  // Cheap reject: far outside the band nothing is drawn.
  float xs0 = bandX(uv.x, aspect);
  vec3 g0 = geometry(uv.x, xs0, t);
  if (abs(uv.y - g0.x) > g0.y * 1.35 + 0.01) return vec4(0.0);

  float H = heightAt(uv, screen, t, aspect, v, g, flow);
  float mask = smoothstep(-1.0, -0.9, v) * (1.0 - smoothstep(0.2, 1.1, v));
  float front = revealFront() + 0.035 * sin(uv.y * 16.0 + t * 1.3);
  // Both ends taper like the pouring front, so the band reads as one piece when drawn together.
  float rev = (1.0 - smoothstep(front - 0.14, front, uv.x)) * smoothstep(-0.34, -0.2, uv.x);
  float alpha = mask * rev;
  if (alpha < 0.002) return vec4(0.0);

  // The thread of light along the crease (pearl core, cobalt glow), with a glint running in it.
  float dv = (v - g.z) * g.y;
  float within = smoothstep(-0.95, -0.7, v) * (1.0 - smoothstep(0.7, 0.95, v));
  float drawn = 1.0 - smoothstep(-0.12, 0.0, uv.x - mix(-0.2, 1.35, uThreadDraw));
  float width = mix(0.0026, 0.0016, uStand);
  float run = 0.55 + 0.45 * pow(max(0.5 + 0.5 * sin(xs0 * 2.4 - t * 2.6), 0.0), 5.0);
  float coreT = exp(-pow(dv / width, 2.0));
  float glowT = exp(-abs(dv) / 0.012) * 0.28;
  float tm = (coreT + glowT) * within * drawn * rev;
  // Quieter where text sits over the glass.
  float ta = clamp(tm * uThread * run * (1.0 - 0.6 * calmAt(screen) * (1.0 - uStand)), 0.0, 1.0);
  vec3 threadCol = mix(COBALT, PEARL, coreT / (coreT + glowT + 0.0001));
  thread = vec4(threadCol * ta, ta);

  if (uRibbon < 0.002) return vec4(0.0);

  float e = 3.0 / uResolution.y;
  float v2;
  vec3 g2;
  float f2;
  float hx = heightAt(uv + vec2(e / aspect, 0.0), screen, t, aspect, v2, g2, f2);
  float hy = heightAt(uv + vec2(0.0, e), screen, t, aspect, v2, g2, f2);
  vec2 grad = vec2(hx - H, hy - H) / e;
  vec3 n = normalize(vec3(-grad * 0.042, 1.0));

  float calm = calmAt(screen) * (1.0 - uStand);
  float d = clamp(H, 0.0, 1.1) * mix(0.35, 1.0, mask);
  d *= mix(0.7, 1.0, smoothstep(0.0, 0.25, uv.x));
  d = clamp((d - 0.5) * 1.4 + 0.52, 0.0, 1.15);
  // Under the text the glass goes pale on paper and deep on the night (the headline stays legible).
  d = mix(d * (1.0 - 0.75 * calm), mix(d, 1.1, 0.65 * calm), uNight);

  vec3 col = ramp(d);
  float side = clamp(dot(n.xy, normalize(vec2(0.65, -0.76))) * 3.2, 0.0, 1.0);
  col = mix(col, PLUM, smoothstep(0.42, 0.68, d) * (1.0 - smoothstep(0.9, 1.08, d)) * side * 0.95);
  col = mix(col, vec3(0.22, 0.08, 0.30), smoothstep(0.92, 1.15, d) * 0.45);

  vec3 film = 0.5 + 0.5 * cos(2.0 * PI * (n.z * 3.0 + d * 0.8 + vec3(0.0, 0.33, 0.67)));
  col += (film - 0.5) * 0.1 * smoothstep(0.12, 0.4, d) * (1.0 - smoothstep(0.6, 0.9, d));

  float stripes = sin(uv.y * 900.0 + H * 16.0 + flow * 9.0);
  col *= 1.0 + 0.045 * stripes * smoothstep(0.35, 0.9, d);

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.45, 0.65, 0.62));
  vec3 L2 = normalize(vec3(0.6, -0.35, 0.72));
  float s1 = max(dot(n, normalize(L1 + V)), 0.0);
  float s2 = max(dot(n, normalize(L2 + V)), 0.0);
  float fres = pow(1.0 - n.z, 3.0);
  col = mix(col, vec3(0.93, 0.95, 1.0), fres * 0.45);
  col = mix(col, vec3(0.86, 0.9, 1.0), pow(s1, 5.0) * 0.22 * (1.0 - calm));
  float spec = pow(s1, 70.0) * 1.1 + pow(s2, 50.0) * 0.6 + pow(s1, 12.0) * 0.14;
  col += spec * (1.0 - 0.7 * calm);

  float crease = exp(-pow(dv / 0.0032, 2.0)) * 0.85 + exp(-abs(dv) / 0.02) * 0.22;
  col = mix(col, vec3(1.0), crease * within * 0.8);
  float lip = (v + 0.94) * g.y;
  col = mix(col, vec3(0.96, 0.97, 1.0), exp(-pow(lip / 0.0028, 2.0)) * 0.75);

  col = clamp(col, 0.0, 1.0);
  alpha *= (1.0 - mix(0.45, 0.7, uNight) * calm) * uRibbon;
  return vec4(col * alpha, alpha);
}

vec4 shadeReflection(vec2 uv, vec2 screen, float t, float aspect) {
  float c2 = uOffsetY - 0.205 * uThickness + 0.025 * sin(uv.x * 2.4 + t * 0.15);
  float h2 = 0.055 * uThickness;
  float v = (uv.y - c2) / h2;
  float xm = smoothstep(0.18, 0.6, uv.x) * (1.0 - smoothstep(0.92, 1.1, uv.x));
  float m = exp(-v * v * 1.1) * xm;
  float rev = 1.0 - smoothstep(revealFront() - 0.35, revealFront() - 0.15, uv.x);
  float alpha = m * rev * uReflection;
  if (alpha < 0.003) return vec4(0.0);
  float f = fbm(vec2(uv.x * aspect * 1.1 - t * 0.04, v * 0.3 + t * 0.03)) * 0.5 + 0.5;
  float ell = length(vec2((uv.x - 0.64) * 2.3, v * 0.42));
  float d = clamp((1.05 - ell) * 1.15, 0.0, 1.0) * (0.7 + 0.55 * f);
  vec3 col = ramp(d * 0.95);
  col = mix(col, PLUM, smoothstep(0.55, 0.85, d) * smoothstep(0.1, -0.9, v) * 0.55);
  float ring = exp(-pow((ell - 0.9 - 0.04 * sin(t * 0.5)) / 0.06, 2.0));
  col = mix(col, vec3(0.97, 0.98, 1.0), ring * 0.55);
  alpha *= 1.0 - mix(0.6, 0.85, uNight) * calmAt(screen);
  return vec4(col * alpha, alpha);
}

${nocLight}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = vUv;
  float t = uPhase;

  float depth = max(depthAt(uv, aspect), uNight);
  vec3 col = groundAt(depth);
  float night = smoothstep(0.55, 0.95, depth);

  // Light: the beam's scene and the glow riding the head of the line, tone-mapped
  // and screened over the ground (which keeps its own colour wherever nothing shines).
  vec3 light = vec3(0.0);
  float occlusion = 0.0;
  if (uIgnite > 0.001 && uBeamLevel > 0.001) light += shadeBeam(uv, aspect, occlusion);
  if (uHead > 0.001) {
    float hx = (uv.x - uBeamX) * aspect;
    float halo = exp(-length(vec2(hx * 1.3, uv.y - uHeadY)) / 0.09);
    light += mix(C_HAZE, LAVENDER, 0.6) * halo * uHead * (0.3 + 0.35 * uGlow);
  }
  col *= 1.0 - min(occlusion, 0.8) * 0.55 * night;
  col = 1.0 - (1.0 - col) * (1.0 - aces(light * 1.15));

  // The faint lavender glint on paper: the first hint of the beam.
  if (uGlint > 0.001) {
    float dx = (uv.x - uBeamX) * aspect;
    float g = exp(-dx * dx / (0.0011 * 0.0011)) * 0.5 + exp(-abs(dx) / 0.016) * 0.2;
    float run = 0.65 + 0.35 * noise(vec2(uv.y * 6.0 - uTime * 0.5, 2.0));
    float fadeY = smoothstep(1.0, 0.55, uv.y) * smoothstep(-0.05, 0.4, uv.y);
    col = mix(col, LAVENDER, g * run * fadeY * uGlint * 0.55);
  }

  // The ribbon, in its own (possibly gathered and standing) frame, with its thread over it.
  if (uRibbon > 0.002 || uThread > 0.002) {
    vec2 ruv = (uAlong < 0.999 || uStand > 0.001) ? ribbonSpace(uv, aspect) : uv;
    vec4 thread;
    vec4 glass = shadeRibbon(ruv, uv, t, aspect, thread);
    if (uReflection > 0.003 && uRibbon > 0.002) {
      vec4 reflection = shadeReflection(uv, uv, t, aspect) * uRibbon;
      glass = glass + reflection * (1.0 - glass.a);
    }
    col = glass.rgb + col * (1.0 - glass.a);
    col = thread.rgb + col * (1.0 - thread.a);
  }

  // The rank: the blinds inside their stage.
  if (uBlinds.y > 0.0 && uBlinds.x < 1.0 && uBlinds.y > uBlinds.x) {
    float mask;
    vec3 blinds = shadeBlinds(uv, aspect, mask);
    col = mix(col, blinds, mask);
  }

  // In the night, the vignette and film grain.
  if (night > 0.001) {
    vec2 v = uv - vec2(0.5, 0.45);
    col *= 1.0 - dot(v, v) * 0.6 * night;
    float grain = hash21(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5;
    col += grain * 0.03 * night;
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
