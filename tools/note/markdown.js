/**
 * Markdown live-preview renderer for the Notes tool (BETA).
 *
 * No dependencies, and the rendered DOM is deliberately flat: only <span> and
 * <br>, never <div>/<p>, so newlines stay controllable and the source can
 * always be recovered. Three invariants make this work:
 *
 *   1. getRawText(el) === the original markdown source.
 *      Every source character lives in exactly one text node, and every source
 *      newline is represented by a <br class="md-nl">.
 *
 *   2. Literal text is emitted in batched runs (never one span per character),
 *      each carrying data-o = its offset in the source.
 *
 *   3. Every markup span carries data-from / data-to = the offsets of the whole
 *      construct it belongs to. Rendering is therefore independent of the
 *      caret: moving the caret only toggles classes via applyVisibility(),
 *      which never touches the DOM structure and never loses the selection.
 *
 * Markers are hidden while the caret is outside their construct, and revealed
 * as soon as it enters it: formatted while reading, raw while writing.
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

/** Source newline. Hidden after a block line, which already breaks. */
const NL = '<br class="md-nl">';

/**
 * Batches consecutive literal characters into a single run, so a paragraph of
 * N characters costs one span instead of N.
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

  pushText(text, offset) {
    if (!this.text) this.start = offset;
    this.text += text;
  }

  flush() {
    if (!this.text) return "";
    const out = `<span data-o="${this.start}">${escapeHTML(this.text)}</span>`;
    this.text = "";
    return out;
  }
}

/**
 * A markup construct's delimiter.
 *
 * `from`/`to` span the WHOLE construct (both delimiters included), so the
 * markers stay visible while the caret is anywhere between them.
 */
function mark(text, offset, from, to) {
  return `<span class="md-mark" data-o="${offset}" data-from="${from}" data-to="${to}">${escapeHTML(text)}</span>`;
}

/**
 * A block-level construct (heading hashes, quote signs, list bullets). These
 * stay visible for the whole line: hidden, a "> quote" would be
 * indistinguishable from plain text.
 */
function blockMark(text, offset, from, to) {
  return `<span class="md-mark is-blockmark" data-o="${offset}" data-from="${from}" data-to="${to}">${escapeHTML(text)}</span>`;
}

/**
 * A marker replaced by a nicer glyph when hidden (list bullets, task boxes).
 * The span stays at zero width (font-size:0) so the source characters keep
 * their place in textContent without taking any room; the pretty glyph comes
 * from a pseudo-element. It must NOT be display:none, or the pseudo-element
 * would never render.
 */
