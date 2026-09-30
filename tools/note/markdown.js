/**
 * Markdown live-preview renderer for the Notes tool (BETA).
 *
 * No dependencies. The rendered DOM is deliberately flat and made only of
 * <span> / <br> elements so the markdown source can always be recovered from
 * the DOM. Two invariants make the whole thing work:
 *
 *   1. getRawText(el) === the original markdown source
 *      (every source character lives in exactly one text node, and every
 *      source newline is represented by a <br class="md-nl">)
 *
 *   2. every literal run carries data-o = its byte offset in the source,
 *      which lets us map a caret offset back to a DOM position.
 *
 * Markup characters are emitted as `.md-mark` spans, hidden by CSS unless the
 * caret currently sits inside that construct. That is what produces the
 * "Obsidian live preview" behaviour: formatted while reading, raw while
 * writing.
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

/** A run of literal source text. */
function run(text, offset) {
  if (!text) return "";
  return `<span data-o="${offset}">${escapeHTML(text)}</span>`;
}

/** A markup character: hidden unless the caret is inside it. */
function mark(text, offset, caret) {
  const active = inRange(caret, offset, text.length);
  return `<span class="md-mark${active ? " is-active" : ""}" data-o="${offset}">${escapeHTML(text)}</span>`;
}

/**
 * A marker that is replaced by a nicer glyph when hidden (list bullets,
 * task boxes). The pretty glyph is injected through a CSS pseudo-element so
 * it never lands in textContent and never corrupts the saved source.
 */
function markGlyph(text, offset, caret, glyph) {
  if (inRange(caret, offset, text.length)) {
    return `<span class="md-mark is-active" data-o="${offset}">${escapeHTML(text)}</span>`;
  }
  return `<span class="md-mark-swap" data-o="${offset}" data-glyph="${escapeHTML(glyph)}">${escapeHTML(text)}</span>`;
}

/** Source newline. Hidden after a block-level line (the block already breaks). */
const NL = '<br class="md-nl">';

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

const RE_FENCE = /^\s*(```|~~~)(.*)$/;
const RE_HR = /^\s*(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const RE_QUOTE = /^(\s*)(\s*>\s?)(.*)$/;
const RE_HEADING = /^(#{1,6})(\s+)(.*)$/;
const RE_LIST = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(\[[ xX]\])?[ \t]*(.*)$/;
const RE_SETEXT_EQ = /^\s*=+\s*$/;
const RE_SETEXT_DASH = /^\s*-{2,}\s*$/;

/**
 * Turns the source into a list of top-level parts. Each part becomes a single
 * `.md-line` span; parts are joined by `NL` so the source newlines survive.
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

    // ---------------------------------------------------------- fenced code
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

      let html = mark(line.text, line.start, caret);
      body.forEach((l, idx) => {
        html += run(l.text, l.start);
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

    // ------------------------------------------------------------ blank line
    if (!line.text.trim()) {
      push({ html: "", s: line.start, e: line.start });
      i++;
      continue;
    }

    // ---------------------------------------------------------- block quote
    if (RE_QUOTE.test(line.text)) {
      const group = [];
      while (i < lines.length && RE_QUOTE.test(lines[i].text)) {
        group.push(lines[i]);
        i++;
      }
      let html = "";
      group.forEach((l, idx) => {
        const m = l.text.match(RE_QUOTE);
        html += mark(m[1] + m[2], l.start, caret);
        html += inline(m[3], l.start + m[1].length + m[2].length, caret);
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

    // ----------------------------------------------------------- list item
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
        off += box.length;
      } else {
        html += markGlyph(bullet + gap, off, caret, ordered ? bullet : "\u2022");
        off += bullet.length + gap.length;
      }

      // the regex is greedy on [ \t]* after the box; recompute the body offset
      const bodyOffset = line.start + full.length - rest.length;
      html += inline(rest, bodyOffset, caret);

      push({
        html: `<span class="md-li${ordered ? " is-ordered" : ""}" style="--md-level:${level}">${html}</span>`,
        block: true,
        s: line.start,
        e: line.start + line.text.length,
      });
      i++;
      continue;
    }

    // -------------------------------------------------------------- heading
    const h = line.text.match(RE_HEADING);
    if (h) {
      push({
        html:
          mark(h[1] + h[2], line.start, caret) +
          inline(h[3], line.start + h[1].length + h[2].length, caret),
        block: true,
        cls: `md-h${h[1].length}`,
        s: line.start,
        e: line.start + line.text.length,
      });
      i++;
      continue;
    }

    // ------------------------------------------------ setext heading (next)
    if (
      line.text.trim() &&
      parts.length &&
      !parts[parts.length - 1].block &&
      (RE_SETEXT_EQ.test(lines[i + 1]?.text ?? "") || RE_SETEXT_DASH.test(lines[i + 1]?.text ?? ""))
    ) {
      const under = lines[i + 1].text;
      push({
        html: inline(line.text, line.start, caret),
        block: true,
        cls: RE_SETEXT_EQ.test(under) ? "md-h1" : "md-h2",
        s: line.start,
        e: lines[i + 1].start + under.length,
      });
      i += 2;
      continue;
    }

    // ------------------------------------------------------ thematic break
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

    // ------------------------------------------------------------- paragraph
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

/** Renders one line of inline markdown, tracking source offsets. */
function inline(s, off, caret) {
  let out = "";
  let i = 0;
  const n = s.length;

  while (i < n) {
    const c = s[i];
    const wordStart = i === 0 || !/[\w]/.test(s[i - 1]);

    // backslash escape ---------------------------------------------------
    if (c === "\\" && i + 1 < n && ESCAPABLE.includes(s[i + 1])) {
      out += mark(s.slice(i, i + 2), off + i, caret);
      i += 2;
      continue;
    }

    // inline code --------------------------------------------------------
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i) {
        out += mark("`", off + i, caret);
        out += `<code class="md-code">${run(s.slice(i + 1, j), off + i + 1)}</code>`;
        out += mark("`", off + j, caret);
        i = j + 1;
        continue;
      }
    }

    // ***bold italic*** ---------------------------------------------------
    if (s.startsWith("***", i)) {
      const e = findCloser(s, i + 3, "***");
      if (e !== -1) {
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
          out += mark("[", off + i, caret);
          out += `<span class="md-link-label">${inline(s.slice(i + 1, close), off + i + 1, caret)}</span>`;
          out += mark("](", off + close, caret);
          out += `<span class="md-link-url">${run(href, off + close + 2)}</span>`;
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
        out += `<span class="md-link">${run(m[0], off + i)}</span>`;
        i += m[0].length;
        continue;
      }
    }

    out += run(c, off + i);
    i++;
  }

  return out;
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
function walkRaw(el, visit) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return node.nodeType === Node.TEXT_NODE || node.tagName === "BR" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  let total = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.nodeType === Node.TEXT_NODE ? node.data.length : 1;
    if (visit(node, total, len) === false) return total;
    total += len;
  }
  return total;
}

