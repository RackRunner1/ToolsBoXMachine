#!/usr/bin/env bash
# install.sh - one-step installer for ToolsBoXApp (Linux).
#
# Detects the distribution and installs the matching package from a
# GitHub release:
#   - Debian/Ubuntu and derivatives -> .deb via apt-get
#   - Fedora/RHEL and derivatives   -> .rpm via dnf (else yum, else zypper)
#   - Arch Linux and derivatives    -> .pkg.tar.zst via pacman
#
# Usage:
#   curl -fsSL https://tbxm.org/install.sh | bash
#   or:
#   curl -fsSL https://raw.githubusercontent.com/RackRunner1/ToolsBoXMachine/main/install.sh | bash
#   or:
#   bash install.sh [VERSION]
#
# Pin a version for reproducible installs (avoids `releases/latest` drift):
#   TOOLBOXAPP_VERSION=v1.2.3 bash install.sh
#   bash install.sh v1.2.3
set -euo pipefail

REPO="RackRunner1/ToolsBoXApp"

die() {
  if [ "${BAR_ACTIVE:-0}" -eq 1 ]; then bar_done; fi
  printf 'install.sh: %s\n' "$*" >&2; exit 1;
}
warn() { printf 'install.sh: warning: %s\n' "$*" >&2; }

# ---------------------------------------------------------------------------
# Pretty output: two blank lines, ASCII banner, single-line progress bar.
# ---------------------------------------------------------------------------
BANNER='████████╗ ██████╗  ██████╗ ██╗     ███████╗██████╗  ██████╗ ██╗  ██╗ █████╗ ██████╗ ██████╗
╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝██╔══██╗██╔══██╗██╔══██╗
   ██║   ██║   ██║██║   ██║██║     ███████╗██████╔╝██║   ██║ ╚███╔╝ ███████║██████╔╝██████╔╝
   ██║   ██║   ██║██║   ██║██║     ╚════██║██╔══██╗██║   ██║ ██╔██╗ ██╔══██║██╔═══╝ ██╔═══╝
   ██║   ╚██████╔╝╚██████╔╝███████╗███████║██████╔╝╚██████╔╝██╔╝ ██╗██║  ██║██║     ██║
   ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝'

print_banner() { printf '\n\n%s\n' "$BANNER"; }

BAR_W=30
BAR_ACTIVE=0
TTY_OUT=0
[ -t 1 ] && TTY_OUT=1

# Redraws `██████░░░░░░  42%` on one line (plain lines when piped).
bar_draw() {
  local pct=$1 filled empty i bar
  [ "$pct" -gt 100 ] && pct=100
  filled=$(( pct * BAR_W / 100 )); empty=$(( BAR_W - filled )); bar=""
  i=0; while [ "$i" -lt "$filled" ]; do bar="${bar}█"; i=$((i+1)); done
  i=0; while [ "$i" -lt "$empty" ]; do bar="${bar}░"; i=$((i+1)); done
  if [ "$TTY_OUT" -eq 1 ]; then
    printf '\r%s %3d%%' "$bar" "$pct"
  else
    printf '%s %3d%%\n' "$bar" "$pct"
  fi
  BAR_ACTIVE=1
}

# Removes the bar line, keeping only the banner and the final message.
bar_done() {
  if [ "$TTY_OUT" -eq 1 ]; then
    printf '\r%*s\r' 40 ''
  fi
  BAR_ACTIVE=0
}

# ---------------------------------------------------------------------------
# 0. Pinned version (reproducible installs)
# ---------------------------------------------------------------------------
# Env var wins, first positional arg is a convenience shorthand.
# Empty (default) means "latest release".
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,16p' "$0"
  echo ""
  echo "Environment: TOOLBOXAPP_VERSION=<tag> pins a release (same as passing VERSION)."
  exit 0
fi
PINNED_VERSION="${TOOLBOXAPP_VERSION:-${1:-}}"
if [ -n "$PINNED_VERSION" ]; then
  API_URL="https://api.github.com/repos/$REPO/releases/tags/$PINNED_VERSION"
