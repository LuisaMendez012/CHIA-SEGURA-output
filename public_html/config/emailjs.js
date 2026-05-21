/* ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦
   config/emailjs.js – Configuración EmailJS (MODO OFFLINE)
*/

let emailjsReady = true;
console.log('[EmailJS] ⚠️ Modo offline - usando localStorage');

async function sendReportEmail({ name, type, description }) {
  const STORAGE_KEY = 'chiasegura_report_emails';
  try {
    let emails = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const emailRecord = {
      id: Date.now().toString(),
      from_name: name || 'Ciudadano anónimo',
      crime_type: type || 'No especificado',
      message: description || 'Sin descripción',
      timestamp: new Date().toISOString(),
      status: 'pendiente_envio'
    };
    emails.unshift(emailRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails.slice(0, 100)));
    console.log('[EmailJS] Correo de reporte guardado:', emailRecord.id);
    return { success: true };
  } catch (error) {
    console.error('[EmailJS] Error:', error.message);
    return { success: false, reason: error.message };
  }
}

async function sendContactEmail({ email, message }) {
  const STORAGE_KEY = 'chiasegura_contact_emails';
  try {
    let contacts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const contactRecord = {
      id: Date.now().toString(),
      email,
      message,
      timestamp: new Date().toISOString(),
      status: 'enviado'
    };
    contacts.unshift(contactRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts.slice(0, 100)));
    console.log('[EmailJS] Contacto guardado:', contactRecord.id);
    return { success: true };
  } catch (error) {
    console.error('[EmailJS] Error:', error.message);
    return { success: false, reason: error.message };
  }
}

window.ChiaSeguraEmail = { sendReportEmail, sendContactEmail };

