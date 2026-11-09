// 微积分笔记 离线排版构建脚本（无外部依赖）
// 用法: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTDIR = path.resolve(HERE, '..');
// 用法: node build.mjs [源文件.md] [输出.html]
// 省略参数时默认处理 电子版/微积分/微积分笔记.md
const posArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const MD_OUT = posArgs[0]
  ? path.resolve(posArgs[0])
  : path.join(OUTDIR, '微积分', '微积分笔记.md');
const HTML_OUT = posArgs[1]
  ? path.resolve(posArgs[1])
  : MD_OUT.replace(/\.md$/i, '.html');
const DOC_NAME = path.basename(MD_OUT, '.md');

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ',
  eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς',
  tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const SYMBOLS = {
  to: '→', rightarrow: '→', longrightarrow: '⟶', leftarrow: '←', gets: '←',
  leftrightarrow: '↔', Rightarrow: '⇒', Longrightarrow: '⟹', Leftarrow: '⇐',
  Leftrightarrow: '⇔', Longleftrightarrow: '⟺', implies: '⟹', iff: '⟺',
  mapsto: '↦', uparrow: '↑', downarrow: '↓',
  infty: '∞', in: '∈', notin: '∉', ni: '∋',
  subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
  cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅',
  le: '≤', leq: '≤', leqslant: '≤', ge: '≥', geq: '≥', geqslant: '≥',
  neq: '≠', ne: '≠', approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅',
  propto: '∝', ll: '≪', gg: '≫', lt: '<', gt: '>',
  pm: '±', mp: '∓', cdot: '⋅', times: '×', div: '÷', ast: '∗', star: '⋆',
  circ: '∘', bullet: '∙', oplus: '⊕', otimes: '⊗',
  forall: '∀', exists: '∃', nexists: '∄', neg: '¬', land: '∧', wedge: '∧',
  lor: '∨', vee: '∨', therefore: '∴', because: '∵',
  partial: '∂', nabla: '∇', prime: '′', degree: '°', angle: '∠', perp: '⊥', parallel: '∥',
  ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
  sum: '∑', prod: '∏', int: '∫', iint: '∬', oint: '∮', bigcup: '⋃', bigcap: '⋂',
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉',
  vert: '|', Vert: '‖', lvert: '|', rvert: '|',
  aleph: 'ℵ', hbar: 'ℏ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ',
  quad: ' ', qquad: ' ', enspace: ' ', thinspace: ' ',
};

const FUNCS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'arccot',
  'sinh', 'cosh', 'tanh', 'coth', 'ln', 'log', 'lg', 'exp', 'sgn', 'det', 'dim', 'gcd', 'deg',
]);

const LIMOPS = new Set(['lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf']);
const BIGOPS = new Set(['sum', 'prod', 'int', 'iint', 'oint', 'bigcup', 'bigcap']);
const LIMOP_TEXT = { lim: 'lim', limsup: 'lim sup', liminf: 'lim inf', max: 'max', min: 'min', sup: 'sup', inf: 'inf' };

const DOUBLESTRUCK = {
  R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', A: '𝔸', B: '𝔹', F: '𝔽', H: 'ℍ',
};

const OP_CHARS = new Set(['+', '−', '=', '<', '>', '±', '∓', '≤', '≥', '≠', '≈', '≡', '∼', '→', '⇒', '⇔', '∈', '∉', '⊂', '⊆', '∪', '∩', '∀', '∃', '∞', '·', '×', '÷', '±']);

