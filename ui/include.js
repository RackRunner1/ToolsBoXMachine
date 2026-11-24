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

function playLogoIntro() {
  const logo = document.querySelector(".nav-logo:not(.nav-logo-intro)");
  const intro = document.querySelector(".nav-logo-intro");
  if (!logo || !intro) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!intro.canPlayType("video/webm")) return;

  let done = false;
  const showLogo = () => {
    if (done) return;
    done = true;
    clearTimeout(fallback);
    intro.removeEventListener("playing", start);
    intro.hidden = true;
    logo.hidden = false;
  };

  const start = () => {
    if (done) return;
    logo.hidden = true;
    intro.hidden = false;
  };

  const fallback = setTimeout(showLogo, 3000);
  intro.addEventListener("playing", start, { once: true });
  intro.addEventListener("ended", showLogo, { once: true });
  intro.addEventListener("error", showLogo, { once: true });
  intro.play().catch(showLogo);
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
        .then((r) => r.text())
        .then((html) => {
          footerEl.innerHTML = html;
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

  document.dispatchEvent(new Event("components-loaded"));
}

includeHTML();
