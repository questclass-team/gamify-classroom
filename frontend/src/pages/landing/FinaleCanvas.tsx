import { useEffect, useRef, type RefObject } from 'react'

export type FinaleUniforms = Record<string, number | readonly number[]>

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uDpr;
`

/** Room around the word in its texture, in em: the bloom spreads into it. */
const WORD_PAD_EM = 0.6

interface FinaleCanvasProps {
  /** GLSL ES 3.00 after the header (`uTime`, `uResolution`, `uMouse` 0–1 of the viewport, `uDpr`). */
  fragment: string
  /** The element holding the key word: painted into `uWord`, its quad passed as `uWordBox`. */
  word: RefObject<HTMLElement | null>
  /** One still frame (reduced motion), redrawn only when the size or the word changes. */
  still: boolean
  /** Writes the uniforms before every frame; `box` is the canvas rect in the viewport. */
  onFrame: (uniforms: FinaleUniforms, time: number, box: DOMRect) => void
  stillTime?: number
  maxDpr?: number
  className?: string
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
    console.error(`[FinaleCanvas] ${gl.getShaderInfoLog(shader)}\n${numbered}`)
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * The finale's renderer: ShaderCanvas's full-screen pass plus one texture, the key word drawn in
 * the page's own font (so the shader can glow it). Renders only while on screen and the tab is
 * visible, caps the pixel ratio, marks the word `data-glow="gl"` while it draws it (the DOM text
 * then turns transparent but stays the real, selectable text) and releases everything on unmount.
 */
export function FinaleCanvas({
  fragment,
  word,
  still,
  onFrame,
  stillTime = 8,
  maxDpr = 1.35,
  className,
}: FinaleCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onFrameRef = useRef(onFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const canvas = document.createElement('canvas')
    canvas.style.cssText = `display:block;width:100%;height:100%;opacity:0;transition:${
      still ? 'none' : 'opacity 900ms ease-out'
    }`
    host.appendChild(canvas)

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
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
      if (gl && program) console.error(`[FinaleCanvas] ${gl.getProgramInfoLog(program)}`)
      return () => canvas.remove()
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
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

    // The key word's texture: one white mask, mipmapped (its levels are the bloom).
    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.uniform1i(location('uWord'), 0)
    let pad = 0
    let scale = 1
    let wordReady = false
    let disposed = false

    const paintWord = async () => {
      const element = word.current
      if (!element) return
      const style = getComputedStyle(element)
      const size = parseFloat(style.fontSize)
      const font = `${style.fontWeight} ${size}px ${style.fontFamily}`
      try {
        await document.fonts.load(font, element.textContent ?? '')
      } catch {
        // The fallback font is drawn instead; the DOM text uses the same one.
      }
      if (disposed) return
      const text = element.textContent ?? ''
      const rect = element.getBoundingClientRect()
      pad = size * WORD_PAD_EM
      const width = rect.width + 2 * pad
      const height = rect.height + 2 * pad
      // Texels per CSS px: the screen's density (crisp letters), within the texture limit.
      scale = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(width, height))
      const paper = document.createElement('canvas')
      paper.width = Math.ceil(width * scale)
      paper.height = Math.ceil(height * scale)
      const ctx = paper.getContext('2d')
      if (!ctx || width < 2 || height < 2) return
      ctx.scale(scale, scale)
      ctx.font = font
      ctx.fontStretch = 'semi-condensed'
      ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#fff'
      // The CSS line box: half-leading above the font's ascent puts the baseline where the DOM has it.
      const metrics = ctx.measureText(text)
      const ascent = metrics.fontBoundingBoxAscent
      const descent = metrics.fontBoundingBoxDescent
      const lineHeight = Number.isNaN(parseFloat(style.lineHeight))
        ? ascent + descent
        : parseFloat(style.lineHeight)
      ctx.fillText(text, pad + rect.width / 2, pad + (lineHeight - ascent - descent) / 2 + ascent)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paper)
      gl.generateMipmap(gl.TEXTURE_2D)
      wordReady = true
      element.dataset.glow = 'gl'
      if (still) draw(stillTime)
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
      mouse.targetX = event.clientX / Math.max(1, window.innerWidth)
      mouse.targetY = 1 - event.clientY / Math.max(1, window.innerHeight)
    }

    const uniforms: FinaleUniforms = {}
    const draw = (time: number) => {
      const box = canvas.getBoundingClientRect()
      onFrameRef.current(uniforms, time, box)
      const element = word.current
      if (element && wordReady) {
        const r = element.getBoundingClientRect()
        uniforms.uWordBox = [
          r.left - pad - box.left,
          box.bottom - r.bottom - pad,
          r.right + pad - box.left,
          box.bottom - r.top + pad,
        ]
      }
      uniforms.uWordReady = wordReady ? 1 : 0
      uniforms.uWordScale = scale
      gl.uniform1f(location('uTime'), time)
      gl.uniform2f(location('uResolution'), canvas.width, canvas.height)
      gl.uniform2f(location('uMouse'), mouse.x, mouse.y)
      gl.uniform1f(location('uDpr'), dpr)
      for (const name in uniforms) {
        const value = uniforms[name]!
        const at = location(name)
        if (at === null) continue
        if (typeof value === 'number') gl.uniform1f(at, value)
        else if (value.length === 2) gl.uniform2fv(at, value)
        else if (value.length === 3) gl.uniform3fv(at, value)
        else if (value.length === 4) gl.uniform4fv(at, value)
        else gl.uniform1fv(at, value)
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
      const ease = 1 - Math.pow(0.02, Math.min(0.1, (now - last) / 1000))
      last = now
      mouse.x += (mouse.targetX - mouse.x) * ease
      mouse.y += (mouse.targetY - mouse.y) * ease
      draw((now - start) / 1000)
      frame = requestAnimationFrame(loop)
    }
    const run = () => {
      if (still || frame !== 0 || !visible || document.hidden) return
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (still) draw(stillTime)
    })
    resizeObserver.observe(canvas)
    // The word is redrawn whenever its box changes (fonts, breakpoints).
    const wordObserver = new ResizeObserver(() => void paintWord())
    if (word.current) wordObserver.observe(word.current)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      run()
    })
    intersection.observe(canvas)
    document.addEventListener('visibilitychange', run)
    if (!still) window.addEventListener('pointermove', onPointer, { passive: true })

    resize()
    if (still) draw(stillTime)
    else run()

    const element = word.current
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      wordObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('pointermove', onPointer)
      if (element) delete element.dataset.glow
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragmentShader)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [fragment, maxDpr, still, stillTime, word])

  return <div ref={hostRef} aria-hidden="true" className={className} />
}
