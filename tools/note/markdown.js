/**
 * Markdown live-preview renderer for the Notes tool (BETA).
 *
 * No dependencies. The rendered DOM is deliberately flat and made only of
 * <span> / <br> elements, so the markdown source can always be recovered from
 * the DOM. Three invariants make the whole thing work:
 *
 *   1. getRawText(el) === the original markdown source
 *      Every source character lives in exactly one text node, and every
 *      source newline is represented by a <br class="md-nl">.
 *
 *   2. Literal text is emitted in runs, never one span per character.
 *      data-o on each run is its offset in the source, which maps a caret
 *      offset back to a DOM position.
 *
 *   3. Nothing but escaped text and our own spans is ever emitted, so note
 *      content cannot inject markup.
 *
 * Markup characters are emitted as `.md-mark` spans, hidden by CSS unless the
 * caret currently sits inside that construct: formatted while reading, raw
 * while writing (Obsidian-style live preview).
 */

const ESCAPABLE = "\\`*_{}[]()#+-.!>~|<&\"";

/* ------------------------------------------------------------------ utils */

export function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const inRange = (caret, start, len) => caret >= start && caret <= start + len;

/** Source newline. Hidden after a block line, which already breaks. */
const NL = '<br class="md-nl">';

/**
 * Collects consecutive literal characters into a single run, so a paragraph
 * of N characters costs one span instead of N.
 */
class RunBuffer {
  constructor() {
    this.text = "";
    this.start = 0;
  }

  push(ch, offset) {
    if (!this.text) this.start = offset;
    this.text += ch;
  }

  flush() {
    if (!this.text) return "";
    const out = `<span data-o="${this.start}">${escapeHTML(this.text)}</span>`;
    this.text = "";
    return out;
  }
}

/** A markup character: hidden unless the caret is inside it. */
function mark(text, offset, caret) {
  const active = inRange(caret, offset, text.length);
  return `<span class="md-mark${active ? " is-active" : ""}" data-o="${offset}">${escapeHTML(text)}</span>`;
}

/**
 * A marker replaced by a nicer glyph when hidden (list bullets, task boxes).
 *
 * The span itself stays laid out at zero width (font-size:0) so the source
 * characters keep their place in textContent without taking any room, and the
 * pretty glyph is injected by a pseudo-element. The span must NOT be
 * display:none, or the pseudo-element would never render.
 */
function markGlyph(text, offset, caret, glyph) {
  if (inRange(caret, offset, text.length)) {
    return `<span class="md-mark is-active" data-o="${offset}">${escapeHTML(text)}</span>`;
  }
  return `<span class="md-mark-swap" data-o="${offset}" data-glyph="${escapeHTML(glyph)}">${escapeHTML(text)}</span>`;
}

/* ----------------------------------------------------------------- blocks */

function splitLines(src) {
  const lines = [];
  let start = 0;
  for (let i = 0; i <= src.length; i++) {
    if (i === src.length || src[i] === "\n") {
      lines.push({ text: src.slice(start, i), start });
      start = i + 1;
    }
  }
  return lines;
}

