/* ═══════════════════════════════════════════════
   js/auth.js – Autenticación Firebase (opcional)
   ═══════════════════════════════════════════════

   Este módulo maneja sesión de usuario para el
   panel de administración de reportes.
   Por defecto la app funciona sin auth.
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     ESTADO DE SESIÓN
  ────────────────────────────────────────────── */
  window.ChiaSeguraAuth = {
    user: null,
    isAdmin: false,

    /* Verifica si Firebase está disponible */
    isAvailable() {
      return typeof firebase !== 'undefined' && firebase.auth;
    },

    /* Observar cambios de sesión */
    init() {
      if (!this.isAvailable()) return;

      firebase.auth().onAuthStateChanged(user => {
        this.user = user;

        if (user) {
          console.log('[Auth] ✅ Sesión activa:', user.email);
          this.checkAdminRole(user.uid);
        } else {
          console.log('[Auth] Sin sesión activa');
          this.isAdmin = false;
        }
      });
    },

    /* Verificar rol de admin en Firestore */
    async checkAdminRole(uid) {
      if (!window.ChiaSeguraDB) return;
      try {
        const db = firebase.firestore();
        const doc = await db.collection('admins').doc(uid).get();
        this.isAdmin = doc.exists;
        console.log('[Auth] Admin:', this.isAdmin);
      } catch (e) {
        this.isAdmin = false;
      }
    },

    /* Login con email/contraseña */
    async login(email, password) {
      if (!this.isAvailable()) return { success: false, reason: 'Firebase no disponible' };
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        return { success: true };
      } catch (err) {
        return { success: false, reason: err.message };
      }
    },

    /* Login con Google */
    async loginWithGoogle() {
      if (!this.isAvailable()) return { success: false, reason: 'Firebase no disponible' };
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        return { success: true };
      } catch (err) {
        return { success: false, reason: err.message };
      }
    },

    /* Cerrar sesión */
    async logout() {
      if (!this.isAvailable()) return;
      try {
        await firebase.auth().signOut();
        showToast('👋 Sesión cerrada', 'success');
      } catch (err) {
        console.error('[Auth] Error al cerrar sesión:', err.message);
      }
    }
  };

  // Inicializar listener cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => {
    window.ChiaSeguraAuth.init();
  });

})();
