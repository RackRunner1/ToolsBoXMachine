(async function() {
  const navbarPlaceholder = document.getElementById('navbar-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (navbarPlaceholder) {
    const res = await fetch('/ui/navbar.html');
    const html = await res.text();
    navbarPlaceholder.outerHTML = html;

    const script = document.createElement('script');
    script.src = '/ui/navbar.js';
    document.body.appendChild(script);
  }

  if (footerPlaceholder) {
    const res = await fetch('/ui/footer.html');
    const html = await res.text();
    footerPlaceholder.outerHTML = html;
  }
})();
