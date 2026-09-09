#!/usr/bin/env python3
"""
Generate QR code OG images for all HTML pages and inject OG/Twitter meta tags.

Scans the project for HTML files, generates QR code PNGs pointing to the
full URL of each page, saves them to og/, and updates the HTML
files with the appropriate og:title, og:url, og:image, og:site_name,
twitter:card, and related meta tags.
"""

import glob
import os
import re
import sys

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image

BASE_URL = "https://tbxm.pages.dev"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Cloudflare Pages serves the repo root as the web root, so QR images placed
# in "og/" at the repo root are served at /og/<name>.png.
OG_DIR = os.path.join(PROJECT_ROOT, "og")

# Map HTML file paths to OG image names
# Key: path relative to project root
# Value: OG image filename (without .png)
EXCLUDE_PATTERNS = ["ui/navbar.html", "ui/footer.html"]


def get_og_name(html_path):
    """Determine the OG image name from an HTML file path."""
    rel = os.path.relpath(html_path, PROJECT_ROOT)

    if rel == "index.html":
        return "homepage"

    if rel.startswith("tools/"):
        # tools/blur/blur.html -> blur
        parts = rel.split("/")
        if len(parts) >= 2:
            return parts[1]

    if rel.startswith("pages/"):
        # pages/about.html -> about
        parts = rel.split("/")
        if len(parts) >= 2:
            name = parts[1].replace(".html", "")
            return name

    # Fallback: use filename without extension
    return os.path.splitext(os.path.basename(html_path))[0]


def generate_qr_png(url, output_path):
    """Generate a styled square QR code PNG."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        fill_color="#0f172a",
        back_color="white",
    )

    # Create a square 1200x1200 canvas with the QR centered
    canvas = Image.new("RGB", (1200, 1200), "white")
    qr_size = 1080
    qr_resized = img.resize((qr_size, qr_size), Image.LANCZOS)
    x = (1200 - qr_size) // 2
    y = (1200 - qr_size) // 2
    canvas.paste(qr_resized, (x, y))

    canvas.save(output_path, "PNG")
    print(f"  Generated: {os.path.relpath(output_path, PROJECT_ROOT)}")


def upsert_meta(content, name, tag_str):
    """Replace an existing single or multi-line meta tag, or insert it before </head>."""
    pattern = re.compile(
        rf'<meta\s+(?:property|name)="{re.escape(name)}"\s+content="[^"]*"\s*/>',
        re.IGNORECASE | re.DOTALL,
    )
    if pattern.search(content):
        return pattern.sub(tag_str, content, count=1)
    # Tag not present — insert right before </head>
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
        # Fall back to the standard description meta tag
        desc_match = re.search(
            r'<meta\s+name="description"\s+content="([^"]*)"',
            content,
            re.IGNORECASE | re.DOTALL,
        )
        description = desc_match.group(1).strip() if desc_match else ""

    image_url = f"{BASE_URL}/og/{og_name}.png"

    tags = [
        ("og:site_name", f'<meta property="og:site_name" content="ToolsBoXMachine" />'),
        ("og:type", '<meta property="og:type" content="website" />'),
        ("og:title", f'<meta property="og:title" content="{page_title}" />'),
        ("og:url", f'<meta property="og:url" content="{page_url}" />'),
        ("og:image", f'<meta property="og:image" content="{image_url}" />'),
        ("og:image:type", '<meta property="og:image:type" content="image/png" />'),
        ("og:image:width", '<meta property="og:image:width" content="1200" />'),
        ("og:image:height", '<meta property="og:image:height" content="1200" />'),
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

    # Exclude UI partials
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

    print(f"Found {len(html_files)} HTML files to process:\n")

    og_names = []
    for html_path in html_files:
        og_name = get_og_name(html_path)
        og_names.append(og_name)
        rel_path = os.path.relpath(html_path, PROJECT_ROOT)
        page_url = BASE_URL if rel_path == "index.html" else f"{BASE_URL}/{rel_path}"
        output_path = os.path.join(OG_DIR, f"{og_name}.png")

        print(f"Processing: {rel_path}")
        print(f"  URL: {page_url}")
        print(f"  OG name: {og_name}.png")

        generate_qr_png(page_url, output_path)
        inject_og_meta(html_path, og_name, page_url)
        print()

    # Remove stale QR codes for pages that no longer exist
    expected = {f"{name}.png" for name in og_names}
    for existing in sorted(os.listdir(OG_DIR)):
        if existing.endswith(".png") and existing not in expected:
            os.remove(os.path.join(OG_DIR, existing))
            print(f"  Removed stale QR: {existing}")

    print(f"Done! Generated {len(html_files)} QR codes in og/")


if __name__ == "__main__":
    main()
