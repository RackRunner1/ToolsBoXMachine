async function loadEditionLabel() {
  const label = document.querySelector(".nav-edition");
  if (!label) return;

  try {
    const response = await fetch("/edition.txt", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const edition = (text.split("\n")[0] || "").replace(/\r/g, "").trim();

    if (!edition) {
      label.hidden = true;
      return;
    }

    label.textContent = `${edition} Edition`;
    label.hidden = false;
  } catch {
    label.hidden = true;
  }
}

// The intro is a CSS sprite animation (42 frames at 30fps), see ui/navbar.html.
// A sprite sheet is used instead of a video or animated image because Safari
// does not decode VP9 with an alpha channel, and WebKit does not restart
// animated images on reload.
const LOGO_INTRO_SPRITE = "/.assets/logo/logo-intro-sprite.png";
const LOGO_INTRO_DURATION = 1400;

// Fetch the navbar images in parallel with /ui/navbar.html instead of waiting
// for the markup to be injected, so the logo shows up as early as possible.
new Image().src = "/.assets/logo/logo.png";
new Image().src = LOGO_INTRO_SPRITE;

function playLogoIntro() {
  const link = document.querySelector(".nav-brand a");
  const intro = document.querySelector(".nav-logo-intro");
  if (!link || !intro) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let timer;

  const play = () => {
    clearTimeout(timer);
    // Restart the CSS animation even if the class is already there.
    link.classList.remove("intro-playing");
    void link.offsetWidth;
    link.classList.add("intro-playing");
    timer = setTimeout(
      () => link.classList.remove("intro-playing"),
      LOGO_INTRO_DURATION + 50
    );
  };

  // Replay the intro animation when the user hovers over the logo.
  link.addEventListener("mouseenter", play);

  // The static logo stays visible until the sprite is decoded, so the navbar
  // never goes blank while the image loads.
  const loader = new Image();
  loader.onload = () => {
    if (typeof loader.decode === "function") {
      loader.decode().then(play).catch(() => {});
    } else {
      play();
    }
  };
  loader.src = LOGO_INTRO_SPRITE;
}

// Safari/iOS does not reliably honour `margin-top: auto` on flex items inside a
// `min-height` flex container, so the footer can end up sitting right after the
// content (mostly below the fold) instead of sticking to the bottom of the
// viewport on short pages. This helper pushes it down with an explicit margin.
function stickFooterToBottom() {
  const ph = document.getElementById("footer-placeholder");
  if (!ph) return;

  ph.style.marginTop = "";
  // Let the browser recompute layout before measuring.
  void ph.offsetHeight;

  const viewportH = window.innerHeight || document.documentElement.clientHeight;
  const rect = ph.getBoundingClientRect();
  const gap = viewportH - (rect.top + ph.offsetHeight);

  if (gap > 0) {
    ph.style.marginTop = gap + "px";
  }
}

async function includeHTML() {
  const navbarEl = document.getElementById("navbar-placeholder");
  const footerEl = document.getElementById("footer-placeholder");

  const promises = [];

  if (navbarEl) {
    promises.push(
      fetch("/ui/navbar.html")
        .then((r) => r.text())
        .then((html) => {
          navbarEl.innerHTML = html;
          playLogoIntro();
          return loadEditionLabel();
        })
    );
  }

  if (footerEl) {
    promises.push(
      fetch("/ui/footer.html")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then((html) => {
          footerEl.innerHTML = html;
          // Force a layout recalculation: Safari/iOS does not always reflow
          // flex containers when their innerHTML changes dynamically, which
          // could leave the footer unrendered or stuck off-screen.
          void footerEl.offsetHeight;
          stickFooterToBottom();
        })
        .catch(() => {
          // Fallback so the footer still shows if the fetch fails.
          footerEl.innerHTML = `<footer class="footer">
  <div class="footer-content">
    <div class="footer-copyright">
      Created by Drayko and maintained by RackRunner. Project under Unlicense.
    </div>
    <div class="footer-links">
      <a href="/pages/about" class="footer-link">About</a>
      <a href="/pages/philosophy" class="footer-link">Philosophy</a>
      <a href="/pages/privacy" class="footer-link">Privacy Policy</a>
      <a href="/pages/legal" class="footer-link">Legal Notice</a>
      <a href="/pages/terms" class="footer-link">Terms of Service</a>
    </div>
  </div>
</footer>`;
          void footerEl.offsetHeight;
          stickFooterToBottom();
        })
    );
  }

  promises.push(
    fetch("/ui/up-page.html")
      .then((r) => r.text())
      .then((html) => {
        document.body.append(document.createRange().createContextualFragment(html));
      })
  );

  await Promise.all(promises);

  // Stick the footer to the bottom on short pages, including on resize/rotation.
  stickFooterToBottom();
  window.addEventListener("resize", stickFooterToBottom);
  window.addEventListener("orientationchange", stickFooterToBottom);

  document.dispatchEvent(new Event("components-loaded"));
}

includeHTML();
