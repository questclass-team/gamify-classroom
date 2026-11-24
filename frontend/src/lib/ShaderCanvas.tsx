import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from './useReducedMotion'

export type UniformValue = number | readonly number[]
export type Uniforms = Record<string, UniformValue>

/**
 * Prepended to every fragment shader. vUv runs 0–1 with y up; uMouse is the smoothed pointer in
 * the same space (0.5, 0.5 until the pointer moves); uResolution is in device pixels.
 */
const HEADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uDpr;
`

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

export interface ShaderCanvasProps {
  /** GLSL ES 3.00 source after the header: declare your own uniforms and write main(). */
  fragment: string
  /** Read every frame; mutate `.current` freely (GSAP can tween its numbers in place). */
  uniforms?: RefObject<Uniforms>
  /** Classes of the host element; the canvas fills it. */
  className?: string
  /** Cap for devicePixelRatio. Heavy full-screen shaders want 1–1.5. */
  maxDpr?: number
  /** Seconds of the single still frame drawn when motion is reduced. */
  stillTime?: number
  /** Runs before each frame with the elapsed seconds; update uniforms here. */
  onFrame?: (time: number) => void
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const numbered = source
      .split('\n')
      .map((line, index) => `${String(index + 1).padStart(3)}  ${line}`)
      .join('\n')
    console.error(`[ShaderCanvas] ${gl.getShaderInfoLog(shader)}\n${numbered}`)
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * A full-screen fragment shader on a WebGL 2 canvas. Renders only while on screen and the tab is
 * visible, draws one still frame for reduced motion, caps the pixel ratio and releases the GL
 * context on unmount. If WebGL is missing or the shader fails, nothing is drawn, so give the host
 * a CSS background as the fallback.
 */
export function ShaderCanvas({
  fragment,
  uniforms,
  className,
  maxDpr = 1.5,
  stillTime = 6,
  onFrame,
}: ShaderCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onFrameRef = useRef(onFrame)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // A fresh canvas per run: a context lost on cleanup can never be reused.
    const canvas = document.createElement('canvas')
    canvas.style.cssText = `display:block;width:100%;height:100%;opacity:0;transition:${
      reduceMotion ? 'none' : 'opacity 900ms ease-out'
    }`
    host.appendChild(canvas)

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    })
    const vertex = gl && compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fragmentShader = gl && compile(gl, gl.FRAGMENT_SHADER, HEADER + fragment)
    const program = gl?.createProgram() ?? null
    if (gl && program && vertex && fragmentShader) {
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
    }
    if (
      !gl ||
      !program ||
      !vertex ||
      !fragmentShader ||
      !gl.getProgramParameter(program, gl.LINK_STATUS)
    ) {
      if (gl && program) console.error(`[ShaderCanvas] ${gl.getProgramInfoLog(program)}`)
      return () => canvas.remove()
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // One triangle that covers the whole clip space.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(program)

    const locations = new Map<string, WebGLUniformLocation | null>()
    const location = (name: string) => {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name))
      return locations.get(name) ?? null
    }

    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
    }

    const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 }
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      mouse.targetX = (event.clientX - rect.left) / rect.width
      mouse.targetY = 1 - (event.clientY - rect.top) / rect.height
    }

    const draw = (time: number) => {
      onFrameRef.current?.(time)
      gl.uniform1f(location('uTime'), time)
      gl.uniform2f(location('uResolution'), canvas.width, canvas.height)
      gl.uniform2f(location('uMouse'), mouse.x, mouse.y)
      gl.uniform1f(location('uDpr'), dpr)
      const values = uniforms?.current
      if (values) {
        for (const name in values) {
          const value = values[name]!
          const at = location(name)
          if (at === null) continue
          if (typeof value === 'number') gl.uniform1f(at, value)
          else if (value.length === 2) gl.uniform2fv(at, value)
          else if (value.length === 3) gl.uniform3fv(at, value)
          else if (value.length === 4) gl.uniform4fv(at, value)
          else gl.uniform1fv(at, value)
        }
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.style.opacity = '1'
    }

    const start = performance.now()
    let frame = 0
    let visible = true
    let last = start
    const loop = (now: number) => {
      frame = 0
      if (!visible || document.hidden) return
      // Frame-rate independent pointer easing.
      const ease = 1 - Math.pow(0.02, Math.min(0.1, (now - last) / 1000))
      last = now
      mouse.x += (mouse.targetX - mouse.x) * ease
      mouse.y += (mouse.targetY - mouse.y) * ease
      draw((now - start) / 1000)
      frame = requestAnimationFrame(loop)
    }
    const run = () => {
      if (reduceMotion || frame !== 0 || !visible || document.hidden) return
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reduceMotion) draw(stillTime)
    })
    resizeObserver.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      run()
    })
    intersection.observe(canvas)
    document.addEventListener('visibilitychange', run)
    if (!reduceMotion) window.addEventListener('pointermove', onPointer, { passive: true })

    resize()
    if (reduceMotion) draw(stillTime)
    else run()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('pointermove', onPointer)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragmentShader)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [fragment, maxDpr, reduceMotion, stillTime, uniforms])

  return <div ref={hostRef} aria-hidden="true" className={className} />
}
