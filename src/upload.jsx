// Parse a workbook (ArrayBuffer) into the {beef, secex, abates} shape
// Assumes SheetJS (XLSX) is loaded globally

function parseNum(v) {
  if (v == null || v === '' || v === 'Sem Dados' || v === '-') return null;
  const s = String(v).replace(/,/g, '').replace(/\s/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
function parseMonthTag(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^([a-zA-Z]{3})[-/]?(\d{2,4})$/);
  if (!m) return null;
  const ALL_MO = { 
    jan:1, fev:2, feb:2, mar:3, abr:4, apr:4, mai:5, may:5, jun:6, 
    jul:7, ago:8, aug:8, set:9, sep:9, out:10, oct:10, nov:11, dez:12, dec:12 
  };
  const mo = ALL_MO[m[1].toLowerCase()];
  if (!mo) return null;
  let yr = parseInt(m[2]);
  if (yr < 100) yr += (yr < 50 ? 2000 : 1900);
  return { year: yr, month: mo };
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return { year: v.getFullYear(), month: v.getMonth()+1, day: v.getDate() };
  if (typeof v === 'string') {
    const tag = parseMonthTag(v);
    if (tag) return { year: tag.year, month: tag.month, day: 1 };
    const d = new Date(v);
    if (!isNaN(d)) return { year: d.getUTCFullYear(), month: d.getUTCMonth()+1, day: d.getUTCDate() };
  }
  if (typeof v === 'number' && v > 20000) {
    if (window.XLSX && window.XLSX.SSF) {
      try { const p = XLSX.SSF.parse_date_code(v); if (p) return { year: p.y, month: p.m, day: p.d }; } catch(_) {}
    }
  }
  return null;
}

function trimEmpty(arr) {
  return arr.filter(row =>
    Object.entries(row).some(([k, v]) => k !== 'year' && k !== 'month' && v != null)
  );
}

async function parseWorkbook(arrayBuffer, { parseBR = true, parseUS = true } = {}) {
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellStyles: true });
  const sheets = wb.SheetNames;
  // Case-insensitive sheet lookup
  const findSheet = name => sheets.find(s => s.toLowerCase() === name.toLowerCase()) || null;
  const result = {};

  // ── BeefBR (abas: BeefBR, SECEX, Abates) ────────────────────────────────────
  if (parseBR && findSheet('BeefBR')) {
    const beefRaw = XLSX.utils.sheet_to_json(wb.Sheets[findSheet('BeefBR')], { header: 1, raw: false });
    const beef = [];
    for (let i = 4; i < beefRaw.length; i++) {
      const r = beefRaw[i];
      if (!r || !r[1]) continue;
      const md = parseMonthTag(r[1]);
      if (!md) continue;
      beef.push({
        year: md.year, month: md.month,
        beef_carcass_brl_kg: parseNum(r[3]),
        beef_me_usd_kg:      parseNum(r[4]),
        beef_me_brl_kg:      parseNum(r[5]),
        cattle_brl_arroba:   parseNum(r[6]),
        cattle_brl_kg:       parseNum(r[7]),
        cattle_usd_kg:       parseNum(r[8]),
        px_secex_brl_kg:     parseNum(r[9]),
        spread_mi:           parseNum(r[11]),
        spread_me:           parseNum(r[13]),
        spread_me_usd:       parseNum(r[15]),
        spread_me_mi_pct:    parseNum(r[17]),
        abates_total:        parseNum(r[31]),
        abates_yoy:          parseNum(r[33]),
        abates_femeas:       parseNum(r[34]),
        pct_femeas: (() => { const v = parseNum(r[35]); if (v == null) return null; return v > 1 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 10; })(),
        usdbrl:              parseNum(r[39]),
      });
    }
    result.beef = trimEmpty(beef);
  }

  if (parseBR && findSheet('SECEX')) {
    const secexRaw = XLSX.utils.sheet_to_json(wb.Sheets[findSheet('SECEX')], { header: 1, raw: false });
    const secex = [];
    for (let i = 2; i < secexRaw.length; i++) {
      const r = secexRaw[i];
      if (!r || !r[1]) continue;
      const md = parseMonthTag(r[1]);
      if (!md) continue;
      secex.push({
        year: md.year, month: md.month,
        vol_suina_br:    parseNum(r[3]),
        vol_bovina_br:   parseNum(r[4]),
        vol_frango_br:   parseNum(r[5]),
        px_suina_usd:    parseNum(r[7]),
        px_suina_brl:    parseNum(r[8]),
        px_bovina_usd:   parseNum(r[9]),
        px_bovina_brl:   parseNum(r[10]),
        px_frango_usd:   parseNum(r[11]),
        px_frango_brl:   parseNum(r[12]),
        fx:              parseNum(r[14]),
        vol_suina_eua:   parseNum(r[17]),
        vol_bovina_eua:  parseNum(r[18]),
        vol_frango_eua:  parseNum(r[19]),
        px_suina_eua:    parseNum(r[21]),
        px_bovina_eua:   parseNum(r[22]),
        px_frango_eua:   parseNum(r[23]),
      });
    }
    result.secex = trimEmpty(secex);
  }

  if (parseBR && findSheet('Abates')) {
    const abatesRaw = XLSX.utils.sheet_to_json(wb.Sheets[findSheet('Abates')], { header: 1, raw: false });
    const abates = [];
    for (let i = 2; i < abatesRaw.length; i++) {
      const r = abatesRaw[i];
      if (!r || !r[1]) continue;
      const md = parseMonthTag(r[1]);
      if (!md) continue;
      abates.push({
        year: md.year, month: md.month,
        bois:        parseNum(r[2]),
        vacas:       parseNum(r[3]),
        novilhos:    parseNum(r[4]),
        novilhas:    parseNum(r[5]),
        vitelos:     parseNum(r[6]),
        total:       parseNum(r[7]),
        pct_bois:    parseNum(r[8]),
        pct_vacas:   parseNum(r[9]),
        pct_novilhos: parseNum(r[10]),
        pct_novilhas: parseNum(r[11]),
        pct_vitelos: parseNum(r[12]),
        peso_total:  parseNum(r[19]),
      });
    }
    result.abates = trimEmpty(abates);
  }

  // ── BeefUS (abas: BBG_Dados, BeefUS) ────────────────────────────────────────
  if (parseUS && findSheet('BBG_Dados')) {
    // Edgebeef diário: col D=data, col E=valor (Edge Beef Margin USD/cwt)
    const bbgRaw = XLSX.utils.sheet_to_json(wb.Sheets[findSheet('BBG_Dados')], { header: 1, raw: true });
    // r[3]=data (Date obj só nas primeiras linhas; resto null por fórmula sem cache)
    // Rastreia data incrementando 1 dia por linha de dados
    // r[6]=valor Edge Beef (primário), r[4]=fallback
    const edgebeef_daily = [];
    let curDate = null;
    for (let i = 3; i < bbgRaw.length; i++) {
      const r = bbgRaw[i];
      if (!r) continue;
      const hasData = r[4] != null || r[5] != null || r[6] != null;
      if (!hasData) continue;
      const pd = parseDate(r[3]);
      if (pd) {
        curDate = new Date(Date.UTC(pd.year, pd.month - 1, pd.day));
      } else if (curDate) {
        curDate = new Date(curDate.getTime() + 86400000); // +1 dia
      } else continue;
      const year = curDate.getUTCFullYear(), month = curDate.getUTCMonth()+1, day = curDate.getUTCDate();
      const value = parseNum(r[4]); // coluna E
      if (value == null) continue;
      edgebeef_daily.push({ year, month, day, value });
    }
    result.edgebeef_daily = edgebeef_daily;
  }

  if (parseUS && findSheet('BeefUS')) {
    // col B(1)=data, col H(7)=pct_femeas, col P(15)=boi_bezerro_mm12
    const usRaw = XLSX.utils.sheet_to_json(wb.Sheets[findSheet('BeefUS')], { header: 1, raw: true });
    const beef_us = [];
    for (let i = 4; i < usRaw.length; i++) {
      const r = usRaw[i];
      if (!r) continue;
      const pd = parseDate(r[1]);
      if (!pd) continue;
      const year  = pd.year;
      const month = pd.month;
      const pct_femeas       = (() => { const v = parseNum(r[7]);  if (v == null) return null; return v > 1 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 10; })();
      const boi_bezerro_mm12 = parseNum(r[15]);
      beef_us.push({ year, month, pct_femeas, boi_bezerro_mm12 });
    }
    result.beef_us = beef_us;
  }

  // ── Production (aba: Production) ─────────────────────────────────────────────
  if (parseUS && findSheet('Production')) {
    const ws   = wb.Sheets[findSheet('Production')];
    const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });

    // Months in EN and PT (lowercase) → number
    const ALL_MO = { 
      jan:1, fev:2, feb:2, mar:3, abr:4, apr:4, mai:5, may:5, jun:6, 
      jul:7, ago:8, aug:8, set:9, sep:9, out:10, oct:10, nov:11, dez:12, dec:12 
    };

    // Row 0: "Total Production          dez-25" — extract trailing "mmm-yy" token
    const hdrRow = raw[0] || [];
    const snapshotCols = [];
    for (let c = 2; c < hdrRow.length; c++) {
      const h = String(hdrRow[c] || '').trim();
      const token = h.split(/\s+/).pop() || '';
      const m = token.match(/^([a-z]{3})-(\d{2,4})$/i);
      if (m) {
        const mo = ALL_MO[m[1].toLowerCase()];
        let yr = parseInt(m[2]);
        if (yr < 100) yr += 2000;
        if (mo && yr) snapshotCols.push({ col: c, label: token.toLowerCase(), year: yr, month: mo });
      }
    }

    if (snapshotCols.length >= 1) {
      // Detect forecast via font color (orange = theme 5 / #ED7D31 = forecast; green = historical)
      const isForecastCell = (ri, ci) => {
        try {
          const cell = ws[XLSX.utils.encode_cell({ r: ri, c: ci })];
          if (!cell?.s) return null;
          const fc = cell.s.font?.color || {};
          if (fc.theme === 5 || fc.theme === 4) return true;
          const rgb = (fc.rgb || '').toUpperCase().replace(/^FF/, '');
          if (['ED7D31','E36C09','FFC000','F79646','E26B0A'].some(c => rgb.startsWith(c))) return true;
          if (['00B050','70AD47','92D050'].some(c => rgb.startsWith(c))) return false;
        } catch (_) {}
        return null;
      };

      // Quarter label: "1Q25", "Q1 25", "1T25", "T1 25", "1Q2025", etc.
      const parseQLabel = s => {
        let m;
        if ((m = s.match(/^([1-4])[QT](\d{2})$/i)))    return { q: +m[1], y: 2000 + +m[2] };
        if ((m = s.match(/^[QT]([1-4])\s*(\d{2})$/i))) return { q: +m[1], y: 2000 + +m[2] };
        if ((m = s.match(/^([1-4])[QT](\d{4})$/i)))    return { q: +m[1], y: +m[2] };
        if ((m = s.match(/^[QT]([1-4])\s*(\d{4})$/i))) return { q: +m[1], y: +m[2] };
        // "Jan-00", "Apr-25" → Q1-Q4 (mês inicial do trimestre)
        if ((m = s.match(/^([a-z]{3})[-/]?(\d{2,4})$/i))) {
          const Q = {jan:1,feb:1,mar:1,apr:2,may:2,jun:2,jul:3,aug:3,sep:3,oct:4,nov:4,dec:4,
                     fev:1,abr:2,mai:2,ago:3,set:3,out:4,dez:4};
          const q = Q[m[1].toLowerCase()];
          let yr = parseInt(m[2]);
          if (yr < 100) yr += 2000;
          if (q) return { q, y: yr };
        }
        return null;
      };

      const snapshots  = snapshotCols.map(s => s.label);
      const bySnapshot = {};

      // Detecta em qual coluna (0-4) ficam os labels de trimestre
      let qLabelCol = 1;
      for (let ri = 2; ri < Math.min(10, raw.length); ri++) {
        for (let c = 0; c <= 4; c++) {
          if (parseQLabel(String(raw[ri]?.[c] || '').trim())) { qLabelCol = c; break; }
        }
      }
      for (let ri = 2; ri < raw.length; ri++) {
        const row    = raw[ri];
        const qLabel = String(row[qLabelCol] || '').trim();
        const qm     = parseQLabel(qLabel);
        if (!qm) continue;
        const quarter = qm.q;
        const year    = qm.y;

        for (const snap of snapshotCols) {
          const v = parseNum(row[snap.col]);
          if (v == null) continue;

          let forecast = isForecastCell(ri, snap.col);
          // Date-based fallback: if quarter ends at or after snapshot month → forecast
          if (forecast === null) {
            const qEndMonth = quarter * 3;
            forecast = year > snap.year || (year === snap.year && qEndMonth >= snap.month);
          }

          if (!bySnapshot[snap.label]) bySnapshot[snap.label] = [];
          bySnapshot[snap.label].push({ year, quarter, value: v, isForecast: !!forecast });
        }
      }

      result.production = { snapshots, bySnapshot };
    }
  }

  if (Object.keys(result).length === 0) throw new Error(`Nenhuma aba reconhecida. Abas encontradas: ${sheets.join(', ')}`);
  return result;
}

