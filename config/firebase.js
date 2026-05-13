/* ═══════════════════════════════════════════════
   config/firebase.js – Configuración Firebase
   ═══════════════════════════════════════════════

   INSTRUCCIONES:
   1. Ve a https://console.firebase.google.com
   2. Crea un proyecto "chia-segura"
   3. Agrega una app web
   4. Copia tu firebaseConfig y pégalo abajo
   5. Habilita Firestore Database en el proyecto
   6. Copia los scripts del CDN de Firebase en index.html antes de este archivo

   Scripts a añadir en index.html (antes de </body>):
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
   ═══════════════════════════════════════════════ */

// ─── TU CONFIGURACIÓN FIREBASE ───────────────
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO_ID",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};

// ─── INICIALIZAR ──────────────────────────────
let db = null;
let firebaseReady = false;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
    console.log('[Firebase] ✅ Conectado correctamente');
  } else {
    console.warn('[Firebase] ⚠️ SDK no cargado. Verifica los scripts en index.html');
  }
} catch (err) {
  console.error('[Firebase] ❌ Error al inicializar:', err.message);
}

/* ──────────────────────────────────────────────
   GUARDAR REPORTE EN FIRESTORE
   Llama esta función desde modal.js al enviar
────────────────────────────────────────────── */
async function saveReport({ name, type, description }) {
  if (!firebaseReady) {
    console.warn('[Firebase] No disponible. Reporte no guardado en DB.');
    return { success: false, reason: 'Firebase no inicializado' };
  }

  try {
    const docRef = await db.collection('reports').add({
      name,
      type,
      description,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pendiente',
      location: null   // Reemplaza con coordenadas GPS si usas Geolocation API
    });

    console.log('[Firebase] Reporte guardado con ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[Firebase] Error al guardar reporte:', error.message);
    return { success: false, reason: error.message };
  }
}

/* ──────────────────────────────────────────────
   LEER REPORTES (para panel de admin)
────────────────────────────────────────────── */
async function getReports(limit = 50) {
  if (!firebaseReady) return [];

  try {
    const snapshot = await db
      .collection('reports')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Firebase] Error al obtener reportes:', error.message);
    return [];
  }
}

/* ──────────────────────────────────────────────
   ESCUCHAR REPORTES EN TIEMPO REAL
────────────────────────────────────────────── */
function onReportsUpdate(callback) {
  if (!firebaseReady) return () => {};

  const unsubscribe = db
    .collection('reports')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .onSnapshot(snapshot => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(reports);
    }, err => {
      console.error('[Firebase] Error en listener:', err.message);
    });

  return unsubscribe; // Llama para detener el listener
}

// Exponer funciones globalmente
window.ChiaSeguraDB = { saveReport, getReports, onReportsUpdate };
