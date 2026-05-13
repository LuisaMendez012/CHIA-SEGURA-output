/* ═══════════════════════════════════════════════
   js/email.js – Conecta los formularios con EmailJS
                 y Firebase en el flujo real de envío
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     INTEGRACIÓN MODAL → Firebase + EmailJS
     Sobrescribe el submit del modal para añadir
     integración real cuando los SDKs estén listos
  ────────────────────────────────────────────── */

  const submitBtn = document.getElementById('submitReport');

  if (submitBtn) {
    // Guardamos el listener original de modal.js y lo reemplazamos
    // con uno que también llama a Firebase + EmailJS
    const originalHandler = submitBtn.onclick;

    submitBtn.addEventListener('click', async () => {
      const name = document.getElementById('reportName').value.trim();
      const type = document.getElementById('reportType').value;
      const desc = document.getElementById('reportDesc').value.trim();

      if (!name || !type || !desc) return; // modal.js ya valida y muestra errores

      const reportData = { name, type, description: desc };

      // Guardar en Firebase (si está disponible)
      if (window.ChiaSeguraDB) {
        const dbResult = await window.ChiaSeguraDB.saveReport(reportData);
        if (!dbResult.success) {
          console.warn('[email.js] Guardado en DB falló:', dbResult.reason);
        }
      }

      // Enviar notificación por email (si EmailJS está disponible)
      if (window.ChiaSeguraEmail) {
        const emailResult = await window.ChiaSeguraEmail.sendReportEmail(reportData);
        if (!emailResult.success) {
          console.warn('[email.js] Email de reporte falló:', emailResult.reason);
        }
      }
    }, true); // useCapture para ejecutarse antes del cierre del modal
  }

  /* ──────────────────────────────────────────────
     INTEGRACIÓN CONTACTO → EmailJS
  ────────────────────────────────────────────── */

  const sendContact = document.getElementById('sendContact');

  if (sendContact) {
    sendContact.addEventListener('click', async () => {
      const emailEl = document.querySelector('#contacto .form-input[type="email"]');
      const msgEl   = document.querySelector('#contacto .form-textarea');

      const email   = emailEl ? emailEl.value.trim() : '';
      const message = msgEl   ? msgEl.value.trim()   : '';

      if (!email || !message) return; // app.js ya valida

      // Enviar con EmailJS (si está disponible)
      if (window.ChiaSeguraEmail) {
        const result = await window.ChiaSeguraEmail.sendContactEmail({ email, message });
        if (!result.success) {
          console.warn('[email.js] Email de contacto falló:', result.reason);
        }
      }
    }, true);
  }

})();
