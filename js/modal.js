/* ═══════════════════════════════════════════════
   modal.js – Lógica del modal "Reportar Incidente"
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  const backdrop  = document.getElementById('modalBackdrop');
  const openBtn   = document.getElementById('openModal');
  const closeBtn  = document.getElementById('closeModal');
  const submitBtn = document.getElementById('submitReport');

  /* ── Campos del formulario ────────────────── */
  const FIELDS = [
    { id: 'reportName',     label: 'Nombre',                type: 'text'  },
    { id: 'reportLastName', label: 'Apellido',              type: 'text'  },
    { id: 'reportCedula',   label: 'Cédula',                type: 'text'  },
    { id: 'reportEmail',    label: 'Correo electrónico',    type: 'email' },
    { id: 'reportType',     label: 'Tipo de delito',        type: 'select'},
    { id: 'reportAddress',  label: 'Dirección',             type: 'text'  },
    { id: 'reportDesc',     label: 'Descripción',           type: 'text'  },
  ];

  /* ── Abrir modal ──────────────────────────── */
  function openModal() {
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const first = backdrop.querySelector('input, select, textarea');
      if (first) first.focus();
    }, 350);
  }

  /* ── Cerrar modal ─────────────────────────── */
  function closeModal() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Validar todos los campos ─────────────── */
  function validateForm() {
    clearErrors();
    let valid = true;
    let firstInvalid = null;

    FIELDS.forEach(function (f) {
      const el = document.getElementById(f.id);
      if (!el) return;

      const val = el.value.trim();
      const isEmpty = val === '' || (f.type === 'select' && el.value === '');
      const isEmailInvalid = f.type === 'email' && val !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

      if (isEmpty) {
        setError(el, f.label + ' es obligatorio.');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      } else if (isEmailInvalid) {
        setError(el, 'Ingresa un correo electrónico válido.');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      }
    });

    if (firstInvalid) {
      shakeField(firstInvalid.id);
      firstInvalid.focus();
    }

    return valid;
  }

  /* ── Marcar campo con error ───────────────── */
  function setError(el, message) {
    el.style.borderColor = '#ef4444';
    el.style.boxShadow   = '0 0 0 2px rgba(239,68,68,0.2)';

    const existing = document.getElementById(el.id + '_error');
    if (existing) return;

    const err = document.createElement('span');
    err.id = el.id + '_error';
    err.textContent = message;
    err.style.cssText = 'color:#ef4444;font-size:12px;margin-top:4px;display:block;padding-left:40px;';
    el.closest('.modal-field').appendChild(err);
  }

  /* ── Limpiar todos los errores ────────────── */
  function clearErrors() {
    FIELDS.forEach(function (f) {
      const el = document.getElementById(f.id);
      if (!el) return;
      el.style.borderColor = '';
      el.style.boxShadow   = '';
      const err = document.getElementById(f.id + '_error');
      if (err) err.remove();
    });
  }

  /* ── Enviar reporte ───────────────────────── */
  function submitReport() {
    if (!validateForm()) return;

    // Simulación de envío (reemplaza con Firebase en firebase.js)
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    setTimeout(() => {
      closeModal();
      clearForm();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Reporte';
      showToast('✅ Reporte enviado correctamente', 'success');
    }, 1200);
  }

  /* ── Limpiar formulario ───────────────────── */
  function clearForm() {
    FIELDS.forEach(function (f) {
      const el = document.getElementById(f.id);
      if (!el) return;
      el.value = '';
    });
    clearErrors();
  }

  /* ── Shake animation on empty field ──────── */
  function shakeField(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = 'shake .4s ease';
    el.addEventListener('animationend', () => {
      el.style.animation = '';
    }, { once: true });
  }

  /* ── Event Listeners ──────────────────────── */
  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  submitBtn.addEventListener('click', submitReport);

  // Cerrar al hacer clic fuera del modal
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      closeModal();
    }
  });

  // Quitar borde rojo y mensaje al escribir/cambiar
  FIELDS.forEach(function (f) {
    const el = document.getElementById(f.id);
    if (!el) return;
    ['input', 'change'].forEach(function (evt) {
      el.addEventListener(evt, function () {
        el.style.borderColor = '';
        el.style.boxShadow   = '';
        const err = document.getElementById(f.id + '_error');
        if (err) err.remove();
      });
    });
  });

  // Inyectar keyframe shake globalmente
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)}
      60%{transform:translateX(-5px)}
      80%{transform:translateX(5px)}
    }
  `;
  document.head.appendChild(style);

})();