const RE_FENCE = /^[ \t]*(```|~~~)(.*)$/;
const RE_HR = /^[ \t]*(?:-[ \t]*){3,}$|^[ \t]*(?:\*[ \t]*){3,}$|^[ \t]*(?:_[ \t]*){3,}$/;
const RE_QUOTE = /^([ \t]*)(\s*>\s?)(.*)$/;
const RE_HEADING = /^(#{1,6})([ \t]+)(.*)$/;
const RE_LIST = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(\[[ xX]\])?[ \t]*(.*)$/;
const RE_SETEXT = /^[ \t]*(=+|-+)[ \t]*$/;

/**
 * Turns the source into top-level parts. Each part becomes one `.md-line`
 * span; parts are joined by NL so the source newlines survive the round-trip.
 */
function parseBlocks(src, caret) {
  const lines = splitLines(src);
  const parts = [];
  let i = 0;

  const push = (p) => {
    parts.push({ block: false, cls: "", ...p });
  };

  while (i < lines.length) {
    const line = lines[i];
    const nextText = lines[i + 1]?.text ?? "";

    // ------------------------------------------------------ fenced code ---
    const fence = line.text.match(RE_FENCE);
    if (fence) {
      const marker = fence[1];
      let last = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].text.trim().startsWith(marker)) {
          last = j;
          break;
        }
      }

      const body = [];
      for (let j = i + 1; j <= last; j++) body.push(lines[j]);

      const buf = new RunBuffer();
      let html = mark(line.text, line.start, caret);
      body.forEach((l, idx) => {
        for (const ch of l.text) buf.push(ch, l.start + buf.text.length);
        const flushed = buf.flush();
        html += flushed || `<span data-o="${l.start}"></span>`;
        if (idx < body.length - 1) html += NL;
      });

      const tail = body.length ? body[body.length - 1] : line;
      push({
        html: `<span class="md-codeblock">${html}</span>`,
        block: true,
        s: line.start,
        e: tail.start + tail.text.length,
      });
      i = last + 1;
      continue;
    }

    // --------------------------------------------------------- blank -----
    if (!line.text.trim()) {
      push({ html: "", s: line.start, e: line.start });
      i++;
      continue;
    }

    // ------------------------------------------------- thematic break -----
    // Checked before lists: "* * *" is a break, not a list item.
    if (RE_HR.test(line.text)) {
      const body = line.text.trim();
      push({
        html: mark(body, line.start + line.text.indexOf(body), caret),
        block: true,
        cls: "md-hr",
        s: line.start,
        e: line.start + line.text.length,
      });
      i++;
      continue;
    }

    // ---------------------------------------------------- setext title ---
    if (parts.length && !parts[parts.length - 1].block && nextText && RE_SETEXT.test(nextText)) {
      push({
        html: inline(line.text, line.start, caret),
        block: true,
        cls: nextText.includes("=") ? "md-h1" : "md-h2",
        s: line.start,
        e: lines[i + 1].start + nextText.length,
      });
      i += 2;
      continue;
    }

    // ---------------------------------------------------- block quote ----
    if (RE_QUOTE.test(line.text)) {
      const group = [];
      while (i < lines.length && RE_QUOTE.test(lines[i].text)) {
        group.push(lines[i]);
        i++;
      }
      let html = "";
      group.forEach((l, idx) => {
        const m = l.text.match(RE_QUOTE);
        const prefix = m[1] + m[2];
        html += mark(prefix, l.start, caret);
        html += inline(m[3], l.start + prefix.length, caret);
        if (idx < group.length - 1) html += NL;
      });
      const tail = group[group.length - 1];
      push({
        html: `<span class="md-quote">${html}</span>`,
        block: true,
        s: group[0].start,
        e: tail.start + tail.text.length,
      });
      continue;
    }

    // ------------------------------------------------------- heading -----
    const h = line.text.match(RE_HEADING);
    if (h) {
      const prefix = h[1] + h[2];
      push({
        html: mark(prefix, line.start, caret) + inline(h[3], line.start + prefix.length, caret),
        block: true,
        cls: `md-h${h[1].length}`,
        s: line.start,
        e: line.start + line.text.length,
      });
      i++;
      continue;
    }

    // ------------------------------------------------------ list item ----
    const li = line.text.match(RE_LIST);
    if (li) {
      const [full, indent, bullet, gap, box, rest] = li;
      const level = Math.min(Math.floor(indent.replace(/\t/g, "  ").length / 2), 4);
      const ordered = /\d/.test(bullet);

      let html = "";
      let off = line.start;

      if (indent) {
        html += mark(indent, off, caret);
        off += indent.length;
      }

      if (box) {
        html += markGlyph(bullet + gap, off, caret, "\u2610");
        off += bullet.length + gap.length;
        html += mark(box, off, caret);
      } else {
        html += markGlyph(bullet + gap, off, caret, ordered ? bullet : "\u2022");
      }

      // Rest is greedy-matched from the right, so derive its offset instead
      // of trusting the captured group positions.
      html += inline(rest, line.start + full.length - rest.length, caret);

      push({
        html: `<span class="md-li${ordered ? " is-ordered" : ""}" style="--md-level:${level}">${html}</span>`,
        block: true,
        s: line.start,
        e: line.start + line.text.length,
      });
      i++;
      continue;
    }

    // ------------------------------------------------------ paragraph ----
    push({ html: inline(line.text, line.start, caret), s: line.start, e: line.start + line.text.length });
    i++;
  }

  return parts;
}

/* ----------------------------------------------------------------- inline */

function findCloser(s, from, token) {
  let idx = from;
  while ((idx = s.indexOf(token, idx)) !== -1) {
    if (idx > from) return idx;
    idx++;
  }
  return -1;
}

const RE_AUTOLINK = /^https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?]/;

/** Renders inline markdown for one line, batching literal text into runs. */
function inline(s, off, caret) {
  const buf = new RunBuffer();
  let out = "";
  let i = 0;
  const n = s.length;

  const flush = () => {
    out += buf.flush();
  };

  while (i < n) {
    const c = s[i];
    const wordStart = i === 0 || !/[\w]/.test(s[i - 1]);

    // backslash escape ---------------------------------------------------
    if (c === "\\" && i + 1 < n && ESCAPABLE.includes(s[i + 1])) {
      flush();
      out += mark(s.slice(i, i + 2), off + i, caret);
      i += 2;
      continue;
    }

    // inline code --------------------------------------------------------
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i) {
        flush();
        out += mark("`", off + i, caret);
        out += `<code class="md-code">${runOf(s.slice(i + 1, j), off + i + 1)}</code>`;
        out += mark("`", off + j, caret);
        i = j + 1;
        continue;
      }
    }

    // ***bold italic*** ---------------------------------------------------
    if (s.startsWith("***", i)) {
      const e = findCloser(s, i + 3, "***");
      if (e !== -1) {
        flush();
        out += mark("***", off + i, caret);
        out += `<strong><em>${inline(s.slice(i + 3, e), off + i + 3, caret)}</em></strong>`;
        out += mark("***", off + e, caret);
        i = e + 3;
        continue;
      }
    }

    // **bold** -----------------------------------------------------------
    if (s.startsWith("**", i)) {
      const e = findCloser(s, i + 2, "**");
      if (e !== -1) {
        flush();
        out += mark("**", off + i, caret);
        out += `<strong>${inline(s.slice(i + 2, e), off + i + 2, caret)}</strong>`;
        out += mark("**", off + e, caret);
        i = e + 2;
        continue;
      }
    }

    // ~~strikethrough~~ ---------------------------------------------------
    if (s.startsWith("~~", i)) {
      const e = findCloser(s, i + 2, "~~");
      if (e !== -1) {
        flush();
        out += mark("~~", off + i, caret);
        out += `<del>${inline(s.slice(i + 2, e), off + i + 2, caret)}</del>`;
        out += mark("~~", off + e, caret);
        i = e + 2;
        continue;
      }
    }

    // *italic* -----------------------------------------------------------
    if (c === "*") {
      const e = findCloser(s, i + 1, "*");
      if (e !== -1 && !/\s/.test(s[e - 1])) {
        flush();
        out += mark("*", off + i, caret);
        out += `<em>${inline(s.slice(i + 1, e), off + i + 1, caret)}</em>`;
        out += mark("*", off + e, caret);
        i = e + 1;
        continue;
      }
    }

    // _italic_ -----------------------------------------------------------
    if (c === "_" && wordStart) {
      const e = findCloser(s, i + 1, "_");
      if (e !== -1 && !/\s/.test(s[e - 1])) {
        flush();
        out += mark("_", off + i, caret);
        out += `<em>${inline(s.slice(i + 1, e), off + i + 1, caret)}</em>`;
        out += mark("_", off + e, caret);
        i = e + 1;
        continue;
      }
    }

    // [label](href) ------------------------------------------------------
    if (c === "[") {
      const close = s.indexOf("](", i);
      const end = close === -1 ? -1 : s.indexOf(")", close + 2);
      if (end !== -1) {
        const href = s.slice(close + 2, end);
        if (href && !/[\s()]/.test(href)) {
          flush();
          out += mark("[", off + i, caret);
          out += `<span class="md-link-label">${inline(s.slice(i + 1, close), off + i + 1, caret)}</span>`;
          out += mark("](", off + close, caret);
          out += `<span class="md-link-url">${runOf(href, off + close + 2)}</span>`;
          out += mark(")", off + end, caret);
          i = end + 1;
          continue;
        }
      }
    }

    // bare autolink -------------------------------------------------------
    if (c === "h" && wordStart) {
      const m = s.slice(i).match(RE_AUTOLINK);
      if (m) {
        flush();
        out += `<span class="md-link">${runOf(m[0], off + i)}</span>`;
        i += m[0].length;
        continue;
      }
    }

    buf.push(c, off + i);
    i++;
  }

  flush();
  return out;
}