/* ------------------------------------------------------------------ */
/* LaTeX 子集 → MathML                                                 */
/* ------------------------------------------------------------------ */
function texToMathML(src, display) {
  const s = String(src);
  let pos = 0;

  const isSpace = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r';
  function skipSpace() { while (pos < s.length && isSpace(s[pos])) pos++; }

  function parseRawGroup() {
    skipSpace();
    if (s[pos] === '{') {
      let depth = 1, start = pos + 1;
      pos++;
      while (pos < s.length) {
        const ch = s[pos];
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) break; }
        pos++;
      }
      const t = s.slice(start, pos);
      if (s[pos] === '}') pos++;
      return t;
    }
    const start = pos;
    if (pos < s.length) pos++;
    return s.slice(start, pos);
  }

  function readDelim() {
    skipSpace();
    if (pos >= s.length) return '<mrow></mrow>';
    let ch = s[pos];
    if (ch === '\\') { pos++; ch = s[pos]; pos++; }
    else pos++;
    if (ch === '.') return '<mrow></mrow>';
    if (ch === '{' || ch === '}' || ch === '|') return `<mo>${ch}</mo>`;
    return `<mo>${esc(ch)}</mo>`;
  }

  function parseSeq(stop) {
    let out = '';
    while (pos < s.length) {
      const c = s[pos];
      if (c === '}') break;
      if (stop && stop.includes(c)) break;
      if (isSpace(c)) { pos++; continue; }
      const node = parseScripted();
      if (!node) break;
      out += node;
    }
    return out;
  }

  function parseScripted() {
    const base = parseAtom();
    if (base === null) return '';
    let { ml, kind } = base;
    let sub = null, sup = null;
    while (pos < s.length) {
      const c = s[pos];
      if (c === "'") { pos++; sup = (sup === null ? '' : sup) + '<mo>′</mo>'; continue; }
      if (c !== '^' && c !== '_') break;
      pos++;
      skipSpace();
      const arg = parseAtom();
      const m = arg ? arg.ml : '<mrow></mrow>';
      if (c === '^') sup = m; else sub = m;
    }
    if (sub === null && sup === null) return ml;
    const under = (kind === 'lim' || kind === 'big') && display;
    if (under) {
      if (sub !== null && sup !== null) return `<munderover>${ml}${sub}${sup}</munderover>`;
      if (sub !== null) return `<munder>${ml}${sub}</munder>`;
      return `<mover>${ml}${sup}</mover>`;
    }
    if (sub !== null && sup !== null) return `<msubsup>${ml}${sub}${sup}</msubsup>`;
    if (sub !== null) return `<msub>${ml}${sub}</msub>`;
    return `<msup>${ml}${sup}</msup>`;
  }

  function parseArg() {
    skipSpace();
    if (pos >= s.length) return '<mrow></mrow>';
    if (s[pos] === '{') {
      pos++;
      const inner = parseSeq(null);
      if (s[pos] === '}') pos++;
      return `<mrow>${inner}</mrow>`;
    }
    const a = parseAtom();
    return a ? a.ml : '<mrow></mrow>';
  }

  function buildEnv(env, raw) {
    if (/^array/.test(env)) raw = raw.replace(/^\s*\{[^}]*\}/, '');
    const rows = raw.split(/\\\\/).map((r) => r.replace(/^\s*\[[^\]]*\]\s*/, '').trim()).filter((r) => r.length);
    if (/^cases/.test(env)) {
      // 分段函数：每行合成一个单元格，避免 Chromium 均分列宽造成的大空隙
      const trs = rows.map((r) => {
        const cells = r.split('&').map((c) => texToMathML(c, display));
        const body = cells.map((c, k) => (k ? '<mspace width="1.1em"></mspace>' : '') + c).join('');
        return `<mtr><mtd>${body}</mtd></mtr>`;
      }).join('');
      return `<mrow><mo>{</mo><mtable>${trs}</mtable></mrow>`;
    }
    let open = '', close = '';
    if (/^vmatrix/.test(env)) { open = '<mo>|</mo>'; close = '<mo>|</mo>'; }
    else if (/^pmatrix/.test(env)) { open = '<mo>(</mo>'; close = '<mo>)</mo>'; }
    else if (/^bmatrix/.test(env)) { open = '<mo>[</mo>'; close = '<mo>]</mo>'; }
    const trs = rows.map((r) => {
      const cells = r.split('&');
      return '<mtr>' + cells.map((c) => `<mtd>${texToMathML(c, display)}</mtd>`).join('') + '</mtr>';
    }).join('');
    const table = `<mtable>${trs}</mtable>`;
    return open ? `<mrow>${open}${table}${close}</mrow>` : table;
  }

  function parseAtom() {
    skipSpace();
    if (pos >= s.length) return null;
    const c = s[pos];

    if (c === '{') {
      pos++;
      const inner = parseSeq(null);
      if (s[pos] === '}') pos++;
      return { ml: `<mrow>${inner}</mrow>`, kind: 'atom' };
    }
    if (c === '\\') return parseCommand();
    if (/[0-9]/.test(c)) {
      let j = pos;
      while (j < s.length && (/[0-9]/.test(s[j]) || (s[j] === '.' && /[0-9]/.test(s[j + 1] || '')))) j++;
      const num = s.slice(pos, j);
      pos = j;
      return { ml: `<mn>${num}</mn>`, kind: 'atom' };
    }
    if (/[A-Za-z]/.test(c)) { pos++; return { ml: `<mi>${c}</mi>`, kind: 'atom' }; }
    if (/[\u4e00-\u9fff]/.test(c)) {
      let j = pos;
      while (j < s.length && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(s[j])) j++;
      const t = s.slice(pos, j);
      pos = j;
      return { ml: `<mtext>${esc(t)}</mtext>`, kind: 'atom' };
    }
    pos++;
    switch (c) {
      case '-': return { ml: '<mo>−</mo>', kind: 'atom' };
      case '*': return { ml: '<mo>⋅</mo>', kind: 'atom' };
      case '<': return { ml: '<mo>&lt;</mo>', kind: 'atom' };
      case '>': return { ml: '<mo>&gt;</mo>', kind: 'atom' };
      case '|': return { ml: '<mtext>|</mtext>', kind: 'atom' };
      case '(': case ')': case '[': case ']':
        return { ml: `<mo stretchy="false">${esc(c)}</mo>`, kind: 'atom' };
      case '&': return { ml: '', kind: 'atom' };
      default: return { ml: `<mo>${esc(c)}</mo>`, kind: 'atom' };
    }
  }

  function parseCommand() {
    pos++; // backslash
    if (pos >= s.length) return { ml: '<mo>\\</mo>', kind: 'atom' };
    if (!/[A-Za-z]/.test(s[pos])) {
      const ch = s[pos++];
      if (ch === ',' || ch === ';' || ch === ':' || ch === ' ') return { ml: '<mspace width="0.28em"></mspace>', kind: 'atom' };
      if (ch === '!') return { ml: '<mspace width="-0.17em"></mspace>', kind: 'atom' };
      if (ch === '{' || ch === '}') return { ml: `<mo stretchy="false">${ch}</mo>`, kind: 'atom' };
      if (ch === '|') return { ml: '<mtext>|</mtext>', kind: 'atom' };
      if (ch === '%') return { ml: '<mo>%</mo>', kind: 'atom' };
      if (ch === '\\') return { ml: '<mspace linebreak="newline"></mspace>', kind: 'atom' };
      return { ml: `<mo>${esc(ch)}</mo>`, kind: 'atom' };
    }
    let j = pos;
    while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
    const name = s.slice(pos, j);
    pos = j;

    switch (name) {
      case 'frac': case 'dfrac': case 'tfrac': {
        const a = parseArg();
        const b = parseArg();
        return { ml: `<mfrac>${a}${b}</mfrac>`, kind: 'atom' };
      }
      case 'sqrt': {
        skipSpace();
        let index = null;
        if (s[pos] === '[') {
          const start = ++pos;
          while (pos < s.length && s[pos] !== ']') pos++;
          index = texToMathML(s.slice(start, pos), display);
          pos++;
        }
        const body = parseArg();
        return { ml: index ? `<mroot>${body}${index}</mroot>` : `<msqrt>${body}</msqrt>`, kind: 'atom' };
      }
      case 'text': case 'mathrm': case 'textrm': case 'operatorname': case 'mbox': case 'textbf': case 'textit': {
        const t = parseRawGroup();
        return { ml: `<mtext>${esc(t)}</mtext>`, kind: 'atom' };
      }
      case 'mathbb': {
        const t = parseRawGroup();
        const conv = t.split('').map((ch) => DOUBLESTRUCK[ch] || ch).join('');
        return { ml: `<mi>${esc(conv)}</mi>`, kind: 'atom' };
      }
      case 'mathcal': case 'mathbf': case 'mathit': {
        const t = parseRawGroup();
        return { ml: `<mi>${esc(t)}</mi>`, kind: 'atom' };
      }
      case 'left': case 'right': {
        const open = readDelim();
        if (name === 'right') return { ml: open, kind: 'atom' };
        // 找到配对的 \right（考虑嵌套）
        let depthL = 1, k = pos;
        while (k < s.length) {
          if (s.startsWith('\\left', k)) { depthL++; k += 5; continue; }
          if (s.startsWith('\\right', k)) { depthL--; if (depthL === 0) break; k += 6; continue; }
          k++;
        }
        const innerRaw = s.slice(pos, k);
        let close = '<mrow></mrow>';
        if (k < s.length && s.startsWith('\\right', k)) { pos = k + 6; close = readDelim(); }
        else pos = s.length;
        const inner = texToMathML(innerRaw, display);
        return { ml: `<mrow>${open}${inner}${close}</mrow>`, kind: 'atom' };
      }
      case 'middle': {
        skipSpace();
        const ch = s[pos] === '|' ? (pos++, '|') : (pos < s.length ? s[pos++] : '|');
        return { ml: `<mo>${ch === '.' ? '' : esc(ch)}</mo>`, kind: 'atom' };
      }
      case 'vert': case 'lvert': case 'rvert':
        return { ml: '<mtext>|</mtext>', kind: 'atom' };
      case 'Vert': case 'lVert': case 'rVert':
        return { ml: '<mtext>‖</mtext>', kind: 'atom' };
      case 'begin': {
        const env = parseRawGroup().trim();
        const endTag = '\\end{' + env + '}';
        const endIdx = s.indexOf(endTag, pos);
        const raw = endIdx === -1 ? s.slice(pos) : s.slice(pos, endIdx);
        pos = endIdx === -1 ? s.length : endIdx + endTag.length;
        return { ml: buildEnv(env, raw), kind: 'atom' };
      }
      case 'end': { parseRawGroup(); return { ml: '', kind: 'atom' }; }
      case 'overline': case 'bar': {
        const a = parseArg();
        return { ml: `<mover accent="true">${a}<mo>‾</mo></mover>`, kind: 'atom' };
      }
      case 'underline': {
        const a = parseArg();
        return { ml: `<munder accentunder="true">${a}<mo>_</mo></munder>`, kind: 'atom' };
      }
      case 'vec': {
        const a = parseArg();
        return { ml: `<mover accent="true">${a}<mo>→</mo></mover>`, kind: 'atom' };
      }
      case 'hat': case 'widehat': {
        const a = parseArg();
        return { ml: `<mover accent="true">${a}<mo>^</mo></mover>`, kind: 'atom' };
      }
      case 'tilde': case 'widetilde': {
        const a = parseArg();
        return { ml: `<mover accent="true">${a}<mo>~</mo></mover>`, kind: 'atom' };
      }
      case 'displaystyle': case 'textstyle': case 'scriptstyle':
      case 'limits': case 'nolimits': case 'mathstrut':
        return { ml: '', kind: 'atom' };
      case 'quad': return { ml: '<mspace width="1em"></mspace>', kind: 'atom' };
      case 'qquad': return { ml: '<mspace width="2em"></mspace>', kind: 'atom' };
      case 'big': case 'Big': case 'bigg': case 'Bigg':
      case 'bigl': case 'bigr': case 'Bigl': case 'Bigr': {
        return parseAtom() || { ml: '', kind: 'atom' };
      }
      default: break;
    }

    if (GREEK[name]) return { ml: `<mi>${GREEK[name]}</mi>`, kind: 'atom' };
    if (SYMBOLS[name] !== undefined) {
      const v = SYMBOLS[name];
      if (name === 'quad' || name === 'qquad' || name === 'enspace' || name === 'thinspace') {
        return { ml: '<mspace width="1em"></mspace>', kind: 'atom' };
      }
      return { ml: `<mo>${esc(v)}</mo>`, kind: 'atom' };
    }
    if (FUNCS.has(name)) return { ml: `<mi mathvariant="normal">${name}</mi>`, kind: 'atom' };
    if (LIMOPS.has(name)) {
      const t = LIMOP_TEXT[name] || name;
      return { ml: `<mo movablelimits="true">${t}</mo>`, kind: 'lim' };
    }
    if (BIGOPS.has(name)) {
      const v = SYMBOLS[name] || name;
      return { ml: `<mo largeop="true">${v}</mo>`, kind: 'big' };
    }
    // 未知命令：按普通函数名处理，保留可读性
    return { ml: `<mi mathvariant="normal">${esc(name)}</mi>`, kind: 'atom' };
  }

  return parseSeq(null);
}

