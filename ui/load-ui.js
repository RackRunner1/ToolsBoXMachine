(function() {
  var navbarHtml = '<nav class="navbar">\n  <div class="nav-brand">\n    <a href="/">\n      <img\n        src="/.assets/logo/blanc-without-drayko-logo.png"\n        alt="TBXM Logo"\n        class="nav-logo"\n      />\n    </a>\n  </div>\n  <div class="nav-search">\n    <div class="search-input-wrapper">\n      <svg\n        xmlns="http://www.w3.org/2000/svg"\n        width="18"\n        height="18"\n        viewBox="0 0 24 24"\n        fill="none"\n        stroke="currentColor"\n        stroke-width="2"\n        stroke-linecap="round"\n        stroke-linejoin="round"\n      >\n        <circle cx="11" cy="11" r="8"></circle>\n        <path d="m21 21-4.3-4.3"></path>\n      </svg>\n      <input\n        type="text"\n        id="tool-search"\n        placeholder="Search tools..."\n        autocomplete="off"\n      />\n    </div>\n  </div>\n  <div class="nav-links">\n    <a\n      href="https://codeberg.org/ToolsBoXMachine/ToolsBoXMachine"\n      target="_blank"\n      class="nav-link"\n      >Codeberg</a\n    >\n  </div>\n</nav>\n\n<div id="search-dropdown" class="search-dropdown">\n  <div id="search-results" class="search-results-list"></div>\n</div>';

  var footerHtml = '<footer class="footer">\n  <div class="footer-content">\n    <div class="footer-copyright">\n      \u00a9 2026\n      <a href="https://drayko.xyz" target="_blank" class="drayko-link">Drayko</a\n      >. All rights reserved.\n    </div>\n    <div class="footer-links">\n      <a href="/pages/philosophy.html" class="footer-link">Philosophy</a>\n      <a href="/pages/privacy.html" class="footer-link">Privacy Policy</a>\n      <a href="/pages/terms.html" class="footer-link">Terms of Service</a>\n    </div>\n  </div>\n</footer>';

  var navbarPlaceholder = document.getElementById('navbar-placeholder');
  var footerPlaceholder = document.getElementById('footer-placeholder');

  if (navbarPlaceholder) {
    navbarPlaceholder.outerHTML = navbarHtml;
    var script = document.createElement('script');
    script.src = '/ui/navbar.js';
    document.body.appendChild(script);
  }

  if (footerPlaceholder) {
    footerPlaceholder.outerHTML = footerHtml;
  }
})();
