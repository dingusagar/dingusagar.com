/* ============================================================
   ANIMATIONS.JS — scroll reveals, nav effects, cursor glow,
   parallax orbs, card tilt, smooth scroll.
   ============================================================ */

/* ── Scroll-triggered reveal ──────────────────────────────── */
function makeScrollObserver() {
  return new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.style.getPropertyValue('--delay') || '0s';
        entry.target.style.transitionDelay = delay;
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
}

function observeAll(observer) {
  document.querySelectorAll('.animate-on-scroll:not(.in-view)')
    .forEach(el => observer.observe(el));
}

function initScrollAnimations() {
  const observer = makeScrollObserver();

  // Observe elements already in DOM
  observeAll(observer);

  // Re-observe whenever the profile data renders new elements
  document.addEventListener('profileLoaded', () => {
    // Small timeout lets the browser paint the new nodes first
    setTimeout(() => observeAll(observer), 60);
  });
}

/* ── Nav ──────────────────────────────────────────────────── */
function initNav() {
  const nav     = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');

  // Scrolled state
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 56);
  }, { passive: true });

  // Hamburger toggle
  menuBtn?.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('mobile-nav--open');
    menuBtn.classList.toggle('active', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  // Close on link click
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('mobile-nav--open');
      menuBtn.classList.remove('active');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Highlight active section in nav
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-links a');

  const secObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => secObserver.observe(s));
}

/* ── Smooth scroll ────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── Cursor ambient glow (desktop only) ───────────────────── */
function initCursorGlow() {
  if (window.matchMedia('(hover: none)').matches) return;

  let targetX = window.innerWidth  / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  document.addEventListener('mousemove', e => {
    targetX = e.clientX;
    targetY = e.clientY;
  }, { passive: true });

  (function tick() {
    currentX += (targetX - currentX) * 0.07;
    currentY += (targetY - currentY) * 0.07;
    document.documentElement.style.setProperty('--cursor-x', `${currentX}px`);
    document.documentElement.style.setProperty('--cursor-y', `${currentY}px`);
    requestAnimationFrame(tick);
  })();
}

/* ── Parallax orbs on mouse move ──────────────────────────── */
function initOrbParallax() {
  if (window.matchMedia('(hover: none)').matches) return;

  const orbs = document.querySelectorAll('.orb');
  const cx   = () => window.innerWidth  / 2;
  const cy   = () => window.innerHeight / 2;

  document.addEventListener('mousemove', e => {
    const dx = (e.clientX - cx()) / cx();
    const dy = (e.clientY - cy()) / cy();
    orbs.forEach((orb, i) => {
      const f = (i + 1) * 9;
      orb.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
    });
  }, { passive: true });
}

/* ── 3-D card tilt ────────────────────────────────────────── */
function initCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  const SELECTOR = '.project-card, .pub-card';

  document.addEventListener('mousemove', e => {
    const card = e.target.closest(SELECTOR);
    if (!card) return;

    const r    = card.getBoundingClientRect();
    const dx   = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
    const dy   = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);

    card.style.transition = 'transform 0.1s ease';
    card.style.transform  =
      `perspective(900px) rotateX(${-dy * 5}deg) rotateY(${dx * 5}deg) translateY(-6px)`;
  }, { passive: true });

  document.querySelectorAll(SELECTOR).forEach(card => {
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.transform  = '';
    });
  });
}

/* ── Re-attach card tilt after dynamic render ─────────────── */
document.addEventListener('profileLoaded', () => {
  // Re-run tilt attachment for newly rendered cards
  setTimeout(initCardTilt, 100);
});

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSmoothScroll();
  initCursorGlow();
  initOrbParallax();
  initScrollAnimations();
  // Card tilt needs rendered project cards — wait for profile load
  // (handled via profileLoaded event above + initial call after delay)
  setTimeout(initCardTilt, 600);
});