/* ------------------------------------------------------------------ */
/* 行内解析                                                            */
/* ------------------------------------------------------------------ */
function findClosing(text, from, ch) {
  for (let k = from; k < text.length; k++) {
    if (text[k] === '\\') { k++; continue; }
    if (text[k] === ch) return k;
  }
  return -1;
}

function inline(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];

    if (c === '$') {
      if (text[i + 1] === '$') {
        const end = text.indexOf('$$', i + 2);
        if (end !== -1) {
          out += `<div class="mathblock"><math display="block">${texToMathML(text.slice(i + 2, end), true)}</math></div>`;
          i = end + 2;
          continue;
        }
      }
      const end = findClosing(text, i + 1, '$');
      if (end !== -1) {
        out += `<math display="inline">${texToMathML(text.slice(i + 1, end), false)}</math>`;
        i = end + 1;
        continue;
      }
      out += '&#36;';
      i++;
      continue;
    }

    if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) { out += `<code>${esc(text.slice(i + 1, end))}</code>`; i = end + 1; continue; }
    }

    if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) { out += `<strong>${inline(text.slice(i + 2, end))}</strong>`; i = end + 2; continue; }
    }

    if (c === '*' && text[i + 1] !== ' ') {
      const end = findClosing(text, i + 1, '*');
      if (end !== -1 && end > i + 1) { out += `<em>${inline(text.slice(i + 1, end))}</em>`; i = end + 1; continue; }
    }

    out += esc(c);
    i++;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 块级解析                                                            */
