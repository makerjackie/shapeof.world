/**
 * 公式微排版器：把一个小型 TeX 子集排成字形盒子。
 *
 * 支持：上下标（^ _）、\frac、\sqrt、\hat \bar \vec、\mathbf、\left( \right)、
 * 希腊字母与常用符号命令、\sum \int \prod、\log 类直立函数、\, \; 间距。
 * 输出与字号无关（1em = 1 单位），由调用方缩放到画布或 SVG。
 *
 * 字体宽度通过注入的 Measurer 获得：浏览器里用离屏 canvas 实测，
 * 测试里可以注入等宽估计，保证布局逻辑可脱离 DOM 验证。
 */

export type GlyphStyle = 'math' | 'up' | 'bold' | 'bigop'

export type Glyph = {
  ch: string
  /** 左边缘 x（em） */
  x: number
  /** 基线 y（em），相对整条公式基线，向下为正 */
  y: number
  /** 字号（em） */
  size: number
  style: GlyphStyle
}

export type Rule = {
  x1: number
  y1: number
  x2: number
  y2: number
  /** 线宽（em） */
  w: number
}

export type FormulaLayout = {
  glyphs: Array<Glyph>
  rules: Array<Rule>
  /** 总宽（em） */
  width: number
  /** 基线以上高度（em） */
  height: number
  /** 基线以下深度（em） */
  depth: number
}

export type Measurer = (ch: string, style: GlyphStyle) => number

const SCRIPT_SCALE = 0.68
const FRAC_SCALE = 0.8
const BIGOP_SCALE = 1.42
const AXIS = 0.26 // 数学轴线在基线以上的高度（em）

type Box = {
  /** 宽（em） */
  w: number
  /** 基线以上高（em） */
  h: number
  /** 基线以下深（em） */
  d: number
  paint: (glyphs: Array<Glyph>, rules: Array<Rule>, x: number, yBase: number) => void
}

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ',
  mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
  phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
}

const SYMBOLS: Record<string, { ch: string; style: GlyphStyle }> = {
  hbar: { ch: 'ħ', style: 'math' },
  nabla: { ch: '∇', style: 'up' },
  partial: { ch: '∂', style: 'math' },
  infty: { ch: '∞', style: 'up' },
  pm: { ch: '±', style: 'up' },
  mp: { ch: '∓', style: 'up' },
  cdot: { ch: '·', style: 'up' },
  times: { ch: '×', style: 'up' },
  div: { ch: '÷', style: 'up' },
  geq: { ch: '≥', style: 'up' },
  leq: { ch: '≤', style: 'up' },
  neq: { ch: '≠', style: 'up' },
  approx: { ch: '≈', style: 'up' },
  propto: { ch: '∝', style: 'up' },
  to: { ch: '→', style: 'up' },
  oplus: { ch: '⊕', style: 'up' },
  perp: { ch: '⊥', style: 'up' },
  degree: { ch: '°', style: 'up' },
}

const UPRIGHT_WORDS: Record<string, string> = {
  log: 'log', ln: 'ln', sin: 'sin', cos: 'cos', tan: 'tan', exp: 'exp',
  min: 'min', max: 'max', const: 'const', Re: 'Re', Im: 'Im', Res: 'Res',
}

/** 关系与二元运算符：排版时前后加中距 */
const SPACED_OPS = new Set(['=', '+', '−', '±', '∓', '×', '·', '≥', '≤', '≠', '≈', '∝', '>', '<', '→'])
const OP_SPACE = 0.2

