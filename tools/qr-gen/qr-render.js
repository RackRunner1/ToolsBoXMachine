// Géométrie des points, marqueurs, placement et logo reprise de qr-code-styling
// (MIT, © Denys Kozak, https://github.com/kozakdenys/qr-code-styling), version 1.9.2.

const IMAGE_SIZE = 0.4;
const ERROR_CORRECTION_Q = 0.25;

const SQUARE_MASK = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const DOT_MASK = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

const CORNER_SQUARE_TYPES = ["dot", "square", "extra-rounded"];
const CORNER_DOT_TYPES = ["dot", "square"];

function figure(path, x, y, size, rotation = 0, rule = "nonzero") {
  return { path, rule, rotation, cx: x + size / 2, cy: y + size / 2 };
}

function circlePath(cx, cy, r) {
  const p = new Path2D();
  p.arc(cx, cy, r, 0, Math.PI * 2);
  return p;
}

function rectPath(x, y, w, h) {
  const p = new Path2D();
  p.rect(x, y, w, h);
  return p;
}

function svgPath(d) {
  return new Path2D(d);
}

function basicDot(x, y, size) {
  return figure(circlePath(x + size / 2, y + size / 2, size / 2), x, y, size);
}

function basicSquare(x, y, size) {
  return figure(rectPath(x, y, size, size), x, y, size);
}

function basicSideRounded(x, y, size, rotation) {
  const d =
    `M ${x} ${y} ` +
    `v ${size} ` +
    `h ${size / 2} ` +
    `a ${size / 2} ${size / 2}, 0, 0, 0, 0 ${-size}`;
  return figure(svgPath(d), x, y, size, rotation);
}

function basicCornerRounded(x, y, size, rotation) {
  const d =
    `M ${x} ${y} ` +
    `v ${size} ` +
    `h ${size} ` +
    `v ${-size / 2} ` +
    `a ${size / 2} ${size / 2}, 0, 0, 0, ${-size / 2} ${-size / 2}`;
  return figure(svgPath(d), x, y, size, rotation);
}

function basicCornerExtraRounded(x, y, size, rotation) {
  const d =
    `M ${x} ${y} ` +
    `v ${size} ` +
    `h ${size} ` +
    `a ${size} ${size}, 0, 0, 0, ${-size} ${-size}`;
  return figure(svgPath(d), x, y, size, rotation);
}

function basicCornersRounded(x, y, size, rotation) {
  const d =
    `M ${x} ${y} ` +
    `v ${size / 2} ` +
    `a ${size / 2} ${size / 2}, 0, 0, 0, ${size / 2} ${size / 2} ` +
    `h ${size / 2} ` +
    `v ${-size / 2} ` +
    `a ${size / 2} ${size / 2}, 0, 0, 0, ${-size / 2} ${-size / 2}`;
  return figure(svgPath(d), x, y, size, rotation);
}

function neighborDot(extra, x, y, size, n) {
  const count = n.l + n.r + n.t + n.b;

  if (count === 0) return basicDot(x, y, size);
  if (count > 2 || (n.l && n.r) || (n.t && n.b)) return basicSquare(x, y, size);

  if (count === 2) {
    let rotation = 0;
    if (n.l && n.t) rotation = Math.PI / 2;
    else if (n.t && n.r) rotation = Math.PI;
    else if (n.r && n.b) rotation = -Math.PI / 2;
    return extra
      ? basicCornerExtraRounded(x, y, size, rotation)
      : basicCornerRounded(x, y, size, rotation);
  }

  let rotation = 0;
  if (n.t) rotation = Math.PI / 2;
  else if (n.r) rotation = Math.PI;
  else if (n.b) rotation = -Math.PI / 2;
  return basicSideRounded(x, y, size, rotation);
}

function classyDot(extra, x, y, size, n) {
  const count = n.l + n.r + n.t + n.b;
  const corner = extra ? basicCornerExtraRounded : basicCornerRounded;

  if (count === 0) return basicCornersRounded(x, y, size, Math.PI / 2);
  if (!n.l && !n.t) return corner(x, y, size, -Math.PI / 2);
  if (!n.r && !n.b) return corner(x, y, size, Math.PI / 2);
  return basicSquare(x, y, size);
}

function dotFigure(type, x, y, size, getNeighbor) {
  const n = {
    l: +getNeighbor(-1, 0),
    r: +getNeighbor(1, 0),
    t: +getNeighbor(0, -1),
    b: +getNeighbor(0, 1),
  };

  switch (type) {
    case "dots":
    case "dot":
      return basicDot(x, y, size);
    case "rounded":
      return neighborDot(false, x, y, size, n);
    case "extra-rounded":
      return neighborDot(true, x, y, size, n);
    case "classy":
      return classyDot(false, x, y, size, n);
    case "classy-rounded":
      return classyDot(true, x, y, size, n);
    default:
      return basicSquare(x, y, size);
  }
}