function markGlyph(text, offset, from, to, glyph) {
  return `<span class="md-mark-swap" data-o="${offset}" data-from="${from}" data-to="${to}" data-glyph="${escapeHTML(glyph)}">${escapeHTML(text)}</span>`;
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
const RE_QUOTE = /^([ \t]*)(>\s?)(.*)$/;
const RE_HEADING = /^(#{1,6})([ \t]+)(.*)$/;
export const RE_LIST = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(\[[ xX]\])?[ \t]*(.*)$/;
const RE_SETEXT = /^[ \t]*(?:=+|-+)[ \t]*$/;

/**
 * Turns the source into top-level parts. Each part becomes one `.md-line`
 * span; parts are joined by NL so source newlines survive the round-trip.
 */
function parseBlocks(src) {
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
      let html = blockMark(line.text, line.start, line.start, line.start + line.text.length);
      body.forEach((l, idx) => {
        buf.pushText(l.text, l.start);
        html += buf.flush() || `<span data-o="${l.start}"></span>`;
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
    // A blank line MUST be a block box: an empty inline span gets no line
    // box, so the line had zero height — the caret bounced back onto the
    // previous line and blank lines were impossible to click into.
    if (!line.text) {
      push({ html: `<span data-o="${line.start}"></span>`, block: true, cls: "md-blank", s: line.start, e: line.start });
      i++;
      continue;
    }

    // ------------------------------------------------- thematic break -----
    // Checked before lists, so "* * *" is a break and not a list item.
    if (RE_HR.test(line.text)) {
      const body = line.text.trim();
      const at = line.start + line.text.indexOf(body);
      push({
        html: blockMark(body, at, line.start, line.start + line.text.length),
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
        html: inline(line.text, line.start),
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
      const from = group[0].start;
      const tail = group[group.length - 1];
      const to = tail.start + tail.text.length;

      let html = "";
      group.forEach((l, idx) => {
        const m = l.text.match(RE_QUOTE);
        html += blockMark(m[1] + m[2], l.start, from, to);
        html += inline(m[3], l.start + m[1].length + m[2].length);
        if (idx < group.length - 1) html += NL;
      });

      push({ html: `<span class="md-quote">${html}</span>`, block: true, s: from, e: to });
      continue;
    }

    // ------------------------------------------------------- heading -----
    const h = line.text.match(RE_HEADING);
    if (h) {
      const prefixLen = h[1].length + h[2].length;
      const to = line.start + line.text.length;
      push({
        html: blockMark(h[1] + h[2], line.start, line.start, to) + inline(h[3], line.start + prefixLen),
        block: true,
        cls: `md-h${h[1].length}`,
        s: line.start,
        e: to,
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
      const from = line.start;
      const to = line.start + line.text.length;

      let html = "";
      if (indent) html += blockMark(indent, line.start, from, to);

      const afterBullet = line.start + indent.length + bullet.length + gap.length;
      if (box) {
        html += markGlyph(bullet + gap, line.start + indent.length, from, to, "\u2610");
        html += blockMark(box, afterBullet, from, to);
      } else {
        html += markGlyph(bullet + gap, line.start + indent.length, from, to, ordered ? bullet : "\u2022");
      }

      // `rest` is greedy-matched from the right, so derive its offset from the
      // line rather than trusting the captured group positions.
      html += inline(rest, line.start + full.length - rest.length);

      push({
        html: `<span class="md-li${ordered ? " is-ordered" : ""}" style="--md-level:${level}">${html}</span>`,
        block: true,
        s: from,
        e: to,
      });
      i++;
      continue;
    }

    // ------------------------------------------------------ paragraph ----
    push({ html: inline(line.text, line.start), s: line.start, e: line.start + line.text.length });
    i++;
  }

  return parts;
}

/* ----------------------------------------------------------------- inline */

function findCloser(s, from, token) {
  let idx = from;
  while ((idx = s.indexOf(token, idx)) !== -1) {
    if (idx > from) {
      // Count backslashes before the token; odd count means it's escaped.
      let backslashes = 0;
      let j = idx - 1;
      while (j >= 0 && s[j] === "\\") {
        backslashes++;
        j--;
      }
      if (backslashes % 2 === 0) return idx;
    }
    idx++;
  }
  return -1;
}

const RE_AUTOLINK = /^https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?]/;

/** A single literal run. Empty text still yields a placeholder node. */
function runOf(text, offset) {
  return `<span data-o="${offset}">${escapeHTML(text)}</span>`;
}

/** Renders inline markdown for one line, batching literal text into runs. */
function inline(s, off) {
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
      out += mark(s.slice(i, i + 2), off + i, off + i, off + i + 2);
      i += 2;
      continue;
    }

    // inline code --------------------------------------------------------
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i) {
        flush();
        const from = off + i;
        const to = off + j + 1;
        out += mark("`", from, from, to);
        out += `<code class="md-code">${runOf(s.slice(i + 1, j), off + i + 1)}</code>`;
        out += mark("`", off + j, from, to);
        i = j + 1;
        continue;
      }
      // Obsidian-style live preview: an open backtick styles the rest of the
      // line as code until the closing one is typed — but only when it is a
      // real opener (backtick + non-space), so "2 ` 3" stays literal. There
      // cannot be another backtick in the rest, so the recursion stays flat.
      if (s[i + 1] && !/\s/.test(s[i + 1])) {
        flush();
        const from = off + i;
        out += mark("`", from, from, off + n);
        out += `<code class="md-code">${inline(s.slice(i + 1), off + i + 1)}</code>`;
        i = n;
        continue;
      }
    }

    // ***bold italic*** ---------------------------------------------------
    if (s.startsWith("***", i)) {
      // The "rest of the line" style only kicks in for a real opener: an
      // asterisk run followed by whitespace (e.g. "2 *** 3") stays literal.
      // Balanced windows keep matching without an opener guard.
      const nextCh = s[i + 3] ?? "";
      // A longer asterisk run (****) must not open here either.
      const openish = nextCh && nextCh !== "*" && !/\s/.test(nextCh);
      const e = findCloser(s, i + 3, "***");
      if (e !== -1 || openish) {
        flush();
        const from = off + i;
        const to = e !== -1 ? off + e + 3 : off + n;
        out += mark("***", from, from, to);
        if (e !== -1) {
          out += `<strong><em>${inline(s.slice(i + 3, e), off + i + 3)}</em></strong>`;
          out += mark("***", off + e, from, to);
          i = e + 3;
        } else {
          // Obsidian-style: the open *** keeps formatting the rest of the line.
          out += `<strong><em>${inline(s.slice(i + 3), off + i + 3)}</em></strong>`;
          i = n;
        }
        continue;
      }
    }

    // **bold** -----------------------------------------------------------
    if (s.startsWith("**", i)) {
      // Opener guard for the unterminated window only (see *** branch).
      // The *** case already tried its own branch; reaching ** with a '*'
      // after means a longer asterisk run that must stay literal (e.g. "2
      // *** 3").
      const nextCh = s[i + 2] ?? "";
      const openish = nextCh && nextCh !== "*" && !/\s/.test(nextCh);
      const e = findCloser(s, i + 2, "**");
      if (e !== -1 || openish) {
        flush();
        const from = off + i;
        const to = e !== -1 ? off + e + 2 : off + n;
        out += mark("**", from, from, to);
        if (e !== -1) {
          out += `<strong>${inline(s.slice(i + 2, e), off + i + 2)}</strong>`;
          out += mark("**", off + e, from, to);
          i = e + 2;
        } else {
          // Obsidian-style: **bon shows up bold right away, before the closer.
          out += `<strong>${inline(s.slice(i + 2), off + i + 2)}</strong>`;
          i = n;
        }
        continue;
      }
    }

    // ~~strikethrough~~ ---------------------------------------------------
    if (s.startsWith("~~", i)) {
      // Opener guard for the unterminated window only (see *** branch).
      const nextCh = s[i + 2] ?? "";
      const openish = nextCh && !/\s/.test(nextCh);
      const e = findCloser(s, i + 2, "~~");
      if (e !== -1 || openish) {
        flush();
        const from = off + i;
        const to = e !== -1 ? off + e + 2 : off + n;
        out += mark("~~", from, from, to);
        if (e !== -1) {
          out += `<del>${inline(s.slice(i + 2, e), off + i + 2)}</del>`;
          out += mark("~~", off + e, from, to);
          i = e + 2;
        } else {
          // Obsidian-style: the open ~~ strikes through the rest of the line.
          out += `<del>${inline(s.slice(i + 2), off + i + 2)}</del>`;
          i = n;
        }
        continue;
      }
    }

    // *italic* -----------------------------------------------------------
    if (c === "*") {
      const e = findCloser(s, i + 1, "*");
      if (e !== -1 && !/\s/.test(s[e - 1])) {
        flush();
        const from = off + i;
        const to = off + e + 1;
        out += mark("*", from, from, to);
        out += `<em>${inline(s.slice(i + 1, e), off + i + 1)}</em>`;
        out += mark("*", off + e, from, to);
        i = e + 1;
        continue;
      }
      // Obsidian-style: an open *italic* formats the rest of the line, but a
      // star followed by whitespace is just a literal character.
      if (s[i + 1] && !/\s/.test(s[i + 1])) {
        flush();
        const from = off + i;
        out += mark("*", from, from, off + n);
        out += `<em>${inline(s.slice(i + 1), off + i + 1)}</em>`;
        i = n;
        continue;
      }
    }

    // _italic_ -----------------------------------------------------------
    if (c === "_" && wordStart) {
      const e = findCloser(s, i + 1, "_");
      if (e !== -1 && !/\s/.test(s[e - 1])) {
        flush();
        const from = off + i;
        const to = off + e + 1;
        out += mark("_", from, from, to);
        out += `<em>${inline(s.slice(i + 1, e), off + i + 1)}</em>`;
        out += mark("_", off + e, from, to);
        i = e + 1;
        continue;
      }
      // Obsidian-style: an open _italic_ formats the rest of the line.
      if (s[i + 1] && !/\s/.test(s[i + 1])) {
        flush();
        const from = off + i;
        out += mark("_", from, from, off + n);
        out += `<em>${inline(s.slice(i + 1), off + i + 1)}</em>`;
        i = n;
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
          const from = off + i;
          const to = off + end + 1;
          out += mark("[", from, from, to);
          out += `<span class="md-link-label">${inline(s.slice(i + 1, close), off + i + 1)}</span>`;
          out += mark("](", off + close, from, to);
          out += `<span class="md-link-url">${runOf(href, off + close + 2)}</span>`;
          out += mark(")", off + end, from, to);
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

/* ----------------------------------------------------------------- render */

/**
 * Renders `src` to HTML. The result is caret-independent: call
 * applyVisibility(el, caret) afterwards to reveal the markers around it.
 */
export function renderMarkdown(src) {
  const parts = parseBlocks(src);
  let html = "";
  parts.forEach((p, idx) => {
    const cls = ["md-line", p.block ? "is-block" : "", p.cls].filter(Boolean).join(" ");
    html += `<span class="${cls}" data-s="${p.s}" data-e="${p.e}">${p.html}</span>`;
    if (idx < parts.length - 1) html += NL;
  });
  return html;
}

/**
 * Structural fingerprint of rendered HTML: the tag/class skeleton with every
 * text run and shifting offset stripped out. Two renders with equal skeletons
 * have the same spans, markers and nesting — only their text and offsets
 * changed. The live-preview pass uses this to skip re-renders (and the caret
 * disturbance they cause) whenever plain typing did not change the structure.
 */
export function htmlSkeleton(html) {
  return html
    .replace(/\s+data-(?:o|from|to|s|e)="[^"]*"/g, "")
    .replace(/>[^<]*</g, "><");
}

/**
 * Reveals the markup markers surrounding the caret, and hides every other one.
 *
 * This only toggles classes. It never touches the DOM structure, so the
 * selection and the IME composition survive it. That is the whole point:
 * re-rendering the HTML on every caret move used to reset the caret and make
 * Enter / arrow keys behave erratically.
 *
 * `caret` of null (no caret in the editor) hides everything.
 */
export function applyVisibility(el, caret) {
  el.querySelectorAll(".md-mark, .md-mark-swap").forEach((node) => {
    const from = Number(node.dataset.from);
    const to = Number(node.dataset.to);

    if (caret === null || caret === undefined) {
      node.classList.remove("is-active");
      node.classList.remove("is-touched");
      return;
    }

    const active = caret >= from && caret <= to;
    node.classList.toggle("is-active", active);
    // The touched marker is the delimiter the caret is directly on, which is
    // where the user is about to type.
    const at = Number(node.dataset.o);
    node.classList.toggle("is-touched", active && caret >= at && caret <= at + node.textContent.length);
  });
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
    visit(node, total, len);
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

/** Counts text characters and <br> newlines inside a subtree. */
function countLeaves(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.data.length;
  if (node.tagName === "BR") return 1;
  let total = 0;
  for (const child of node.childNodes) total += countLeaves(child);
  return total;
}

/**
 * Current caret position as an offset into the markdown source, or null when
 * the selection is not inside `el`.
 */
export function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  const container = range.startContainer;
  if (container !== el && !el.contains(container)) return null;

  // Walk the live DOM up to the caret, counting every character (including
  // hidden markers) so the offset matches the markdown source exactly.
  // cloneContents() would skip display:none elements, losing marker chars.
  //
  // The caret frequently rests inside an element node (before a block
  // marker, at a block boundary...), which is invisible to a text-only walk:
  // resolve that case by counting the leaves preceding startOffset within
  // the container. Miss it and the offset degrades to null, which makes
  // every structured edit fall back to "end of document".
  let count = 0;
  let found = false;

  const walk = (node) => {
    if (found) return;
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) {
        count += range.startOffset;
      } else {
        const kids = node.childNodes;
        for (let k = 0; k < range.startOffset && k < kids.length; k++) {
          count += countLeaves(kids[k]);
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      count += node.data.length;
      return;
    }
    if (node.tagName === "BR") {
      count += 1;
      return;
    }
    for (const child of node.childNodes) {
      walk(child);
      if (found) return;
    }
  };
  walk(el);

  return found ? count : null;
}

/** Places the caret at `offset` (an index into the markdown source). */
export function setCaretOffset(el, offset) {
  // Zero-width glyph spans (list bullets) are not caret homes: text typed
  // inside them has font-size:0 and never shows up. Everything else,
  // INCLUDING empty runs, is a legitimate target — an empty run is the only
  // place to rest the caret on a blank line, which is exactly where Enter
  // leaves the user.
  const info = Array.from(el.querySelectorAll("[data-o]"))
    .filter((leaf) => !leaf.classList.contains("md-mark-swap"))
    // A still-hidden marker is never a caret home: the caret would vanish
    // into display:none and typed text would go with it. applyVisibility has
    // already revealed the markers around the caret, so anything that is
    // still hidden lies outside the caret and must not be targeted.
    .filter(
      (leaf) =>
        !leaf.classList.contains("md-mark") ||
        leaf.classList.contains("is-active") ||
        leaf.classList.contains("is-touched") ||
        leaf.classList.contains("is-blockmark")
    )
    .map((leaf) => ({ leaf, start: Number(leaf.dataset.o), len: leaf.textContent.length }))
    .filter((x) => Number.isFinite(x.start));

  if (!info.length) {
    focusEnd(el);
    return;
  }

  // A run starting exactly at the offset wins: that is where the browser puts
  // the caret when you type, and the empty-run variant is the only way to
  // land on a blank line.
  let target = info.find((x) => x.start === offset && x.len === 0);
  if (!target) target = info.find((x) => x.start === offset);
  if (!target) {
    target = info.filter((x) => x.len > 0 && offset >= x.start && offset <= x.start + x.len).sort((a, b) => a.len - b.len)[0];
  }

  if (!target) {
    const last = info.reduce((a, b) => (b.start + b.len > a.start + a.len ? b : a));
    placeCaret(el, last.leaf, last.len);
    return;
  }

  placeCaret(el, target.leaf, offset - target.start);
}

/**
 * Moves the caret out of any hidden marker or zero-width glyph and into the
 * nearest visible text. This prevents the caret from being "stuck" inside a
 * display:none marker — where typed text vanishes into the marker — or inside
 * a font-size:0 bullet span, where typed text is simply invisible.
 */
export function moveCaretOutOfHiddenMarkers(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const startContainer = range.startContainer;

  // Both "hidden homes" are caret traps: display:none markers and
  // font-size:0 glyph spans (list bullets).
  const HIDDEN_HOME =
    '.md-mark:not(.is-active):not(.is-blockmark):not(.is-touched), .md-mark-swap';

  const marker = startContainer.parentElement?.closest(HIDDEN_HOME) ?? null;
  if (!marker) return;

  // Find the nearest visible text node after the marker
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip text nodes inside hidden markers and glyph spans
      if (node.parentElement?.closest(HIDDEN_HOME)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  walker.currentNode = marker;

  // Look for the next visible text node, stepping over <br> newlines: a caret
  // escaping a trailing marker must land on the NEXT line, not before the br.
  let nextNode = walker.nextNode();
  while (nextNode && nextNode.tagName === "BR") nextNode = walker.nextNode();

  if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
    const newRange = document.createRange();
    newRange.setStart(nextNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    // If no visible text after, look before the marker
    walker.currentNode = marker;
    let prevNode = walker.previousNode();
    while (prevNode && prevNode.tagName === "BR") prevNode = walker.previousNode();

    if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
      const newRange = document.createRange();
      newRange.setStart(prevNode, prevNode.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }
}

function placeCaret(el, leaf, at) {
  const sel = window.getSelection();
  if (!sel) return;

  // An empty run has no text node; insert one so the caret has a home.
  let textNode = leaf.firstChild;
  if (!textNode) {
    textNode = document.createTextNode("");
    leaf.appendChild(textNode);
  }
  if (textNode.nodeType !== Node.TEXT_NODE) return;

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
  // Drop every angle-bracket construct, including unterminated ones such as
  // "<script", not just well-formed "<...>" tags.
  out = out.replace(/<[^>]*>?/g, " ");
  out = out.replace(/[<>`]/g, " ");
  out = out.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");
  out = out.replace(/^[ \t]*(?:=+|-+)[ \t]*$/gm, "");
  out = out.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  out = out.replace(/^[ \t]*([-*+]|\d+[.)])[ \t]+/gm, "");
  out = out.replace(/^[ \t]*\[[ xX]\][ \t]*/gm, "");
  out = out.replace(/(?:\*\*\*|\*\*|__|~~|\*|_)/g, "");
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!>~|<&"])/g, "$1");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}