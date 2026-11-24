/**
 * The finale's one fragment shader (closing + footer), drawn by FinaleCanvas on the night ground.
 *
 * Scene units: one unit is `uRef` CSS px (the viewport height, or 0.75 of its width on narrow
 * screens, so everything scales down on phones); y runs up from the canvas bottom.
 * - The helix (the closing): the ribbon's night form. Pearl strands twist out of a bright mass at
 *   the left edge, turn on their own axes (wide when facing us, thin and brighter edge-on), cool to
 *   lavender, iris and cobalt as they drift right and fade; an aurora haze and curtains behind,
 *   bokeh discs and fine particles around them, a little pointer parallax.
 * - The horizon (the footer): a thin curved planet limb low in the frame with a lit atmosphere, an
 *   anamorphic streak along it, the light bursting at its centre (pearl core, lavender glow, cobalt
 *   haze) and nebula wisps rising, rising into place and brightening with the scroll.
 * - The key word: a text mask (mipmapped, so its blur levels are the bloom) with mottled hot
 *   patches, iris / azure fringes, fine CRT scanlines, a faint row wobble and a subtle flicker. It
 *   starts as a faint headline and ignites with the burst.
 * Light is tone-mapped (ACES) and screened over the ground, then the sky's vignette and grain so
 * the seam with the story's sky above cannot be seen.
 */