// Upload widget component
const UploadWidget = ({ onLoad, lastUpdate, currentSource }) => {
  const [status, setStatus] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus({ kind: 'loading', msg: 'Processando ' + file.name + '…' });
    try {
      const ab = await file.arrayBuffer();
      // Detecção pelo nome do arquivo para evitar ler abas erradas
      // (BeefBR.xlsm também tem BBG_Dados mas não deve atualizar o BeefUS)
      const nameLC = file.name.toLowerCase();
      const forceUS = nameLC.includes('beefus');
      const forceBR = nameLC.includes('beefbr') || (!forceUS);
      const parsed = await parseWorkbook(ab, { parseBR: forceBR && !forceUS, parseUS: forceUS });

      // Mescla com dados existentes para preservar beef_us / edgebeef_daily
      const fullData = { ...(window.__dashboardData || {}), ...parsed };
      window.__dashboardData = fullData;

      // Meta separado por planilha — não sobrescreve o log da outra aba
      const metaEntry = { source: file.name, updated: new Date().toISOString() };
      const metaKey   = forceUS ? 'us' : 'br';
      const prevMeta  = window.__dashboardMeta || {};
      const fullMeta  = { ...prevMeta, [metaKey]: metaEntry };
      window.__dashboardMeta = fullMeta;

      // 1. Salva localmente
      try {
        localStorage.setItem('dashboard_data', JSON.stringify(fullData));
        localStorage.setItem('dashboard_meta', JSON.stringify(fullMeta));
        localStorage.setItem('dashboard_version', '5');
      } catch (_) {}

      // 2. Sobe para Supabase Storage
      setStatus({ kind: 'loading', msg: '☁ Salvando na nuvem…' });
      let cloudOk = false;
      try {
        const payload = JSON.stringify({ data: fullData, meta: fullMeta });
        const res = await fetch(
          `${window.__SB_URL}/storage/v1/object/dashboard/data.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${window.__SB_KEY}`,
              'Content-Type': 'application/json',
              'x-upsert': 'true',
            },
            body: payload,
          }
        );
        cloudOk = res.ok;
        if (!res.ok) console.warn('Supabase upload HTTP', res.status, await res.text());
      } catch (e) {
        console.warn('Supabase upload falhou:', e);
      }

      onLoad(fullData, fullMeta);
      const parts = [];
      if (parsed.beef)           parts.push(`${parsed.beef.length}L BeefBR`);
      if (parsed.secex)          parts.push(`${parsed.secex.length} SECEX`);
      if (parsed.abates)         parts.push(`${parsed.abates.length} Abates`);
      if (parsed.edgebeef_daily) parts.push(`${parsed.edgebeef_daily.length} Edgebeef diário`);
      if (parsed.beef_us)        parts.push(`${parsed.beef_us.length}L BeefUS`);
      if (parsed.production)     parts.push(`${parsed.production.snapshots.length} snapshots Produção`);
      const cloudBadge = cloudOk ? ' · ☁ nuvem atualizada' : ' · ⚠ nuvem offline';
      setStatus({ kind: 'ok', msg: `✓ ${parts.join(' · ')}${cloudBadge}` });
      setTimeout(() => setStatus(null), 5000);
    } catch (e) {
      console.error(e);
      setStatus({ kind: 'err', msg: 'Erro: ' + (e.message || 'falha ao ler planilha') });
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div className={`upload-widget ${dragging ? 'is-drag' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        style={{display:'none'}}
        onChange={e => handleFile(e.target.files[0])}
      />
      <button className="upload-btn" onClick={() => inputRef.current.click()}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7,2 L7,10 M3,6 L7,2 L11,6 M2,12 L12,12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        </svg>
        <span>Atualizar planilha</span>
      </button>
      <div className="upload-meta">
        {status ? (
          <span className={`upload-status is-${status.kind}`}>{status.msg}</span>
        ) : lastUpdate ? (
          <span className="upload-last">
            <span className="upload-last-src">{currentSource || 'planilha'}</span>
            <span className="upload-last-time">· atualizado {formatRelative(lastUpdate)}</span>
          </span>
        ) : (
          <span className="upload-hint">ou arraste o .xlsx aqui</span>
        )}
      </div>
    </div>
  );
};

function formatRelative(iso) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return Math.floor(diff/60) + ' min atrás';
    if (diff < 86400) return Math.floor(diff/3600) + ' h atrás';
    const days = Math.floor(diff/86400);
    if (days < 30) return days + ' d atrás';
    return d.toLocaleDateString('pt-BR');
  } catch { return ''; }
}

Object.assign(window, { parseWorkbook, UploadWidget });
