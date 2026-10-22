const { esc, booking, icon } = require('./helpers');

const NAV = [
  { id: 'home', label: 'Home', href: 'index.html' },
  { id: 'services', label: 'Services', href: 'services.html' },
  { id: 'about', label: 'About', href: 'about.html' },
  { id: 'gallery', label: 'Gallery', href: 'gallery.html' },
  { id: 'contact', label: 'Contact', href: 'contact.html' },
];

function AnnouncementBar(ctx) {
  const text = ctx.config.announcement;
  if (!text) return '';
  return `<div class="announcement" role="region" aria-label="Announcement"><p>${esc(text)}</p></div>`;
}

function Navbar(ctx) {
  const b = booking(ctx);
  const links = NAV.map(
    (n) => `<li><a href="${n.href}"${n.id === ctx.page ? ' aria-current="page"' : ''}>${n.label}</a></li>`
  ).join('');
  return `<header class="site-header" data-header>
  <div class="container nav">
    <a class="logo" href="index.html" aria-label="${esc(ctx.config.name)}, home">
      <span class="logo-word">Tush</span><span class="logo-sub">Beauty Spa</span>
    </a>
    <nav class="nav-links" aria-label="Main">
      <ul>${links}</ul>
    </nav>
    <a class="btn btn-primary nav-cta" href="${b.href}"${b.attrs} data-track="book_nav">Book an Appointment</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" data-menu-toggle>
      ${icon('menu')}
    </button>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden data-menu>
    <nav aria-label="Mobile">
      <ul>${links}</ul>
    </nav>
    <a class="btn btn-primary btn-block" href="${b.href}"${b.attrs} data-track="book_mobile_menu">Book an Appointment</a>
  </div>
</header>`;
}

module.exports = { Navbar, AnnouncementBar, NAV };