else
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
fi

# ---------------------------------------------------------------------------
# 1. Detect the native package format (via /etc/os-release first)
# ---------------------------------------------------------------------------
# Checking manager presence alone (apt before dnf before pacman) mis-detects
# systems that ship several managers (distrobox, toolbx, WSL, containers).
# /etc/os-release (ID + ID_LIKE) is authoritative; manager presence is only
# a sanity check / fallback.
detect_ext() {
  local id="" like=""
  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    id="$(printf '%s' "${ID:-}" | tr '[:upper:]' '[:lower:]')"
    like="$(printf '%s' "${ID_LIKE:-}" | tr '[:upper:]' '[:lower:]')"
  fi

  local family=""
  case " $like " in
    *" debian "* | *" ubuntu "*) family="debian" ;;
    *" rhel "* | *" fedora "* | *" centos "* | *" suse "* | *" opensuse "*) family="fedora" ;;
    *" arch "*) family="arch" ;;
  esac
  if [ -z "$family" ]; then
    case "$id" in
      debian | ubuntu | linuxmint | pop | elementary | zorin | kali | raspbian | pureos | parrot) family="debian" ;;
      fedora | rhel | centos | rocky | alma* | almalinux | ol | scientific | amzn | opensuse* | sles | oes) family="fedora" ;;
      arch | archarm | manjaro | endeavouros | cachyos | garuda | artix) family="arch" ;;
    esac
  fi

  case "$family" in
    debian)
      command -v apt-get >/dev/null 2>&1 || die "unsupported distribution ($id): apt-get is required for .deb installs."
      printf '%s' ".deb"
      return 0
      ;;
    fedora)
      if command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1 || command -v zypper >/dev/null 2>&1; then
        printf '%s' ".rpm"
        return 0
      fi
      die "unsupported distribution ($id): need dnf/yum/zypper for .rpm installs."
      ;;
    arch)
      command -v pacman >/dev/null 2>&1 || die "unsupported distribution ($id): pacman is required for .pkg.tar.zst installs."
      printf '%s' ".pkg.tar.zst"
      return 0
      ;;
  esac

  # Fallback for unknown / missing os-release: keep the old probe order,
  # but warn that the guess may be wrong when several managers coexist.
  if command -v apt-get >/dev/null 2>&1; then
    warn "/etc/os-release did not identify the distro (ID='${id:-?}'); guessing .deb via apt-get."
    printf '%s' ".deb"
  elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1 || command -v zypper >/dev/null 2>&1; then
    warn "/etc/os-release did not identify the distro (ID='${id:-?}'); guessing .rpm."
    printf '%s' ".rpm"
  elif command -v pacman >/dev/null 2>&1; then
    warn "/etc/os-release did not identify the distro (ID='${id:-?}'); guessing .pkg.tar.zst via pacman."
    printf '%s' ".pkg.tar.zst"
  else
    die "unsupported distribution: need apt-get (Debian/Ubuntu), dnf/yum/zypper (Fedora/RHEL/openSUSE) or pacman (Arch Linux)."
  fi
}
EXT="$(detect_ext)"

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
  download() { curl -fsSL --max-time 600 -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO- --timeout=60 "$1"; }
  download() { wget -q --timeout=600 -O "$2" "$1"; }
else
  die "curl or wget is required to download the package."
fi

# ---------------------------------------------------------------------------
# 4. Pick the matching asset (tag + download URL + asset name)
# ---------------------------------------------------------------------------
# Strict on architecture: if assets exist for EXT but none matches ARCH,
# we FAIL instead of silently installing a foreign-arch package (e.g. an
# x86-64 .deb on ARM). The old fallback (`cands[0]`) and the broken jq
# fallback (`.[0] // .[0]`, where the second `.[0]` runs on an object and
# can never match) are intentionally removed.
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
if not cands:
    print(f"{tag}".strip())
    sys.exit(0)
