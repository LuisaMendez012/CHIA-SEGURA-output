/* ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦ ⇦
   config/firebase.js – Configuración Firebase (MODO OFFLINE)
*/

// En modo offline, usamos localStorage
let db = null;
let firebaseReady = true;

console.log('[Firebase] ⚠️ Modo offline - usando localStorage');

async function saveReport({ name, type, description, lat, lng }) {
  const STORAGE_KEY = 'chiasegura_incidents';
  try {
    let incidents = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newReport = {
      id: Date.now().toString(),
      name,
      type,
      description,
      lat: lat || null,
      lng: lng || null,
      timestamp: new Date().toISOString(),
      status: 'pendiente'
    };
    incidents.unshift(newReport);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents.slice(0, 500)));
    console.log('[Firebase] Reporte guardado localmente:', newReport.id);
    return { success: true, id: newReport.id };
  } catch (error) {
    console.error('[Firebase] Error al guardar reporte:', error.message);
    return { success: false, reason: error.message };
  }
}

async function getReports(limit = 50) {
  try {
    const incidents = JSON.parse(localStorage.getItem('chiasegura_incidents') || '[]');
    return incidents.slice(0, limit);
  } catch (error) {
    console.error('[Firebase] Error al obtener reportes:', error.message);
    return [];
  }
}

function onReportsUpdate(callback) {
  const STORAGE_KEY = 'chiasegura_incidents';
  const interval = setInterval(() => {
    try {
      const incidents = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      callback(incidents);
    } catch (err) {
      console.error('[Firebase] Error en listener:', err.message);
    }
  }, 2000);
  return () => clearInterval(interval);
}

window.ChiaSeguraDB = { saveReport, getReports, onReportsUpdate };