function cornerSquareRing(x, y, size, type) {
  const dotSize = size / 7;

  if (type === "square") {
    const d =
      `M ${x} ${y} v ${size} h ${size} v ${-size} z ` +
      `M ${x + dotSize} ${y + dotSize} ` +
      `h ${size - 2 * dotSize} v ${size - 2 * dotSize} h ${-size + 2 * dotSize} z`;
    return svgPath(d);
  }

  if (type === "extra-rounded") {
    const d =
      `M ${x} ${y + 2.5 * dotSize} ` +
      `v ${2 * dotSize} ` +
      `a ${2.5 * dotSize} ${2.5 * dotSize}, 0, 0, 0, ${dotSize * 2.5} ${dotSize * 2.5} ` +
      `h ${2 * dotSize} ` +
      `a ${2.5 * dotSize} ${2.5 * dotSize}, 0, 0, 0, ${dotSize * 2.5} ${-dotSize * 2.5} ` +
      `v ${-2 * dotSize} ` +
      `a ${2.5 * dotSize} ${2.5 * dotSize}, 0, 0, 0, ${-dotSize * 2.5} ${-dotSize * 2.5} ` +
      `h ${-2 * dotSize} ` +
      `a ${2.5 * dotSize} ${2.5 * dotSize}, 0, 0, 0, ${-dotSize * 2.5} ${dotSize * 2.5} ` +
      `M ${x + 2.5 * dotSize} ${y + dotSize} ` +
      `h ${2 * dotSize} ` +
      `a ${1.5 * dotSize} ${1.5 * dotSize}, 0, 0, 1, ${dotSize * 1.5} ${dotSize * 1.5} ` +
      `v ${2 * dotSize} ` +
      `a ${1.5 * dotSize} ${1.5 * dotSize}, 0, 0, 1, ${-dotSize * 1.5} ${dotSize * 1.5} ` +
      `h ${-2 * dotSize} ` +
      `a ${1.5 * dotSize} ${1.5 * dotSize}, 0, 0, 1, ${-dotSize * 1.5} ${-dotSize * 1.5} ` +
      `v ${-2 * dotSize} ` +
      `a ${1.5 * dotSize} ${1.5 * dotSize}, 0, 0, 1, ${dotSize * 1.5} ${-dotSize * 1.5}`;
    return svgPath(d);
  }

  const d =
    `M ${x + size / 2} ${y} ` +
    `a ${size / 2} ${size / 2} 0 1 0 0.1 0 ` +
    `z ` +
    `m 0 ${dotSize} ` +
    `a ${size / 2 - dotSize} ${size / 2 - dotSize} 0 1 1 -0.1 0 ` +
    `Z`;
  return svgPath(d);
}

function cornerSquareFigure(type, x, y, size, rotation) {
  return figure(cornerSquareRing(x, y, size, type), x, y, size, rotation, "evenodd");
}

function cornerDotFigure(type, x, y, size, rotation) {
  if (type === "square") return figure(rectPath(x, y, size, size), x, y, size, rotation);
  return figure(circlePath(x + size / 2, y + size / 2, size / 2), x, y, size, rotation);
}