/** A single literal run. Empty text still yields a placeholder node. */
function runOf(text, offset) {
  if (!text) return `<span data-o="${offset}"></span>`;
  return `<span data-o="${offset}">${escapeHTML(text)}</span>`;
}

/* ----------------------------------------------------------------- render */

/** Renders `src` to HTML. `caret` decides which markers stay visible. */
export function renderMarkdown(src, caret = src.length) {
  const parts = parseBlocks(src, caret);
  let html = "";
  parts.forEach((p, idx) => {
    const cls = ["md-line", p.block ? "is-block" : "", p.cls].filter(Boolean).join(" ");
    html += `<span class="${cls}" data-s="${p.s}" data-e="${p.e}">${p.html}</span>`;
    if (idx < parts.length - 1) html += NL;
  });
  return html;
}

/* ------------------------------------------------------------------ caret */

/** Depth-first walk over text nodes and <br> newlines, in document order. */
function walkRaw(root, visit) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return node.nodeType === Node.TEXT_NODE || node.tagName === "BR" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  let total = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.nodeType === Node.TEXT_NODE ? node.data.length : 1;
    if (visit(node, total, len) === false) return;
    total += len;
  }
}

/** Recovers the markdown source from the rendered DOM. */
export function getRawText(el) {
  let out = "";
  walkRaw(el, (node) => {
    out += node.nodeType === Node.TEXT_NODE ? node.data : "\n";
  });
  return out;
}