/* ------------------------------------------------------------------ */
const CALLOUT_CLASS = [
  ['要点', 'key'], ['易错', 'warn'], ['待确认', 'todo'], ['补注', 'note'], ['说明', 'note'],
];

function calloutClass(tag) {
  for (const [k, v] of CALLOUT_CLASS) if (tag.startsWith(k)) return v;
  return 'note';
}

function isBlockStart(line) {
  return /^(#{1,4})\s+/.test(line) ||
    /^\s*\$\$/.test(line) ||
    /^>/.test(line) ||
    /^\|/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^-{3,}\s*$/.test(line.trim());
}

function renderBlocks(lines, ctx) {
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];

    if (!raw.trim()) { i++; continue; }

    if (/^-{3,}\s*$/.test(raw.trim())) { html += '<hr>\n'; i++; continue; }

    // 标题
    let m = raw.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const textHtml = inline(m[2].trim());
      if (ctx.collectToc && (level === 2 || level === 3)) ctx.n++;
      const id = `sec${ctx.n}`;
      if (ctx.collectToc && (level === 2 || level === 3)) ctx.toc.push({ level, id, html: textHtml });
      const isChapter = level === 2 && /^(第.+章|附录)/.test(m[2].trim());
      const cls = isChapter ? ' class="chapter"' : '';
      html += `<h${level} id="${id}"${cls}>${textHtml}</h${level}>\n`;
      i++;
      continue;
    }

    // 公式块
    if (/^\s*\$\$/.test(raw)) {
      let body = raw.trim().slice(2);
      i++;
      if (body.endsWith('$$')) body = body.slice(0, -2);
      else {
        while (i < lines.length && !lines[i].trim().endsWith('$$')) { body += '\n' + lines[i]; i++; }
        if (i < lines.length) { body += '\n' + lines[i].trim().replace(/\$\$\s*$/, ''); i++; }
      }
      html += `<div class="mathblock"><math display="block">${texToMathML(body, true)}</math></div>\n`;
      continue;
    }

    // 引用块 / 提示框
    if (/^>/.test(raw)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      // 一个引用块内若出现多个 **【标记】**，拆成多个独立提示框
      const segs = [];
      let cur = [];
      for (const line of buf) {
        if (/^\*\*【[^】]+】\*\*/.test(line.trim()) && cur.some((l) => l.trim())) {
          segs.push(cur);
          cur = [line];
        } else {
          cur.push(line);
        }
      }
      if (cur.length) segs.push(cur);

      for (const seg of segs) {
        let first = seg[0] || '';
        let tagText = null;
        const tm = first.match(/^\*\*【([^】]+)】\*\*\s*/);
        if (tm) {
          tagText = tm[1];
          seg[0] = first.slice(tm[0].length);
          if (!seg[0].trim()) seg.shift();
        }
        const inner = renderBlocks(seg, Object.assign({}, ctx, { collectToc: false }));
        if (tagText) {
          const cls = calloutClass(tagText);
          const edit = cls === 'todo'
            ? '<div class="editline"><span class="editlabel">修改区</span><span class="rule"></span></div>'
            : '';
          html += `<div class="callout ${cls}"><div class="callout-title">${esc(tagText)}</div><div class="callout-body">${inner}</div>${edit}</div>\n`;
        } else {
          html += `<blockquote>${inner}</blockquote>\n`;
        }
      }
      continue;
    }

    // 表格
    if (/^\|/.test(raw)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const parseRow = (line) => {
        const cells = [];
        let cur = '';
        for (let k = 0; k < line.length; k++) {
          if (line[k] === '\\' && line[k + 1] === '|') { cur += '|'; k++; continue; }
          if (line[k] === '|') { cells.push(cur); cur = ''; continue; }
          cur += line[k];
        }
        cells.push(cur);
        if (cells.length && !cells[0].trim()) cells.shift();
        if (cells.length && !cells[cells.length - 1].trim()) cells.pop();
        return cells.map((c) => c.trim());
      };
      const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
      const head = body.length ? parseRow(body[0]) : [];
      let t = '<div class="table-wrap"><table>\n';
      t += '<thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>\n<tbody>\n';
      for (let r = 1; r < body.length; r++) {
        t += '<tr>' + parseRow(body[r]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>\n';
      }
      t += '</tbody></table></div>\n';
      html += t;
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(raw)) {
      html += '<ul>\n';
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^[-*+]\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(raw)) {
      const start = parseInt(raw.match(/^(\d+)\./)[1], 10);
      html += `<ol${start !== 1 ? ` start="${start}"` : ''}>\n`;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    // 段落
    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    html += `<p>${inline(para.join(' '))}</p>\n`;
  }

  return html;
}

