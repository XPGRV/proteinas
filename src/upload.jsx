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
  const m = String(s).match(/^(\w{3})-(\d{2})$/);
  if (!m) return null;
  const months = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
  const mo = months[m[1]];
  const yy = parseInt(m[2]);
  return { year: yy < 50 ? 2000 + yy : 1900 + yy, month: mo };
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
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheets = wb.SheetNames;
  const result = {};

  // ── BeefBR (abas: BeefBR, SECEX, Abates) ────────────────────────────────────
  if (parseBR && sheets.includes('BeefBR')) {
    const beefRaw = XLSX.utils.sheet_to_json(wb.Sheets['BeefBR'], { header: 1, raw: false });
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
        pct_femeas: (() => { const v = parseNum(r[35]); return v != null ? Math.round(v * 1000) / 10 : null; })(),
        usdbrl:              parseNum(r[39]),
      });
    }
    result.beef = trimEmpty(beef);
  }

  if (parseBR && sheets.includes('SECEX')) {
    const secexRaw = XLSX.utils.sheet_to_json(wb.Sheets['SECEX'], { header: 1, raw: false });
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

  if (parseBR && sheets.includes('Abates')) {
    const abatesRaw = XLSX.utils.sheet_to_json(wb.Sheets['Abates'], { header: 1, raw: false });
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
  if (parseUS && sheets.includes('BBG_Dados')) {
    // Edgebeef diário: col A=ano, col C=mês, col D=data completa (dia), col E=valor
    const bbgRaw = XLSX.utils.sheet_to_json(wb.Sheets['BBG_Dados'], { header: 1, raw: true });
    const edgebeef_daily = [];
    for (let i = 4; i < bbgRaw.length; i++) {
      const r = bbgRaw[i];
      if (!r || r[0] == null) continue;
      const year  = Number(r[0]);
      const month = Number(r[2]);
      const day   = r[3] instanceof Date ? r[3].getDate() : null;
      const value = parseNum(r[4]);
      if (!isFinite(year) || !isFinite(month) || !day || value == null) continue;
      edgebeef_daily.push({ year, month, day, value });
    }
    result.edgebeef_daily = edgebeef_daily;
  }

  if (parseUS && sheets.includes('BeefUS')) {
    // Mensal: col B=data (Date), col H=pct_femeas (decimal), col P=boi_bezerro_mm12
    const usRaw = XLSX.utils.sheet_to_json(wb.Sheets['BeefUS'], { header: 1, raw: true });
    const beef_us = [];
    for (let i = 4; i < usRaw.length; i++) {
      const r = usRaw[i];
      if (!r || !(r[1] instanceof Date)) continue;
      const year  = r[1].getFullYear();
      const month = r[1].getMonth() + 1;
      const pct_femeas       = (() => { const v = parseNum(r[7]);  return v != null ? Math.round(v * 1000) / 10 : null; })();
      const boi_bezerro_mm12 = parseNum(r[15]);
      beef_us.push({ year, month, pct_femeas, boi_bezerro_mm12 });
    }
    result.beef_us = beef_us;
  }

  if (Object.keys(result).length === 0) throw new Error('Nenhuma aba reconhecida (BeefBR, SECEX, Abates, BBG_Dados, BeefUS)');
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

      const meta = {
        source: file.name,
        updated: new Date().toISOString(),
        beefRows:          parsed.beef?.length           ?? null,
        secexRows:         parsed.secex?.length          ?? null,
        abatesRows:        parsed.abates?.length         ?? null,
        edgebeefRows:      parsed.edgebeef_daily?.length ?? null,
        beefUsRows:        parsed.beef_us?.length        ?? null,
      };

      // 1. Salva localmente (versão corrigida para '5')
      try {
        localStorage.setItem('dashboard_data', JSON.stringify(fullData));
        localStorage.setItem('dashboard_meta', JSON.stringify(meta));
        localStorage.setItem('dashboard_version', '5');
      } catch (_) {}

      // 2. Sobe para Supabase Storage
      setStatus({ kind: 'loading', msg: '☁ Salvando na nuvem…' });
      let cloudOk = false;
      try {
        const payload = JSON.stringify({ data: fullData, meta });
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

      onLoad(fullData, meta);
      const parts = [];
      if (parsed.beef)           parts.push(`${parsed.beef.length}L BeefBR`);
      if (parsed.secex)          parts.push(`${parsed.secex.length} SECEX`);
      if (parsed.abates)         parts.push(`${parsed.abates.length} Abates`);
      if (parsed.edgebeef_daily) parts.push(`${parsed.edgebeef_daily.length} Edgebeef diário`);
      if (parsed.beef_us)        parts.push(`${parsed.beef_us.length}L BeefUS`);
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
        accept=".xlsx,.xls"
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
