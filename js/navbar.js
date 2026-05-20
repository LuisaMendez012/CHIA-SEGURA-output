(function () {
  'use strict';

  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.navbar__link');
  const sections = document.querySelectorAll('section[id]');

  function getNavbarHeight() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '64px';
    return parseInt(v, 10) || 64;
  }

  function updateScrolled() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }

  function updateActiveLink() {
    try {
      if (sections.length) {
        let current = '';
        const offset = getNavbarHeight() + 16;
        sections.forEach(section => {
          const top = section.offsetTop - offset;
          if (window.scrollY >= top) current = section.getAttribute('id');
        });

        navLinks.forEach(link => {
          link.classList.remove('active');
          const href = link.getAttribute('href') || '';
          if (href.startsWith('#') && href === `#${current}`) link.classList.add('active');
        });
      } else {
        // fallback: match by filename
        const path = location.pathname.split('/').pop() || 'index.html';
        navLinks.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.split('#')[0] === path) a.classList.add('active');
          else a.classList.remove('active');
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Toggle menú móvil
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = !navMenu.classList.contains('open');
      navToggle.classList.toggle('open');
      navMenu.classList.toggle('open');
      // accessibility
      try { navToggle.setAttribute('aria-expanded', String(isOpen)); } catch (e) {}
    });
  }

  // Cerrar menú al hacer click en un link (móvil)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navToggle) navToggle.classList.remove('open');
      if (navMenu) {
        navMenu.classList.remove('open');
        try { navToggle.setAttribute('aria-expanded', 'false'); } catch (e) {}
      }
    });
  });

  // Inicialización
  updateScrolled();
  updateActiveLink();

  window.addEventListener('scroll', () => {
    updateScrolled();
    updateActiveLink();
  }, { passive: true });

  window.addEventListener('resize', updateActiveLink);
  window.addEventListener('popstate', updateActiveLink);

})();
