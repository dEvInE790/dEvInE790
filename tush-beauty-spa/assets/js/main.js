/* =========================================================
   Tush Beauty Spa Houston — interactions & motion
   GSAP + ScrollTrigger for animation, Lenis for smooth scrolling.
   Everything degrades gracefully: with reduced motion or if the
   animation libraries fail to load, all content and features still work.
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — edit these values
     --------------------------------------------------------- */
  const CONFIG = {
    // Enquiries are sent as a text message to this number (E.164 format).
    smsNumber: '+13463155575',
    smsDisplay: '346-315-5575',
    // Optional: a form service endpoint (e.g. https://formspree.io/f/xxxx) to receive
    // enquiries by email instead. Can also be set with data-endpoint on the <form>.
    formEndpoint: '',
  };

  /* Genuine customer reviews ONLY. The Reviews section stays hidden while this is empty.
     Example entry:
     { quote: 'My skin has never felt so good…', name: 'Client first name', detail: 'HydraFacial' } */
  const REVIEWS = [];

  /* --------------------------------------------------------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGSAP && !reduceMotion;
  const gsap = window.gsap;

  if (hasGSAP) gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;

  /* ---------- Year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (animate && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const stopScroll = () => { if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden'; };
  const startScroll = () => { if (lenis) lenis.start(); document.body.style.overflow = ''; };

  const navH = () => ($('#nav') ? $('#nav').offsetHeight : 70);
  const scrollToTarget = (target, immediate = false) => {
    const y = target.id === 'home' ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - (target.id === 'contact' ? 0 : navH() * 0.6));
    if (lenis) lenis.scrollTo(y, { immediate, force: true, duration: 1.4 });
    else window.scrollTo({ top: y, behavior: immediate || reduceMotion ? 'auto' : 'smooth' });
  };

  /* ---------- Split text into masked words ---------- */
  const splitWords = (el) => {
    const nodes = Array.from(el.childNodes);
    el.textContent = '';
    nodes.forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.className = 'w__i'; i.textContent = part;
          w.appendChild(i); el.appendChild(w);
        });
      } else {
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('span'); i.className = 'w__i';
        i.appendChild(node); w.appendChild(i); el.appendChild(w);
      }
    });
    return $$('.w__i', el);
  };

  /* =========================================================
     PRELOADER → HERO ENTRANCE
     ========================================================= */
  const preloader = $('#preloader');
  const heroTl = () => {
    if (!animate) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.arch', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' }, 0)
      .to('.arch img', { scale: 1, duration: 2.4, ease: 'power3.out' }, 0.1)
      .to('.hero__line', { yPercent: 0, duration: 1.4, stagger: 0.12 }, 0.25)
      .to('.hero__script > span', { clipPath: 'inset(-30% -10% -40% -10%)', duration: 1.9, ease: 'power2.inOut' }, 0.6)
      .to('.arch-outline', { autoAlpha: 1, x: 18, y: -18, duration: 1.6 }, 0.7)
      .to('[data-hero-fade]', { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.75)
      .to('.seal', { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.4 }, 1)
      .to('#nav', { yPercent: 0, autoAlpha: 1, duration: 1.2 }, 0.6)
      .to('.botanical--hero .botanical__stem', { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, 0.4)
      .to('.botanical--hero use', { scale: 1, autoAlpha: 1, duration: 1, stagger: 0.08, ease: 'back.out(1.6)' }, 0.9)
      .to('.hero__scroll', { autoAlpha: 1, duration: 1 }, 1.4);
  };

  const setHeroInitial = () => {
    if (!animate) return;
    gsap.set('.arch', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.arch img', { scale: 1.35 });
    gsap.set('.hero__line', { yPercent: 115 });
    gsap.set('.hero__script > span', { clipPath: 'inset(-30% 110% -40% -10%)' });
    gsap.set('.arch-outline', { autoAlpha: 0, x: 0, y: 0 });
    gsap.set('[data-hero-fade]', { autoAlpha: 0, y: 30 });
    gsap.set('.seal', { autoAlpha: 0, scale: 0.4, rotate: -90 });
    gsap.set('#nav', { yPercent: -100, autoAlpha: 0 });
    gsap.set('.hero__scroll', { autoAlpha: 0 });
    $$('.botanical--hero .botanical__stem').forEach((p) => {
      const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.set('.botanical--hero use', { scale: 0, autoAlpha: 0, transformOrigin: '0% 50%' });
  };

  const runPreloader = () => {
    if (!preloader) return Promise.resolve();
    if (!animate) { preloader.remove(); return Promise.resolve(); }

    let seen = false;
    try { seen = sessionStorage.getItem('tbs-intro') === '1'; sessionStorage.setItem('tbs-intro', '1'); } catch (e) { /* storage unavailable */ }

    stopScroll();
    preloader.style.animation = 'none';
    const fontsReady = Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => setTimeout(r, 1500)),
    ]);

    return fontsReady.then(() => new Promise((resolve) => {
      const lotus = $('.preloader__lotus', preloader);
      gsap.set(lotus, { strokeDasharray: 140, strokeDashoffset: 140 });
      gsap.set('.preloader__line > span', { yPercent: 110 });
      gsap.set('.preloader__script', { clipPath: 'inset(-30% 110% -30% -10%)' });
      gsap.set('.preloader__city', { autoAlpha: 0, y: 10 });

      const speed = seen ? 0.55 : 1;
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: () => { preloader.remove(); startScroll(); resolve(); },
      });
      tl.timeScale(1 / speed);
      tl.to(lotus, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
        .to('.preloader__line > span', { yPercent: 0, duration: 1.1 }, 0.2)
        .to('.preloader__script', { clipPath: 'inset(-30% -10% -30% -10%)', duration: 1.2, ease: 'power2.inOut' }, 0.5)
        .to('.preloader__city', { autoAlpha: 1, y: 0, duration: 0.8 }, 0.7)
        .to('.preloader__bar span', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0.2)
        .to('.preloader__inner', { autoAlpha: 0, y: -30, duration: 0.6, ease: 'power2.in' }, 1.7)
        .to('.preloader__panel--b', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 2.0)
        .to('.preloader__panel--a', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 2.12)
        .add(heroTl, 2.35);
    }));
  };

  /* =========================================================
     NAVIGATION
     ========================================================= */
  const nav = $('#nav');
  const mbar = $('#mbar');
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;
  let contactVisible = false;

  const onScroll = () => {
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 40);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (!menuOpen && y > window.innerHeight * 0.9 && goingDown) nav.classList.add('is-hidden');
      else if (goingUp || y < window.innerHeight * 0.9) nav.classList.remove('is-hidden');
    }
    if (mbar) mbar.classList.toggle('is-visible', y > window.innerHeight * 0.75 && !contactVisible);
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Active section highlighting
  const navLinks = $$('.nav__links a');
  const sections = ['home', 'about', 'services', 'gallery', 'contact'].map((id) => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'contact') {
          contactVisible = entry.isIntersecting;
          if (mbar && contactVisible) mbar.classList.remove('is-visible');
        }
        if (entry.isIntersecting) {
          navLinks.forEach((a) => {
            const active = a.getAttribute('href') === `#${entry.target.id}`;
            a.classList.toggle('is-active', active);
            if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Mobile menu ---------- */
  const menu = $('#mobileMenu');
  const toggle = $('#menuToggle');
  const pageRegions = [$('#main'), $('.footer'), mbar].filter(Boolean);

  const openMenu = () => {
    if (!menu || menuOpen) return;
    menuOpen = true;
    root.classList.add('menu-open');
    menu.classList.add('is-open');
    menu.removeAttribute('inert'); menu.setAttribute('aria-hidden', 'false');
    pageRegions.forEach((r) => r.setAttribute('inert', ''));
    toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-label', 'Close menu');
    nav.classList.remove('is-hidden');
    stopScroll();
    if (animate) {
      gsap.timeline()
        .fromTo('.menu__bg', { clipPath: 'circle(0% at calc(100% - 48px) 42px)' }, { clipPath: 'circle(150% at calc(100% - 48px) 42px)', duration: 0.9, ease: 'expo.inOut' })
        .fromTo('.menu__list a', { yPercent: 105 }, { yPercent: 0, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0.35)
        .fromTo('.menu__foot > *', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out' }, 0.55);
    } else {
      $('.menu__bg').style.clipPath = 'circle(150% at 50% 50%)';
    }
    setTimeout(() => { const first = $('.menu__list a'); if (first) first.focus(); }, animate ? 400 : 0);
  };

  const closeMenu = (returnFocus = true) => new Promise((resolve) => {
    if (!menu || !menuOpen) { resolve(); return; }
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu');
    pageRegions.forEach((r) => r.removeAttribute('inert'));
    const finish = () => {
      menu.classList.remove('is-open');
      menu.setAttribute('inert', ''); menu.setAttribute('aria-hidden', 'true');
      root.classList.remove('menu-open');
      startScroll();
      if (returnFocus) toggle.focus();
      resolve();
    };
    if (animate) {
      gsap.timeline({ onComplete: finish })
        .to('.menu__list a, .menu__foot > *', { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
        .to('.menu__bg', { clipPath: 'circle(0% at calc(100% - 48px) 42px)', duration: 0.7, ease: 'expo.inOut' }, 0.1)
        .set('.menu__list a, .menu__foot > *', { autoAlpha: 1 });
    } else finish();
  });

  if (toggle) toggle.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });

  /* ---------- In-page navigation with curtain transition ---------- */
  const curtain = $('#curtain');
  let transitioning = false;

  const focusSection = (target) => {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  const goTo = (target, opts = {}) => {
    if (!target || transitioning) return Promise.resolve();
    const distance = Math.abs(target.getBoundingClientRect().top);
    const far = distance > window.innerHeight * 1.6;
    if (history.replaceState) history.replaceState(null, '', `#${target.id}`);

    if (!animate || !far || !curtain) {
      scrollToTarget(target);
      if (!opts.keepFocus) setTimeout(() => focusSection(target), animate ? 900 : 50);
      return new Promise((r) => setTimeout(r, animate ? 1000 : 50));
    }

    transitioning = true;
    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => { transitioning = false; gsap.set(curtain, { yPercent: 101 }); resolve(); } })
        .set(curtain, { yPercent: 101 })
        .to(curtain, { yPercent: 0, duration: 0.65, ease: 'expo.inOut' })
        .to('.curtain__lotus', { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' }, 0.35)
        .add(() => { scrollToTarget(target, true); ST.update(); if (!opts.keepFocus) focusSection(target); })
        .to('.curtain__lotus', { autoAlpha: 0, duration: 0.25 }, '+=0.15')
        .to(curtain, { yPercent: -101, duration: 0.8, ease: 'expo.inOut' }, '<');
    });
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    if (a.hasAttribute('data-book')) return; // handled by booking logic
    if (menuOpen) closeMenu(false).then(() => goTo(target));
    else goTo(target);
  });

  /* =========================================================
     SCROLL ANIMATIONS
     ========================================================= */
  const initScrollAnimations = () => {
    if (!animate) return;

    // Split headings
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el);
      gsap.set(words, { yPercent: 110 });
      ST.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.3, stagger: 0.07, ease: 'expo.out' }),
      });
    });

    // Script "handwritten" reveal
    $$('[data-script-reveal]').forEach((el) => {
      gsap.set(el, { clipPath: 'inset(-30% 110% -40% -10%)' });
      ST.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(el, { clipPath: 'inset(-30% -10% -40% -10%)', duration: 1.8, delay: 0.3, ease: 'power2.inOut' }),
      });
    });

    // Generic fade-up reveals (batched for natural stagger)
    gsap.set('[data-reveal]', { autoAlpha: 0, y: 40 });
    ST.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', overwrite: true }),
    });

    // Image clip + scale reveals
    $$('[data-img-reveal]').forEach((el) => {
      const pic = $('picture', el) || el.firstElementChild;
      gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(pic, { scale: 1.3, transformOrigin: '50% 60%' });
      ST.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => {
          gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
          gsap.to(pic, { scale: 1, duration: 2.2, ease: 'expo.out' });
        },
      });
    });

    // Parallax
    $$('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 10;
      gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-parallax-img]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.closest('section') || img, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Hero scroll-out
    gsap.to('.hero__copy', { yPercent: -12, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__visual', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Service cards
    const cards = $$('.service-card');
    gsap.set(cards, { autoAlpha: 0, yPercent: 14 });
    cards.forEach((card) => {
      const shapes = $$('.service-card__art path, .service-card__art circle', card);
      shapes.forEach((s) => {
        const len = typeof s.getTotalLength === 'function' ? s.getTotalLength() : 300;
        gsap.set(s, { strokeDasharray: len, strokeDashoffset: len });
      });
      ST.create({
        trigger: card, start: 'top 92%', once: true,
        onEnter: () => {
          gsap.to(card, { autoAlpha: 1, yPercent: 0, duration: 1.3, ease: 'expo.out' });
          gsap.to(shapes, { strokeDashoffset: 0, duration: 2.2, stagger: 0.08, delay: 0.3, ease: 'power2.inOut' });
        },
      });
    });

    // Gallery stagger + inner parallax
    $$('.g-item').forEach((item, i) => {
      gsap.from(item, { autoAlpha: 0, y: 60, duration: 1.3, delay: (i % 3) * 0.08, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 92%', once: true } });
    });

    // Botanical draw (contact)
    $$('.botanical--contact').forEach((svg) => {
      const stem = $('.botanical__stem', svg);
      const len = stem.getTotalLength();
      gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set($$('use', svg), { scale: 0, autoAlpha: 0, transformOrigin: '0% 50%' });
      ST.create({
        trigger: svg.parentElement, start: 'top 70%', once: true,
        onEnter: () => {
          gsap.to(stem, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' });
          gsap.to($$('use', svg), { scale: 1, autoAlpha: 1, duration: 1, stagger: 0.09, delay: 0.5, ease: 'back.out(1.6)' });
        },
      });
    });

    // Ornament line draw
    $$('.ornament__line').forEach((l) => gsap.from(l, { scaleX: 0, transformOrigin: 'left', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 90%', once: true } }));

    // Footer giant word
    gsap.fromTo('.footer__giant', { yPercent: 50 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Marquee: GSAP-driven so it can react to scroll velocity
    const track = $('.marquee__track');
    if (track) {
      track.style.animation = 'none';
      const loop = gsap.to(track, { xPercent: -50, duration: 48, ease: 'none', repeat: -1 });
      let boost = gsap.quickTo(loop, 'timeScale', { duration: 0.6, ease: 'power2.out' });
      ST.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const v = Math.min(Math.abs(self.getVelocity()) / 300, 6);
          boost(1 + v);
          clearTimeout(track._t);
          track._t = setTimeout(() => boost(1), 120);
        },
        onToggle: (self) => (self.isActive ? loop.resume() : loop.pause()),
      });
    }

    window.addEventListener('load', () => ST.refresh());
    if (document.fonts) document.fonts.ready.then(() => ST.refresh());
  };

  /* =========================================================
     CURSOR + MAGNETIC BUTTONS
     ========================================================= */
  const initCursor = () => {
    if (!animate || !finePointer) return;
    const cursor = $('.cursor');
    if (!cursor) return;
    root.classList.add('has-cursor');
    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    const label = $('.cursor__label', cursor);
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    gsap.set([dot, ring], { x: -100, y: -100 });

    window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cursor.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, select, input, [role="button"]');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-hover', !labelled && !!interactive);
      label.textContent = labelled ? labelled.dataset.cursor : '';
    });

    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.22);
        my((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  };

  /* =========================================================
     HERO GOLD DUST (canvas)
     ========================================================= */
  const initDust = () => {
    const canvas = $('#goldDust');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0; let h = 0; let parts = []; let running = false; let raf = 0;

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const sctx = sprite.getContext('2d');
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(250, 230, 180, 1)');
    grad.addColorStop(0.25, 'rgba(226, 190, 120, .7)');
    grad.addColorStop(1, 'rgba(201, 164, 92, 0)');
    sctx.fillStyle = grad; sctx.fillRect(0, 0, 32, 32);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, (w * h) / 22000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 2 + Math.random() * 7, vy: 0.08 + Math.random() * 0.3,
        ph: Math.random() * Math.PI * 2, sp: 0.004 + Math.random() * 0.01, a: 0.2 + Math.random() * 0.6,
      }));
    };
    const draw = (still) => {
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        if (!still) {
          p.y -= p.vy; p.ph += p.sp; p.x += Math.sin(p.ph) * 0.25;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        }
        ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(p.ph * 2));
        ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      });
    };
    const loop = () => { draw(false); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduceMotion) { running = true; loop(); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    if (reduceMotion) { draw(true); return; }
    window.addEventListener('resize', () => { resize(); if (!running) draw(true); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
    } else start();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  };

  /* =========================================================
     SERVICES: LEARN MORE DIALOG + BOOK NOW
     ========================================================= */
  const treatmentSelect = $('#f-treatment');

  const book = (service) => {
    if (treatmentSelect && service) {
      const opt = Array.from(treatmentSelect.options).find((o) => o.value === service || o.text === service);
      if (opt) { treatmentSelect.value = opt.value; treatmentSelect.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    const contact = $('#contact');
    goTo(contact, { keepFocus: true }).then(() => {
      const nameInput = $('#f-name');
      if (nameInput && !$('#enquiryForm').hidden) nameInput.focus({ preventScroll: true });
    });
  };

  $$('[data-book]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('[data-service]');
      book(card ? card.dataset.service : '');
    });
  });

  const modal = $('#serviceModal');
  let modalService = '';
  const openModal = (card) => {
    if (!modal || typeof modal.showModal !== 'function') return;
    modalService = card.dataset.service;
    $('#modalTitle').textContent = $('.service-card__title', card).textContent;
    $('#modalNum').textContent = $('.service-card__num', card).textContent;
    $('#modalText').innerHTML = $('.service-card__more', card).innerHTML;
    const art = $('#modalArt');
    art.innerHTML = '';
    const media = $('.service-card__media', card).cloneNode(true);
    media.style.cssText = card.getAttribute('style') || '';
    $$('path, circle', media).forEach((s) => { s.style.strokeDasharray = ''; s.style.strokeDashoffset = ''; });
    art.appendChild(media);
    modal.showModal();
    stopScroll();
    if (animate) {
      gsap.fromTo(modal, { autoAlpha: 0, y: 40, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out' });
      gsap.fromTo($$('.modal__body > *', modal), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.05, delay: 0.15, ease: 'expo.out' });
    }
  };
  const closeModal = () => {
    if (!modal || !modal.open) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => { modal.close(); resolve(); };
      if (animate) gsap.to(modal, { autoAlpha: 0, y: 20, duration: 0.35, ease: 'power2.in', onComplete: done });
      else done();
    });
  };
  if (modal) {
    modal.addEventListener('close', () => { startScroll(); if (animate) gsap.set(modal, { clearProps: 'opacity,visibility,transform' }); });
    modal.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
    $('#modalBook').addEventListener('click', (e) => { e.preventDefault(); closeModal().then(() => book(modalService)); });
  }
  $$('[data-learn-more]').forEach((btn) => btn.addEventListener('click', () => openModal(btn.closest('.service-card'))));

  /* =========================================================
     GALLERY LIGHTBOX
     ========================================================= */
  const lightbox = $('#lightbox');
  const lbItems = $$('[data-lightbox]').map((btn) => {
    const img = $('img', btn);
    const cap = $('.g-item__cap', btn);
    return { src: img.currentSrc || img.src, fallback: img.src, alt: img.alt, caption: cap ? cap.textContent.replace(/^\s*\d+\s*/, '').trim() : '' };
  });
  let lbIndex = 0;
  const lbShow = (i, dir = 0) => {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    const img = $('#lbImg'); const cap = $('#lbCap');
    const apply = () => { img.src = item.src || item.fallback; img.alt = item.alt; cap.textContent = item.caption; };
    if (animate && dir) {
      gsap.to(img, { autoAlpha: 0, x: -30 * dir, duration: 0.25, ease: 'power2.in', onComplete: () => { apply(); gsap.fromTo(img, { autoAlpha: 0, x: 30 * dir }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out' }); } });
    } else apply();
  };
  if (lightbox && typeof lightbox.showModal === 'function') {
    $$('[data-lightbox]').forEach((btn) => btn.addEventListener('click', () => {
      // refresh currentSrc now that images have loaded
      const img = $('img', btn); const idx = +btn.dataset.lightbox;
      lbItems[idx].src = img.currentSrc || img.src;
      lbShow(idx);
      lightbox.showModal(); stopScroll();
      if (animate) gsap.fromTo('.lightbox__figure', { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out' });
    }));
    lightbox.addEventListener('close', startScroll);
    lightbox.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === lightbox) lightbox.close();
      else if (e.target.closest('[data-prev]')) lbShow(lbIndex - 1, -1);
      else if (e.target.closest('[data-next]')) lbShow(lbIndex + 1, 1);
    });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') lbShow(lbIndex - 1, -1);
      if (e.key === 'ArrowRight') lbShow(lbIndex + 1, 1);
    });
  }

  /* =========================================================
     ENQUIRY FORM
     ========================================================= */
  const form = $('#enquiryForm');
  const success = $('#formSuccess');
  const pad = (n) => String(n).padStart(2, '0');
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const validators = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
    phone: (v) => {
      const digits = v.replace(/\D/g, '');
      if (!v.trim()) return 'Please enter your phone number.';
      if (!/^[\d\s()+.-]+$/.test(v.trim()) || digits.length < 10 || digits.length > 15) return 'Please enter a valid phone number (at least 10 digits).';
      return '';
    },
    treatment: (v) => (v ? '' : 'Please choose a treatment.'),
    date: (v) => {
      if (!v) return 'Please choose your preferred date.';
      if (v < todayStr) return 'Please choose a date from today onwards.';
      return '';
    },
  };

  const showError = (field, msg) => {
    const wrap = field.closest('.field');
    const err = $(`#${field.getAttribute('aria-describedby')}`);
    wrap.classList.toggle('is-invalid', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg;
  };

  const formatDate = (v) => {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (form) {
    const dateInput = $('#f-date', form);
    dateInput.min = todayStr;
    let attempted = false;

    $$('input, select', form).forEach((field) => {
      const check = () => { if (attempted || field.getAttribute('aria-invalid') === 'true') showError(field, validators[field.name](field.value)); };
      field.addEventListener('input', check);
      field.addEventListener('change', check);
      field.addEventListener('blur', () => { if (field.value) showError(field, validators[field.name](field.value)); });
    });

    const endpoint = form.dataset.endpoint || CONFIG.formEndpoint;
    if (endpoint) {
      $('#formNote span').innerHTML = 'Your enquiry is sent securely to Tush Beauty Spa Houston. We\'ll contact you to confirm your appointment.';
    }

    const showSuccess = (msg, viaSms) => {
      const smsHref = `sms:${CONFIG.smsNumber}?&body=${encodeURIComponent(msg)}`;
      $('#smsLink').href = smsHref;
      $('#successMsg').textContent = msg;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      if (viaSms) {
        $('#successText').textContent = coarse
          ? `Your messaging app should open with your enquiry addressed to ${CONFIG.smsDisplay} — just press send. If it didn't open, tap “Open in Messages”.`
          : `On a computer? Text the message below to ${CONFIG.smsDisplay} from your phone, copy it, or simply give us a call.`;
        $('#smsLink').hidden = false;
      } else {
        $('#successText').textContent = 'Thank you — your enquiry has been sent. We\'ll be in touch to confirm your appointment.';
        $('#smsLink').hidden = true;
      }
      form.hidden = true;
      success.hidden = false;
      success.focus();
      if (animate) gsap.from(success.children, { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.06, ease: 'expo.out' });
      if (viaSms && coarse) window.location.href = smsHref;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      attempted = true;
      const fields = $$('input, select', form);
      let firstInvalid = null;
      fields.forEach((f) => {
        const msg = validators[f.name](f.value);
        showError(f, msg);
        if (msg && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        if (animate) gsap.fromTo(firstInvalid.closest('.field'), { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const msg = [
        'Hi Tush Beauty Spa! I\'d like to book an appointment.',
        `Name: ${data.name.trim()}`,
        `Phone: ${data.phone.trim()}`,
        `Treatment: ${data.treatment}`,
        `Preferred date: ${formatDate(data.date)}`,
      ].join('\n');

      if (endpoint) {
        const btn = $('button[type="submit"]', form);
        btn.disabled = true;
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
          if (!res.ok) throw new Error(String(res.status));
          showSuccess(msg, false);
        } catch (err) {
          showSuccess(msg, true); // fall back to text message
        } finally { btn.disabled = false; }
      } else {
        showSuccess(msg, true);
      }
    });

    $('#copyMsg').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const text = $('#successMsg').textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied ✓';
      } catch (err) {
        const range = document.createRange(); range.selectNodeContents($('#successMsg'));
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        btn.textContent = 'Selected — press Ctrl/⌘+C';
      }
      setTimeout(() => { btn.textContent = 'Copy Message'; }, 2600);
    });

    $('#formReset').addEventListener('click', () => {
      form.reset(); attempted = false;
      $$('input, select', form).forEach((f) => showError(f, ''));
      success.hidden = true; form.hidden = false;
      $('#f-name').focus();
    });
  }

  /* =========================================================
     REVIEWS (genuine reviews only)
     ========================================================= */
  if (REVIEWS.length) {
    const grid = $('#reviewsGrid');
    REVIEWS.forEach((r) => {
      const fig = document.createElement('figure'); fig.className = 'review-card'; fig.setAttribute('data-reveal', '');
      const q = document.createElement('blockquote'); q.textContent = r.quote;
      const c = document.createElement('figcaption'); c.textContent = r.name;
      if (r.detail) { const s = document.createElement('span'); s.textContent = r.detail; c.appendChild(s); }
      fig.append(q, c); grid.appendChild(fig);
    });
    $('#reviews').hidden = false;
  }

  /* =========================================================
     BOOT
     ========================================================= */
  setHeroInitial();
  initScrollAnimations();
  initCursor();
  initDust();
  runPreloader().then(() => {
    if (location.hash && location.hash.length > 1) {
      const t = document.getElementById(location.hash.slice(1));
      if (t && t.id !== 'home') scrollToTarget(t, true);
    }
    if (hasGSAP) ST.refresh();
  });
})();
