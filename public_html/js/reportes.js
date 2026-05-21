(function () {
  'use strict';

  const STORAGE_KEYS = ['chia_segura_incidents', 'chiasegura_incidents'];

  const TYPE_META = {
    hurto: { label: 'Hurto', badge: 'badge--hurto' },
    atraco: { label: 'Atraco', badge: 'badge--atraco' },
    accidente: { label: 'Accidente', badge: 'badge--accidente' },
    vandalismo: { label: 'Vandalismo', badge: 'badge--vandalismo' },
    otro: { label: 'Otro', badge: 'badge--otro' },
  };

  function safeLower(s) {
    return (s || '').toString().toLowerCase();
  }

  function normalizeStatus(raw) {
    const s = safeLower(raw);
    if (s.includes('activo')) return 'Activo';
    if (s.includes('revis')) return 'Revisado';
    if (s.includes('cerr')) return 'Cerrado';
    if (s.includes('confirmado')) return 'Revisado';
    if (s.includes('en proceso')) return 'Activo';
    return raw ? String(raw) : 'Activo';
  }

  function toISODateParts(dateStr) {
    const months = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
    };

    if (!dateStr) return { date: '', time: '', dateObj: null };

    if (typeof dateStr === 'number') {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
        dateObj: d
      };
    }

    const str = String(dateStr);

    const m = str.match(/(\d{1,2})\s+(\w{3})\s+(\d{4}),\s+(\d{2}):(\d{2})/i);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = months[m[2].toLowerCase()] ?? 0;
      const year = parseInt(m[3], 10);
      const hh = parseInt(m[4], 10);
      const mm = parseInt(m[5], 10);
      const d = new Date(year, mon, day, hh, mm, 0, 0);
      return {
        date: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
        dateObj: d
      };
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return {
        date: parsed.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: parsed.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
        dateObj: parsed
      };
    }

    return { date: str, time: '', dateObj: null };
  }

  function getIncidentByKeys() {
    const merged = [];
    for (const key of STORAGE_KEYS) {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(raw)) merged.push(...raw);
      } catch (_) {}
    }
    return merged;
  }

  function normalizeIncident(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const type = (raw.type || '').toString().toLowerCase();
    const address = raw.address || raw.location || raw.ubicacion || '';
    const description = raw.description || raw.desc || raw.detail || '';

    const status = normalizeStatus(raw.status || raw.estado);

    let dateParts = { date: '', time: '', dateObj: null };

    if (raw.ts) {
      dateParts = toISODateParts(Number(raw.ts));
    } else if (raw.date) {
      dateParts = toISODateParts(raw.date);
    } else {
      dateParts = toISODateParts(raw.createdAt || raw.fecha);
    }

    const sortDate = dateParts.dateObj ? dateParts.dateObj.getTime() : 0;

    const normalized = {
      id: raw.id ?? raw.ts ?? `${Math.random()}`,
      type: TYPE_META[type] ? type : 'otro',
      address: address,
      location: address,
      description: description,
      status,
      dateText: dateParts.date || '',
      timeText: dateParts.time || '',
      dateObj: dateParts.dateObj,
      sortDate
    };

    return normalized;
  }

  const state = {
    all: [],
    filtered: [],
    page: 1,
    pageSize: 10,
    filters: {
      searchLocation: '',
      category: 'all',
      status: 'all',
      dateStart: '',
      dateEnd: '',
    }
  };

  const statsEl = document.getElementById('reportesStats');
  const filtersCountEl = document.getElementById('filtersCount');

  const tableLoading = document.getElementById('tableLoading');
  const tbody = document.querySelector('#reportesTable tbody');
  const emptyState = document.getElementById('emptyState');
  const paginationEl = document.getElementById('pagination');

  const searchLocation = document.getElementById('searchLocation');
  const categoryFilter = document.getElementById('categoryFilter');
  const statusFilter = document.getElementById('statusFilter');
  const dateStart = document.getElementById('dateStart');
  const dateEnd = document.getElementById('dateEnd');

  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');

  const exportLoading = document.getElementById('exportLoading');
  const exportMeta = document.getElementById('exportMeta');

  const exportPdfFiltered = document.getElementById('exportPdfFiltered');
  const exportExcelFiltered = document.getElementById('exportExcelFiltered');
  const exportPdfAll = document.getElementById('exportPdfAll');
  const exportExcelAll = document.getElementById('exportExcelAll');

  function setLoading(el, isLoading) {
    if (!el) return;
    el.style.display = isLoading ? 'flex' : 'none';
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function applyQuickRange(quick) {
    const today = new Date();
    const toYmd = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    if (quick === 'today') {
      state.filters.dateStart = toYmd(today);
      state.filters.dateEnd = toYmd(today);
    } else if (quick === '7') {
      const d = new Date(today.getTime() - 6 * 86400000);
      state.filters.dateStart = toYmd(d);
      state.filters.dateEnd = toYmd(today);
    } else if (quick === '30') {
      const d = new Date(today.getTime() - 29 * 86400000);
      state.filters.dateStart = toYmd(d);
      state.filters.dateEnd = toYmd(today);
    } else if (quick === '90') {
      const d = new Date(today.getTime() - 89 * 86400000);
      state.filters.dateStart = toYmd(d);
      state.filters.dateEnd = toYmd(today);
    } else {
      state.filters.dateStart = '';
      state.filters.dateEnd = '';
    }

    if (dateStart) dateStart.value = state.filters.dateStart;
    if (dateEnd) dateEnd.value = state.filters.dateEnd;
  }

  function withinDateRange(item) {
    if (!item.dateObj) return false;

    const ds = state.filters.dateStart;
    const de = state.filters.dateEnd;

    if (!ds && !de) return true;

    const time = item.dateObj.getTime();

    if (ds) {
      const start = new Date(ds + 'T00:00:00');
      if (time < start.getTime()) return false;
    }

    if (de) {
      const end = new Date(de + 'T23:59:59');
      if (time > end.getTime()) return false;
    }

    return true;
  }

  function filterAll() {
    const f = state.filters;
    const qLoc = safeLower(f.searchLocation);

    let list = [...state.all];

    if (f.category !== 'all') {
      list = list.filter(i => i.type === f.category);
    }

    if (f.status !== 'all') {
      list = list.filter(i => i.status === f.status);
    }

    if (f.dateStart || f.dateEnd) {
      list = list.filter(i => withinDateRange(i));
    }

    if (qLoc) {
      list = list.filter(i => safeLower(i.address).includes(qLoc));
    }

    list.sort((a, b) => (b.sortDate || 0) - (a.sortDate || 0));

    state.filtered = list;
    state.page = 1;

    renderTable();
    renderExportMeta();
  }

  function renderTable() {
    if (tableLoading) setLoading(tableLoading, false);

    const list = state.filtered;
    const total = list.length;
    if (filtersCountEl) filtersCountEl.textContent = total;

    if (!tbody) return;

    if (total === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(state.page, pages);

    const start = (state.page - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, total);
    const pageItems = list.slice(start, end);

    tbody.innerHTML = pageItems.map(item => {
      const typeMeta = TYPE_META[item.type] || TYPE_META.otro;
      const typeBadge = typeMeta.badge || 'badge--otro';

      const statusBadgeClass = item.status === 'Activo'
        ? 'badge-state--Activo'
        : item.status === 'Revisado'
          ? 'badge-state--Revisado'
          : 'badge-state--Cerrado';

      const desc = escapeHtml(item.description || '');
      const address = escapeHtml(item.address || '');

      return `
        <tr>
          <td data-label="Fecha">${escapeHtml(item.dateText || '')}</td>
          <td data-label="Hora">${escapeHtml(item.timeText || '')}</td>
          <td data-label="Tipo"><span class="badge ${typeBadge}">${escapeHtml(typeMeta.label)}</span></td>
          <td data-label="Ubicación">${address}</td>
          <td data-label="Descripción">
            <div class="desc-cell">
              <div class="desc-text">${desc}</div>
              <button class="view-more" type="button" data-desc="${escapeHtml(desc)}">Ver más</button>
            </div>
          </td>
          <td data-label="Estado"><span class="badge ${statusBadgeClass}">${escapeHtml(item.status)}</span></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-more').forEach(btn => {
      btn.addEventListener('click', () => {
        const full = btn.getAttribute('data-desc') || '';
        showToastModal('Descripción completa', full);
      });
    });

    if (paginationEl) {
      paginationEl.innerHTML = renderPagination(pages, state.page);
      const prev = paginationEl.querySelector('#pagePrev');
      const next = paginationEl.querySelector('#pageNext');
      if (prev) prev.disabled = state.page <= 1;
      if (next) next.disabled = state.page >= pages;

      prev?.addEventListener('click', () => { state.page -= 1; renderTable(); });
      next?.addEventListener('click', () => { state.page += 1; renderTable(); });

      const selectPage = paginationEl.querySelector('#pageSelect');
      selectPage?.addEventListener('change', () => {
        state.page = parseInt(selectPage.value, 10);
        renderTable();
      });
    }
  }

  function renderPagination(pages, current) {
    const options = Array.from({ length: pages }, (_, idx) => {
      const p = idx + 1;
      return `<option value="${p}" ${p === current ? 'selected' : ''}>Página ${p}</option>`;
    }).join('');

    return `
      <div class="pagination__info">Página <strong>${current}</strong> de <strong>${pages}</strong></div>
      <div class="pagination__btns">
        <button class="page-btn" id="pagePrev" type="button">← Anterior</button>
        <select id="pageSelect" class="form-input" style="padding:10px 12px; width:auto; border-radius:12px;">${options}</select>
        <button class="page-btn" id="pageNext" type="button">Siguiente →</button>
      </div>
    `;
  }

  function showToastModal(title, htmlEncoded) {
    const overlayId = 'descOverlay';
    let overlay = document.getElementById(overlayId);
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(2,6,23,0.55)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '18px';

    overlay.innerHTML = `
      <div style="max-width:720px; width:100%; background:#fff; border-radius:16px; border:1px solid rgba(148,163,184,0.35); box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid rgba(148,163,184,0.25);">
          <div style="font-weight:1000; color:#0f172a;">${escapeHtml(title)}</div>
          <button type="button" style="border:none; background:transparent; cursor:pointer; font-weight:1000; color:#64748b; font-size:18px;">✕</button>
        </div>
        <div style="padding:14px 16px; color:#0f172a; font-weight:800; max-height:60vh; overflow:auto; line-height:1.4;">${htmlEncoded}</div>
        <div style="padding:0 16px 16px;">
          <button type="button" style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid rgba(249,115,22,0.35); background:rgba(249,115,22,0.12); color:#ea580c; font-weight:1000; cursor:pointer;">Cerrar</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('button')?.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function renderExportMeta() {
    if (!exportMeta) return;
    const f = state.filters;

    const parts = [];
    if (f.category !== 'all') parts.push(`Categoría: ${TYPE_META[f.category]?.label || f.category}`);
    if (f.status !== 'all') parts.push(`Estado: ${f.status}`);
    if (f.dateStart || f.dateEnd) parts.push(`Fecha: ${f.dateStart || '…'} → ${f.dateEnd || '…'}`);
    if (f.searchLocation) parts.push(`Ubicación: “${f.searchLocation}”`);

    const summary = parts.length ? parts.join(' | ') : 'Sin filtros (todos los reportes)';
    exportMeta.textContent = `Exportación actual: ${state.filtered.length} reporte(s). Filtro usado: ${summary}`;
  }

  function getFilteredForExport() {
    return state.filtered || [];
  }

  function getAllForExport() {
    return state.all || [];
  }

  function setExportLoading(isLoading) {
    if (!exportLoading) return;
    exportLoading.style.display = isLoading ? 'flex' : 'none';
  }

  function requireExportLibs() {
    const missing = [];

    if (typeof window.XLSX === 'undefined') missing.push('XLSX');
    if (typeof window.saveAs === 'undefined') missing.push('saveAs (FileSaver)');

    const hasAutoTable =
      (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && typeof window.jspdf.jsPDF.API.autoTable === 'function') ||
      (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.prototype?.autoTable === 'function') ||
      (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF?.autoTable === 'function') ||
      (window.jspdf && typeof window.jspdf.jsPDF?.autoTable === 'function');

    if (!hasAutoTable) missing.push('autoTable (jspdf-autotable)');

    return missing;
  }

  function generateExcel(list, filename) {
    const missing = requireExportLibs();
    const missingExcel = missing.filter(x => x === 'XLSX' || x.includes('saveAs'));
    if (missingExcel.length) {
      showToast('No se pudo exportar Excel: falta ' + missingExcel.join(', '), 'error');
      throw new Error('Missing Excel libs: ' + missingExcel.join(', '));
    }

    const rows = list.map(i => ({
      fecha: i.dateText,
      hora: i.timeText,
      tipo: TYPE_META[i.type]?.label || i.type,
      ubicacion: i.address,
      descripcion: i.description,
      estado: i.status
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reportes');

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  }

  async function generatePDF(list, filterSummary) {
    const missing = requireExportLibs();
    if (missing.length) {
      showToast('No se pudo exportar PDF: falta ' + missing.join(', '), 'error');
      throw new Error('Missing PDF libs: ' + missing.join(', '));
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    function normalizePdfText(s) {
      return String(s ?? '')
        .replaceAll('\u2019', "'")
        .replaceAll('\u201C', '"')
        .replaceAll('\u201D', '"')
        .replaceAll('\u00A0', ' ');
    }

    const pageWidth = doc.internal.pageSize.getWidth();

    const now = new Date();
    const genDate = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(normalizePdfText('Reporte de Incidentes - Chía Segura'), pageWidth / 2, 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(normalizePdfText(`Fecha de generación: ${genDate}`), pageWidth / 2, 44, { align: 'center' });
    doc.text(normalizePdfText(`Resumen: ${list.length} exportado(s)`), pageWidth / 2, 58, { align: 'center' });

    const filterLine = normalizePdfText(`Filtro usado: ${filterSummary || 'Sin filtros'}`);
    doc.text('PRUEBA NORMAL PDF', 20, 20);
    doc.text(filterLine, pageWidth / 2, 70, { align: 'center' });

    const tableColumn = ['Fecha', 'Hora', 'Tipo', 'Ubicación', 'Descripción', 'Estado'];
    const tableRows = list.map(i => [
      i.dateText,
      i.timeText,
      TYPE_META[i.type]?.label || i.type,
      i.address,
      i.description,
      i.status
    ]);

    const autoTableFn =
      (typeof doc.autoTable === 'function' && doc.autoTable) ||
      (window.jspdf?.jsPDF?.API && typeof window.jspdf.jsPDF.API.autoTable === 'function' && window.jspdf.jsPDF.API.autoTable);

    if (typeof autoTableFn !== 'function') {
      throw new Error('autoTable is not a function (jspdf-autotable no registrado)');
    }

    const safeStr = (v) => normalizePdfText(v == null ? '' : String(v));
    const safeTableColumn = tableColumn.map(safeStr);
    const safeTableRows = tableRows.map(r => r.map(safeStr));

    autoTableFn.call(doc, {
      head: [safeTableColumn],
      body: safeTableRows,
      startY: 86,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: 255
      },
      columnStyles: {
        4: { cellWidth: 240 },
        3: { cellWidth: 170 }
      }
    });

    return doc;
  }

  function buildFilterSummaryForExport() {
    const f = state.filters;
    const parts = [];

    if (f.category !== 'all') parts.push(`Categoría: ${TYPE_META[f.category]?.label || f.category}`);
    if (f.status !== 'all') parts.push(`Estado: ${f.status}`);
    if (f.dateStart || f.dateEnd) parts.push(`Fecha: ${f.dateStart || '…'} → ${f.dateEnd || '…'}`);
    if (f.searchLocation) parts.push(`Ubicación: “${f.searchLocation}”`);

    return parts.length ? parts.join(' | ') : 'Sin filtros';
  }

  function showToast(msg, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
      return;
    }
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast toast--' + (type || 'success') + ' show';
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  function bindEvents() {
    document.querySelectorAll('[data-quick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const quick = btn.getAttribute('data-quick');
        applyQuickRange(quick);
      });
    });

    clearFiltersBtn?.addEventListener('click', () => {
      state.filters = {
        searchLocation: '',
        category: 'all',
        status: 'all',
        dateStart: '',
        dateEnd: '',
      };

      if (searchLocation) searchLocation.value = '';
      if (categoryFilter) categoryFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (dateStart) dateStart.value = '';
      if (dateEnd) dateEnd.value = '';

      filterAll();
    });

    applyFiltersBtn?.addEventListener('click', () => {
      state.filters.searchLocation = searchLocation?.value?.trim() || '';
      state.filters.category = categoryFilter?.value || 'all';
      state.filters.status = statusFilter?.value || 'all';
      state.filters.dateStart = dateStart?.value || '';
      state.filters.dateEnd = dateEnd?.value || '';

      setLoading(tableLoading, true);
      setTimeout(() => {
        filterAll();
      }, 140);
    });

    exportExcelFiltered?.addEventListener('click', () => {
      const list = getFilteredForExport();
      generateExcel(list, `ChiaSegura_Reportes_filtrados_${new Date().toISOString().slice(0,10)}.xlsx`);
    });

    exportExcelAll?.addEventListener('click', () => {
      const list = getAllForExport();
      generateExcel(list, `ChiaSegura_Reportes_todos_${new Date().toISOString().slice(0,10)}.xlsx`);
    });

    exportPdfFiltered?.addEventListener('click', async () => {
      const list = getFilteredForExport();
      const filterSummary = buildFilterSummaryForExport();

      setExportLoading(true);
      try {
        const doc = await generatePDF(list, filterSummary);
        doc.save(`ChiaSegura_Reportes_filtrados_${new Date().toISOString().slice(0,10)}.pdf`);
      } finally {
        setExportLoading(false);
      }
    });

    exportPdfAll?.addEventListener('click', async () => {
      const list = getAllForExport();
      setExportLoading(true);
      try {
        const doc = await generatePDF(list, 'Conjunto completo');
        doc.save(`ChiaSegura_Reportes_todos_${new Date().toISOString().slice(0,10)}.pdf`);
      } finally {
        setExportLoading(false);
      }
    });
  }

  function init() {
    setLoading(tableLoading, true);

    const rawAll = getIncidentByKeys();
    const normalized = rawAll
      .map(normalizeIncident)
      .filter(Boolean)
      .filter(i => (i.type || i.description || i.address));

    const seen = new Set();
    state.all = normalized.filter(i => {
      const k = String(i.id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    state.filtered = [...state.all];

    renderTable();
    renderExportMeta();

    setLoading(tableLoading, false);
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