/* ------------------------------------------------------------------ */
/* 模板                                                                */
/* ------------------------------------------------------------------ */
const CSS = `
:root{
  --ink:#1f2328; --ink-soft:#5b636c; --line:#dfe5ec;
  --blue:#1d4f8c; --blue-l:#2f6db5; --blue-bg:#eef4fb;
  --amber:#a5611a; --amber-bg:#fdf6ea;
  --yellow:#8a6d00; --yellow-bg:#fffbdc; --yellow-line:#c9a227;
  --gray-bg:#f4f5f6;
}
*{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{
  margin:0; padding:0 16px 80px;
  background:#eceff3; color:var(--ink);
  font-family:"Source Han Serif SC","Noto Serif CJK SC","Songti SC",SimSun,"Times New Roman",serif;
  font-size:16.5px; line-height:1.95;
}
.page{
  max-width:920px; margin:0 auto; background:#fff;
  padding:56px 64px 72px; box-shadow:0 2px 18px rgba(31,45,61,.08);
}
/* 页眉 */
.doc-head{border-bottom:2px solid var(--blue); padding-bottom:18px; margin-bottom:26px;}
.doc-head h1{
  margin:0; font-size:34px; letter-spacing:.18em; font-weight:700; color:#12243c;
  font-family:"Source Han Sans SC","Microsoft YaHei","PingFang SC",sans-serif;
}
.doc-sub{margin:8px 0 0; color:var(--blue); font-size:15px; letter-spacing:.28em;}
.doc-meta{margin:6px 0 0; color:var(--ink-soft); font-size:13px;}
/* 工具栏 */
.toolbar{
  position:sticky; top:0; z-index:50; display:flex; gap:10px; align-items:center; flex-wrap:wrap;
  background:rgba(255,255,255,.94); backdrop-filter:blur(6px);
  border-bottom:1px solid var(--line); padding:10px 0 10px; margin:-10px 0 22px;
}
.toolbar input[type=search]{
  flex:1 1 220px; min-width:160px; padding:7px 12px; font-size:14px;
  border:1px solid var(--line); border-radius:6px; outline:none; background:#fbfcfd; color:var(--ink);
  font-family:inherit;
}
.toolbar input[type=search]:focus{border-color:var(--blue-l); background:#fff; box-shadow:0 0 0 3px rgba(47,109,181,.12);}
.toolbar button{
  padding:7px 14px; font-size:13.5px; border-radius:6px; cursor:pointer;
  border:1px solid var(--line); background:#f7f9fb; color:#26313d; font-family:inherit;
}
.toolbar button:hover{background:#eef4fb; border-color:#b9cee6; color:var(--blue);}
.toolbar button.on{background:var(--blue-l); border-color:var(--blue-l); color:#fff;}
.hit-count{font-size:13px; color:var(--ink-soft); min-width:64px;}
mark.hit{background:#ffe98a; color:inherit; padding:0 1px; border-radius:2px;}
body.editing #content{outline:1px dashed #b9cee6; outline-offset:12px;}
/* 目录 */
.toc{margin:4px 0 40px; padding:18px 24px 14px; background:#f7f9fb; border:1px solid var(--line); border-radius:8px;}
.toc-title{font-family:"Source Han Sans SC","Microsoft YaHei",sans-serif; font-weight:700; letter-spacing:.3em;
  color:var(--blue); font-size:15px; margin-bottom:8px;}
.toc-list{list-style:none; margin:0; padding:0; columns:2; column-gap:34px;}
.toc-list li{font-size:14px; line-height:1.85; break-inside:avoid;}
.toc-list li a{color:#2b3a4a; text-decoration:none; border-bottom:1px dotted transparent;}
.toc-list li a:hover{color:var(--blue-l); border-bottom-color:var(--blue-l);}
.toc-l3{padding-left:14px; font-size:13.5px; color:var(--ink-soft);}
.toc-l3 a{color:#4a5563;}
/* 标题层级 */
h2{
  font-family:"Source Han Sans SC","Microsoft YaHei","PingFang SC",sans-serif;
  font-size:25px; color:#123a63; line-height:1.5;
  margin:58px 0 20px; padding:6px 0 6px 16px; border-left:6px solid var(--blue-l);
  background:linear-gradient(90deg,#f2f7fc 0%,rgba(242,247,252,0) 78%);
}
h2.chapter{margin-top:64px;}
#content > h2:first-of-type{margin-top:24px;}
h3{
  font-family:"Source Han Sans SC","Microsoft YaHei","PingFang SC",sans-serif;
  font-size:19.5px; color:#1a4a7a; margin:38px 0 12px; padding-bottom:6px;
  border-bottom:1px dashed #c9d6e4; letter-spacing:.02em;
}
h4{font-size:17px; color:#25405c; margin:26px 0 8px;}
p{margin:0 0 13px; text-align:justify;}
strong{font-weight:700; color:#152c47;}
em{font-style:normal; color:var(--ink-soft); font-size:.94em;}
code{font-family:Consolas,"Courier New",monospace; background:#f1f3f5; padding:1px 5px; border-radius:3px; font-size:.92em;}
hr{border:0; border-top:1px solid var(--line); margin:34px 0;}
/* 列表 */
ul,ol{margin:0 0 14px; padding-left:1.7em;}
li{margin:5px 0;}
li::marker{color:var(--blue-l);}
/* 公式 */
math{font-family:"Cambria Math","Latin Modern Math","STIX Two Math","Times New Roman",serif; font-size:1.06em;}
math[display="block"]{margin:.42em auto; padding:0; overflow-x:auto; overflow-y:hidden;}
math mtd{text-align:left;}
math mtable{margin:0 .35em;}
.mathblock{text-align:center; margin:16px 0; max-width:100%; overflow-x:auto;}
.mathblock math[display="block"]{margin:0 auto;}
/* 表格 */
.table-wrap{overflow-x:auto; margin:18px 0 22px;}
table{border-collapse:collapse; width:auto; min-width:100%; font-size:14.5px; line-height:1.75;}
table math{font-size:.96em;}
th,td{border:1px solid #dbe3ec; padding:8px 11px; text-align:left; vertical-align:top;}
th{background:#eef3f9; color:#1c3f65; font-weight:700; white-space:nowrap;}
tbody tr:nth-child(even){background:#fafbfd;}
/* 提示框 */
.callout{
  margin:18px 0; padding:13px 18px 15px; border-radius:6px; font-size:15.5px; line-height:1.85;
  break-inside:avoid;
}
.callout .callout-title{
  font-family:"Source Han Sans SC","Microsoft YaHei",sans-serif;
  font-weight:700; font-size:13.5px; letter-spacing:.12em; margin-bottom:6px;
}
.callout-body > :last-child{margin-bottom:0;}
.callout-body p{margin:0 0 8px;}
.callout-body .mathblock{margin:10px 0;}
.callout.key{background:var(--blue-bg); border-left:4px solid var(--blue-l);}
.callout.key .callout-title{color:#17457c;}
.callout.warn{background:var(--amber-bg); border-left:4px solid #d98324;}
.callout.warn .callout-title{color:#95540f;}
.callout.note{background:var(--gray-bg); border-left:4px solid #98a2ac; color:#4d565f; font-size:14.5px;}
.callout.note .callout-title{color:#5e6a75;}
.callout.todo{
  background:var(--yellow-bg); border:1.5px dashed var(--yellow-line);
  padding:13px 18px 12px;
}
.callout.todo .callout-title{color:var(--yellow);}
.editline{display:flex; align-items:flex-end; gap:10px; margin-top:12px; font-size:12.5px; color:var(--yellow);}
.editline .editlabel{white-space:nowrap; letter-spacing:.08em;}
.editline .rule{flex:1; border-bottom:1px dashed var(--yellow-line); height:18px;}
blockquote{margin:16px 0; padding:10px 18px; border-left:3px solid var(--line); color:var(--ink-soft);}
/* 打印 */
@page{size:A4; margin:17mm 15mm 16mm;}
@media print{
  body{background:#fff; font-size:10.8pt; line-height:1.78; padding:0;}
  .page{box-shadow:none; max-width:none; padding:0;}
  .toolbar{display:none !important;}
  .toc{background:#fff; border-color:#ccc; break-after:page;}
  .toc-list{columns:2;}
  h2{break-before:page; margin-top:0; font-size:17pt; background:none;}
  #content > h2:first-of-type, .toc + h2{break-before:auto;}
  h3{break-after:avoid; font-size:13pt;}
  .callout,.table-wrap,table,tr,.mathblock{break-inside:avoid;}
  .mathblock{overflow:visible;}
  table{font-size:9.6pt;}
  math{font-size:1.02em;}
  mark.hit{background:none;}
}
`;

