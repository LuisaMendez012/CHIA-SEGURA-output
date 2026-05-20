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
      if (!validateForm()) return;

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
      submitBtn.textContent = 'Enviando…';

      // Firebase (si disponible)
      if (window.ChiaSeguraDB) {
        const r = await window.ChiaSeguraDB.saveReport(reportData);
        if (!r.success) console.warn('[modal] Firebase:', r.reason);
      }

      // EmailJS (si disponible)
      if (window.ChiaSeguraEmail) {
        const r = await window.ChiaSeguraEmail.sendReportEmail(reportData);
        if (!r.success) console.warn('[modal] EmailJS:', r.reason);
      }

      // Guardar localmente
      allIncidents.push(reportData);
      saveIncidents(allIncidents);

      // Reset form
      FIELDS.forEach(f => { const el = document.getElementById(f.id); if (el) el.value = ''; });
      if (miniPin && miniMap) { miniMap.removeLayer(miniPin); miniPin = null; }
      selectedLat = null; selectedLng = null;
      pill.classList.remove('visible');

      closeModal();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Reporte';
      clearErrors();
      showToast('✅ ¡Reporte enviado! Gracias por contribuir a Chía Segura.', 'success');
    });
  }

  // Shake keyframe
  const s = document.createElement('style');
  s.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`;
  document.head.appendChild(s);

})();