/** Recovers the markdown source from the rendered DOM. */
export function getRawText(el) {
  let out = "";
  walkRaw(el, (node, _start, _len) => {
    out += node.nodeType === Node.TEXT_NODE ? node.data : "\n";
  });
  return out;
}

/** Current caret position, expressed as an offset into the markdown source. */
export function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return getRawText(el).length;

  const { startContainer, startOffset } = sel.getRangeAt(0);
  if (!el.contains(startContainer)) return getRawText(el).length;

  let total = 0;
  walkRaw(el, (node, start, len) => {
    if (node === startContainer) {
      total = start + Math.min(startOffset, len);
      return false;
    }
    // Caret anchored on an element node (e.g. an empty line): count
    // everything before it, then the child index's worth of newlines.
    if (node.parentNode === startContainer && startOffset > 0) {
      total = start;
      return false;
    }
    return true;
  });

  return Math.min(total, getRawText(el).length);
}

/** Places the caret at `offset` (an index into the markdown source). */
export function setCaretOffset(el, offset) {
  const leaves = el.querySelectorAll("[data-o]");
  if (!leaves.length) return;

  let target = null;
  leaves.forEach((leaf) => {
    const start = Number(leaf.dataset.o);
    const len = leaf.textContent.length;
    if (len && offset >= start && offset <= start + len && (!target || len < target.len)) {
      target = { leaf, start, len };
    }
  });

  if (!target) {
    // Past the last character (trailing newline / empty note): go to the end.
    let last = null;
    leaves.forEach((leaf) => {
      const start = Number(leaf.dataset.o);
      const len = leaf.textContent.length;
      if (len && (!last || start + len > last.start + last.len)) last = { leaf, start, len };
    });
    if (!last) return;
    target = { ...last, at: last.len };
  } else {
    target.at = offset - target.start;
  }

  placeCaret(el, target.leaf, target.at);
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
  out = out.replace(/<[^>]*>/g, "");
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  out = out.replace(/^\s*=+\s*$/gm, "");
  out = out.replace(/^\s*>+\s?/gm, "");
  out = out.replace(/^\s*([-*+]|\d+[.)])\s+/gm, "");
  out = out.replace(/^\s*(\[[ xX]\])[ \t]*/gm, "");
  out = out.replace(/(\*\*\*|\*\*|__|~~|\*|_)/g, "");
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!>~|<&"])/g, "$1");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}