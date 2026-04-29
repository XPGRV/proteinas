// BimonthlyCard — Sazonal (empresa + anos) e Contínuo (3 linhas simultâneas)

const BM_LABELS = ['Jan/Fev','Mar/Abr','Mai/Jun','Jul/Ago','Set/Out','Nov/Dez'];
const BM_SHORT  = ['J/F','M/A','M/J','J/A','S/O','N/D'];

function toBimonthly(rows, fieldKeys) {
  const map = {};
  for (const r of rows) {
    const bm  = Math.ceil(r.month / 2);
    const key = `${r.year}-${bm}`;
    if (!map[key] && fieldKeys.some(f => r[f] != null)) {
      const entry = { year: r.year, bimonth: bm };
      for (const f of fieldKeys) entry[f] = r[f] ?? null;
      map[key] = entry;
    }
  }
  return Object.values(map).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.bimonth - b.bimonth
  );
}

// Mesma paleta do SeasonalChart
function makeYearColor(accent) {
  const palette = [
    'oklch(0.75 0.15 200)','oklch(0.68 0.16 255)','oklch(0.74 0.15 310)',
    'oklch(0.78 0.17 35)', 'oklch(0.80 0.15 60)', 'oklch(0.72 0.16 0)',
    'oklch(0.76 0.13 170)',
  ];
  return (yr, selectedYears) => {
    const latest = Math.max(...selectedYears);
    const age = latest - yr;
    if (age === 0) return accent;
    if (age - 1 < palette.length) return palette[age - 1];
    const t = Math.min(1, (age - palette.length) / 4);
    return `oklch(${0.48 - t * 0.08} 0.01 260)`;
  };
}