const JS = `
(function(){
  var content = document.getElementById('content');
  var input = document.getElementById('q');
  var count = document.getElementById('qcount');
  var clearBtn = document.getElementById('clear');
  var editBtn = document.getElementById('edit');
  var printBtn = document.getElementById('print');

  function clearMarks(){
    var marks = document.querySelectorAll('mark.hit');
    for (var i=0;i<marks.length;i++){
      var m = marks[i];
      m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    }
    content.normalize();
  }

  function highlight(term){
    var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    var total = 0;
    for (var k=0;k<nodes.length;k++){
      var node = nodes[k];
      var txt = node.nodeValue;
      if (!txt) continue;
      var parent = node.parentNode;
      if (!parent || /^(SCRIPT|STYLE)$/.test(parent.tagName)) continue;
      if (parent.closest && parent.closest('math')) continue;
      var lower = txt.toLowerCase();
      if (lower.indexOf(term) === -1) continue;
      var frag = document.createDocumentFragment();
      var idx = 0, pos;
      while ((pos = lower.indexOf(term, idx)) !== -1){
        if (pos > idx) frag.appendChild(document.createTextNode(txt.slice(idx, pos)));
        var mk = document.createElement('mark');
        mk.className = 'hit';
        mk.textContent = txt.slice(pos, pos + term.length);
        frag.appendChild(mk);
        idx = pos + term.length;
        total++;
      }
      if (idx < txt.length) frag.appendChild(document.createTextNode(txt.slice(idx)));
      parent.replaceChild(frag, node);
    }
    return total;
  }
  var timer = null;
  if (input){
    input.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        clearMarks();
        var term = input.value.trim();
        if (!term){ count.textContent = ''; return; }
        var hits = 0;
        try { hits = highlight(term.toLowerCase()); } catch(e) {}
        count.textContent = hits ? hits + ' 处' : '未找到';
      }, 160);
    });
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') e.preventDefault(); });
  }
  if (clearBtn) clearBtn.onclick = function(){ if(input){input.value='';} clearMarks(); if(count) count.textContent=''; };
  if (editBtn) editBtn.onclick = function(){
    var on = content.getAttribute('contenteditable') === 'true';
    content.setAttribute('contenteditable', on ? 'false' : 'true');
    document.body.classList.toggle('editing', !on);
    editBtn.classList.toggle('on', !on);
    editBtn.textContent = on ? '编辑模式' : '退出编辑';
    if (!on) content.focus();
  };
  if (printBtn) printBtn.onclick = function(){ window.print(); };
  try {
    var mm = (location.search || '').match(/[?&]y=(\d+)/);
    if (mm) window.scrollTo(0, parseInt(mm[1], 10));
  } catch (e) {}
})();
`;

