// Data utilities
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const EVENTS = [
  { year: 2008, month: 2,  label: 'UE suspende importação bovina BR', severity: 'high' },
  { year: 2012, month: 12, label: 'Caso atípico de BSE', severity: 'high' },
  { year: 2017, month: 3,  label: 'Operação Carne Fraca', severity: 'high' },
  { year: 2018, month: 5,  label: 'Greve dos caminhoneiros', severity: 'med' },
  { year: 2019, month: 8,  label: 'PSA China — pico de demanda', severity: 'med' },
  { year: 2020, month: 3,  label: 'COVID-19 — início pandemia', severity: 'high' },
  { year: 2021, month: 9,  label: 'China suspende bovina BR', severity: 'high' },
  { year: 2022, month: 3,  label: 'China reabre mercado bovino', severity: 'med' },
  { year: 2023, month: 2,  label: 'China suspende (atípico)', severity: 'med' },
  { year: 2024, month: 5,  label: 'Enchentes RS', severity: 'med' },
];

function fmt(n, opts = {}) {
  if (n == null || !isFinite(n)) return '—';
  if (opts.big) {
    if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(2) + ' bi';
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(2) + ' mi';
    if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + ' k';
    return Math.round(n).toLocaleString('pt-BR');
  }
  const d = opts.decimals ?? 2;
  return n.toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});
}
function fmtCompact(n, opts = {}) {
  if (n == null || !isFinite(n)) return '—';
  if (opts.big) {
    if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0) + 'k';
  }
  return fmt(n, opts);
}

function availableYears(data, dataset, field) {
  const ys = new Set();
  data[dataset].forEach(r => { if (r[field] != null) ys.add(r.year); });
  return [...ys].sort((a,b) => a-b);
}

function buildSeasonal(data, dataset, field, years) {
  const out = {};
  for (const y of years) out[y] = new Array(12).fill(null);
  for (const row of data[dataset]) {
    if (!out[row.year]) continue;
    out[row.year][row.month - 1] = row[field];
  }
  return out;
}

function buildStats(data, dataset, field, fromYear, toYear) {
  const byMonth = Array.from({length: 12}, () => []);
  for (const row of data[dataset]) {
    if (row.year < fromYear || row.year > toYear) continue;
    const v = row[field];
    if (v != null) byMonth[row.month - 1].push(v);
  }
  return byMonth.map(vals => {
    if (!vals.length) return null;
    const sorted = [...vals].sort((a,b) => a-b);
    const sum = sorted.reduce((a,b) => a+b, 0);
    return {
      min: sorted[0],
      max: sorted[sorted.length-1],
      mean: sum / sorted.length,
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      n: sorted.length,
    };
  });
}

function latestNonNull(data, dataset, field) {
  const arr = data[dataset];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i][field] != null) return arr[i];
  }
  return null;
}

function getValue(data, dataset, field, year, month) {
  const r = data[dataset].find(r => r.year === year && r.month === month);
  return r ? r[field] : null;
}

// ── Eventos mercado bovino EUA ────────────────────────────────────────────────
const EVENTS_US = [
  // Choques de demanda / acesso a mercados
  { year: 2003, month: 12, label: 'BSE EUA — Japão e Coreia fecham importações', severity: 'high' },
  { year: 2012, month: 3,  label: '"Pink slime" — choque de demanda doméstica',  severity: 'med'  },
  { year: 2015, month: 12, label: 'Fim do COOL — reentrada Canada/México',        severity: 'med'  },

  // Choques de oferta / capacidade
  { year: 2019, month: 8,  label: 'Incêndio Tyson Holcomb — 5% cap. abate EUA',  severity: 'high' },
  { year: 2020, month: 4,  label: 'COVID-19 — fechamento plantas + pico EdgeBeef', severity: 'high' },

  // Ciclo pecuário
  { year: 2014, month: 2,  label: 'Boi gordo em máxima histórica — herd shortage', severity: 'med' },
  { year: 2021, month: 7,  label: 'Seca Grandes Planícies — liquidação do rebanho', severity: 'med' },
  { year: 2023, month: 1,  label: 'Rebanho EUA: menor nível desde 1951',           severity: 'high' },

  // Outros
  { year: 2024, month: 3,  label: 'HPAI confirmada em bovinos de leite',           severity: 'med'  },
];

Object.assign(window, { MONTHS_PT, EVENTS, EVENTS_US, fmt, fmtCompact, availableYears, buildSeasonal, buildStats, latestNonNull, getValue });
