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

  const event = new Event("components-loaded");
  document.dispatchEvent(event);
}

includeHTML();