export const finaleFragment = /* glsl */ `
uniform sampler2D uWord;
uniform float uRef;        // CSS px per scene unit
uniform float uWidth;      // canvas width in units
uniform float uPhase;      // integrated time of the strands
uniform vec4 uHelix;       // centre y, pour-in 0–1, flare (-1..1), top of the closing (units)
uniform vec4 uHorizon;     // line y, rise 0–1, burst 0–1, top of the footer (units)
uniform vec4 uWordBox;     // the word's texture quad in canvas CSS px (x0, y0, x1, y1; y up)
uniform float uWordLit;    // 0 faint, 1 ignited
uniform float uWordReady;  // the texture holds the word
uniform float uWordScale;  // texels per CSS px in the word's texture
uniform vec3 uView;        // canvas top in the viewport (CSS px), viewport height (CSS px), live 0/1
uniform float uDetail;     // 1 on large screens, 0 on phones

const float PI = 3.14159265;
const vec3 NIGHT = vec3(0.0235, 0.0392, 0.1686);
const vec3 NIGHT_RAISED = vec3(0.0471, 0.0706, 0.2510);
const vec3 PLANET = vec3(0.0118, 0.0216, 0.0941);
const vec3 COBALT = vec3(0.1686, 0.2314, 1.0);
const vec3 IRIS = vec3(0.4235, 0.2314, 0.9569);
const vec3 LAVENDER = vec3(0.5569, 0.6078, 1.0);
const vec3 PEARL = vec3(0.9843, 0.9804, 1.0);
const vec3 AZURE = vec3(0.26, 0.58, 1.0);
const vec3 HAZE = vec3(0.2, 0.26, 0.86);

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

const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = OCT * p;
    a *= 0.5;
  }
  return v;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

/* ---------------------------------------------------------------------------------------- */
/* The helix                                                                                  */
/* ---------------------------------------------------------------------------------------- */

// One layer of bokeh discs drifting right near the strands.
vec3 bokeh(vec2 q, float yc, float s, float t, float layer) {
  float cell = 0.15 - layer * 0.04;
  vec2 p = q - vec2(t * (0.014 + 0.01 * layer), 0.0) - (uMouse - 0.5) * vec2(0.05, 0.035) * (1.0 + layer);
  vec2 id = floor(p / cell);
  vec2 f = p - id * cell;
  float presence = 0.62 * exp(-abs(q.y - yc) / 0.2) * (1.0 - smoothstep(0.35, 0.9, s));
  if (hash21(id + layer * 17.0) > presence) return vec3(0.0);
  float r = cell * mix(0.12, 0.3, hash21(id + 3.1 + layer));
  vec2 c = vec2(mix(r, cell - r, hash21(id + 5.7)), mix(r, cell - r, hash21(id + 9.2)));
  float d = length(f - c);
  float aa = 1.5 / (uDpr * uRef);
  float disc = 1.0 - smoothstep(r * 0.5 - aa, r, d);
  float rim = smoothstep(r * 0.4, r * 0.85, d) * disc;
  float twinkle = 0.7 + 0.3 * sin(uTime * 0.5 + hash21(id + 2.2) * 40.0);
  vec3 tint = mix(IRIS, COBALT, hash21(id + 1.3));
  return tint * (disc * 0.32 + rim * 0.22) * twinkle * (0.55 + 0.45 * layer);
}

vec3 helix(vec2 q, float t) {
  float cy = uHelix.x;
  if (abs(q.y - cy) > 1.1) return vec3(0.0);
  float s = clamp(q.x / max(uWidth, 0.01), 0.0, 1.0);
  float front = mix(-0.25, 1.3, uHelix.y);
  float poured = 1.0 - smoothstep(front - 0.25, front, s);
  // Nothing glows past the closing's top edge (the story's sky ends there) or into the footer.
  float bounds = (1.0 - smoothstep(uHelix.w - 0.3, uHelix.w - 0.02, q.y))
    * smoothstep(uHorizon.w - 0.05, uHorizon.w + 0.3, q.y);
  float gate = poured * bounds;
  if (gate < 0.001) return vec3(0.0);

  vec2 m = uMouse - 0.5;
  float x = q.x;
  float yc = cy + 0.03 * sin(x * 1.6 + t * 0.11) - 0.035 * (s - 0.3) + m.y * 0.025;
  float R = mix(0.105, 0.04, smoothstep(0.0, 0.45, s)) + 0.04 * smoothstep(0.5, 1.0, s);
  float flare = 1.0 + 0.7 * uHelix.z;
  float bright = mix(2.5, 0.42, smoothstep(0.0, 0.5, s)) * (1.0 - smoothstep(0.7, 1.0, s)) * flare;
  float k = 3.4;
  vec3 L = vec3(0.0);

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float thin = i == 3 ? 0.5 : 1.0;
    float a = x * k - t * 0.5 + fi * 2.094 + (i == 3 ? 1.1 : 0.0) + m.x * 0.5;
    float rr = R * (i == 3 ? 0.62 : 1.0);
    float y = yc + rr * sin(a);
    float z = cos(a) * 0.5 + 0.5;
    float slope = rr * k * cos(a);
    float d = abs(q.y - y) / sqrt(1.0 + slope * slope);
    float turn = abs(cos(x * 2.1 + fi * 1.7 - t * 0.27));
    float w = mix(0.005, 0.024, turn) * thin;
    w *= mix(1.7, 1.0, smoothstep(0.0, 0.3, s)) * mix(1.0, 2.0, smoothstep(0.5, 1.0, s));
    float core = exp(-pow(d / w, 2.0));
    float glow = exp(-d / (w * 3.0 + 0.012)) * 0.32;
    float lum = (core * mix(1.4, 0.85, turn) + glow) * mix(0.35, 1.0, z) * bright;
    vec3 tint = mix(PEARL, mix(LAVENDER, IRIS, 0.25 + 0.2 * fi), smoothstep(0.03, 0.34, s));
    tint = mix(tint, COBALT, smoothstep(0.5, 0.95, s) * 0.55 * (1.0 - z * 0.5));
    L += tint * lum;
  }

  // The bundle's body and the aurora haze pouring out of the left edge.
  float body = exp(-abs(q.y - yc) / (R + 0.05)) * bright * 0.16;
  L += mix(COBALT, LAVENDER, 0.4) * body;
  vec2 hp = (q - vec2(-0.12 + m.x * 0.03, yc - 0.02)) * vec2(0.75, 1.3);
  float haze = exp(-length(hp) / 0.3) * flare;
  L += mix(HAZE, LAVENDER, 0.2) * haze * 0.75;
  float lift = q.y - yc;
  float curtain = 0.0;
  if (lift > -0.05 && lift < 0.7 && s < 0.85) {
    float au = fbm(vec2(x * 2.4 + t * 0.03, q.y * 0.45 - t * 0.025));
    curtain = smoothstep(0.42, 0.78, au) * exp(-pow((lift - 0.26) / 0.17, 2.0))
      * (1.0 - smoothstep(0.08, 0.8, s));
  }
  L += mix(IRIS, COBALT, 0.45) * curtain * 0.42;

  // Bokeh and fine particles.
  L += bokeh(q, yc, s, t, 0.0);
  if (uDetail > 0.5) L += bokeh(q, yc, s, t, 1.0);
  float pc = uDetail > 0.5 ? 0.024 : 0.032;
  vec2 pp = q - vec2(t * 0.045, 0.0) - m * 0.02;
  vec2 pid = floor(pp / pc);
  vec2 pf = pp / pc - pid - 0.5;
  float ph = hash21(pid + 7.0);
  if (ph < 0.2 * exp(-abs(q.y - yc) / 0.09) * (1.0 - 0.8 * s)) {
    vec2 o = (vec2(hash21(pid + 1.0), hash21(pid + 2.0)) - 0.5) * 0.6;
    float dd = length(pf - o) * pc;
    float size = 0.0022 + 0.002 * hash21(pid + 4.0);
    L += mix(PEARL, LAVENDER, hash21(pid + 3.0)) * exp(-dd * dd / (size * size))
      * (0.55 + 0.45 * sin(uTime * 1.7 + ph * 60.0)) * 1.3;
  }

  return L * gate;
}

/* ---------------------------------------------------------------------------------------- */
/* The horizon                                                                                */
/* ---------------------------------------------------------------------------------------- */

vec3 horizon(vec2 q, out float shade) {
  shade = 0.0;
  float rise = uHorizon.y;
  float burst = uHorizon.z;
  float lineY = uHorizon.x - (1.0 - rise) * 0.05;
  if (q.y > uHorizon.w + 0.1) return vec3(0.0);
  float dx = q.x - uWidth * 0.5;
  float Rp = 4.6;
  float ys = lineY - dx * dx / (2.0 * Rp);
  float h = q.y - ys;
  float aa = 1.2 / (uDpr * uRef);
  float above = smoothstep(-aa, aa, h);
  shade = 1.0 - above;
  float fadeTop = 1.0 - smoothstep(uHorizon.w - 0.35, uHorizon.w + 0.05, q.y);
  float breath = 1.0 + 0.07 * sin(uTime * 0.5) * uView.z;
  float centre = exp(-dx * dx / 0.16);
  float near = exp(-dx * dx / 0.035);

  // The limb: a thin lit rim, a breath of atmosphere above it, the streak along the line.
  float rim = exp(-abs(h) / 0.0018) * (0.18 + 1.4 * centre) * mix(0.35, 1.0, rise);
  float atmo = exp(-max(h, 0.0) / 0.028) * above * (0.03 + 0.4 * near) * mix(0.4, 1.0, rise);
  float streak = exp(-abs(q.y - lineY) / 0.0015) * exp(-abs(dx) / (0.4 + 0.3 * burst)) * 0.6 * burst;
  vec3 L = mix(LAVENDER, PEARL, centre) * rim + mix(COBALT, LAVENDER, 0.45) * atmo
    + mix(LAVENDER, PEARL, 0.3) * streak;

  // The burst: compact and bright, rising from behind the limb.
  vec2 bc = vec2(uWidth * 0.5, lineY + mix(-0.045, 0.012, rise));
  float r = length((q - bc) * vec2(0.6, 1.0));
  float core = exp(-r / 0.014) * 3.0;
  float mid = exp(-r / 0.045) * 0.9;
  float wide = exp(-r / 0.18) * 0.16;
  vec3 B = PEARL * core + LAVENDER * mid + HAZE * wide;

  // Delicate nebula wisps rising out of it.
  float y1 = max(h, 0.0);
  float spread = 0.06 + y1 * 0.5;
  float plume = exp(-dx * dx / (spread * spread)) * exp(-y1 / 0.2) * smoothstep(0.0, 0.025, y1);
  if (plume > 0.002) {
    vec2 np = vec2(dx * 2.6, y1 * 1.7 - uTime * 0.04);
    vec2 warp = vec2(fbm(np * 1.3 + uTime * 0.015), fbm(np + vec2(4.1, 1.7)));
    float n = fbm(np + 0.9 * warp);
    float wisps = pow(smoothstep(0.45, 0.85, n), 2.0) * plume;
    B += mix(COBALT, LAVENDER, smoothstep(0.5, 0.85, n)) * wisps * 0.8;
  }
  L += B * burst * breath * mix(0.08, 1.0, above);
  return L * fadeTop;
}

/* ---------------------------------------------------------------------------------------- */
/* The key word                                                                               */
/* ---------------------------------------------------------------------------------------- */

// The mask softened by r CSS px: five taps, so no mip blocks show.
float softMask(vec2 uv, float r) {
  vec2 o = r * uWordScale / vec2(textureSize(uWord, 0));
  return (textureLod(uWord, uv, 0.5).r * 2.0
    + textureLod(uWord, uv + vec2(o.x, o.y * 0.6), 0.5).r
    + textureLod(uWord, uv + vec2(-o.x * 0.6, o.y), 0.5).r
    + textureLod(uWord, uv - vec2(o.x, o.y * 0.6), 0.5).r
    + textureLod(uWord, uv + vec2(o.x * 0.6, -o.y), 0.5).r) / 6.0;
}

vec3 word(vec2 px) {
  vec2 size = uWordBox.zw - uWordBox.xy;
  vec2 tuv = (px - uWordBox.xy) / size;
  if (tuv.x < 0.0 || tuv.y < 0.0 || tuv.x > 1.0 || tuv.y > 1.0) return vec3(0.0);
  float lit = uWordLit;
  float tt = uTime;
  // Everything scales with the word: em is its font size in CSS px (the quad is 2.2 em tall).
  float em = size.y / 2.2;
  // The tube's pitch: 3 CSS px at the largest size, finer on phones.
  float cell = clamp(em / 64.0, 1.25, 3.0);
  vec2 css = gl_FragCoord.xy / uDpr;
  // While it ignites the rows sputter sideways.
  float sputter = sin(PI * clamp(lit, 0.0, 1.0)) * uView.z;
  float row = floor(css.y / cell);
  float jitter = (hash21(vec2(row, floor(tt * 18.0))) - 0.5) * 0.03 * em * sputter;
  vec2 uv = tuv + vec2(jitter, 0.0) / size;

  // The letters, a hot core inside their strokes, thin iris / azure fringes on their edges.
  float soft = em / 160.0;
  float m0 = softMask(uv, soft);
  vec2 ca = vec2(max(0.6, em / 110.0), 0.0) / size;
  float mA = softMask(uv - ca, soft);
  float mI = softMask(uv + ca, soft);
  float lodCore = log2(max(em * 0.05 * uWordScale, 1.0));
  float core = smoothstep(0.45, 0.92, textureLod(uWord, uv, lodCore).r);

  // A strong soft bloom: three blur levels of the mask, faded out before the quad's edges.
  float lod = log2(max(em * 0.09 * uWordScale, 1.0));
  vec2 inside = min(tuv, 1.0 - tuv);
  float window = smoothstep(0.0, 0.18, inside.x * size.x / size.y) * smoothstep(0.0, 0.18, inside.y);
  float b1 = textureLod(uWord, uv, lod).r * window;
  float b2 = (textureLod(uWord, uv, lod + 1.5).r * 0.7 + textureLod(uWord, uv, lod + 3.0).r * 0.5)
    * window;

  // Mottled brightness (a few blotches per letter) and the tube's dot / scanline texture.
  vec2 mp = (tuv * size) / em * 3.2;
  float mot = noise(mp + vec2(tt * 0.3, -tt * 0.17)) * 0.62 + noise(mp * 2.3 - tt * 0.45) * 0.38;
  float rows = 0.5 + 0.5 * cos(css.y * 2.0 * PI / cell);
  float cols = 0.5 + 0.5 * cos(css.x * 2.0 * PI / cell);
  float dots = mix(1.0, 0.12 + 0.88 * rows * mix(1.0, cols, 0.45), 0.85);
  float flick = 1.0 - (0.05 * noise(vec2(tt * 9.0, 0.5)) + 0.14 * step(0.985, hash11(floor(tt * 14.0))))
    * uView.z;
  flick *= 1.0 - 0.35 * sputter * step(0.6, hash11(floor(tt * 22.0) + 3.0));

  // Pearl-white where the mottle peaks inside the strokes, a violet-blue body elsewhere.
  float hot = core * smoothstep(0.3, 0.72, mot);
  vec3 body = mix(mix(COBALT, IRIS, 0.5) * 1.35, LAVENDER * 1.1, 0.3 * mot);
  vec3 c = (body + PEARL * hot * 2.6) * m0 * dots;
  c += AZURE * max(mA - m0, 0.0) * 1.7 + IRIS * max(mI - m0, 0.0) * 1.9;
  // The bloom lives around the letters (inside them the tube's own texture shows).
  float halo = 1.0 - 0.5 * m0;
  c += (mix(LAVENDER, PEARL, 0.35) * b1 * 0.5 + mix(COBALT, IRIS, 0.35) * b2 * 0.6) * halo;
  c *= flick;
  vec3 faint = vec3(0.2, 0.26, 0.66) * textureLod(uWord, tuv, 0.5).r * 0.7;
  return mix(faint, c, smoothstep(0.0, 1.0, lit));
}

void main() {
  vec2 q = gl_FragCoord.xy / (uDpr * uRef);
  vec3 light = helix(q, uPhase);
  float shade;
  light += horizon(q, shade);
  if (uWordReady > 0.5) light += word(gl_FragCoord.xy / uDpr);

  // The planet's body under the limb, faintly lit near its edge; above it the footer's sky
  // deepens toward the top, back to the night where the closing begins.
  float under = max(uHorizon.x - q.y, 0.0);
  vec3 planet = mix(PLANET, NIGHT_RAISED, exp(-under / 0.05) * 0.45 * uHorizon.y);
  float deep = smoothstep(uHorizon.x + 0.06, uHorizon.x + 0.5, q.y)
    * (1.0 - smoothstep(uHorizon.w - 0.1, uHorizon.w + 0.45, q.y));
  vec3 col = mix(mix(NIGHT, NIGHT * 0.6, deep), planet, shade);
  col = 1.0 - (1.0 - col) * (1.0 - aces(light * 1.1));

  // The sky's vignette (in viewport space, live only) and its grain.
  if (uView.z > 0.5) {
    float vy = uView.x + (uResolution.y - gl_FragCoord.y) / uDpr;
    vec2 v = vec2(gl_FragCoord.x / uResolution.x, 1.0 - vy / max(uView.y, 1.0)) - vec2(0.5, 0.45);
    col *= 1.0 - dot(v, v) * 0.6;
  }
  float grain = hash21(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5;
  col += grain * 0.03;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
