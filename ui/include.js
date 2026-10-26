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

  await Promise.all(promises);

  document.dispatchEvent(new Event("components-loaded"));
}

includeHTML();
