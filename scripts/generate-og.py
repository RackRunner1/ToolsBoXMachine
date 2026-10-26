#!/usr/bin/env python3
import glob
import json
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

BASE_URL = "https://www.tbxm.org"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OG_DIR = os.path.join(PROJECT_ROOT, "og")
ASSETS_DIR = os.path.join(PROJECT_ROOT, ".og-assets")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "public", "tools", "index.json")

EXCLUDE_PATTERNS = ["ui/navbar.html", "ui/footer.html"]

W, H = 1200, 630

COLOR_BG_TOP = (2, 6, 23)
COLOR_BG_BOTTOM = (15, 23, 42)
COLOR_GLOW_BLUE = (59, 130, 246)
COLOR_GLOW_VIOLET = (167, 139, 250)
COLOR_GRAD_A = (96, 165, 250)
COLOR_GRAD_B = (167, 139, 250)
COLOR_TITLE = (248, 250, 252)
COLOR_DESC = (148, 163, 184)

APPLE_EMOJI_FONT = "/System/Library/Fonts/Apple Color Emoji.ttc"
APPLE_EMOJI_NATIVE = 160
EMOJI_SIZE = 118

LOGO_PATH = os.path.join(PROJECT_ROOT, ".assets", "logo", "logo.png")
LOGO_HEIGHT = 48

HOMEPAGE_OG_NAME = "homepage"
HOMEPAGE_OG_SOURCE = os.path.join(PROJECT_ROOT, ".assets", "homepage.png")

PAGE_META = {
    "homepage": ("ToolsBoXMachine", "🔨", "A collection of free, privacy-first browser tools for everyday tasks."),
    "about": ("About", "ℹ️", "Learn about ToolsBoXMachine, a free and open-source collection of browser tools."),
    "privacy": ("Privacy Policy", "🛡️", "Your data stays in your browser. Nothing is ever sent to servers."),
    "terms": ("Terms of Service", "📜", "Free, open source tools for everyone, no strings attached."),
    "philosophy": ("Philosophy", "💡", "Privacy-first, open source, no trackers and no accounts."),
}

FONT_BASE = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-{weight}-normal.ttf"


def get_og_name(html_path):
    rel = os.path.relpath(html_path, PROJECT_ROOT)

    if rel == "index.html":
        return "homepage"

    if rel.startswith("tools/"):
        return rel.split("/")[1]

    if rel.startswith("pages/"):
        return rel.split("/")[1].replace(".html", "")

    return os.path.splitext(os.path.basename(html_path))[0]


def download_asset(url, dest):
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


def export_og_source(source_path, output_path):
    if not os.path.exists(source_path):
        print(f"  Warning: {os.path.relpath(source_path, PROJECT_ROOT)} not found")
        return False

    try:
        img = Image.open(source_path)
        if img.mode in ("RGBA", "LA", "P"):
            rgba = img.convert("RGBA")
            flat = Image.new("RGB", img.size, COLOR_BG_BOTTOM)
            flat.paste(rgba, mask=rgba.getchannel("A"))
            img = flat
        else:
            img = img.convert("RGB")

        if img.size != (W, H):
            print(f"  Note: resizing {img.size[0]}x{img.size[1]} to {W}x{H}")
            img = ImageOps.fit(img, (W, H), method=Image.LANCZOS)

        img.save(output_path, "PNG")
    except Exception as exc:  # noqa: BLE001
        print(f"  Warning: cannot use source image ({exc})")
        return False

    print(f"  Copied: {os.path.relpath(source_path, PROJECT_ROOT)} -> "
          f"{os.path.relpath(output_path, PROJECT_ROOT)}")
    return True


def load_font(size, weight=600):
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


def lerp_color(color_a, color_b, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(color_a, color_b))


def draw_gradient_text(img, xy, text, font, color_a, color_b, center=False):
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    grad = Image.new("RGB", (1, max(th, 1)))
    for i in range(th):
        t = i / max(th - 1, 1)
        grad.putpixel((0, i), lerp_color(color_a, color_b, t))
    grad = grad.resize((tw, th))

    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).text((-bbox[0], -bbox[1]), text, font=font, fill=255)

    x, y = xy
    x = x - tw // 2 if center else x
    img.paste(grad, (int(x), int(y)), mask)


def build_background():
    grad = Image.new("RGB", (1, H))
    for row in range(H):
        t = row / (H - 1)
        grad.putpixel((0, row), lerp_color(COLOR_BG_TOP, COLOR_BG_BOTTOM, t))
    img = grad.resize((W, H))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-380, -360, 860, 620], fill=(*COLOR_GLOW_BLUE, 46))
    gd.ellipse([380, 80, 1500, 920], fill=(*COLOR_GLOW_VIOLET, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(90))

    return Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")


def generate_og_banner(output_path, name, emoji, description):
    img = build_background()
    draw = ImageDraw.Draw(img)

    GAP_EMOJI_TITLE = 32
    GAP_TITLE_DESC = 26
    LINE_SPACING = 42
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

    if emoji_img is not None:
        img.paste(emoji_img, (W // 2 - ew // 2, top), emoji_img)
    else:
        letter_font = load_font(72, 800)
        draw_gradient_text(
            img,
            (W // 2, top),
            name[0].upper(),
            letter_font,
            COLOR_GRAD_A,
            COLOR_GRAD_B,
            center=True,
        )

    title_top = top + eh + GAP_EMOJI_TITLE
    draw_gradient_text(
        img, (W // 2, title_top), name, name_font, COLOR_TITLE, COLOR_GRAD_B, center=True
    )

    desc_top = title_top + title_h + GAP_TITLE_DESC
    for i, line in enumerate(desc_lines):
        l, t, r, b = draw.textbbox((0, 0), line, font=desc_font)
        x = W // 2 - (l + r) // 2
        y = desc_top + i * LINE_SPACING - t
        draw.text((x, y), line, font=desc_font, fill=COLOR_DESC)

    logo_img = load_logo()
    if logo_img is not None:
        lw, lh = logo_img.size
        img.paste(logo_img, (W - lw - 44, H - lh - 40), logo_img)

    img.save(output_path, "PNG")
    print(f"  Generated: {os.path.relpath(output_path, PROJECT_ROOT)}")


def load_manifest():
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

        used_source = og_name == HOMEPAGE_OG_NAME and export_og_source(
            HOMEPAGE_OG_SOURCE, output_path
        )
        if not used_source:
            generate_og_banner(output_path, name, emoji, description)

        inject_og_meta(html_path, og_name, page_url)
        print()

    expected = {f"{name}.png" for name in og_names}
    for existing in sorted(os.listdir(OG_DIR)):
        if existing.endswith(".png") and existing not in expected:
            os.remove(os.path.join(OG_DIR, existing))
            print(f"  Removed stale image: {existing}")

    print(f"Done! Generated {len(html_files)} banners in og/")


if __name__ == "__main__":
    main()