function build() {
  const md = fs.readFileSync(MD_OUT, 'utf8').replace(/^\uFEFF/, '');
  const lines = md.split(/\r?\n/);
  const ctx = { toc: [], n: 0, collectToc: true };
  const body = renderBlocks(lines, ctx);

  const tocHtml = '<nav class="toc"><div class="toc-title">目 录</div><ul class="toc-list">' +
    ctx.toc.map((it) => `<li class="toc-l${it.level}"><a href="#${it.id}">${it.html}</a></li>`).join('') +
    '</ul></nav>\n';

  // 在第一个 <h2 前插入目录
  const idx = body.indexOf('<h2');
  const withToc = idx === -1 ? body + tocHtml : body.slice(0, idx) + tocHtml + body.slice(idx);

  const headEnd = withToc.indexOf('</h1>');
  let content = withToc;
  if (headEnd !== -1) {
    // 把第一个 h1 及紧随的副标题包进 doc-head
    const firstH2 = content.indexOf('<h2');
    const headPart = content.slice(0, firstH2 === -1 ? content.length : firstH2);
    const rest = firstH2 === -1 ? '' : content.slice(firstH2);
    let h1 = headPart.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    let ps = [...headPart.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((mm) => mm[1]);
    const html = `<header class="doc-head">\n<h1>${h1 ? h1[1] : DOC_NAME}</h1>\n` +
      (ps[0] ? `<p class="doc-sub">${ps[0]}</p>\n` : '') +
      (ps[1] ? `<p class="doc-meta">${ps[1]}</p>\n` : '') +
      `</header>\n`;
    // 目录在 header 之后
    const tocIdx = rest.indexOf('<nav class="toc">');
    let restWithoutToc = rest;
    if (tocIdx !== -1) restWithoutToc = rest.replace(tocHtml, '');
    content = html + tocHtml + restWithoutToc;
  }

  const out = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${DOC_NAME} · 电子整理版</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
<div class="toolbar">
  <input id="q" type="search" placeholder="全文检索：输入关键词，例如 定理名、符号、人名" autocomplete="off">
  <span class="hit-count" id="qcount"></span>
  <button id="clear" type="button">清除</button>
  <button id="edit" type="button">编辑模式</button>
  <button id="print" type="button">打印 / 导出 PDF</button>
</div>
<main id="content">
${content}
</main>
</div>
<script>${JS}</script>
</body>
</html>`;

  fs.writeFileSync(HTML_OUT, out, 'utf8');
  const kb = (fs.statSync(HTML_OUT).size / 1024).toFixed(1);
  console.log(`已生成 ${path.basename(MD_OUT)} 与 ${path.basename(HTML_OUT)}（${kb} KB，目录 ${ctx.toc.length} 条）`);

  // 预览切片：按三级标题切块，便于逐屏核对排版
  if (process.argv.includes('--preview')) {
    const chunks = content.split(/(?=<h[23] )/);
    const dir = path.join(HERE, 'preview');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    chunks.forEach((ch, i) => {
      const t = (ch.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || ch.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [, 'chunk'])[1];
      const label = t.replace(/<[^>]+>/g, '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 24);
      const name = `${String(i).padStart(2, '0')}_${label}.html`;
      const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="page"><main id="content">${ch}</main></div></body></html>`;
      fs.writeFileSync(path.join(dir, name), html, 'utf8');
    });
    console.log(`预览切片 ${chunks.length} 个 → ${dir}`);
  }

  if (process.argv.includes('--audit')) {
    const audit = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><style>${CSS}</style>
<style>
body{font-size:10.8pt;line-height:1.78;padding:0;background:#fff;}
.page{max-width:190mm;padding:0;box-shadow:none;}
table{font-size:9.6pt;}
</style></head><body><div class="page"><main id="content">${content.replace(/<nav class="toc">[\s\S]*?<\/nav>/, '')}</main></div>
<script>
window.addEventListener('load', function(){
  var rep = [];
  var c = document.getElementById('content');
  var limit = c.clientWidth;
  var els = document.querySelectorAll('.mathblock, table, .callout, p, h2, h3, li');
  for (var i=0;i<els.length;i++){
    var el = els[i];
    if (el.scrollWidth > limit + 3) {
      rep.push(el.tagName + ':' + el.scrollWidth + '>' + limit + '::' + (el.textContent||'').replace(/\\s+/g,' ').slice(0,40));
    }
  }
  document.title = 'AUDIT width=' + limit + ' overflow=' + rep.length + ' ' + rep.join(' || ');
  var pre = document.createElement('pre');
  pre.id = 'auditreport';
  pre.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fffbe6;border:2px solid #c00;font:15px/1.6 Consolas,monospace;padding:14px;z-index:9999;max-height:96vh;overflow:auto;white-space:pre-wrap;margin:0';
  pre.textContent = 'AUDIT width=' + limit + ' overflow=' + rep.length + '\\n' + rep.join('\\n');
  document.body.appendChild(pre);
});
</script></body></html>`;
    fs.writeFileSync(path.join(HERE, 'audit.html'), audit, 'utf8');
    console.log('审计页 → audit.html');
  }
}

build();