arch = [(n, u) for n, u in cands if pat.search(n)]
if not arch:
    names = " ".join(n for n, _ in cands)
    print(f"NO_ARCH_MATCH {tag} {names}", file=sys.stderr)
    print(f"{tag}".strip())
    sys.exit(2)
name, url = arch[0]
print(f"{tag} {url} {name}".strip())
'
  elif command -v jq >/dev/null 2>&1; then
    # NOTE: no `// .[0]` fallback here on purpose (see header comment).
    jq -r --arg ext "$EXT" --arg pat "$ARCH_PAT" \
      '.tag_name as $tag
       | [.assets[] | select(.name | endswith($ext)) | {name, url: .browser_download_url}]
       | if length == 0 then "\($tag)"
         else ((map(select(.name | test($pat; "i"))) | .[0] | select(.) | "\($tag) \(.url) \(.name)")
               // "NO_ARCH_MATCH") end'
  else
    die "python3 or jq is required to read the release metadata."
  fi
}

# Lookup of the checksum asset. The release pipeline
# (ToolsBoXApp `.github/workflows/daily-release.yml`) always publishes
# `checksums.txt` (`sha256sum` of every package), so that exact name wins;
# anything else matching *sha256*/*checksum* is only a fallback.
pick_checksum_asset() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, re, sys
pat = re.compile(r"(sha256|checksum)", re.IGNORECASE)
doc = json.load(sys.stdin)
assets = [(a.get("name", ""), a.get("browser_download_url", ""))
          for a in doc.get("assets", []) if a.get("browser_download_url")]
for n, u in assets:
    if n == "checksums.txt":
        print(f"{u} {n}".strip())
        break
else:
    for n, u in assets:
        if pat.search(n):
            print(f"{u} {n}".strip())
            break
'
  elif command -v jq >/dev/null 2>&1; then
    jq -r '[.assets[] | select(.browser_download_url != null)
            | "\(.browser_download_url) \(.name)"]
           | (map(select(endswith(" checksums.txt"))) | .[0])
             // (map(select(test("(sha256|checksum)"; "i"))) | .[0])
             // empty'
  else
    die "python3 or jq is required to read the release metadata."
  fi
}

# Verify $1 (package file, original asset name $2) against checksum file $3.
# The checksum file uses `sha256sum` output format: "<hash>  <basename>".
verify_sha256() {
  local file="$1" asset_name="$2" sums="$3" expected="" actual=""
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$file" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$file" | awk '{print $1}')"
  else
    die "checksum found but no sha256sum/shasum tool to verify it."
  fi
  # Exact basename match ($NF, tolerating the `*` binary marker): a
  # substring grep could accept the hash of a similarly-named file.
  expected="$(awk -v name="$asset_name" \
    '$1 ~ /^[0-9a-fA-F]{64}$/ { f=$NF; sub(/^\*/, "", f); if (f == name) { print $1; exit } }' \
    "$sums")"
  [ -n "$expected" ] || die "no SHA-256 entry for $asset_name in the checksum asset."
  if [ "$(printf '%s' "$expected" | tr '[:upper:]' '[:lower:]')" != \
       "$(printf '%s' "$actual" | tr '[:upper:]' '[:lower:]')" ]; then
    die "SHA-256 mismatch for $asset_name (expected $expected, got $actual). Aborting."
  fi
}

if [ -z "$PINNED_VERSION" ]; then
  warn "no version pinned: 'latest' is convenient but not reproducible. Set TOOLBOXAPP_VERSION=<tag> to pin."
fi
print_banner

DOC="$(fetch "$API_URL")" || die "could not reach the GitHub API (network, rate limit, or bad tag '$PINNED_VERSION'?)."
bar_draw 10
# pick_asset uses exit code 2 for "right format, wrong arch" (python branch);
# guard with set +e so `set -e` does not abort before we can emit the
# foreign-arch error message.
set +e
PICK_OUT="$(printf '%s' "$DOC" | pick_asset)"
PICK_RC="$?"
set -e
if [ "$PICK_RC" -eq 2 ] || [ "$PICK_OUT" = "NO_ARCH_MATCH" ] || printf '%s' "$PICK_OUT" | grep -q "^NO_ARCH_MATCH"; then
  AVAIL="$(printf '%s' "$DOC" | EXT="$EXT" python3 -c '
