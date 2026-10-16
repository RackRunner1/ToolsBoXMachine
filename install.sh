#!/usr/bin/env bash
# install.sh - one-step installer for ToolsBoXApp (Linux).
#
# Detects the distribution and installs the matching package from the
# latest GitHub release:
#   - Debian/Ubuntu and derivatives -> .deb via apt-get
#   - Fedora/RHEL and derivatives   -> .rpm via dnf (else yum)
#   - Arch Linux and derivatives    -> .pkg.tar.zst via pacman
#
# Usage:
#   curl -fsSL https://tbxm.org/install.sh | bash
#   or:
#   curl -fsSL https://raw.githubusercontent.com/RackRunner1/ToolsBoXMachine/main/install.sh | bash
#   or:
#   bash install.sh
set -euo pipefail

REPO="RackRunner1/ToolsBoXApp"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Detect the native package format
# ---------------------------------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
  EXT=".deb"
elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
  EXT=".rpm"
elif command -v pacman >/dev/null 2>&1; then
  EXT=".pkg.tar.zst"
else
  die "unsupported distribution: need apt-get (Debian/Ubuntu), dnf/yum (Fedora/RHEL) or pacman (Arch Linux)."
fi

# ---------------------------------------------------------------------------
# 2. Architecture preference (same chip, different names per ecosystem)
# ---------------------------------------------------------------------------
ARCH="$(uname -m 2>/dev/null || echo x86_64)"
case "$ARCH" in
  x86_64)          ARCH_PAT="x86_64|amd64|x86-64" ;;
  aarch64 | arm64) ARCH_PAT="aarch64|arm64" ;;
  *)               ARCH_PAT="$ARCH" ;;
esac

# ---------------------------------------------------------------------------
# 3. Downloader (curl preferred, wget fallback)
# ---------------------------------------------------------------------------
if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL --max-time 60 -H "Accept: application/vnd.github+json" -H "User-Agent: toolsboxapp-install" "$1"; }
  download() { curl -fSL --max-time 600 -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO- --timeout=60 "$1"; }
  download() { wget --timeout=600 -O "$2" "$1"; }
else
  die "curl or wget is required to download the package."
fi

# ---------------------------------------------------------------------------
# 4. Pick the matching asset (tag + download URL) from the latest release
# ---------------------------------------------------------------------------
pick_asset() {
  if command -v python3 >/dev/null 2>&1; then
    EXT="$EXT" ARCH_PAT="$ARCH_PAT" python3 -c '
import json, os, re, sys
ext = os.environ["EXT"]
pat = re.compile(os.environ["ARCH_PAT"], re.IGNORECASE)
doc = json.load(sys.stdin)
tag = doc.get("tag_name", "")
cands = [(a.get("name", ""), a.get("browser_download_url", ""))
         for a in doc.get("assets", [])
         if a.get("name", "").endswith(ext) and a.get("browser_download_url")]
url = next((u for n, u in cands if pat.search(n)), cands[0][1] if cands else "")
print(f"{tag} {url}".strip())
'
  elif command -v jq >/dev/null 2>&1; then
    jq -r --arg ext "$EXT" --arg pat "$ARCH_PAT"
      '.tag_name as $tag
       | [.assets[] | select(.name | endswith($ext)) | {name, url: .browser_download_url}]
       | (map(select(.name | test($pat; "i"))) | .[0] // .[0] | select(.) | "\($tag) \(.url)") // empty'
  else
    die "python3 or jq is required to read the release metadata."
  fi
}

echo "Checking the latest $REPO release for a $EXT package ($ARCH)..."
DOC="$(fetch "$API_URL")" || die "could not reach the GitHub API (network or rate limit?)."
read -r TAG URL <<<"$(printf '%s' "$DOC" | pick_asset)"
[ -n "${URL:-}" ] || die "no $EXT asset found in the latest release."

echo "Latest release: ${TAG:-unknown}"
echo "Downloading $URL ..."

TMP="$(mktemp -d "${TMPDIR:-/tmp}/toolsboxapp-install-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
FILE="$TMP/toolsboxapp-latest$EXT"
download "$URL" "$FILE" || die "download failed (network issue?)."

# ---------------------------------------------------------------------------
# 5. Install with the native package manager (sudo unless root)
# ---------------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || die "root privileges are required: run as root or install sudo."
  SUDO="sudo"
else
  SUDO=""
fi

if [ "$EXT" = ".deb" ]; then
  echo "Installing with apt-get (root privileges required)..."
  $SUDO apt-get install -y "$FILE"
elif [ "$EXT" = ".rpm" ]; then
  if command -v dnf >/dev/null 2>&1; then
    MANAGER="dnf"
  else
    MANAGER="yum"
  fi
  echo "Installing with $MANAGER (root privileges required)..."
  $SUDO "$MANAGER" install -y "$FILE"
else
  echo "Installing with pacman (root privileges required)..."
  $SUDO pacman -U --noconfirm "$FILE"
fi

echo "ToolsBoXApp installed. Run 'tbxa update' later to update, 'tbxa uninstall' to remove ('tbxm' works too)."
