/* ═══════════════════════════════════════════════
   app.js – Funcionalidades generales de la app:
            navbar scroll, menú móvil, toast,
            active links, animaciones de entrada
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     NAVBAR – Scroll & mobile toggle
  ────────────────────────────────────────────── */
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');
  const navLinks  = document.querySelectorAll('.navbar__link');

  // Añadir clase scrolled al bajar
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    updateActiveLink();
  }, { passive: true });

  // Toggle menú móvil
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navMenu.classList.toggle('open');
  });

  // Cerrar menú al hacer click en un link (móvil)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('open');
      navMenu.classList.remove('open');
    });
  });

  /* ──────────────────────────────────────────────
     ACTIVE LINK on scroll
  ────────────────────────────────────────────── */
  const sections = document.querySelectorAll('section[id]');

  function updateActiveLink() {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 80;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  /* ──────────────────────────────────────────────
     TOAST NOTIFICATION (global)
  ────────────────────────────────────────────── */
  window.showToast = function (message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast--${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  };

  /* ──────────────────────────────────────────────
     CONTACT FORM
  ────────────────────────────────────────────── */
  const sendContact = document.getElementById('sendContact');
  if (sendContact) {
    sendContact.addEventListener('click', () => {
      const emailEl = document.querySelector('#contacto .form-input[type="email"]');
      const msgEl   = document.querySelector('#contacto .form-textarea');

      const email   = emailEl ? emailEl.value.trim() : '';
      const message = msgEl   ? msgEl.value.trim()   : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('⚠️ Ingresa un correo válido', 'error');
        return;
      }
      if (!message) {
        showToast('⚠️ Escribe un mensaje', 'error');
        return;
      }

      // Simulación de envío (reemplaza con EmailJS en email.js)
      sendContact.disabled = true;
      sendContact.textContent = 'Enviando…';

      setTimeout(() => {
        sendContact.disabled = false;
        sendContact.textContent = 'Enviar Mensaje';
        if (emailEl) emailEl.value = '';
        if (msgEl)   msgEl.value   = '';
        showToast('✅ Mensaje enviado correctamente', 'success');
      }, 1200);
    });
  }

  /* ──────────────────────────────────────────────
     INTERSECTION OBSERVER – Fade in on scroll
  ────────────────────────────────────────────── */
  const animatables = document.querySelectorAll(
    '.stat-card, .feature-card, .solution-layout__text, .phone-mockup'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  animatables.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity .55s ease ${i * 0.08}s, transform .55s ease ${i * 0.08}s`;
    observer.observe(el);
  });

  /* ──────────────────────────────────────────────
     HERO STATS – contadores animados
  ────────────────────────────────────────────── */
  const statNumbers = document.querySelectorAll('.hero-stat__number');
  if (statNumbers && statNumbers.length) {
    const statsObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statNumbers.forEach(el => {
            const target = parseInt(el.getAttribute('data-target') || '0', 10);
            const start = +el.textContent.replace(/[^0-9]/g, '') || 0;
            const duration = 900;
            const stepTime = Math.max(Math.floor(duration / Math.max(target,1)), 12);
            let current = start;
            const inc = target > 0 ? Math.ceil(target / (duration / stepTime)) : 1;
            const timer = setInterval(() => {
              current += inc;
              if (current >= target) {
                el.textContent = (target >= 100 ? `+${target}` : `${target}`);
                clearInterval(timer);
              } else {
                el.textContent = (target >= 100 ? `+${current}` : `${current}`);
              }
            }, stepTime);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.2 });

    const heroStats = document.querySelector('.hero__stats');
    if (heroStats) statsObserver.observe(heroStats);
  }

})();