import json, os, sys
ext = os.environ["EXT"]
doc = json.load(sys.stdin)
print(" ".join(a.get("name", "") for a in doc.get("assets", []) if a.get("name", "").endswith(ext)))
' 2>/dev/null || printf '%s' "$DOC" | jq -r --arg ext "$EXT" '[.assets[] | select(.name | endswith($ext)) | .name] | join(" ")')"
  die "no $EXT asset matches architecture '$ARCH' (pattern: $ARCH_PAT). Available $EXT assets: ${AVAIL:-<none>}. Refusing to install a foreign-arch package."
fi
bar_draw 20
read -r TAG URL ASSET_NAME <<<"$PICK_OUT"
[ -n "${URL:-}" ] || die "no $EXT asset found in this release."
[ -n "${ASSET_NAME:-}" ] || ASSET_NAME="$(basename "$URL")"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/toolsboxapp-install-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
FILE="$TMP/$ASSET_NAME"
download "$URL" "$FILE" || die "download failed (network issue?)."
bar_draw 50

# ---------------------------------------------------------------------------
# 4b. Checksum verification (mandatory: the pipeline publishes checksums.txt)
# ---------------------------------------------------------------------------
# HTTPS alone proves transport security, not artifact authenticity.
# Every published release ships `checksums.txt` (sha256sum of all
# packages), so a missing/unparsable checksum or a hash mismatch aborts
# the install instead of trusting the bytes.
CHECKSUM_INFO="$(printf '%s' "$DOC" | pick_checksum_asset || true)"
if [ -z "$CHECKSUM_INFO" ]; then
  die "no checksums.txt asset in this release; refusing to install an unverifiable package."
fi
read -r CHECKSUM_URL CHECKSUM_NAME <<<"$CHECKSUM_INFO"
SUMS="$TMP/$CHECKSUM_NAME"
download "$CHECKSUM_URL" "$SUMS" || die "checksum download failed."
bar_draw 65
verify_sha256 "$FILE" "$ASSET_NAME" "$SUMS"
bar_draw 75

# ---------------------------------------------------------------------------
# 5. Install with the native package manager (sudo unless root)
# ---------------------------------------------------------------------------
# Manager output goes to a log (shown only on failure) to keep the display
# to the banner plus the progress bar. sudo still prompts on /dev/tty.
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || die "root privileges are required: run as root or install sudo."
  SUDO="sudo"
else
  SUDO=""
fi

bar_draw 85
LOG="$TMP/pkg-manager.log"
if [ "$EXT" = ".deb" ]; then
  $SUDO apt-get install -y "$FILE" >"$LOG" 2>&1 || { tail -n 20 "$LOG" >&2; die "apt-get install failed (see above)."; }
elif [ "$EXT" = ".rpm" ]; then
  if command -v dnf >/dev/null 2>&1; then
    MANAGER="dnf"
  elif command -v yum >/dev/null 2>&1; then
    MANAGER="yum"
  else
    MANAGER="zypper"
  fi
  if [ "$MANAGER" = "zypper" ]; then
    $SUDO "$MANAGER" --non-interactive install --allow-unsigned-rpm "$FILE" >"$LOG" 2>&1 || { tail -n 20 "$LOG" >&2; die "zypper install failed (see above)."; }
  else
    $SUDO "$MANAGER" install -y "$FILE" >"$LOG" 2>&1 || { tail -n 20 "$LOG" >&2; die "$MANAGER install failed (see above)."; }
  fi
else
  $SUDO pacman -U --noconfirm "$FILE" >"$LOG" 2>&1 || { tail -n 20 "$LOG" >&2; die "pacman install failed (see above)."; }
fi
bar_draw 100

bar_done
echo "Welcome to ToolsBoXApp!"