function calculateImageSize({ originalHeight, originalWidth, maxHiddenDots, maxHiddenAxisDots, dotSize }) {
  const hideDots = { x: 0, y: 0 };
  const imageSize = { x: 0, y: 0 };

  if (originalHeight <= 0 || originalWidth <= 0 || maxHiddenDots <= 0 || dotSize <= 0) {
    return { height: 0, width: 0, hideYDots: 0, hideXDots: 0 };
  }

  const k = originalHeight / originalWidth;

  hideDots.x = Math.floor(Math.sqrt(maxHiddenDots / k));
  if (hideDots.x <= 0) hideDots.x = 1;
  if (maxHiddenAxisDots && maxHiddenAxisDots < hideDots.x) hideDots.x = maxHiddenAxisDots;
  if (hideDots.x % 2 === 0) hideDots.x--;
  imageSize.x = hideDots.x * dotSize;
  hideDots.y = 1 + 2 * Math.ceil((hideDots.x * k - 1) / 2);
  imageSize.y = Math.round(imageSize.x * k);

  if (hideDots.y * hideDots.x > maxHiddenDots || (maxHiddenAxisDots && maxHiddenAxisDots < hideDots.y)) {
    if (maxHiddenAxisDots && maxHiddenAxisDots < hideDots.y) {
      hideDots.y = maxHiddenAxisDots;
      if (hideDots.y % 2 === 0) hideDots.x--;
    } else {
      hideDots.y -= 2;
    }
    imageSize.y = hideDots.y * dotSize;
    hideDots.x = 1 + 2 * Math.ceil((hideDots.y / k - 1) / 2);
    imageSize.x = Math.round(imageSize.y / k);
  }

  return {
    height: imageSize.y,
    width: imageSize.x,
    hideYDots: hideDots.y,
    hideXDots: hideDots.x,
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function renderQR(modules, options) {
  const { size, margin, bgColor, dotsColor, dotsType, cornersSquareType, cornersSquareColor, cornersDotType, cornersDotColor, logo, logoMargin } = options;
  const count = modules.length;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const isDark = (row, col) => row >= 0 && col >= 0 && row < count && col < count && !!modules[row][col];

  const paint = (fig, color) => {
    ctx.save();
    if (fig.rotation) {
      ctx.translate(fig.cx, fig.cy);
      ctx.rotate(fig.rotation);
      ctx.translate(-fig.cx, -fig.cy);
    }
    ctx.fillStyle = color;
    ctx.fill(fig.path, fig.rule);
    ctx.restore();
  };

  const draw = (image) => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    const minSize = size - margin * 2;
    const dotSize = Math.floor(minSize / count);
    const xBeginning = Math.floor((size - count * dotSize) / 2);
    const yBeginning = Math.floor((size - count * dotSize) / 2);

    let imageLayout = { hideXDots: 0, hideYDots: 0, width: 0, height: 0 };
    if (image) {
      const maxHiddenDots = Math.floor(IMAGE_SIZE * ERROR_CORRECTION_Q * count * count);
      imageLayout = calculateImageSize({
        originalWidth: image.width,
        originalHeight: image.height,
        maxHiddenDots,
        maxHiddenAxisDots: count - 14,
        dotSize,
      });
    }

    const isHiddenByImage = (row, col) =>
      !!image &&
      row >= (count - imageLayout.hideYDots) / 2 &&
      row < (count + imageLayout.hideYDots) / 2 &&
      col >= (count - imageLayout.hideXDots) / 2 &&
      col < (count + imageLayout.hideXDots) / 2;

    const inMask = (mask, row, col) => !!mask[row]?.[col];
    const isFinderArea = (row, col) =>
      inMask(SQUARE_MASK, row, col) ||
      inMask(SQUARE_MASK, row - count + 7, col) ||
      inMask(SQUARE_MASK, row, col - count + 7) ||
      inMask(DOT_MASK, row, col) ||
      inMask(DOT_MASK, row - count + 7, col) ||
      inMask(DOT_MASK, row, col - count + 7);

    const filter = (row, col) => !isHiddenByImage(row, col) && !isFinderArea(row, col);

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!filter(row, col) || !isDark(row, col)) continue;

        const fig = dotFigure(dotsType, xBeginning + col * dotSize, yBeginning + row * dotSize, dotSize, (xOffset, yOffset) => {
          const r = row + yOffset;
          const c = col + xOffset;
          if (r < 0 || c < 0 || r >= count || c >= count) return false;
          if (!filter(r, c)) return false;
          return isDark(r, c);
        });
        paint(fig, dotsColor);
      }
    }

    [
      [0, 0, 0],
      [1, 0, Math.PI / 2],
      [0, 1, -Math.PI / 2],
    ].forEach(([column, row, rotation]) => {
      const x = xBeginning + column * dotSize * (count - 7);
      const y = yBeginning + row * dotSize * (count - 7);
      const cornersSquareSize = dotSize * 7;
      const cornersDotSize = dotSize * 3;

      if (CORNER_SQUARE_TYPES.includes(cornersSquareType)) {
        paint(cornerSquareFigure(cornersSquareType, x, y, cornersSquareSize, rotation), cornersSquareColor);
      } else {
        for (let r = 0; r < SQUARE_MASK.length; r++) {
          for (let c = 0; c < SQUARE_MASK[r].length; c++) {
            if (!SQUARE_MASK[r][c]) continue;
            const fig = dotFigure(cornersSquareType, x + c * dotSize, y + r * dotSize, dotSize, (xOffset, yOffset) =>
              inMask(SQUARE_MASK, r + yOffset, c + xOffset)
            );
            paint(fig, cornersSquareColor);
          }
        }
      }

      if (CORNER_DOT_TYPES.includes(cornersDotType)) {
        paint(cornerDotFigure(cornersDotType, x + dotSize * 2, y + dotSize * 2, cornersDotSize, rotation), cornersDotColor);
      } else {
        for (let r = 0; r < DOT_MASK.length; r++) {
          for (let c = 0; c < DOT_MASK[r].length; c++) {
            if (!DOT_MASK[r][c]) continue;
            const fig = dotFigure(cornersDotType, x + c * dotSize, y + r * dotSize, dotSize, (xOffset, yOffset) =>
              inMask(DOT_MASK, r + yOffset, c + xOffset)
            );
            paint(fig, cornersDotColor);
          }
        }
      }
    });

    if (image) {
      const { width, height } = imageLayout;
      const imageMargin = logoMargin;
      const dx = xBeginning + Math.floor(imageMargin + (count * dotSize - width) / 2);
      const dy = yBeginning + Math.floor(imageMargin + (count * dotSize - height) / 2);
      const dw = width - imageMargin * 2;
      const dh = height - imageMargin * 2;
      const scale = Math.min(dw / image.width, dh / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      ctx.drawImage(image, dx + (dw - iw) / 2, dy + (dh - ih) / 2, iw, ih);
    }
  };

  const toBlob = (ready) => () => ready.then(() => new Promise((resolve) => canvas.toBlob(resolve, "image/png")));

  if (!logo) {
    draw(null);
    return { canvas, toBlob: toBlob(Promise.resolve()) };
  }

  const ready = loadImage(logo)
    .then((image) => draw(image))
    .catch(() => draw(null));

  return { canvas, toBlob: toBlob(ready) };
}
