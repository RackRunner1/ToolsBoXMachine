#!/usr/bin/env python3
"""
Generate QR code OG images for all HTML pages and inject og:image meta tags.

Scans the project for HTML files, generates QR code PNGs pointing to the
full URL of each page, saves them to public/og/, and updates the HTML
files with the appropriate og:image meta tag.
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
OG_DIR = os.path.join(PROJECT_ROOT, "public", "og")

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


def inject_og_image(html_path, og_name):
    """Inject or update the og:image meta tag in an HTML file."""
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    og_image_tag = f'<meta property="og:image" content="/og/{og_name}.png" />'
    og_image_pattern = re.compile(
        r"<meta\s+property=\"og:image\"\s+content=\"[^\"]*\"\s*/?>\s*",
        re.IGNORECASE,
    )

    if og_image_pattern.search(content):
        # Update existing og:image tag
        og_image_pattern = re.compile(
            r"<meta\s+property=\"og:image\"\s+content=\"[^\"]*\"\s*/>",
            re.IGNORECASE,
        )
        content = og_image_pattern.sub(og_image_tag, content)
    else:
        # No og:image tag exists
        og_tags = list(
            re.finditer(
                r'<meta\s+property="og:[^>]*>', content, re.IGNORECASE | re.DOTALL
            )
        )
        if og_tags:
            # Has other og: tags — insert og:image after the last one,
            # matching its indentation
            last_tag = og_tags[-1]
            line_start = content.rfind("\n", 0, last_tag.start()) + 1
            indent_match = re.match(
                r"^(\s*)", content[line_start : last_tag.start()]
            )
            indent = indent_match.group(1) if indent_match else "    "
            content = (
                content[: last_tag.end()]
                + f"\n{indent}{og_image_tag}"
                + content[last_tag.end() :]
            )
        else:
            # No og: tags at all — insert og:type + og:image before </head>
            og_block = (
                f'    <meta property="og:type" content="website" />\n'
                f'    <meta property="og:image" content="/og/{og_name}.png" />\n'
            )
            content = re.sub(
                r"(\n)(\s*)(</head>)",
                r"\1" + og_block + r"\2\3",
                content,
                count=1,
                flags=re.IGNORECASE,
            )

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

    for html_path in html_files:
        og_name = get_og_name(html_path)
        rel_path = os.path.relpath(html_path, PROJECT_ROOT)
        page_url = BASE_URL if rel_path == "index.html" else f"{BASE_URL}/{rel_path}"
        output_path = os.path.join(OG_DIR, f"{og_name}.png")

        print(f"Processing: {rel_path}")
        print(f"  URL: {page_url}")
        print(f"  OG name: {og_name}.png")

        generate_qr_png(page_url, output_path)
        inject_og_image(html_path, og_name)
        print()

    print(f"Done! Generated {len(html_files)} QR codes in public/og/")


if __name__ == "__main__":
    main()
