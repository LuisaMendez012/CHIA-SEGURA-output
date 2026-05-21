(function () {
  'use strict';

  /* ⇦ ⇦ ⇦ Coordenadas base de Chía, Cundinamarca ⇦ ⇦ ⇦ */
  const CHIA_CENTER = [4.8631, -74.0307];
  const STORAGE_KEY = 'chia_segura_incidents';

  /* ⇦ ⇦ ⇦ Colores por tipo de delito ⇦ ⇦ ⇦ */
  const TYPE_COLORS = {
    hurto:      { color: '#f97316', label: 'Hurto' },
    atraco:     { color: '#ef4444', label: 'Atraco' },
    vandalismo: { color: '#8b5cf6', label: 'Vandalismo' },
    accidente:  { color: '#3b82f6', label: 'Accidente' },
    otro:       { color: '#6b7280', label: 'Otro' },
  };

  /* ⇦ ⇦ ⇦ Barrios / zonas de Chía para geocodificación aproximada ⇦ ⇦ ⇦ */
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

  /* ⇦ ⇦ ⇦ Geocodificación aproximada por texto de dirección ⇦ ⇦ ⇦ */
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

  /* ⇦ ⇦ ⇦ LocalStorage helpers ⇦ ⇦ ⇦ */
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

  /* ⇦ ⇦ ⇦ Inicializar mapa Leaflet ⇦ ⇦ ⇦ */
  let map, heatLayer, markersGroup;
  let currentFilter = 'all';

  function initMap() {
    try {
      const mapEl = document.getElementById('chiaheatmap');
      if (!mapEl) {
        console.error('[heatmap] faltó #chiaheatmap en el DOM');
        return;
      }

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
    } catch (err) {
      console.error('[heatmap] error en initMap:', err);
    }
  }


  /* ⇦ ⇦ ⇦ Renderizar mapa con filtro activo ⇦ ⇦ ⇦ */
  function renderMap() {
    const incidents = getIncidents();
    const filtered  = currentFilter === 'all'
      ? incidents
      : incidents.filter(i => i.type === currentFilter);

    const heatData = filtered.map(i => [i.lat, i.lng, 1]);
    heatLayer.setLatLngs(heatData);

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

    const countEl = document.getElementById('totalCount');
    if (countEl) {
      countEl.textContent = `${filtered.length} reporte${filtered.length !== 1 ? 's' : ''}`;
    }

    renderList(filtered);
  }

  /* ⇦ ⇦ ⇦ Renderizar lista de incidentes ⇦ ⇦ ⇦ */
  function renderList(incidents) {
    const list  = document.getElementById('incidentsList');
    const empty = document.getElementById('incidentsEmpty');
    if (!list) return;

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

      item.addEventListener('click', () => {
        map.flyTo([incident.lat, incident.lng], 16, { duration: 1 });
        document.getElementById('chiaheatmap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      list.appendChild(item);
    });
  }

  /* ⇦ ⇦ ⇦ Filtros de tipo ⇦ ⇦ ⇦ */
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

  /* ⇦ ⇦ ⇦ Integración con modal de reporte ⇦ ⇦ ⇦ */
  function hookSubmitCapture() {
    const submitBtn = document.getElementById('submitReport');
    if (!submitBtn) return;

    let lastReport = null;

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

  /* ⇦ ⇦ ⇦ Datos de demostración (mock realistas) ⇦ ⇦ ⇦ */
  function seedDemoData() {
    const existingCount = getIncidents().length;
    const MIN_COUNT = 120;
    if (existingCount >= MIN_COUNT) return;

    const TARGET_COUNT = 180;

    const WEIGHTS = {
      hurto: 40,
      accidente: 20,
      vandalismo: 15,
      atraco: 15,
      otro: 10,
    };

    const zones = [
      { label: 'Centro Chía', coordsBias: [0.0000, 0.0000], base: 'Centro Chía' },
      { label: 'La Caro', coordsBias: [-0.0020, -0.0010], base: 'La Caro' },
      { label: 'Bojacá', coordsBias: [0.0020, -0.0015], base: 'Bojacá' },
      { label: 'Yerbabuena', coordsBias: [-0.0030, 0.0010], base: 'Yerbabuena' },
      { label: 'Cerca Universidad de La Sabana', coordsBias: [0.0010, 0.0010], base: 'Cerca Universidad de La Sabana' },
      { label: 'Río Frío', coordsBias: [-0.0015, 0.0020], base: 'Río Frío' },
      { label: 'Variante Chía-Cajicá', coordsBias: [0.0028, 0.0018], base: 'Variante Chía-Cajicá' },
      { label: 'Zona Comercial', coordsBias: [0.0008, -0.0012], base: 'Zona Comercial' },
      { label: 'Sectores residenciales', coordsBias: [-0.0010, -0.0018], base: 'Sectores residenciales' },
      { label: 'La Fontana', coordsBias: [0.0017, -0.0020], base: 'La Fontana' },
    ];

    const descriptionsByType = {
      hurto: [
        'Hurto de celular reportado en vía pública.',
        'Robo de bicicleta en zona residencial durante la tarde.',
        'Hurto de bolso a peatón cerca de zona comercial.',
        'Reporte de robo de motocicleta estacionada sin vigilancia.',
        'Hurto de elementos personales en transporte público.',
        'Sustracción de billetera en punto de alta afluencia.',
      ],
      accidente: [
        'Colisión menor entre vehículos sin heridos.',
        'Accidente de tránsito por desaceleración repentina en vía principal.',
        'Choque por alcance con daños materiales leves.',
        'Accidente con objetos en la calzada, sin reporte de heridos.',
        'Colisión en intersección con afectación parcial del carril.',
        'Accidente de tránsito sin lesionados, tránsito lento en la zona.',
      ],
      vandalismo: [
        'Daños reportados en mobiliario urbano.',
        'Pintura y rayones en fachada de un inmueble.',
        'Afectación de señalización vial por impacto reportado.',
        'Vandalismo en paradero: ruptura de vidrio.',
        'Daños en parque infantil y elementos de recreación.',
        'Reporte de grafitis en muro de sector residencial.',
      ],
      atraco: [
        'Ciudadano reporta intento de robo cerca de zona comercial.',
        'Atraco a conductor en vía secundaria con solicitud de información.',
        'Intento de hurto con intimidación en zona de alta circulación.',
        'Atraco reportado cerca de establecimiento comercial.',
        'Ataque y amenaza a peatón en horario nocturno.',
        'Robos con intimidación durante desplazamiento hacia transporte.',
      ],
      otro: [
        'Reporte ciudadano de situación sospechosa.',
        'Observación de actividad inusual en sector residencial.',
        'Reporte de riña entre personas sin lesionados.',
        'Hallazgo de objeto abandonado en espacio público.',
        'Reporte de comportamiento agresivo en zona común.',
        'Ciudadano reporta aglomeración inusual y posible riesgo.',
      ],
    };

    const states = ['En revisión', 'Confirmado', 'En proceso', 'Cerrado'];

    const incidentTypes = Object.keys(WEIGHTS);
    const totalWeight = incidentTypes.reduce((sum, t) => sum + WEIGHTS[t], 0);

    function pickType() {
      const r = Math.random() * totalWeight;
      let acc = 0;
      for (const t of incidentTypes) {
        acc += WEIGHTS[t];
        if (r <= acc) return t;
      }
      return 'hurto';
    }

    const now = Date.now();

    function pickDate() {
      const bucket = Math.random();
      let daysAgo;
      if (bucket < 0.25) {
        daysAgo = Math.floor(Math.random() * 1);
      } else if (bucket < 0.55) {
        daysAgo = Math.floor(Math.random() * 7);
      } else if (bucket < 0.80) {
        daysAgo = Math.floor(Math.random() * 30);
      } else {
        daysAgo = 60 + Math.floor(Math.random() * 120);
      }

      const dt = new Date(now - daysAgo * 86400000);
      const hh = String(Math.floor(Math.random() * 24)).padStart(2, '0');
      const mm = String(Math.floor(Math.random() * 60)).padStart(2, '0');

      dt.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

      const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      const day = dt.getDate();
      const month = months[dt.getMonth()];
      const year = dt.getFullYear();

      return `${day} ${month} ${year}, ${hh}:${mm}`;
    }

    function pickPriority(type) {
      const r = Math.random();
      if (type === 'atraco') return r < 0.55 ? 'alta' : (r < 0.85 ? 'media' : 'baja');
      if (type === 'accidente') return r < 0.35 ? 'alta' : (r < 0.75 ? 'media' : 'baja');
      if (type === 'vandalismo') return r < 0.25 ? 'alta' : (r < 0.75 ? 'media' : 'baja');
      if (type === 'hurto') return r < 0.25 ? 'alta' : (r < 0.70 ? 'media' : 'baja');
      return r < 0.18 ? 'alta' : (r < 0.65 ? 'media' : 'baja');
    }

    for (let idx = 0; idx < TARGET_COUNT; idx++) {
      const type = pickType();
      const zone = zones[Math.floor(Math.random() * zones.length)];

      const address = `${zone.base} # ${1 + Math.floor(Math.random() * 160)}`;
      const coords = geocodeAddress(address);

      const lat = coords[0] + (zone.coordsBias[0] || 0) + (Math.random() - 0.5) * 0.0025;
      const lng = coords[1] + (zone.coordsBias[1] || 0) + (Math.random() - 0.5) * 0.0025;

      const descriptions = descriptionsByType[type] || descriptionsByType.otro;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      const date = pickDate();

      const incident = {
        id: Date.now() - idx * (2 + Math.floor(Math.random() * 3)) * 86400000 / 10,
        type,
        address,
        description,
        lat,
        lng,
        date,
        status: states[Math.floor(Math.random() * states.length)],
        priority: pickPriority(type),
      };

      saveIncident(incident);
    }
  }

  /* ⇦ ⇦ ⇦ Bootstrap ⇦ ⇦ ⇦ */
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

