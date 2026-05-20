/* ═══════════════════════════════════════════════
   heatmap.js – Mapa de calor de incidentes en Chía
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Coordenadas base de Chía, Cundinamarca ─── */
  const CHIA_CENTER = [4.8631, -74.0307];
  const STORAGE_KEY = 'chia_segura_incidents';

  /* ── Colores por tipo de delito ─────────────── */
  const TYPE_COLORS = {
    hurto:      { color: '#f97316', label: 'Hurto' },
    atraco:     { color: '#ef4444', label: 'Atraco' },
    vandalismo: { color: '#8b5cf6', label: 'Vandalismo' },
    accidente:  { color: '#3b82f6', label: 'Accidente' },
    otro:       { color: '#6b7280', label: 'Otro' },
  };

  /* ── Barrios / zonas de Chía para geocodificación aproximada ── */
  const CHIA_ZONES = {
    'centro':           [4.8631, -74.0307],
    'centro chia':      [4.8631, -74.0307],
    'parque':           [4.8635, -74.0310],
    'parque principal': [4.8635, -74.0310],
    'zipaquira':        [4.8700, -74.0150],
    'cajica':           [4.9100, -74.0200],
    'fonqueta':         [4.8500, -74.0400],
    'cerca de piedra':  [4.8550, -74.0250],
    'yerbabuena':       [4.8400, -74.0100],
    'fagua':            [4.8750, -74.0500],
    'bojaca':           [4.8800, -74.0450],
    'vereda aposentos': [4.8450, -74.0350],
    'la balsa':         [4.8550, -74.0180],
    'sindamanoy':       [4.8680, -74.0220],
    'samaria':          [4.8590, -74.0260],
    'portales':         [4.8610, -74.0340],
    'portal de chia':   [4.8615, -74.0345],
  };

  /* ─────────────────────────────────────────────
     Geocodificación aproximada por texto de dirección
  ────────────────────────────────────────────── */
  function geocodeAddress(address) {
    const lower = address.toLowerCase().trim();

    // Buscar coincidencia con zonas conocidas
    for (const [key, coords] of Object.entries(CHIA_ZONES)) {
      if (lower.includes(key)) {
        // Pequeña variación aleatoria para evitar superposición exacta
        return [
          coords[0] + (Math.random() - 0.5) * 0.005,
          coords[1] + (Math.random() - 0.5) * 0.005,
        ];
      }
    }

    // Intentar extraer número de carrera/calle para generar coord aproximada
    const craMatch = lower.match(/cr[a.]?\s*(\d+)/);
    const callMatch = lower.match(/c[a.]?l?[le.]?\s*(\d+)/);

    if (craMatch || callMatch) {
      const cra  = craMatch  ? parseInt(craMatch[1])  : 10;
      const cll  = callMatch ? parseInt(callMatch[1]) : 10;
      return [
        CHIA_CENTER[0] + (cll - 10) * 0.0008 + (Math.random() - 0.5) * 0.003,
        CHIA_CENTER[1] + (cra - 10) * 0.0008 + (Math.random() - 0.5) * 0.003,
      ];
    }

    // Fallback: posición aleatoria dentro de Chía
    return [
      CHIA_CENTER[0] + (Math.random() - 0.5) * 0.025,
      CHIA_CENTER[1] + (Math.random() - 0.5) * 0.025,
    ];
  }

  /* ─────────────────────────────────────────────
     LocalStorage helpers
  ────────────────────────────────────────────── */
  function getIncidents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveIncident(incident) {
    const list = getIncidents();
    list.unshift(incident); // más reciente primero
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
  }

  /* ─────────────────────────────────────────────
     Inicializar mapa Leaflet
  ────────────────────────────────────────────── */
  let map, heatLayer, markersGroup;
  let currentFilter = 'all';

  function initMap() {
    map = L.map('chiaheatmap', {
      center: CHIA_CENTER,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    heatLayer = L.heatLayer([], {
      radius: 35,
      blur: 20,
      maxZoom: 17,
      gradient: { 0.3: '#3b82f6', 0.6: '#f97316', 1.0: '#ef4444' },
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);

    renderMap();
  }

  /* ─────────────────────────────────────────────
     Renderizar mapa con filtro activo
  ────────────────────────────────────────────── */
  function renderMap() {
    const incidents = getIncidents();
    const filtered  = currentFilter === 'all'
      ? incidents
      : incidents.filter(i => i.type === currentFilter);

    // Actualizar capa de calor
    const heatData = filtered.map(i => [i.lat, i.lng, 1]);
    heatLayer.setLatLngs(heatData);

    // Actualizar marcadores
    markersGroup.clearLayers();
    filtered.forEach(incident => {
      const cfg = TYPE_COLORS[incident.type] || TYPE_COLORS.otro;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:${cfg.color};border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
          cursor:pointer;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([incident.lat, incident.lng], { icon });
      marker.bindPopup(`
        <div style="font-family:Nunito,sans-serif;min-width:180px;">
          <div style="font-weight:700;font-size:14px;color:${cfg.color};margin-bottom:4px;">
            ${cfg.label}
          </div>
          <div style="font-size:12px;color:#374151;margin-bottom:3px;">
            <strong>Dirección:</strong> ${incident.address}
          </div>
          <div style="font-size:12px;color:#374151;margin-bottom:3px;">
            <strong>Descripción:</strong> ${incident.description}
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:6px;">
            ${incident.date}
          </div>
        </div>
      `, { maxWidth: 240 });

      markersGroup.addLayer(marker);
    });

    // Actualizar contador
    const countEl = document.getElementById('totalCount');
    if (countEl) {
      countEl.textContent = `${filtered.length} reporte${filtered.length !== 1 ? 's' : ''}`;
    }

    renderList(filtered);
  }

  /* ─────────────────────────────────────────────
     Renderizar lista de incidentes
  ────────────────────────────────────────────── */
  function renderList(incidents) {
    const list  = document.getElementById('incidentsList');
    const empty = document.getElementById('incidentsEmpty');
    if (!list) return;

    // Limpiar items previos (conservar el elemento empty)
    Array.from(list.children).forEach(child => {
      if (child.id !== 'incidentsEmpty') child.remove();
    });

    if (incidents.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    incidents.slice(0, 20).forEach(incident => {
      const cfg  = TYPE_COLORS[incident.type] || TYPE_COLORS.otro;
      const item = document.createElement('div');
      item.className = 'incident-item';
      item.innerHTML = `
        <div class="incident-item__badge" style="background:${cfg.color}20;color:${cfg.color};">
          ${cfg.label}
        </div>
        <div class="incident-item__body">
          <div class="incident-item__address">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${incident.address}
          </div>
          <div class="incident-item__desc">${incident.description}</div>
        </div>
        <div class="incident-item__date">${incident.date}</div>
      `;
      // Clic → volar al marcador
      item.addEventListener('click', () => {
        map.flyTo([incident.lat, incident.lng], 16, { duration: 1 });
        document.getElementById('chiaheatmap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      list.appendChild(item);
    });
  }

  /* ─────────────────────────────────────────────
     Filtros de tipo
  ────────────────────────────────────────────── */
  function initFilters() {
    const btns = document.querySelectorAll('.heatmap-filter-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.type;
        renderMap();
      });
    });
  }

  /* ─────────────────────────────────────────────
     Integración con modal de reporte
  ────────────────────────────────────────────── */
  function hookModal() {
    const submitBtn = document.getElementById('submitReport');
    if (!submitBtn) return;

    // Sobrescribir la lógica de submit para capturar el reporte
    // Se hace DESPUÉS de que modal.js registra su listener (ver orden de scripts)
    const originalHandler = submitBtn.onclick;

    // Usamos un evento capturado en la fase de burbuja, ejecutado después del de modal.js
    submitBtn.addEventListener('click', function () {
      // Esperar a que modal.js valide y cierre
      setTimeout(() => {
        const nameEl    = document.getElementById('reportName');
        const typeEl    = document.getElementById('reportType');
        const descEl    = document.getElementById('reportDesc');
        const addrEl    = document.getElementById('reportAddress');

        // Si el modal se cerró es porque el submit fue exitoso
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop || backdrop.classList.contains('open')) return;

        // Recuperar valores del último reporte (pueden haber sido limpiados)
        // guardamos temporalmente antes de que clearForm los borre
      }, 0);
    });
  }

  /* Estrategia mejor: interceptar ANTES del submit de modal.js */
  function hookSubmitCapture() {
    const submitBtn = document.getElementById('submitReport');
    if (!submitBtn) return;

    let lastReport = null;

    // Capturar valores al hacer click (antes de validar/limpiar)
    submitBtn.addEventListener('mousedown', function () {
      const nameEl  = document.getElementById('reportName');
      const lastEl  = document.getElementById('reportLastName');
      const typeEl  = document.getElementById('reportType');
      const descEl  = document.getElementById('reportDesc');
      const addrEl  = document.getElementById('reportAddress');

      if (!addrEl || !addrEl.value.trim()) return;

      lastReport = {
        name:        (nameEl  ? nameEl.value.trim()  : ''),
        lastName:    (lastEl  ? lastEl.value.trim()  : ''),
        type:        (typeEl  ? typeEl.value         : 'otro'),
        description: (descEl  ? descEl.value.trim()  : ''),
        address:     (addrEl  ? addrEl.value.trim()  : ''),
      };
    });

    // Observar el toast de éxito para saber que se envió
    const toastEl = document.getElementById('toast');
    if (toastEl) {
      const observer = new MutationObserver(() => {
        if (
          lastReport &&
          toastEl.textContent.includes('Reporte enviado correctamente')
        ) {
          const coords = geocodeAddress(lastReport.address);
          const now = new Date();
          const dateStr = now.toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });

          const incident = {
            id:          Date.now(),
            type:        lastReport.type || 'otro',
            address:     lastReport.address,
            description: lastReport.description,
            lat:         coords[0],
            lng:         coords[1],
            date:        dateStr,
          };

          saveIncident(incident);
          renderMap();

          // Hacer scroll al mapa y resaltar el nuevo marcador
          setTimeout(() => {
            const mapSection = document.getElementById('mapa');
            if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });
            map.flyTo([incident.lat, incident.lng], 16, { duration: 1.5 });
          }, 600);

          lastReport = null;
        }
      });
      observer.observe(toastEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ─────────────────────────────────────────────
     Datos de demostración (primeros 8 incidentes)
  ────────────────────────────────────────────── */
  function seedDemoData() {
    if (getIncidents().length > 0) return;
    const demos = [
      { type: 'hurto',      address: 'Cra 6 # 11-20, Centro Chía',          description: 'Hurto de celular en vía pública' },
      { type: 'atraco',     address: 'Cll 13 # 5-30, Parque Principal',      description: 'Atraco a mano armada cerca al parque' },
      { type: 'vandalismo', address: 'Cra 3 # 8-10, Samaria',               description: 'Daño a vehículos parqueados' },
      { type: 'hurto',      address: 'Portal de Chía, local 12',             description: 'Hurto en centro comercial' },
      { type: 'accidente',  address: 'Autopista Norte Km 22, Cajicá-Chía',  description: 'Accidente de tránsito con heridos leves' },
      { type: 'hurto',      address: 'Cll 5 # 9-45, La Balsa',              description: 'Hurto de bicicleta' },
      { type: 'otro',       address: 'Vía Fonqueta, Chía',                  description: 'Riña entre personas' },
      { type: 'atraco',     address: 'Sindamanoy, Conjunto Las Acacias',    description: 'Intento de hurto a residencia' },
    ];
    const months = ['ene','feb','mar','abr','may'];
    demos.forEach((d, i) => {
      const coords = geocodeAddress(d.address);
      saveIncident({
        id:          Date.now() - (demos.length - i) * 86400000,
        type:        d.type,
        address:     d.address,
        description: d.description,
        lat:         coords[0],
        lng:         coords[1],
        date:        `${10 + i} ${months[i % 5]} 2025, 14:${String(i * 7 % 60).padStart(2,'0')}`,
      });
    });
  }

  /* ─────────────────────────────────────────────
     Bootstrap
  ────────────────────────────────────────────── */
  function init() {
    seedDemoData();
    initMap();
    initFilters();
    hookSubmitCapture();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();