export function createCanvasMeasurer(): Measurer {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const cache = new Map<string, number>()
  const fontFor = (style: GlyphStyle) => {
    switch (style) {
      case 'math':
        return 'italic 100px "Times New Roman", "Songti SC", Georgia, serif'
      case 'bold':
        return 'bold 100px "Times New Roman", "Songti SC", Georgia, serif'
      default:
        return '100px "Times New Roman", "Songti SC", Georgia, serif'
    }
  }
  return (ch, style) => {
    const key = `${style}:${ch}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    ctx.font = fontFor(style)
    const w = ctx.measureText(ch).width / 100
    cache.set(key, w)
    return w
  }
}

/** 测试与 SSR 用的等宽估计 */
export const fallbackMeasurer: Measurer = (ch) => (ch.codePointAt(0)! > 0xff ? 1 : 0.5)

type Token =
  | { kind: 'char'; ch: string }
  | { kind: 'cmd'; name: string }
  | { kind: 'group'; tokens: Array<Token> }
  | { kind: 'sup' }
  | { kind: 'sub' }

function tokenize(src: string): Array<Token> {
  const tokens: Array<Token> = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n') {
      i += 1
      continue
    }
    if (c === '{') {
      let depth = 1
      let j = i + 1
      while (j < src.length && depth > 0) {
        if (src[j] === '{') depth += 1
        else if (src[j] === '}') depth -= 1
        j += 1
      }
      tokens.push({ kind: 'group', tokens: tokenize(src.slice(i + 1, j - 1)) })
      i = j
      continue
    }
    if (c === '}') {
      i += 1
      continue
    }
    if (c === '^') {
      tokens.push({ kind: 'sup' })
      i += 1
      continue
    }
    if (c === '_') {
      tokens.push({ kind: 'sub' })
      i += 1
      continue
    }
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i))
      if (m) {
        tokens.push({ kind: 'cmd', name: m[1] })
        i += m[0].length
        continue
      }
    }
    tokens.push({ kind: 'char', ch: c })
    i += 1
  }
  return tokens
}

export function typeset(source: string, measure: Measurer): FormulaLayout {
  const glyphs: Array<Glyph> = []
  const rules: Array<Rule> = []

  const glyphBox = (ch: string, style: GlyphStyle, size: number): Box => ({
    w: measure(ch, style) * size,
    h: 0.72 * size,
    d: 0.22 * size,
    paint: (g, _r, x, yBase) => {
      g.push({ ch, x, y: yBase, size, style })
    },
  })

  const spaceBox = (w: number): Box => ({ w, h: 0, d: 0, paint: () => {} })

  const row = (boxes: Array<Box>): Box => ({
    w: boxes.reduce((s, b) => s + b.w, 0),
    h: Math.max(0, ...boxes.map((b) => b.h)),
    d: Math.max(0, ...boxes.map((b) => b.d)),
    paint: (g, r, x, yBase) => {
      let cx = x
      for (const b of boxes) {
        b.paint(g, r, cx, yBase)
        cx += b.w
      }
    },
  })

  const atomBox = (t: Token, size: number): Box => {
    if (t.kind === 'group') return parseSeq(t.tokens, size)
    if (t.kind === 'char') {
      const ch = t.ch === '-' ? '−' : t.ch
      if (/[a-zA-Z]/.test(ch)) return glyphBox(ch, 'math', size)
      return glyphBox(ch, 'up', size)
    }
    if (t.kind === 'cmd') return commandBox(t.name, size)
    return spaceBox(0)
  }

  const withScripts = (base: Box, sup: Box | null, sub: Box | null, size: number): Box => {
    const gap = 0.04 * size
    const supRise = base.h - 0.3 * size // 上标基线相对主基线的上移量
    const subDrop = 0.3 * size
    const scriptW = Math.max(sup?.w ?? 0, sub?.w ?? 0) + gap
    return {
      w: base.w + scriptW,
      h: Math.max(base.h, sup ? supRise + sup.h : 0),
      d: Math.max(base.d, sub ? subDrop + sub.d : 0),
      paint: (g, r, x, yBase) => {
        base.paint(g, r, x, yBase)
        if (sup) sup.paint(g, r, x + base.w + gap, yBase - supRise)
        if (sub) sub.paint(g, r, x + base.w + gap, yBase + subDrop)
      },
    }
  }

  const fracBox = (numTok: Token | undefined, denTok: Token | undefined, size: number): Box => {
    const num = numTok ? atomBox(numTok, size * FRAC_SCALE) : spaceBox(0)
    const den = denTok ? atomBox(denTok, size * FRAC_SCALE) : spaceBox(0)
    const w = Math.max(num.w, den.w) + 0.16 * size
    const ruleY = AXIS * size // 分数线在主基线以上
    const numBase = ruleY + 0.2 * size + num.d // 分子基线在主基线以上的距离
    const denBase = ruleY + 0.32 * size + den.h // 分母基线在主基线以下的距离
    return {
      w,
      h: numBase + num.h,
      d: denBase + den.d,
      paint: (g, r, x, yBase) => {
        num.paint(g, r, x + (w - num.w) / 2, yBase - numBase)
        den.paint(g, r, x + (w - den.w) / 2, yBase + denBase)
        r.push({ x1: x, y1: yBase - ruleY, x2: x + w, y2: yBase - ruleY, w: 0.045 * size })
      },
    }
  }

  const sqrtBox = (argTok: Token | undefined, size: number): Box => {
    const inner = argTok ? atomBox(argTok, size) : spaceBox(0)
    const lead = 0.46 * size
    const topPad = 0.16 * size
    return {
      w: inner.w + lead + 0.08 * size,
      h: inner.h + topPad,
      d: inner.d,
      paint: (g, r, x, yBase) => {
        const top = yBase - inner.h - topPad + 0.06 * size
        const bottom = yBase + Math.max(0.1 * size, inner.d * 0.5)
        r.push({ x1: x, y1: yBase - inner.h * 0.3, x2: x + lead * 0.38, y2: bottom, w: 0.05 * size })
        r.push({ x1: x + lead * 0.38, y1: bottom, x2: x + lead * 0.74, y2: top, w: 0.05 * size })
        r.push({ x1: x + lead * 0.74, y1: top, x2: x + lead + inner.w + 0.06 * size, y2: top, w: 0.05 * size })
        inner.paint(g, r, x + lead + 0.02 * size, yBase)
      },
    }
  }

  const accentBox = (kind: string, argTok: Token | undefined, size: number): Box => {
    const inner = argTok ? atomBox(argTok, size) : spaceBox(0)
    return {
      w: inner.w,
      h: inner.h + 0.32 * size,
      d: inner.d,
      paint: (g, r, x, yBase) => {
        inner.paint(g, r, x, yBase)
        if (kind === 'bar') {
          r.push({ x1: x, y1: yBase - inner.h - 0.16 * size, x2: x + inner.w, y2: yBase - inner.h - 0.16 * size, w: 0.04 * size })
        } else if (kind === 'hat') {
          g.push({ ch: '^', x: x + inner.w / 2 - 0.16 * size, y: yBase - inner.h - 0.04 * size, size: size * 0.76, style: 'up' })
        } else {
          g.push({ ch: '→', x: x + inner.w / 2 - 0.26 * size, y: yBase - inner.h - 0.06 * size, size: size * 0.62, style: 'up' })
        }
      },
    }
  }

  const boldBox = (argTok: Token | undefined, size: number): Box => {
    if (!argTok) return spaceBox(0)
    if (argTok.kind === 'char') return glyphBox(argTok.ch, 'bold', size)
    if (argTok.kind === 'cmd' && GREEK[argTok.name]) return glyphBox(GREEK[argTok.name], 'bold', size)
    if (argTok.kind === 'group') {
      return row(argTok.tokens.map((tk) => (tk.kind === 'char' ? glyphBox(tk.ch, 'bold', size) : atomBox(tk, size))))
    }
    return atomBox(argTok, size)
  }

  const bigopBox = (name: string, size: number): Box => {
    const ch = name === 'sum' ? '∑' : name === 'int' ? '∫' : '∏'
    const scaled = BIGOP_SCALE * size
    return {
      w: measure(ch, 'bigop') * scaled + (name === 'int' ? 0.16 * size : 0),
      h: 0.78 * scaled,
      d: 0.3 * scaled,
      paint: (g, _r, x, yBase) => {
        g.push({ ch, x, y: yBase + 0.08 * size, size: scaled, style: 'bigop' })
      },
    }
  }

  const commandBox = (name: string, size: number): Box => {
    if (GREEK[name]) return glyphBox(GREEK[name], 'math', size)
    if (SYMBOLS[name]) return glyphBox(SYMBOLS[name].ch, SYMBOLS[name].style, size)
    if (UPRIGHT_WORDS[name]) return row(UPRIGHT_WORDS[name].split('').map((c) => glyphBox(c, 'up', size)))
    if (name === ',' || name === ';') return spaceBox((name === ',' ? 0.17 : 0.24) * size)
    if (name === ' ') return spaceBox(0.25 * size)
    if (name === '!') return spaceBox(-0.1 * size)
    if (name === 'sum' || name === 'int' || name === 'prod') return bigopBox(name, size)
    // 未识别命令：按直立小字渲染，避免静默丢失
    return row(name.split('').map((c) => glyphBox(c, 'up', size * 0.9)))
  }

  /** 顺序解析一段 token；带参数的指令（\frac \sqrt …）在这里消费它们的参数 */
  function parseSeq(tokens: Array<Token>, size: number): Box {
    const boxes: Array<Box> = []
    let prevWasValue = false
    for (let ti = 0; ti < tokens.length; ti += 1) {
      const t = tokens[ti]
      if (t.kind === 'sup' || t.kind === 'sub') continue
      let box: Box
      let isOp = false
      if (t.kind === 'cmd' && (t.name === 'frac' || t.name === 'dfrac' || t.name === 'tfrac')) {
        box = fracBox(tokens[ti + 1], tokens[ti + 2], size)
        ti += 2
      } else if (t.kind === 'cmd' && t.name === 'sqrt') {
        box = sqrtBox(tokens[ti + 1], size)
        ti += 1
      } else if (t.kind === 'cmd' && (t.name === 'hat' || t.name === 'bar' || t.name === 'vec')) {
        box = accentBox(t.name, tokens[ti + 1], size)
        ti += 1
      } else if (t.kind === 'cmd' && (t.name === 'mathbf' || t.name === 'bm')) {
        box = boldBox(tokens[ti + 1], size)
        ti += 1
      } else if (t.kind === 'cmd' && (t.name === 'mathrm' || t.name === 'text')) {
        const arg = tokens[ti + 1]
        box = arg?.kind === 'group'
          ? row(arg.tokens.map((tk) => (tk.kind === 'char' ? glyphBox(tk.ch, 'up', size) : atomBox(tk, size))))
          : spaceBox(0)
        ti += 1
      } else if (t.kind === 'cmd' && t.name === 'left') {
        // 交给上层 parseTop 处理；连续片段里出现则按普通括号
        box = spaceBox(0)
      } else if (t.kind === 'cmd' && t.name === 'right') {
        box = spaceBox(0)
      } else if (t.kind === 'char') {
        const ch = t.ch === '-' ? '−' : t.ch
        box = atomBox(t, size)
        isOp = SPACED_OPS.has(ch) && prevWasValue
      } else {
        box = atomBox(t, size)
      }
      // 上下标：由当前 base 向后消费
      let sup: Box | null = null
      let sub: Box | null = null
      while (tokens[ti + 1] && (tokens[ti + 1].kind === 'sup' || tokens[ti + 1].kind === 'sub')) {
        const mark = tokens[ti + 1]
        const arg = tokens[ti + 2] as Token | undefined
        if (!arg || arg.kind === 'sup' || arg.kind === 'sub') break
        const argBox = atomBox(arg, size * SCRIPT_SCALE)
        if (mark.kind === 'sup') sup = argBox
        else sub = argBox
        ti += 2
      }
      if (sup || sub) box = withScripts(box, sup, sub, size)
      if (isOp) boxes.push(spaceBox(OP_SPACE * size))
      boxes.push(box)
      prevWasValue = !isOp
      if (isOp) boxes.push(spaceBox(OP_SPACE * size))
    }
    return row(boxes)
  }

  /** 顶层：处理 \left( … \right) 自动伸缩括号 */
  const parseTop = (tokens: Array<Token>, size: number): Box => {
    const segments: Array<Box> = []
    let i = 0
    while (i < tokens.length) {
      const t = tokens[i]
      const isLeft = t.kind === 'cmd' && t.name === 'left'
      if (!isLeft) {
        let j = i
        while (j < tokens.length) {
          const tk = tokens[j]
          if (tk.kind === 'cmd' && tk.name === 'left') break
          j += 1
        }
        segments.push(parseSeq(tokens.slice(i, j), size))
        i = j
        continue
      }
      const openTok = tokens[i + 1]
      let depth = 1
      let j = i + 2
      while (j < tokens.length && depth > 0) {
        const tk = tokens[j]
        if (tk.kind === 'cmd' && tk.name === 'left') depth += 1
        if (tk.kind === 'cmd' && tk.name === 'right') depth -= 1
        j += 1
      }
      // tokens[j-1] 是 \right，tokens[j] 是右括号字符
      const inner = parseTop(tokens.slice(i + 2, j - 1), size)
      const openCh = openTok?.kind === 'char' ? openTok.ch : '('
      const closeTok = tokens[j]
      const closeCh = closeTok?.kind === 'char' ? closeTok.ch : ')'
      const parenSize = Math.min(3.4, Math.max(1, (inner.h + inner.d) / 0.94)) * size
      const open = glyphBox(openCh, 'up', parenSize)
      const close = glyphBox(closeCh, 'up', parenSize)
      const lift = (inner.h - inner.d) / 2
      segments.push({
        w: open.w + inner.w + close.w + 0.1 * size,
        h: Math.max(inner.h, 0.25 * parenSize + lift),
        d: Math.max(inner.d, 0.25 * parenSize - lift),
        paint: (g, r, x, yBase) => {
          open.paint(g, r, x, yBase - lift + 0.25 * parenSize)
          inner.paint(g, r, x + open.w + 0.05 * size, yBase)
          close.paint(g, r, x + open.w + inner.w + 0.1 * size, yBase - lift + 0.25 * parenSize)
        },
      })
      i = j + 1
    }
    return row(segments)
  }

  const top = parseTop(tokenize(source), 1)
  top.paint(glyphs, rules, 0, 0)
  return { glyphs, rules, width: top.w, height: top.h, depth: top.d }
}

/** 画布绘制：originX/originY 是公式基线左端的像素坐标，pxPerEm 为缩放 */
export function paintLayoutToCanvas(
  layout: FormulaLayout,
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  pxPerEm: number,
  fillStyle: string,
): void {
  ctx.fillStyle = fillStyle
  ctx.textBaseline = 'alphabetic'
  for (const g of layout.glyphs) {
    const px = g.size * pxPerEm
    const italic = g.style === 'math' ? 'italic ' : ''
    const bold = g.style === 'bold' ? 'bold ' : ''
    ctx.font = `${italic}${bold}${px}px "Times New Roman", "Songti SC", Georgia, serif`
    ctx.fillText(g.ch, originX + g.x * pxPerEm, originY + g.y * pxPerEm)
  }
  ctx.strokeStyle = fillStyle
  ctx.lineCap = 'round'
  for (const r of layout.rules) {
    ctx.lineWidth = Math.max(1, r.w * pxPerEm)
    ctx.beginPath()
    ctx.moveTo(originX + r.x1 * pxPerEm, originY + r.y1 * pxPerEm)
    ctx.lineTo(originX + r.x2 * pxPerEm, originY + r.y2 * pxPerEm)
    ctx.stroke()
  }
}
