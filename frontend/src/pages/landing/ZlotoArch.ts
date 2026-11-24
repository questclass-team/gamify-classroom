import {
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  OneFactor,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { gsap } from '../../lib/gsap'

/**
 * Where and what the arch is, in CSS pixels of its own canvas. GSAP and ScrollTrigger write these
 * numbers; the renderer reads them every frame.
 */
export interface ArchState {
  /** Center of the rings. */
  cx: number
  cy: number
  /** Radius of the outermost ring. */
  radius: number
  /** 0.5 = the arch (upper half), 1 = the closed ring (the coin). */
  arc: number
  /** Spin in the ring's plane, radians. */
  spin: number
  /** Lean around the horizontal axis, radians (negative = the apex recedes). */
  lean: number
  /** Overall light, 0–1. At 0 nothing is drawn. */
  intensity: number
  /** Lit share of the ring, clockwise from the top; 1 = all of it. */
  ringProgress: number
}

export interface ArchOptions {
  count: number
  /** Brick segments per ring at radius 1; sets the length of each glint. */
  slotsPerUnit: number
  maxDpr: number
  bloom: { strength: number; radius: number; threshold: number } | null
  /** Follow the pointer (sparkle and tilt). */
  interactive: boolean
  /** Reduced motion: no loop, one still frame per change. */
  still: boolean
  /** Runs before each frame; write `arch.state` here. */
  onFrame?: (arch: ZlotoArch, dt: number) => void
}

const RINGS = 11
const INNER = 0.72
const FOV = 30
const CAMERA_Z = 10

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uArc;
uniform float uAssemble;
uniform float uRingProgress;
uniform float uIntensity;
uniform float uDensity;
uniform float uMaxPoint;
uniform vec2 uViewport;
uniform vec2 uPointer;
uniform float uPointerAmt;
uniform vec3 uLavender;
uniform vec3 uIris;
uniform vec3 uCobalt;
uniform vec3 uPearl;

// position: x = angle parameter t (0–1), y = ring radius, z = ring flow speed (t per second)
attribute vec4 aRand;  // radial jitter, depth jitter, phase, speed
attribute vec4 aSpark; // assembly delay, scatter xyz
attribute vec2 aSlot;  // brick hash, brick length in t

varying vec3 vColor;
varying vec2 vDir;
varying float vSoft;

const float PI = 3.14159265;
const float TAU = 6.28318531;

float spanOf(float arc) {
  float arch = 0.88 * PI;
  return arc < 0.5 ? arc * 2.0 * arch : mix(arch, TAU, (arc - 0.5) * 2.0);
}

vec3 ringPoint(float t, float span, float radius, float z) {
  float angle = 0.5 * PI + (t - 0.5) * span;
  return vec3(cos(angle) * radius, sin(angle) * radius, z);
}

vec2 toScreen(vec3 local) {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(local, 1.0);
  return clip.xy / clip.w * uViewport * 0.5;
}

void main() {
  float circle = smoothstep(0.5, 1.0, uArc);
  float span = spanOf(uArc);
  float slotT = aSlot.y;

  // Each ring flows at its own speed; every grain also breathes a little along its brick.
  float drift = sin(uTime * (0.6 + aRand.w * 0.8) + aRand.z * TAU) * 0.08 * slotT;
  float t = fract(position.x + uTime * position.z + drift);
  float endness = abs(t - 0.5) * 2.0;
  // Depth of field: the apex is in focus, the ends of the arch melt into bokeh.
  float blur = smoothstep(0.3, 0.97, endness) * (1.0 - circle);
  float radius = position.y + aRand.x * 0.0068 * (1.0 + blur * 4.0);
  float z = aRand.y * 0.18 * mix(0.05, 1.0, blur);
  vec3 target = ringPoint(t, span, radius, z);

  // Assembly: sparks fly from a scattered cloud into their slots (expo out per particle).
  float k = clamp((uAssemble - aSpark.x * 0.45) / 0.55, 0.0, 1.0);
  float settle = 1.0 - pow(2.0, -10.0 * k);
  vec3 scatter = vec3(aSpark.y * 1.9, aSpark.z * 1.2 + 0.25, aSpark.w * 1.2);
  vec3 local = mix(scatter, target, settle);

  vec4 clip = projectionMatrix * modelViewMatrix * vec4(local, 1.0);
  vec2 s0 = clip.xy / clip.w * uViewport * 0.5;
  vec3 tangent = ringPoint(t + slotT * 0.5, span, radius, z) - ringPoint(t - slotT * 0.5, span, radius, z);
  vec2 along = toScreen(local + tangent) - s0;
  float slotPx = length(along);
  vDir = along / max(slotPx, 0.0001);

  // Pointer: nearby grains sparkle harder and step aside.
  vec2 aspect = vec2(uViewport.x / uViewport.y, 1.0);
  vec2 away = (clip.xy / clip.w - uPointer) * aspect;
  float near = (1.0 - smoothstep(0.0, 0.38, length(away))) * uPointerAmt;
  clip.xy += normalize(away + vec2(0.00001)) / aspect * near * 0.02 * clip.w;

  // Glitter: mostly per brick, so whole tiles flash like the rows of an LED wall.
  float phase = aSlot.x * 40.0 + aRand.z * 0.8;
  float speed = 0.45 + aSlot.x * 1.3 + aRand.w * 0.25;
  // pow() of a value rounding below zero is NaN, and one NaN pixel floods the bloom: clamp bases.
  float glint = 0.3 + 0.7 * pow(max(0.5 + 0.5 * sin(uTime * speed + phase), 0.0), 8.0);
  glint += near * (0.3 + 0.7 * pow(max(0.5 + 0.5 * sin(uTime * 7.0 + aRand.z * TAU), 0.0), 4.0));

  // Light from above.
  vec3 world = normalize(mat3(modelMatrix) * vec3(target.xy, 0.0));
  float light = mix(0.26, 1.3, pow(clamp(0.5 + 0.5 * world.y, 0.0, 1.0), 2.2));

  // Progress ring: lit clockwise from the top, the rest is deep blue dust.
  float angle = 0.5 * PI + (t - 0.5) * span;
  float around = fract((0.5 * PI - angle) / TAU + 1.0);
  float partial = step(uRingProgress, 0.999);
  float lit = mix(1.0, 1.0 - smoothstep(uRingProgress - 0.004, uRingProgress + 0.004, around), partial);
  float head = partial * step(0.001, uRingProgress) * (1.0 - smoothstep(0.0, 0.03, abs(around - uRingProgress)));

  // Every brick has its own tint (lavender, iris or cobalt); its hottest glints burn pearl.
  float hue = fract(aSlot.x * 7.31);
  vec3 tint = hue < 0.55 ? uLavender : (hue < 0.8 ? uIris : uCobalt);
  vec3 deep = tint * 0.36;
  float bright = glint * light;
  vec3 color = mix(deep, tint, smoothstep(0.0, 0.55, bright));
  color = mix(color, uPearl, smoothstep(0.55, 1.15, bright));
  bright = mix(0.2 + glint * 0.12, bright + head * 1.4, lit);
  color = mix(deep, color, lit);

  float flight = 1.0 - settle;
  float fade = mix(smoothstep(1.0, 0.86, endness), 1.0, circle);
  float grow = 1.0 + blur * 1.8;
  float size = slotPx * 0.96 * grow * mix(1.0, 0.4, flight) * mix(0.7, 1.0, lit);
  gl_PointSize = clamp(size, 1.0, uMaxPoint);
  // Energy rises faster than brightness: deep blue tiles, hot pearl glints.
  float alpha = pow(max(bright, 0.0), 1.5) * 1.7 * fade * smoothstep(0.0, 0.25, k) * (1.0 + flight * 2.0);
  alpha *= uIntensity * uDensity / (grow * grow);
  vColor = color * alpha;
  vSoft = max(blur, flight);
  gl_Position = clip;
}
`

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying vec2 vDir;
varying float vSoft;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  p.y = -p.y;
  // Into the streak's frame: x along the ring, y across it.
  vec2 q = vec2(dot(p, vDir), dot(p, vec2(-vDir.y, vDir.x)));
  vec2 halfSize = mix(vec2(0.42, 0.2), vec2(0.36), vSoft);
  float corner = mix(0.1, 0.36, vSoft);
  vec2 d = abs(q) - halfSize + corner;
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - corner;
  float soft = mix(0.05, 0.22, vSoft);
  float mask = 1.0 - smoothstep(-soft, soft * 0.3, sd);
  // A brushed-metal hot spot in the middle of each tile.
  mask *= mix(0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.42, abs(q.x))), 1.0, vSoft);
  if (mask < 0.003) discard;
  float alpha = max(vColor.r, max(vColor.g, vColor.b));
  gl_FragColor = vec4(vColor * mask, alpha * mask);
}
`

function buildGeometry(count: number, slotsPerUnit: number) {
  const radii = Array.from({ length: RINGS }, (_, i) => INNER + ((1 - INNER) * i) / (RINGS - 1))
  const total = radii.reduce((sum, r) => sum + r, 0)
  const position = new Float32Array(count * 3)
  const rand = new Float32Array(count * 4)
  const spark = new Float32Array(count * 4)
  const slot = new Float32Array(count * 2)
  const signed = () => Math.random() * 2 - 1
  let slots = 0
  let index = 0
  radii.forEach((r, ring) => {
    const share = ring === RINGS - 1 ? count - index : Math.round((count * r) / total)
    const ringSlots = Math.max(8, Math.round(slotsPerUnit * r))
    slots += ringSlots
    const direction = ring % 2 === 0 ? 1 : -1
    const speed = direction * (0.6 + Math.random() * 0.8) * (0.55 / ringSlots)
    // Brick hashes are shared by every grain in the brick.
    const hashes = Array.from({ length: ringSlots }, () => Math.random())
    for (let n = 0; n < share && index < count; n++, index++) {
      const s = Math.floor(Math.random() * ringSlots)
      position[index * 3] = (s + 0.5 + signed() * 0.12) / ringSlots
      position[index * 3 + 1] = r
      position[index * 3 + 2] = speed
      rand.set([signed(), signed(), Math.random(), Math.random()], index * 4)
      spark.set([Math.random(), signed(), signed(), signed()], index * 4)
      slot.set([hashes[s]!, 1 / ringSlots], index * 2)
    }
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aRand', new BufferAttribute(rand, 4))
  geometry.setAttribute('aSpark', new BufferAttribute(spark, 4))
  geometry.setAttribute('aSlot', new BufferAttribute(slot, 2))
  return { geometry, perSlot: count / slots }
}

/**
 * The arch in Blask's light: thousands of tangential streaks on eleven rings, one three.js
 * renderer with bloom. It renders only while visible and lit, and in still mode draws one frame
 * per change.
 */
export class ZlotoArch {
  readonly state: ArchState = {
    cx: 0,
    cy: 0,
    radius: 100,
    arc: 0.5,
    spin: 0,
    lean: 0,
    intensity: 1,
    ringProgress: 1,
  }
  /** 0 = scattered sparks, 1 = assembled. */
  assemble = 1
  /** Extra sparkle, 0–1, for answers to actions (a submit, a purchase). */
  flare = 0

  private readonly options: ArchOptions
  private readonly host: HTMLElement
  private readonly renderer: WebGLRenderer
  private readonly composer: EffectComposer | null
  private readonly passes: { dispose: () => void }[] = []
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  private readonly points: Points
  private readonly material: ShaderMaterial
  private readonly geometry: BufferGeometry
  private readonly resizeObserver: ResizeObserver
  private readonly intersection: IntersectionObserver
  private width = 1
  private height = 1
  private time = 11
  private visible = true
  private cleared = false
  private stillFrame = 0
  private started = false
  private startFrame = 0
  private readonly pointer = { x: 0, y: 0, tx: 0, ty: 0, amt: 0, tamt: 0 }
  private readonly tilt = { x: 0, y: 0 }

  constructor(host: HTMLElement, options: ArchOptions) {
    this.host = host
    this.options = options
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    const canvas = this.renderer.domElement
    canvas.style.cssText = 'display:block;width:100%;height:100%'
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)

    const { geometry, perSlot } = buildGeometry(options.count, options.slotsPerUnit)
    this.geometry = geometry
    const gl = this.renderer.getContext()
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
      uniforms: {
        uTime: { value: 0 },
        uArc: { value: 0.5 },
        uAssemble: { value: 1 },
        uRingProgress: { value: 1 },
        uIntensity: { value: 1 },
        uDensity: { value: 1.05 / Math.max(1, perSlot) },
        uMaxPoint: { value: Math.min(range?.[1] ?? 64, 160) },
        uViewport: { value: new Vector2(1, 1) },
        uPointer: { value: new Vector2(0, 0) },
        uPointerAmt: { value: 0 },
        uLavender: { value: new Color('#8e9bff') },
        uIris: { value: new Color('#6c3bf4') },
        uCobalt: { value: new Color('#2b3bff') },
        uPearl: { value: new Color('#fbfaff') },
      },
    })
    this.points = new Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.points.rotation.order = 'XYZ'
    this.scene.add(this.points)
    this.camera.position.set(0, 0, CAMERA_Z)

    if (options.bloom) {
      const composer = new EffectComposer(this.renderer)
      const render = new RenderPass(this.scene, this.camera)
      const bloom = new UnrealBloomPass(
        new Vector2(1, 1),
        options.bloom.strength,
        options.bloom.radius,
        options.bloom.threshold,
      )
      const output = new OutputPass()
      composer.addPass(render)
      composer.addPass(bloom)
      composer.addPass(output)
      this.passes.push(render, bloom, output)
      this.composer = composer
    } else {
      this.composer = null
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
      this.invalidate()
    })
    this.resizeObserver.observe(host)
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting ?? true
    })
    this.intersection.observe(host)
    this.resize()

    if (options.interactive && !options.still) {
      window.addEventListener('pointermove', this.onPointer, { passive: true })
      document.documentElement.addEventListener('pointerleave', this.onLeave)
    }
  }

  /** Starts the frame loop (after the page's smooth scroll, so rects read this frame's scroll). */
  start() {
    if (this.options.still) {
      this.invalidate()
      return
    }
    // Deferred one frame: the smooth scroller registers on the ticker after this component.
    this.startFrame = requestAnimationFrame(() => {
      this.started = true
      gsap.ticker.add(this.tick)
    })
  }

  /** Still mode: draw one frame on the next animation frame. */
  invalidate() {
    if (!this.options.still || this.stillFrame) return
    this.stillFrame = requestAnimationFrame(() => {
      this.stillFrame = 0
      this.options.onFrame?.(this, 0)
      this.draw()
    })
  }

  get size() {
    return { width: this.width, height: this.height }
  }

  private resize() {
    const rect = this.host.getBoundingClientRect()
    this.width = Math.max(1, rect.width)
    this.height = Math.max(1, rect.height)
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDpr)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(this.width, this.height, false)
    this.composer?.setPixelRatio(dpr)
    this.composer?.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    const uniforms = this.material.uniforms
    ;(uniforms.uViewport!.value as Vector2).set(this.width * dpr, this.height * dpr)
  }

  private readonly onPointer = (event: PointerEvent) => {
    const rect = this.host.getBoundingClientRect()
    this.pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.ty = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    this.pointer.tamt = event.pointerType === 'mouse' ? 1 : 0.6
  }

  private readonly onLeave = () => {
    this.pointer.tamt = 0
  }

  private readonly tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(0.1, deltaMs / 1000)
    this.options.onFrame?.(this, dt)
    if (!this.visible || document.hidden) return
    this.time += dt
    const ease = 1 - Math.pow(0.0025, dt)
    const p = this.pointer
    p.x += (p.tx - p.x) * ease
    p.y += (p.ty - p.y) * ease
    p.amt += (p.tamt - p.amt) * ease * 0.6
    // At most 4 degrees toward the pointer.
    const max = 0.07 * p.amt
    this.tilt.x += (-p.y * max - this.tilt.x) * ease * 0.5
    this.tilt.y += (p.x * max - this.tilt.y) * ease * 0.5
    this.draw()
  }

  private draw() {
    const s = this.state
    const u = this.material.uniforms
    const intensity = Math.min(1.6, s.intensity * (1 + this.flare * 0.6))
    // Off screen or unlit: clear once and skip the work.
    const offscreen =
      s.cy - s.radius * 1.3 > this.height ||
      s.cy + s.radius * 1.3 < 0 ||
      s.cx + s.radius * 1.3 < 0 ||
      s.cx - s.radius * 1.3 > this.width
    if (intensity < 0.004 || offscreen) {
      if (!this.cleared) {
        this.renderer.setRenderTarget(null)
        this.renderer.clear()
        this.cleared = true
      }
      return
    }
    this.cleared = false
    const unit = (2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360)) / this.height
    this.points.position.set((s.cx - this.width / 2) * unit, -(s.cy - this.height / 2) * unit, 0)
    this.points.scale.setScalar(Math.max(0.0001, s.radius * unit))
    this.points.rotation.set(s.lean + this.tilt.x, this.tilt.y, s.spin)
    u.uTime!.value = this.time
    u.uArc!.value = s.arc
    u.uAssemble!.value = this.assemble
    u.uRingProgress!.value = s.ringProgress
    u.uIntensity!.value = intensity
    ;(u.uPointer!.value as Vector2).set(this.pointer.x, this.pointer.y)
    u.uPointerAmt!.value = Math.min(1, this.pointer.amt + this.flare)
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.startFrame)
    cancelAnimationFrame(this.stillFrame)
    if (this.started) gsap.ticker.remove(this.tick)
    window.removeEventListener('pointermove', this.onPointer)
    document.documentElement.removeEventListener('pointerleave', this.onLeave)
    this.resizeObserver.disconnect()
    this.intersection.disconnect()
    for (const pass of this.passes) pass.dispose()
    this.composer?.dispose()
    this.geometry.dispose()
    this.material.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
