/* ═══════════════════════════════════════════════
   js/modal.js – Modal "Reportar Incidente"
                 con mini-mapa Leaflet integrado
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Storage helpers ──────────────────────── */
  const STORAGE_KEY = 'chiasegura_incidents';

  function loadIncidents() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveIncidents(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch {}
  }

  /* ── State ────────────────────────────────── */
  let allIncidents = loadIncidents();
  let miniMap      = null;
  let miniPin      = null;
  let selectedLat  = null;
  let selectedLng  = null;
  let minimapOpen  = false;
  let isSubmitting = false;


  /* ── Elements ─────────────────────────────── */
  const backdrop    = document.getElementById('modalBackdrop');
  const openModalBtn  = document.getElementById('openModal');
  const closeModalBtn = document.getElementById('closeModal');
  const submitBtn   = document.getElementById('submitReport');
  const btnToggle   = document.getElementById('btnToggleMinimap');
  const panel       = document.getElementById('minimapPanel');
  const btnGPS      = document.getElementById('btnMinimapGPS');
  const btnClear    = document.getElementById('btnMinimapClear');
  const pill        = document.getElementById('locationPill');
  const pillCoords  = document.getElementById('pillCoords');
  const btnEdit     = document.getElementById('btnPillEdit');
  const btnDel      = document.getElementById('btnPillDel');
  const addrInput   = document.getElementById('reportAddress');

  if (!backdrop) return; // Modal no presente en esta página

  /* ── Toast (fallback si toast.js no cargó) ── */
  function showToast(msg, type) {
    if (typeof window.showToast === 'function') { window.showToast(msg, type); return; }
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast toast--' + (type || 'success') + ' show';
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3500);
  }

  /* ── Mini-mapa ────────────────────────────── */
  function initMinimap() {
    if (miniMap) return;
    miniMap = L.map('modal-minimap', { zoomControl: true }).setView([4.8633, -74.0278], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(miniMap);

    // Mostrar incidentes existentes
    allIncidents.forEach(inc => {
      if (inc.lat && inc.lng) {
        L.circleMarker([inc.lat, inc.lng], {
          radius: 5, color: '#22c55e', fillColor: '#4ade80', fillOpacity: 0.7, weight: 2
        }).addTo(miniMap);
      }
    });

    miniMap.on('click', function(e) {
      placePin(e.latlng.lat, e.latlng.lng);
    });

    setTimeout(() => miniMap.invalidateSize(), 200);
  }

  function placePin(lat, lng) {
    if (miniPin) miniMap.removeLayer(miniPin);
    selectedLat = lat;
    selectedLng = lng;
    const icon = L.divIcon({
      html: `<svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="#f97316"/>
        <circle cx="12" cy="12" r="5" fill="#fff"/>
      </svg>`,
      className: '',
      iconSize: [28, 36],
      iconAnchor: [14, 36]
    });
    miniPin = L.marker([lat, lng], { icon }).addTo(miniMap);
    updatePill();
  }

  function updatePill() {
    if (selectedLat !== null && selectedLng !== null) {
      pill.classList.add('visible');
      pillCoords.textContent = `${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
    } else {
      pill.classList.remove('visible');
      pillCoords.textContent = '';
    }
  }

  function openMinimap() {
    if (!minimapOpen) {
      panel.classList.add('visible');
      btnToggle.classList.add('active');
      minimapOpen = true;
      initMinimap();
    } else {
      panel.classList.remove('visible');
      btnToggle.classList.remove('active');
      minimapOpen = false;
    }
  }

  if (btnToggle) btnToggle.addEventListener('click', openMinimap);

  if (btnGPS) {
    btnGPS.addEventListener('click', function() {
      if (!navigator.geolocation) { showToast('Geolocalización no disponible', 'error'); return; }
      const orig = btnGPS.innerHTML;
      btnGPS.innerHTML = '⏳ Localizando…';
      btnGPS.disabled = true;
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          btnGPS.innerHTML = orig;
          btnGPS.disabled = false;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          miniMap.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
          placePin(lat, lng);
          showToast(`📍 Ubicación encontrada (±${Math.round(pos.coords.accuracy)}m)`, 'success');
        },
        function(err) {
          btnGPS.innerHTML = orig;
          btnGPS.disabled = false;
          const msgs = { 1: 'Permiso denegado.', 2: 'No se pudo determinar la ubicación.', 3: 'Tiempo agotado.' };
          showToast(msgs[err.code] || 'Error al obtener ubicación', 'error');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', function() {
      if (miniPin && miniMap) { miniMap.removeLayer(miniPin); miniPin = null; }
      selectedLat = null; selectedLng = null;
      updatePill();
    });
  }

  if (btnEdit) btnEdit.addEventListener('click', openMinimap);

  if (btnDel) {
    btnDel.addEventListener('click', function() {
      if (miniPin && miniMap) { miniMap.removeLayer(miniPin); miniPin = null; }
      selectedLat = null; selectedLng = null;
      pill.classList.remove('visible');
    });
  }

  /* ── Modal open / close ───────────────────── */
  function openModal() {
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const first = backdrop.querySelector('input, select, textarea');
      if (first) first.focus();
    }, 350);
  }

  function closeModal() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (minimapOpen) {
      panel.classList.remove('visible');
      btnToggle.classList.remove('active');
      minimapOpen = false;
    }
  }

  if (openModalBtn)  openModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) closeModal();
  });

  /* ── Validación ───────────────────────────── */
  const FIELDS = [
    { id: 'reportName',     label: 'Nombre',             type: 'text'   },
    { id: 'reportLastName', label: 'Apellido',            type: 'text'   },
    { id: 'reportCedula',   label: 'Cédula',              type: 'text'   },
    { id: 'reportEmail',    label: 'Correo electrónico',  type: 'email'  },
    { id: 'reportType',     label: 'Tipo de delito',      type: 'select' },
    { id: 'reportAddress',  label: 'Dirección',           type: 'text'   },
    { id: 'reportDesc',     label: 'Descripción',         type: 'text'   },
  ];

  function clearErrors() {
    FIELDS.forEach(f => {
      const el = document.getElementById(f.id);
      if (!el) return;
      el.style.borderColor = '';
      el.style.boxShadow   = '';
      const err = document.getElementById(f.id + '_error');
      if (err) err.remove();
    });
  }

  function setError(el, message) {
    el.style.borderColor = '#ef4444';
    el.style.boxShadow   = '0 0 0 2px rgba(239,68,68,0.2)';
    if (document.getElementById(el.id + '_error')) return;
    const err = document.createElement('span');
    err.id = el.id + '_error';
    err.textContent = message;
    err.style.cssText = 'color:#ef4444;font-size:12px;margin-top:4px;display:block;padding-left:40px;';
    el.closest('.modal-field').appendChild(err);
  }

  function validateForm() {
    clearErrors();
    let valid = true, firstInvalid = null;
    FIELDS.forEach(f => {
      const el = document.getElementById(f.id);
      if (!el) return;
      const val = el.value.trim();
      const isEmpty = val === '' || (f.type === 'select' && el.value === '');
      const badEmail = f.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (isEmpty) {
        setError(el, f.label + ' es obligatorio.');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      } else if (badEmail) {
        setError(el, 'Ingresa un correo válido.');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      }
    });
    if (firstInvalid) firstInvalid.focus();
    return valid;
  }

  FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    ['input', 'change'].forEach(evt => {
      el.addEventListener(evt, () => {
        el.style.borderColor = '';
        el.style.boxShadow   = '';
        const err = document.getElementById(f.id + '_error');
        if (err) err.remove();
      });
    });
  });

  /* ── Submit ───────────────────────────────── */
  if (submitBtn) {
    submitBtn.addEventListener('click', async function() {
      if (isSubmitting) return;

      if (!validateForm()) {
        console.log('Formulario inválido');
        return;
      }

      console.log('Enviando reporte');
      isSubmitting = true;

      const reportData = {
        id:      Date.now(),
        name:    document.getElementById('reportName').value.trim(),
        last:    document.getElementById('reportLastName').value.trim(),
        cedula:  document.getElementById('reportCedula').value.trim(),
        email:   document.getElementById('reportEmail').value.trim(),
        type:    document.getElementById('reportType').value,
        address: addrInput ? addrInput.value.trim() : '',
        desc:    document.getElementById('reportDesc').value.trim(),
        lat:     selectedLat,
        lng:     selectedLng,
        ts:      Date.now()
      };

      submitBtn.disabled = true;
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <span class="btn-spinner" aria-hidden="true" style="width:18px;height:18px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;margin-right:8px;animation:bbspin 0.75s linear infinite;"></span>
        <span>Enviando…</span>
      `;

      try {
        // Firebase (si disponible)
        if (window.ChiaSeguraDB) {
          const r = await window.ChiaSeguraDB.saveReport(reportData);
          if (r && !r.success) console.warn('[modal] Firebase:', r.reason);
        }

        // EmailJS (si disponible)
        if (window.ChiaSeguraEmail) {
          const r = await window.ChiaSeguraEmail.sendReportEmail(reportData);
          if (r && !r.success) console.warn('[modal] EmailJS:', r.reason);
        }
      } catch (err) {
        console.error('[modal] Error enviando reporte:', err);
        // no rompemos el flujo: igual guardamos local y mostramos toast
      }

      // Guardar localmente
      allIncidents.push(reportData);
      saveIncidents(allIncidents);

      // ---- ÉXITO (1) Toast primero para evitar que el close lo oculte ----
      const toastMsg = 'Reporte enviado correctamente';

      // Fallback visual SEGURO (crea un toast moderno si showToast no crea/visible)
      function showSuccessToastHard() {
        try {
          showToast(toastMsg, 'success');
        } catch (e) {
          console.error('[modal] showToast falló:', e);
        }

        const waitFor = (ms) => new Promise(res => setTimeout(res, ms));

        (async () => {
          // Esperar a que toast.js cree elementos
          await waitFor(50);

          const toastContainer = document.getElementById('toastContainer');
          const existing = toastContainer ? toastContainer.querySelector('.toast') : null;

          // Si toastContainer no existe o no se agregó, creamos uno nuevo fijo.
          if (!toastContainer || !existing || !existing.textContent.includes(toastMsg)) {
            // Elimina toasts previos (para evitar que el usuario no vea el nuevo)
            if (toastContainer) {
              toastContainer.querySelectorAll('.toast').forEach(t => t.remove());
            }

            const c = toastContainer || document.createElement('div');
            if (!toastContainer) {
              c.id = 'toastContainer';
              c.style.position = 'fixed';
              c.style.top = '16px';
              c.style.right = '16px';
              c.style.zIndex = '99999';
              c.style.display = 'flex';
              c.style.flexDirection = 'column';
              c.style.gap = '10px';
              document.body.appendChild(c);
            }

            const el = document.createElement('div');
            el.className = 'toast toast--hard-success';
            el.textContent = toastMsg;
            el.style.padding = '14px 16px';
            el.style.borderRadius = '14px';
            el.style.background = 'rgba(17,24,39,0.95)';
            el.style.border = '1px solid rgba(74,222,128,0.35)';
            el.style.color = '#86efac';
            el.style.fontFamily = 'Nunito, sans-serif';
            el.style.fontWeight = '900';
            el.style.backdropFilter = 'blur(10px)';
            el.style.boxShadow = '0 14px 40px rgba(0,0,0,0.35)';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px) scale(0.98)';
            el.style.transition = 'opacity .25s ease, transform .25s ease';
            c.appendChild(el);

            requestAnimationFrame(() => {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0) scale(1)';
            });

            setTimeout(() => {
              el.style.opacity = '0';
              el.style.transform = 'translateY(-8px) scale(0.98)';
              setTimeout(() => el.remove(), 260);
            }, 3000);
          }
        })();
      }

      showSuccessToastHard();
      console.log('Reporte enviado correctamente');

      // ---- ÉXITO (2) Reset form + validaciones ----
      FIELDS.forEach(f => { const el = document.getElementById(f.id); if (el) el.value = ''; });
      if (miniPin && miniMap) { miniMap.removeLayer(miniPin); miniPin = null; }
      selectedLat = null; selectedLng = null;
      pill.classList.remove('visible');
      clearErrors();

      // ---- ÉXITO (3) Reactivar botón ----
      submitBtn.disabled = false;
      isSubmitting = false;
      submitBtn.innerHTML = originalBtnHtml;

      // ---- ÉXITO (4) Cerrar modal en 2-3s (y permitir cierre manual) ----
      // Quitamos el cierre inmediato para asegurar que el toast sea visible.
      setTimeout(() => {
        // Si el usuario lo cerró manualmente antes, closeModal no rompe.
        closeModal();
      }, 2400);

    });

  }

  // Shake + spinner keyframes + animación suave de éxito
  const s = document.createElement('style');
  s.textContent = `
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@keyframes bbspin{to{transform:rotate(360deg)}}
@keyframes toastSuccessPop{0%{transform:translateY(8px) scale(.98); opacity:.0} 40%{opacity:1} 100%{transform:translateY(0) scale(1); opacity:1}}
@keyframes fadeOutFast{to{opacity:0; transform:translateY(6px)}}`;
  document.head.appendChild(s);



})();