/**
 * Current caret position as an offset into the markdown source, or null when
 * the selection is not inside `el`.
 */
export function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return null;

  // Clone the content up to the caret and measure it with the same rules as
  // getRawText, so hidden markers and <br> newlines are counted correctly.
  const before = document.createRange();
  before.setStart(el, 0);
  before.setEnd(range.startContainer, range.startOffset);

  let count = 0;
  walkRaw(before.cloneContents(), (node, _start, len) => {
    count += len;
  });

  return count;
}

/** Places the caret at `offset` (an index into the markdown source). */
export function setCaretOffset(el, offset) {
  const leaves = Array.from(el.querySelectorAll("[data-o]"));
  if (!leaves.length) {
    focusEnd(el);
    return;
  }

  const info = leaves
    .map((leaf) => ({ leaf, start: Number(leaf.dataset.o), len: leaf.textContent.length }))
    .filter((x) => x.len > 0 && Number.isFinite(x.start));

  if (!info.length) {
    focusEnd(el);
    return;
  }

  // Prefer the run starting exactly at the offset (matches what a browser
  // does when you type), then the shortest run containing it.
  let target = info.find((x) => x.start === offset);
  if (!target) {
    target = info
      .filter((x) => offset >= x.start && offset <= x.start + x.len)
      .sort((a, b) => a.len - b.len)[0];
  }

  if (!target) {
    const last = info.reduce((a, b) => (b.start + b.len > a.start + a.len ? b : a));
    placeCaret(el, last.leaf, last.len);
    return;
  }

  placeCaret(el, target.leaf, offset - target.start);
}

function placeCaret(el, leaf, at) {
  const sel = window.getSelection();
  if (!sel) return;
  const textNode = leaf.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

  const range = document.createRange();
  range.setStart(textNode, Math.max(0, Math.min(at, textNode.length)));
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Last resort for empty content: focus the editor with the caret inside. */
function focusEnd(el) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/* ---------------------------------------------------------------- preview */

/** Strips markdown down to readable plain text, for the sidebar preview. */
export function stripMarkdown(src) {
  if (!src) return "";
  let out = src;
  out = out.replace(/```[\s\S]*?```/g, "  ");
  out = out.replace(/~~~[\s\S]*?~~~/g, "  ");
  out = out.replace(/`([^`\n]+)`/g, "$1");
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Drop any angle-bracket construct, including unterminated ones such as
  // "<script", rather than only well-formed "<...>" tags.
  out = out.replace(/<[^>]*>?/g, " ");
  out = out.replace(/[<>`]/g, " ");
  out = out.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");
  out = out.replace(/^[ \t]*(=+|-+)[ \t]*$/gm, "");
  out = out.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  out = out.replace(/^[ \t]*([-*+]|\d+[.)])[ \t]+/gm, "");
  out = out.replace(/^[ \t]*\[[ xX]\][ \t]*/gm, "");
  out = out.replace(/(\*\*\*|\*\*|__|~~|\*|_)/g, "");
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!>~|<&"])/g, "$1");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}