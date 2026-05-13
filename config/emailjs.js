/* ═══════════════════════════════════════════════
   config/emailjs.js – Configuración EmailJS
   ═══════════════════════════════════════════════

   INSTRUCCIONES:
   1. Crea cuenta en https://www.emailjs.com (gratis hasta 200 emails/mes)
   2. Crea un "Email Service" (Gmail, Outlook, etc.)
   3. Crea un "Email Template" con las variables:
      - {{from_name}}
      - {{reply_to}}
      - {{message}}
      - {{crime_type}}
   4. Copia tus credenciales abajo
   5. Añade el SDK en index.html antes de este archivo:
      <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>

   ═══════════════════════════════════════════════ */

// ─── TUS CREDENCIALES EMAILJS ─────────────────
const EMAILJS_CONFIG = {
  publicKey:  'TU_PUBLIC_KEY',         // Account → API Keys
  serviceId:  'TU_SERVICE_ID',         // Email Services → Service ID
  templateId: 'TU_TEMPLATE_ID'         // Email Templates → Template ID
};

// ─── INICIALIZAR ──────────────────────────────
let emailjsReady = false;

try {
  if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
    emailjsReady = true;
    console.log('[EmailJS] ✅ Inicializado correctamente');
  } else {
    console.warn('[EmailJS] ⚠️ SDK no cargado. Verifica el script en index.html');
  }
} catch (err) {
  console.error('[EmailJS] ❌ Error al inicializar:', err.message);
}

/* ──────────────────────────────────────────────
   ENVIAR EMAIL DE NUEVO REPORTE (notificación admin)
────────────────────────────────────────────── */
async function sendReportEmail({ name, type, description }) {
  if (!emailjsReady) {
    console.warn('[EmailJS] No disponible. Email no enviado.');
    return { success: false };
  }

  const params = {
    from_name:  name        || 'Ciudadano anónimo',
    crime_type: type        || 'No especificado',
    message:    description || 'Sin descripción',
    reply_to:   'noreply@chiasegura.com'
  };

  try {
    const res = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      params
    );
    console.log('[EmailJS] Email enviado. Status:', res.status);
    return { success: true };
  } catch (error) {
    console.error('[EmailJS] Error al enviar:', error.text || error.message);
    return { success: false, reason: error.text };
  }
}

/* ──────────────────────────────────────────────
   ENVIAR EMAIL DE CONTACTO
────────────────────────────────────────────── */
async function sendContactEmail({ email, message }) {
  if (!emailjsReady) {
    console.warn('[EmailJS] No disponible. Email de contacto no enviado.');
    return { success: false };
  }

  const params = {
    from_name: email,
    reply_to:  email,
    message:   message
  };

  try {
    const res = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      params
    );
    console.log('[EmailJS] Contacto enviado. Status:', res.status);
    return { success: true };
  } catch (error) {
    console.error('[EmailJS] Error al enviar contacto:', error.text || error.message);
    return { success: false, reason: error.text };
  }
}

// Exponer funciones globalmente
window.ChiaSeguraEmail = { sendReportEmail, sendContactEmail };