// ── Seasonal (eixo bimestral, 1 empresa, anos sobrepostos) ────────────────────
function BimonthlySeasonalChart({ bmRows, fieldKey, accent, selectedYears, height = 420 }) {
  const svgRef     = React.useRef(null);
  const [W, setW]  = React.useState(760);
  const [hoverBm, setHoverBm] = React.useState(null);
  const [hoverX, setHoverX]   = React.useState(0);
  const [mouseY, setMouseY]   = React.useState(0);
  const [pinnedYear, setPinnedYear] = React.useState(null);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const H = height;
  const padL = 58, padR = 24, padT = 14, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const seasonal = React.useMemo(() => {
    const s = {};
    for (const r of bmRows) {
      if (!s[r.year]) s[r.year] = {};
      s[r.year][r.bimonth] = r[fieldKey] ?? null;
    }
    return s;
  }, [bmRows, fieldKey]);

  const yearColor = React.useMemo(() => makeYearColor(accent), [accent]);

  const sortedYears  = [...selectedYears].sort((a, b) => a - b);
  const latestYear   = sortedYears[sortedYears.length - 1];
  const displayYears = pinnedYear ? [pinnedYear] : sortedYears;

  const allVals = React.useMemo(() =>
    bmRows.filter(r => selectedYears.includes(r.year)).map(r => r[fieldKey]).filter(v => v != null),
    [bmRows, selectedYears, fieldKey]
  );
  if (!allVals.length) {
    return <div style={{height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)', fontSize:13}}>Sem dados</div>;
  }

  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.08, yMax = maxV + span * 0.08;

  const x   = bm => padL + ((bm - 1) / 5) * chartW;
  const y   = v  => padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const fmt = v  => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(1).replace('.', ',') + '%';

  const seriesOpacity = yr => pinnedYear ? (yr === pinnedYear ? 1 : 0.10) : (yr === latestYear ? 1 : 0.80);
  const seriesWidth   = yr => pinnedYear ? (yr === pinnedYear ? 2.5 : 1) : (yr === latestYear ? 2 : 1.25);

  const range = yMax - yMin;
  const rawStep = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const norm = rawStep / mag;
  const nStep = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const step = nStep * mag;
  const yTicks = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + step * 0.01; v += step)
    yTicks.push(parseFloat(v.toPrecision(10)));

  const buildPath = (yr) => {
    const pts = [];
    for (let bm = 1; bm <= 6; bm++) {
      const v = seasonal[yr]?.[bm];
      if (v != null) pts.push(`${pts.length === 0 ? 'M' : 'L'}${x(bm).toFixed(1)},${y(v).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const onMouseMove = React.useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const bm = Math.round(((e.clientX - rect.left - padL) / chartW) * 5) + 1;
    if (bm >= 1 && bm <= 6) {
      setHoverBm(bm); setHoverX(x(bm)); setMouseY(e.clientY - rect.top);
    }
  }, [chartW]);

  return (
    <div style={{position:'relative'}}>
      <svg ref={svgRef} width="100%" height={H} style={{display:'block', overflow:'visible'}}
        onMouseMove={onMouseMove} onMouseLeave={() => setHoverBm(null)}>
        <defs>
          <clipPath id="bm-sea-clip">
            <rect x={padL} y={padT - 2} width={chartW} height={chartH + 6}/>
          </clipPath>
        </defs>

        {/* Grid + Y labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={0.7}
              style={{opacity:0, animation:`rx-grid-fade 0.5s ease-out ${i * 0.06}s forwards`}}/>
            <text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="var(--fg-dim)">{fmt(v)}</text>
          </g>
        ))}

        {/* Linha do zero destacada */}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)}
            stroke="var(--fg)" strokeWidth={1} strokeOpacity={0.35}/>
        )}

        {/* X axis */}
        <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="var(--border)" strokeWidth={1}/>
        {[1,2,3,4,5,6].map(bm => (
          <g key={bm}>
            <line x1={x(bm)} x2={x(bm)} y1={padT + chartH} y2={padT + chartH + 4} stroke="var(--fg-dim)" strokeWidth={0.5}/>
            <text x={x(bm)} y={padT + chartH + 15} textAnchor="middle" fontSize={10} fill="var(--fg-dim)">{BM_LABELS[bm - 1]}</text>
          </g>
        ))}

        {/* Linhas por ano (multi-ponto, com clip) */}
        <g clipPath="url(#bm-sea-clip)">
          {displayYears.map(yr => {
            const color = yearColor(yr, selectedYears);
            const bmsWithData = [1,2,3,4,5,6].filter(bm => seasonal[yr]?.[bm] != null);
            if (bmsWithData.length <= 1) return null; // pontos únicos renderizados fora do clip
            const path = buildPath(yr);
            return (
              <g key={yr}>
                <path d={path} fill="none" stroke={color}
                  strokeWidth={seriesWidth(yr)} strokeLinejoin="round" strokeLinecap="round"
                  opacity={seriesOpacity(yr)}/>
                <path d={path} fill="none" stroke="transparent" strokeWidth={12}
                  style={{cursor:'pointer'}}
                  onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
              </g>
            );
          })}
        </g>

        {/* Pontos únicos — fora do clip para não cortar nas bordas */}
        {displayYears.map(yr => {
          const color = yearColor(yr, selectedYears);
          const bmsWithData = [1,2,3,4,5,6].filter(bm => seasonal[yr]?.[bm] != null);
          if (bmsWithData.length !== 1) return null;
          const bm = bmsWithData[0];
          const v = seasonal[yr][bm];
          const isCurrent = yr === latestYear;
          return (
            <g key={`single-${yr}`} onClick={() => setPinnedYear(p => p === yr ? null : yr)} style={{cursor:'pointer'}}>
              <circle cx={x(bm)} cy={y(v)} r={14} fill="transparent"/>
              <circle cx={x(bm)} cy={y(v)}
                r={isCurrent ? 5 : 4}
                fill="var(--bg)" stroke={color}
                strokeWidth={isCurrent ? 2 : 1.25}
                opacity={seriesOpacity(yr)}/>
            </g>
          );
        })}

        {/* Data labels quando um ano está pinado — estilo SeasonalChart */}
        {pinnedYear && (
          <g>
            {[1,2,3,4,5,6].map(bm => {
              const v = seasonal[pinnedYear]?.[bm];
              if (v == null) return null;
              const color = yearColor(pinnedYear, selectedYears);
              const cx = x(bm), cy = y(v);
              const above = cy - padT > 22;
              const nearLeft = cx < padL + 28;
              const anchor = nearLeft ? 'start' : 'middle';
              const lx = nearLeft ? padL + 4 : cx;
              return (
                <g key={bm}>
                  <circle cx={cx} cy={cy} r={3.5} fill={color} opacity={0.9}/>
                  <text x={lx} y={above ? cy - 8 : cy + 14}
                    textAnchor={anchor} dominantBaseline="auto"
                    style={{fontFamily:'var(--font-mono)', fontSize:10, fill:color, fontWeight:500, letterSpacing:'0.02em'}}>
                    {fmt(v)}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Hover crosshair + dots */}
        {hoverBm != null && (
          <g>
            <line x1={x(hoverBm)} x2={x(hoverBm)} y1={padT} y2={padT + chartH}
              stroke="var(--fg)" strokeOpacity={0.2} strokeWidth={1}/>
            {displayYears.map(yr => {
              const v = seasonal[yr]?.[hoverBm];
              if (v == null) return null;
              const isPinned = yr === pinnedYear;
              const isCurrent = yr === latestYear;
              return (
                <circle key={yr} cx={x(hoverBm)} cy={y(v)}
                  r={isPinned ? 5 : isCurrent ? 4 : 3}
                  fill="var(--bg)" stroke={yearColor(yr, selectedYears)}
                  strokeWidth={isPinned ? 2.5 : isCurrent ? 2 : 1.25}
                  style={{cursor:'pointer'}}
                  onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
              );
            })}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hoverBm != null && (() => {
        const isRight = hoverX > W * 0.75;
        const visYears = [...displayYears].sort((a, b) => b - a);
        return (
          <div className="hover-card" style={{
            left:`${(hoverX / W * 100).toFixed(1)}%`,
            top: Math.max(10, Math.min(H - 110, mouseY - 40)),
            transform: isRight ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)',
          }}>
            <div className="hover-month">{BM_LABELS[hoverBm - 1]}</div>
            <div className="hover-rows">
              {visYears.map(yr => {
                const v = seasonal[yr]?.[hoverBm];
                return (
                  <div key={yr} className="hover-row">
                    <span className="hover-year" style={{color: yearColor(yr, selectedYears)}}>{yr}</span>
                    <span className="hover-val">{fmt(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Legenda de anos */}
      <div className="ciclo-legend">
        {[...selectedYears].sort((a, b) => b - a).map(yr => (
          <span key={yr} className="legend-year"
            style={{
              userSelect:'none', padding:'2px 6px', cursor:'pointer',
              opacity: pinnedYear && pinnedYear !== yr ? 0.3 : 1,
              outline: pinnedYear === yr ? `1px solid ${yearColor(yr, selectedYears)}` : 'none',
              borderRadius: 4,
            }}
            onClick={() => setPinnedYear(p => p === yr ? null : yr)}>
            <span className="legend-line" style={{background: yearColor(yr, selectedYears)}}/>
            {yr}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Continuous (3 linhas, eixo temporal bimestral) ────────────────────────────
function BimonthlyContChart({ bmRows, fields, rangeYears, height = 420 }) {
  const svgRef    = React.useRef(null);
  const [W, setW] = React.useState(760);
  const [hovered, setHovered]             = React.useState(null);
  const [pinnedCompany, setPinnedCompany] = React.useState(null);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const filtered = React.useMemo(() => {
    if (!bmRows.length || rangeYears === 'all') return bmRows;
    const last = bmRows[bmRows.length - 1];
    const cutOrd = last.year * 6 + last.bimonth - 1 - rangeYears * 6;
    return bmRows.filter(r => r.year * 6 + r.bimonth - 1 > cutOrd);
  }, [bmRows, rangeYears]);

  const H = height;
  const padL = 58, padR = 24, padT = 14, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = React.useMemo(() =>
    filtered.flatMap(r => fields.map(f => r[f.key]).filter(v => v != null)),
    [filtered, fields]
  );
  if (!allVals.length) {
    return <div style={{height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)', fontSize:13}}>Sem dados</div>;
  }

  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.08, yMax = maxV + span * 0.08;

  const firstOrd = filtered[0].year * 6 + filtered[0].bimonth - 1;
  const lastOrd  = filtered[filtered.length - 1].year * 6 + filtered[filtered.length - 1].bimonth - 1;
  const totalBms = lastOrd - firstOrd || 1;

  const xOf    = r   => padL + ((r.year * 6 + r.bimonth - 1 - firstOrd) / totalBms) * chartW;
  const xOfOrd = ord => padL + ((ord - firstOrd) / totalBms) * chartW;
  const yOf    = v   => padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const fmt    = v   => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(1).replace('.', ',') + '%';

  const rangeYrsNum = totalBms / 6;
  const stepBms = rangeYrsNum <= 6 ? 3 : 6;
  const xTicks  = [];
  const tickStart = Math.ceil(firstOrd / stepBms) * stepBms;
  for (let ord = tickStart; ord <= lastOrd; ord += stepBms) {
    const yr = Math.floor(ord / 6);
    const bm = (ord % 6) + 1;
    xTicks.push({ x: xOfOrd(ord), label: stepBms === 3 ? `${BM_SHORT[bm - 1]}/${String(yr).slice(-2)}` : String(yr) });
  }

  const range2 = yMax - yMin;
  const rawStep = range2 / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const norm = rawStep / mag;
  const nStep = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const tickStep = nStep * mag;
  const yTicks = [];
  for (let v = Math.ceil(yMin / tickStep) * tickStep; v <= yMax + tickStep * 0.01; v += tickStep)
    yTicks.push(parseFloat(v.toPrecision(10)));

  const lineOpacity = key => pinnedCompany ? (key === pinnedCompany ? 1 : 0.15) : 1;
  const lineWidth   = key => pinnedCompany === key ? 2.5 : 2;

  const buildPath = (key) => {
    let path = '', inPath = false;
    for (const r of filtered) {
      const v = r[key];
      if (v != null) {
        const pt = `${xOf(r).toFixed(1)},${yOf(v).toFixed(1)}`;
        path += inPath ? `L${pt}` : `M${pt}`; inPath = true;
      } else { inPath = false; }
    }
    return path;
  };

  const onMouseMove = React.useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px   = (e.clientX - rect.left - padL) / chartW;
    const ord  = firstOrd + px * totalBms;
    let best = null, bestD = Infinity;
    for (const r of filtered) {
      const d = Math.abs(r.year * 6 + r.bimonth - 1 - ord);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (best) setHovered({ x: xOf(best), row: best, mouseY: e.clientY - rect.top });
  }, [filtered, firstOrd, totalBms, chartW]);

  return (
    <div style={{position:'relative'}}>
      <svg ref={svgRef} width="100%" height={H} style={{display:'block', overflow:'visible'}}
        onMouseMove={onMouseMove} onMouseLeave={() => setHovered(null)}>
        <defs>
          <clipPath id="bm-cont-clip">
            <rect x={padL} y={padT - 2} width={chartW} height={chartH + 6}/>
          </clipPath>
        </defs>

        {/* Grid + Y labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yOf(v)} y2={yOf(v)} stroke="var(--grid)" strokeWidth={0.7}
              style={{opacity:0, animation:`rx-grid-fade 0.5s ease-out ${i * 0.06}s forwards`}}/>
            <text x={padL - 6} y={yOf(v) + 4} textAnchor="end" fontSize={10} fill="var(--fg-dim)">{fmt(v)}</text>
          </g>
        ))}

        {/* Linha do zero destacada */}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={padL} x2={W - padR} y1={yOf(0)} y2={yOf(0)}
            stroke="var(--fg)" strokeWidth={1} strokeOpacity={0.35}/>
        )}

        <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="var(--border)" strokeWidth={1}/>

        {/* X ticks */}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} x2={t.x} y1={padT + chartH} y2={padT + chartH + 4} stroke="var(--fg-dim)" strokeWidth={0.5}/>
            <text x={t.x} y={padT + chartH + 14} textAnchor="middle" fontSize={10} fill="var(--fg-dim)">{t.label}</text>
          </g>
        ))}

        {/* Linhas + hitbox clicável */}
        <g clipPath="url(#bm-cont-clip)">
          {fields.map(f => {
            const path = buildPath(f.key);
            if (!path) return null;
            return (
              <g key={f.key}>
                <path d={path} fill="none" stroke={f.color}
                  strokeWidth={lineWidth(f.key)} strokeLinejoin="round"
                  opacity={lineOpacity(f.key)}/>
                <path d={path} fill="none" stroke="transparent" strokeWidth={12}
                  style={{cursor:'pointer'}}
                  onClick={() => setPinnedCompany(p => p === f.key ? null : f.key)}/>
              </g>
            );
          })}
        </g>

        {/* Hover crosshair + dots */}
        {hovered && (
          <g>
            <line x1={hovered.x} x2={hovered.x} y1={padT} y2={padT + chartH}
              stroke="var(--fg)" strokeOpacity={0.2} strokeWidth={1}/>
            {fields.map(f => {
              const v = hovered.row[f.key];
              if (v == null) return null;
              const isPinned = pinnedCompany === f.key;
              const dimmed   = pinnedCompany && !isPinned;
              return (
                <circle key={f.key} cx={hovered.x} cy={yOf(v)}
                  r={isPinned ? 5 : dimmed ? 2.5 : 4}
                  fill="var(--bg-panel)" stroke={f.color}
                  strokeWidth={isPinned ? 2.5 : dimmed ? 1 : 2}
                  style={{cursor:'pointer'}}
                  onClick={() => setPinnedCompany(p => p === f.key ? null : f.key)}/>
              );
            })}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (() => {
        const r = hovered.row;
        const isRight = hovered.x > W * 0.75;
        const visFields = pinnedCompany ? fields.filter(f => f.key === pinnedCompany) : fields;
        return (
          <div className="hover-card" style={{
            left:`${(hovered.x / W * 100).toFixed(1)}%`,
            top: Math.max(10, Math.min(H - 110, hovered.mouseY - 40)),
            transform: isRight ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)',
          }}>
            <div className="hover-month">{BM_LABELS[r.bimonth - 1]}/{r.year}</div>
            <div className="hover-rows">
              {visFields.map(f => (
                <div key={f.key} className="hover-row">
                  <span className="hover-year" style={{color: f.color}}>{f.label}</span>
                  <span className="hover-val">{fmt(r[f.key])}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legenda — clicável para pinnar empresa */}
      <div className="ciclo-legend">
        {fields.map(f => (
          <span key={f.key} className="legend-year"
            style={{
              userSelect:'none', padding:'2px 6px', cursor:'pointer',
              opacity: pinnedCompany && pinnedCompany !== f.key ? 0.3 : 1,
              outline: pinnedCompany === f.key ? `1px solid ${f.color}` : 'none',
              borderRadius: 4,
            }}
            onClick={() => setPinnedCompany(p => p === f.key ? null : f.key)}>
            <span className="legend-line" style={{background: f.color}}/>
            {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── BimonthlyCard ─────────────────────────────────────────────────────────────
function BimonthlyCard({ cardId, title, sub, data, dataset, fields, accent, height = 420 }) {
  const [mode, setMode]             = React.useState('seasonal');
  const [range, setRange]           = React.useState('5');
  const [selYears, setSelYears]     = React.useState(null);
  const [activeFieldIdx, setActiveFieldIdx] = React.useState(0);

  const allRows   = data[dataset] || [];
  const fieldKeys = fields.map(f => f.key);
  const bmRows    = React.useMemo(() => toBimonthly(allRows, fieldKeys), [allRows, fieldKeys.join(',')]);
  const years     = React.useMemo(() => [...new Set(bmRows.map(r => r.year))].sort((a, b) => a - b), [bmRows]);
  const latest    = years[years.length - 1];

  const PRESETS = [
    { label:'3a',    yrs: [latest, latest-1, latest-2] },
    { label:'5a',    yrs: [latest, latest-1, latest-2, latest-3, latest-4] },
    { label:'10a',   yrs: Array.from({length:10}, (_, i) => latest - i) },
    { label:'Todos', yrs: years },
  ];
  const defaultYears  = React.useMemo(
    () => [latest, latest-1, latest-2, latest-3, latest-4].filter(y => years.includes(y)),
    [latest, years.join(',')]
  );
  const activeYears   = selYears ?? defaultYears;
  const activePreset  = PRESETS.find(p => {
    const v = p.yrs.filter(y => years.includes(y));
    return v.length === activeYears.length && v.every(y => activeYears.includes(y));
  });
  const rangeNum = range === 'all' ? 'all' : parseInt(range);

  if (!bmRows.length) {
    return (
      <section className="card card-full" data-card-id={cardId}>
        <div style={{height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)', fontSize:13}}>Sem dados</div>
      </section>
    );
  }

  return (
    <section className="card card-full" data-card-id={cardId}>
      <div className="card-head">
        <div>
          <div className="card-eyebrow">{sub}</div>
          <h3 className="card-title">{title}</h3>
        </div>

        <div className="card-controls">
          {/* Linha 1: empresa (esquerda, sazonal) + modo (direita) */}
          <div className="card-ctrl-row" style={{display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end'}}>
            {mode === 'seasonal' && (
              <div className="seg">
                {fields.map((f, i) => (
                  <button key={f.key}
                    className={`seg-btn ${activeFieldIdx === i ? 'is-on' : ''}`}
                    onClick={() => setActiveFieldIdx(i)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <div className="seg">
              <button className={`seg-btn ${mode === 'seasonal'   ? 'is-on' : ''}`} onClick={() => setMode('seasonal')}>Sazonal</button>
              <button className={`seg-btn ${mode === 'continuous' ? 'is-on' : ''}`} onClick={() => setMode('continuous')}>Contínuo</button>
            </div>
          </div>

          {/* Seletor de período */}
          <div className="card-ctrl-row">
            {mode === 'seasonal' ? (
              <div className="year-seg">
                {PRESETS.map(p => (
                  <button key={p.label}
                    className={`year-seg-btn ${activePreset?.label === p.label ? 'is-on' : ''}`}
                    onClick={() => setSelYears(p.yrs.filter(y => years.includes(y)))}>
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="year-seg">
                {[['3a','3'],['5a','5'],['10a','10'],['Todos','all']].map(([label, val]) => (
                  <button key={label}
                    className={`year-seg-btn ${range === val ? 'is-on' : ''}`}
                    onClick={() => setRange(val)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {mode === 'seasonal' ? (
        <BimonthlySeasonalChart
          bmRows={bmRows}
          fieldKey={fields[activeFieldIdx].key}
          accent={accent}
          selectedYears={activeYears}
          height={height}
        />
      ) : (
        <BimonthlyContChart
          bmRows={bmRows}
          fields={fields}
          rangeYears={rangeNum}
          height={height}
        />
      )}
    </section>
  );
}

window.BimonthlyCard = BimonthlyCard;
