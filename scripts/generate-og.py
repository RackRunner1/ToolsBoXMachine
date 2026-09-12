#!/usr/bin/env python3
"""
Generate branded OG images for all HTML pages and inject OG/Twitter meta tags.

Scans the project for HTML files, generates a personalized 1200x630 banner
for each page (Twemoji + tool name + description + ToolsBoXMachine brand),
saves them to og/, and updates the HTML files with the appropriate og:title,
og:url, og:image, og:site_name, twitter:card, and related meta tags.
"""

import glob
import json
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE_URL = "https://www.tbxm.org"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Cloudflare Pages serves the repo root as the web root, so images placed
# in "og/" at the repo root are served at /og/<name>.png.
OG_DIR = os.path.join(PROJECT_ROOT, "og")
ASSETS_DIR = os.path.join(PROJECT_ROOT, ".og-assets")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "public", "tools", "index.json")

EXCLUDE_PATTERNS = ["ui/navbar.html", "ui/footer.html"]

W, H = 1200, 630

# Brand palette (matches style.css)
COLOR_BG_TOP = (2, 6, 23)        # #020617
COLOR_BG_BOTTOM = (15, 23, 42)   # #0f172a
COLOR_GLOW_BLUE = (59, 130, 246) # #3b82f6
COLOR_GLOW_VIOLET = (167, 139, 250)  # #a78bfa
COLOR_GRAD_A = (96, 165, 250)    # #60a5fa
COLOR_GRAD_B = (167, 139, 250)   # #a78bfa
COLOR_TITLE = (248, 250, 252)    # #f8fafc
COLOR_DESC = (148, 163, 184)     # #94a3b8

# macOS system emoji font (Apple Color Emoji), present on macOS runners/dev machines.
# The sbix color font only has fixed bitmap strikes; 160 gives the sharpest result.
APPLE_EMOJI_FONT = "/System/Library/Fonts/Apple Color Emoji.ttc"
APPLE_EMOJI_NATIVE = 160
EMOJI_SIZE = 118

# Brand logo, shown at the bottom of each banner.
LOGO_PATH = os.path.join(PROJECT_ROOT, ".assets", "logo", "logo.png")
LOGO_HEIGHT = 48

# Dedicated data for pages that are not in the tools manifest.
# Format: (name, emoji, description)
PAGE_META = {
    "homepage": ("ToolsBoXMachine", "🔨", "A collection of free, privacy-first browser tools for everyday tasks."),
    "about": ("About", "ℹ️", "Learn about ToolsBoXMachine, a free and open-source collection of browser tools."),
    "privacy": ("Privacy Policy", "🛡️", "Your data stays in your browser — nothing is ever sent to servers."),
    "terms": ("Terms of Service", "📜", "Free, open source tools for everyone, no strings attached."),
    "philosophy": ("Philosophy", "💡", "Privacy-first, open source, no trackers and no accounts."),
}

FONT_BASE = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-{weight}-normal.ttf"


def get_og_name(html_path):
    """Determine the OG image name from an HTML file path."""
    rel = os.path.relpath(html_path, PROJECT_ROOT)

    if rel == "index.html":
        return "homepage"

    if rel.startswith("tools/"):
        return rel.split("/")[1]

    if rel.startswith("pages/"):
        return rel.split("/")[1].replace(".html", "")

    # Fallback: use filename without extension
    return os.path.splitext(os.path.basename(html_path))[0]


def download_asset(url, dest):
    """Download a file and cache it locally; no-op if already present."""
    if os.path.exists(dest):
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"  Downloading: {url}")
    try:
        subprocess.run(
            ["curl", "-fsSL", "--retry", "2", "--connect-timeout", "15", url, "-o", dest],
            check=True,
            capture_output=True,
        )
        return os.path.getsize(dest) > 0
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"  Warning: download failed ({exc})")
        return False


def load_emoji(emoji, size):
    """Render an emoji with the macOS Apple Color Emoji font, or None."""
    if not emoji or not os.path.exists(APPLE_EMOJI_FONT):
        return None
    try:
        font = ImageFont.truetype(APPLE_EMOJI_FONT, APPLE_EMOJI_NATIVE)
        canvas = Image.new("RGBA", (APPLE_EMOJI_NATIVE * 2,) * 2, (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        ascent, _ = font.getmetrics()
        draw.text((APPLE_EMOJI_NATIVE // 2, ascent), emoji, font=font, embedded_color=True)
        bbox = canvas.getbbox()
        if not bbox:
            return None
        img = canvas.crop(bbox)
        w, h = img.size
        scale = size / max(h, 1)
        return img.resize((max(1, int(w * scale)), size), Image.LANCZOS)
    except Exception as exc:  # noqa: BLE001
        print(f"  Warning: cannot render emoji {emoji} ({exc})")
        return None


def load_logo():
    """Load the brand logo resized to a fixed height, or None on failure."""
    if not os.path.exists(LOGO_PATH):
        return None
    try:
        img = Image.open(LOGO_PATH).convert("RGBA")
        w, h = img.size
        scale = LOGO_HEIGHT / h
        return img.resize((int(w * scale), LOGO_HEIGHT), Image.LANCZOS)
    except Exception as exc:  # noqa: BLE001
        print(f"  Warning: cannot load logo ({exc})")
        return None


def load_font(size, weight=600):
    """Load Inter from local cache; fall back to a system DejaVu font."""
    weight = str(weight)
    dest = os.path.join(ASSETS_DIR, "fonts", f"inter-{weight}.ttf")
    if download_asset(FONT_BASE.format(weight=weight), dest):
        try:
            return ImageFont.truetype(dest, size)
        except Exception:  # noqa: BLE001
            pass

    for fallback in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/Library/Fonts/Arial.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        if os.path.exists(fallback):
            try:
                return ImageFont.truetype(fallback, size)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def wrap_text(text, font, max_width):
    """Wrap text into lines fitting a max pixel width."""
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if measure.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def draw_gradient_text(img, xy, text, font, color_a, color_b, center=False):
    """Draw text with a vertical gradient fill."""
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    grad = Image.new("RGB", (1, max(th, 1)))
    for i in range(th):
        t = i / max(th - 1, 1)
        col = tuple(int(a + (b - a) * t) for a, b in zip(color_a, color_b))
        grad.putpixel((0, i), col)
    grad = grad.resize((tw, th))

    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).text((-bbox[0], -bbox[1]), text, font=font, fill=255)

    x, y = xy
    x = x - tw // 2 if center else x
    img.paste(grad, (int(x), int(y)), mask)


def build_background():
    """Full-bleed 1200x630 background: vertical gradient + brand glows."""
    grad = Image.new("RGB", (1, H))
    for row in range(H):
        t = row / (H - 1)
        grad.putpixel(
            (0, row),
            tuple(int(a + (b - a) * t) for a, b in zip(COLOR_BG_TOP, COLOR_BG_BOTTOM)),
        )
    img = grad.resize((W, H))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-380, -360, 860, 620], fill=(*COLOR_GLOW_BLUE, 46))
    gd.ellipse([380, 80, 1500, 920], fill=(*COLOR_GLOW_VIOLET, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(90))

    return Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")


def generate_og_banner(output_path, name, emoji, description):
    """Generate a branded 1200x630 banner for a page."""
    img = build_background()
    draw = ImageDraw.Draw(img)

    # Vertical layout: the emoji + title + description block is centered
    # as a whole in the 630px-tall canvas (with the logo free in the corner).
    GAP_EMOJI_TITLE = 32
    GAP_TITLE_DESC = 26
    LINE_SPACING = 42
    # Small nudge to keep the block slightly above the true vertical center.
    CONTENT_SHIFT_Y = -18

    emoji_img = load_emoji(emoji, EMOJI_SIZE)
    if emoji_img is not None:
        ew, eh = emoji_img.size
    else:
        ew, eh = EMOJI_SIZE, 80

    name_font = load_font(54, 700)
    measured = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    while measured.textlength(name, font=name_font) > 1000 and name_font.size > 30:
        name_font = load_font(name_font.size - 4, 700)
    _, title_t, _, title_b = draw.textbbox((0, 0), name, font=name_font)
    title_h = title_b - title_t

    desc_font = load_font(30, 400)
    desc_lines = wrap_text(description, desc_font, 900)[:2]
    desc_block_h = len(desc_lines) * LINE_SPACING

    content_h = eh + GAP_EMOJI_TITLE + title_h + GAP_TITLE_DESC + desc_block_h
    top = max(20, (H - content_h) // 2 + CONTENT_SHIFT_Y)

    # --- Emoji ---
    emoji_top = top
    if emoji_img is not None:
        # Centered horizontally by the ink bounding box, same axis as the text.
        img.paste(emoji_img, (W // 2 - ew // 2, emoji_top), emoji_img)
    else:
        # Fallback: first letter monogram
        letter_font = load_font(72, 800)
        draw_gradient_text(
            img,
            (W // 2, emoji_top),
            name[0].upper(),
            letter_font,
            COLOR_GRAD_A,
            COLOR_GRAD_B,
            center=True,
        )

    # --- Tool name ---
    title_top = emoji_top + eh + GAP_EMOJI_TITLE
    draw_gradient_text(
        img, (W // 2, title_top), name, name_font, COLOR_TITLE, COLOR_GRAD_B, center=True
    )

    # --- Description (wrapped, below the name) ---
    desc_top = title_top + title_h + GAP_TITLE_DESC
    for i, line in enumerate(desc_lines):
        # Center the INK (textbbox), not the advance (textlength): `draw.text`
        # anchors on the left-ascender pen point, and the ink can extend
        # asymmetrically past the advance on either side.
        l, t, r, b = draw.textbbox((0, 0), line, font=desc_font)
        x = W // 2 - (l + r) // 2
        y = desc_top + i * LINE_SPACING - t
        draw.text((x, y), line, font=desc_font, fill=COLOR_DESC)

    # --- Brand logo (bottom-right) ---
    logo_img = load_logo()
    if logo_img is not None:
        lw, lh = logo_img.size
        img.paste(logo_img, (W - lw - 44, H - lh - 40), logo_img)

    img.save(output_path, "PNG")
    print(f"  Generated: {os.path.relpath(output_path, PROJECT_ROOT)}")


def load_manifest():
    """Load tool metadata (name, emoji, description) keyed by page path."""
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"  Warning: cannot read manifest ({exc})")
        return {}
    return {
        tool["url"].lstrip("/"): tool
        for tool in data.get("tools", [])
        if "url" in tool
    }


def page_meta(rel_path, og_name, manifest):
    """Return (name, emoji, description) for a page."""
    if rel_path in manifest:
        tool = manifest[rel_path]
        return (
            tool.get("name", og_name),
            tool.get("emoji", ""),
            tool.get("description", ""),
        )
    if og_name in PAGE_META:
        return PAGE_META[og_name]
    return og_name, "", ""


def upsert_meta(content, name, tag_str):
    """Replace an existing single or multi-line meta tag, or insert it before </head>."""
    pattern = re.compile(
        rf'<meta\s+(?:property|name)="{re.escape(name)}"\s+content="[^"]*"\s*/>',
        re.IGNORECASE | re.DOTALL,
    )
    if pattern.search(content):
        return pattern.sub(tag_str, content, count=1)
    return re.sub(
        r"(\n)(\s*)(</head>)",
        r"\1" + f"    {tag_str}\n" + r"\2\3",
        content,
        count=1,
        flags=re.IGNORECASE,
    )


def inject_og_meta(html_path, og_name, page_url):
    """Upsert the full set of Open Graph and Twitter Card meta tags."""
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    title_match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE | re.DOTALL)
    page_title = title_match.group(1).strip() if title_match else "ToolsBoXMachine (TBXM)"

    desc_match = re.search(
        r'<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"',
        content,
        re.IGNORECASE | re.DOTALL,
    )
    if desc_match:
        description = desc_match.group(1).strip()
    else:
        desc_match = re.search(
            r'<meta\s+name="description"\s+content="([^"]*)"',
            content,
            re.IGNORECASE | re.DOTALL,
        )
        description = desc_match.group(1).strip() if desc_match else ""

    image_url = f"{BASE_URL}/og/{og_name}.png"

    tags = [
        ("og:site_name", '<meta property="og:site_name" content="ToolsBoXMachine" />'),
        ("og:type", '<meta property="og:type" content="website" />'),
        ("og:title", f'<meta property="og:title" content="{page_title}" />'),
        ("og:url", f'<meta property="og:url" content="{page_url}" />'),
        ("og:image", f'<meta property="og:image" content="{image_url}" />'),
        ("og:image:type", '<meta property="og:image:type" content="image/png" />'),
        ("og:image:width", '<meta property="og:image:width" content="1200" />'),
        ("og:image:height", '<meta property="og:image:height" content="630" />'),
        ("twitter:card", '<meta name="twitter:card" content="summary_large_image" />'),
        ("twitter:title", f'<meta name="twitter:title" content="{page_title}" />'),
        ("twitter:image", f'<meta name="twitter:image" content="{image_url}" />'),
    ]
    if description:
        tags.append(("og:description", f'<meta property="og:description" content="{description}" />'))
        tags.append(("twitter:description", f'<meta name="twitter:description" content="{description}" />'))

    for name, tag_str in tags:
        content = upsert_meta(content, name, tag_str)

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  Updated meta: {os.path.relpath(html_path, PROJECT_ROOT)}")


def find_html_files():
    """Find all HTML files to process."""
    patterns = [
        os.path.join(PROJECT_ROOT, "index.html"),
        os.path.join(PROJECT_ROOT, "tools", "**", "*.html"),
        os.path.join(PROJECT_ROOT, "pages", "*.html"),
    ]

    files = []
    for pattern in patterns:
        files.extend(glob.glob(pattern, recursive=True))

    files = [
        f for f in files
        if not any(excl in os.path.relpath(f, PROJECT_ROOT) for excl in EXCLUDE_PATTERNS)
    ]

    return sorted(set(files))


def main():
    os.makedirs(OG_DIR, exist_ok=True)

    html_files = find_html_files()
    if not html_files:
        print("No HTML files found!")
        sys.exit(1)

    manifest = load_manifest()
    print(f"Found {len(html_files)} HTML files to process:\n")

    og_names = []
    for html_path in html_files:
        og_name = get_og_name(html_path)
        og_names.append(og_name)
        rel_path = os.path.relpath(html_path, PROJECT_ROOT)
        page_url = BASE_URL if rel_path == "index.html" else f"{BASE_URL}/{rel_path}"
        output_path = os.path.join(OG_DIR, f"{og_name}.png")

        name, emoji, description = page_meta(rel_path, og_name, manifest)

        print(f"Processing: {rel_path}")
        print(f"  Name: {name} | URL: {page_url}")

        generate_og_banner(output_path, name, emoji, description)
        inject_og_meta(html_path, og_name, page_url)
        print()

    # Remove stale images for pages that no longer exist
    expected = {f"{name}.png" for name in og_names}
    for existing in sorted(os.listdir(OG_DIR)):
        if existing.endswith(".png") and existing not in expected:
            os.remove(os.path.join(OG_DIR, existing))
            print(f"  Removed stale image: {existing}")

    print(f"Done! Generated {len(html_files)} banners in og/")


if __name__ == "__main__":
    main()