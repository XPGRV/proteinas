// Poultry US Tab — FrangoUS.xlsm · BBG_Dados

const MONTH_DOY_US = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

const FRANGO_US_SERIES = [
  { key: 'proxy',   label: 'Proxy XPG',       unit: 'USD/Kg', note: '41% BB · 48% Legs · 11% Wings' },
  { key: 'chic_bb', label: 'Boneless Breast',  unit: 'USD/Kg', ticker: 'CHICNEBB' },
  { key: 'chic_tn', label: 'Tender',           unit: 'USD/Kg', ticker: 'CHICNETN' },
  { key: 'chic_lq', label: 'Legs',             unit: 'USD/Kg', ticker: 'CHICNELQ' },
  { key: 'chic_wi', label: 'Wings',            unit: 'USD/Kg', ticker: 'CHICNEWI' },
];

const EVENTS_FRANGO_US = [
  { year: 2015, month: 3,  label: 'HPAI H5N2 — maior surto da história dos EUA (~50M aves)' },
  { year: 2020, month: 4,  label: 'COVID-19 — fechamento de plantas, choques de oferta' },
  { year: 2022, month: 2,  label: 'HPAI H5N1 reemergência — surto em aves comerciais EUA' },
  { year: 2024, month: 3,  label: 'HPAI confirmada em bovinos de leite (spillover)' },
];

const EVENTS_FEED_GRAIN = [
  { year: 2012, month: 7,  label: 'Seca severa EUA — alta histórica de grãos' },
  { year: 2020, month: 4,  label: 'COVID-19 — disrupção de cadeias de suprimento' },
  { year: 2022, month: 2,  label: 'Invasão Russa — choque de commodities agrícolas' },
];

const EVENTS_SPREAD = [
  { year: 2015, month: 3,  label: 'HPAI H5N2 — redução de oferta, spread em alta' },
  { year: 2020, month: 4,  label: 'COVID-19 — fechamento de plantas processadoras' },
  { year: 2022, month: 2,  label: 'HPAI H5N1 + guerra na Ucrânia — duplo choque' },
];

// ── Daily stats (igual ao beef-us-tab) ───────────────────────────────────────
function buildDailyStatsUS(byYear, histYears) {
  const byDoy = {};
  for (const yr of histYears) {
    for (const pt of (byYear[yr] || [])) {
      if (!byDoy[pt.doy]) byDoy[pt.doy] = [];
      byDoy[pt.doy].push(pt.value);
    }
  }
  const stats = {};
  for (const [doy, vals] of Object.entries(byDoy)) {
    if (vals.length < 2) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    stats[Number(doy)] = {
      min: sorted[0], max: sorted[sorted.length - 1],
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      n: sorted.length,
    };
  }
  return stats;
}

// ── Chart ─────────────────────────────────────────────────────────────────────
const FrangoUSChart = ({
  byYear, allYears, selectedYears, pinnedYear, setPinnedYear,
  chartStyle, showStats, showEvents, events, accent, unit,
}) => {
  const W = 1000, H = 380;
  const padL = 68, padR = 24, padT = 20, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const latestYear = Math.max(...selectedYears);
  const sortedAsc  = [...selectedYears].sort((a, b) => a - b);
  const { displayYears, isLeaving } = window.useTrackedYears(selectedYears);
  const { shouldRender: showAreaRender, isLeaving: areaLeaving } = window.useFadeOut(chartStyle === 'area', 400);
  const { shouldRender: showStatsRender, isLeaving: statsLeaving } = window.useFadeOut(showStats, 500);
  const { shouldRender: showEventsRender, isLeaving: eventsLeaving } = window.useFadeOut(showEvents, 400);

  const [hover, setHover] = React.useState(null);
  const [mouseY, setMouseY] = React.useState(0);
  React.useEffect(() => { setHover(null); }, [selectedYears.join(',')]);

  const { vMin, vMax, step } = React.useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const yr of selectedYears) {
      for (const p of (byYear[yr] || [])) {
        if (p.value < lo) lo = p.value;
        if (p.value > hi) hi = p.value;
      }
    }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    const range = hi - lo;
    const raw = range / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => range / s <= 8) || mag * 10;
    return {
      vMin: Math.floor((lo - range * 0.05) / step) * step,
      vMax: Math.ceil( (hi + range * 0.15) / step) * step,
      step,
    };
  }, [byYear, selectedYears.join(',')]);

  const stats = React.useMemo(() => {
    if (!showStatsRender) return {};
    const latest = Math.max(...allYears);
    const fromYr = Math.max(allYears[0], latest - 10);
    const histYears = allYears.filter(y => y >= fromYr && y < latest);
    return buildDailyStatsUS(byYear, histYears);
  }, [byYear, allYears, showStatsRender]);

  const xFn = doy => padL + ((doy - 1) / 364) * chartW;
  const yFn = v   => padT + (1 - (v - vMin) / (vMax - vMin)) * chartH;

  const LATEST_COLOR = 'oklch(0.82 0.18 155)'; // verde fixo, igual aos demais gráficos
  const yearColor = yr => {
    const palette = ['oklch(0.75 0.15 200)','oklch(0.68 0.16 255)','oklch(0.74 0.15 310)','oklch(0.78 0.17 35)','oklch(0.80 0.15 60)','oklch(0.72 0.16 0)','oklch(0.76 0.13 170)'];
    const age = latestYear - yr;
    if (age === 0) return LATEST_COLOR;
    return age - 1 < palette.length ? palette[age - 1] : 'oklch(0.48 0.01 260)';
  };
  const seriesOpacity = yr => (!pinnedYear ? (yr === latestYear ? 1 : 0.7) : (yr === pinnedYear ? 1 : 0.1));
  const seriesWidth   = yr => (pinnedYear ? (yr === pinnedYear ? 2.5 : 1) : (yr === latestYear ? 2 : 1.25));

  const buildPath = pts =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFn(p.doy).toFixed(1)},${yFn(p.value).toFixed(1)}`).join(' ');

  const buildArea = pts => {
    if (!pts.length) return '';
    const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFn(p.doy).toFixed(1)},${yFn(p.value).toFixed(1)}`).join(' ');
    return top + ` L${xFn(pts[pts.length-1].doy).toFixed(1)},${yFn(vMin).toFixed(1)} L${xFn(pts[0].doy).toFixed(1)},${yFn(vMin).toFixed(1)} Z`;
  };

  const yTicks = [];
  for (let v = vMin; v <= vMax + step * 0.01; v = Math.round((v + step) * 1e6) / 1e6) yTicks.push(v);

  const statsDoys    = Object.keys(stats).map(Number).sort((a,b)=>a-b);
  const statsMaxPath = statsDoys.map((d,i)=>`${i===0?'M':'L'}${xFn(d).toFixed(1)},${yFn(stats[d].max).toFixed(1)}`).join(' ');
  const statsMinPath = [...statsDoys].reverse().map(d=>`L${xFn(d).toFixed(1)},${yFn(stats[d].min).toFixed(1)}`).join(' ');
  const statsP75Path = statsDoys.map((d,i)=>`${i===0?'M':'L'}${xFn(d).toFixed(1)},${yFn(stats[d].p75).toFixed(1)}`).join(' ');
  const statsP25Path = [...statsDoys].reverse().map(d=>`L${xFn(d).toFixed(1)},${yFn(stats[d].p25).toFixed(1)}`).join(' ');
  const statsMeanPath= statsDoys.map((d,i)=>`${i===0?'M':'L'}${xFn(d).toFixed(1)},${yFn(stats[d].mean).toFixed(1)}`).join(' ');

  const eventsInView = React.useMemo(() => {
    if (!showEventsRender) return [];
    return (events||[]).filter(e => selectedYears.includes(e.year) && (!pinnedYear || e.year === pinnedYear));
  }, [showEventsRender, selectedYears, pinnedYear, events]);

  const EVENT_COLOR = 'oklch(0.85 0.18 80)';

  const getHoverPoint = (yr, doy) => {
    const pts = byYear[yr] || [];
    let best = null, bestD = Infinity;
    for (const p of pts) { const d = Math.abs(p.doy - doy); if (d < bestD) { bestD = d; best = p; } }
    return bestD <= 4 ? best : null;
  };

  const doyToLabel = doy => {
    let mo = 0;
    for (let m = 11; m >= 0; m--) { if (doy > MONTH_DOY_US[m]) { mo = m; break; } }
    return `${doy - MONTH_DOY_US[mo]} ${window.MONTHS_PT[mo]}`;
  };

  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);
    const doy = Math.round(1 + ((px - padL) / chartW) * 364);
    setHover(Math.max(1, Math.min(365, doy)));
    setMouseY(py);
  };

  const gradId = 'frango-us-grad';

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {sortedAsc.map(yr => (
            <linearGradient key={yr} id={`${gradId}-${yr}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={yearColor(yr)} stopOpacity="0.28"/>
              <stop offset="100%" stopColor={yearColor(yr)} stopOpacity="0"/>
            </linearGradient>
          ))}
          <clipPath id={`clip-${gradId}`}>
            <rect x={padL} y={padT} width={chartW} height={chartH + 4}/>
          </clipPath>
        </defs>

        {yTicks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W-padR} y1={yFn(v)} y2={yFn(v)} className="grid-line"/>
            <text x={padL-6} y={yFn(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">
              {window.fmt(v, {decimals: v % 1 === 0 ? 2 : 3})}
            </text>
          </g>
        ))}

        {MONTH_DOY_US.map((doy, mi) => (
          <g key={mi}>
            <line x1={xFn(doy+1)} x2={xFn(doy+1)} y1={padT} y2={H-padB} className="grid-line" opacity="0.3"/>
            <text x={xFn(doy+16)} y={H-padB+16} className="tick-label" textAnchor="middle">{window.MONTHS_PT[mi]}</text>
          </g>
        ))}

        {showStatsRender && statsDoys.length > 0 && (
          <g clipPath={`url(#clip-${gradId})`}>
            <path d={statsMaxPath + ' ' + statsMinPath + ' Z'} fill="var(--fg)" className={`rx-stat-band${statsLeaving ? ' rx-stat-leaving' : ''}`} style={{'--rx-stat-op': 0.05}}/>
            <path d={statsP75Path + ' ' + statsP25Path + ' Z'} fill="var(--fg)" className={`rx-stat-band${statsLeaving ? ' rx-stat-leaving' : ''}`} style={{'--rx-stat-op': 0.08}}/>
            <path d={statsMeanPath} stroke="var(--fg)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" fill="none" className={`rx-stat-mean${statsLeaving ? ' rx-stat-leaving' : ''}`}/>
          </g>
        )}

        <g clipPath={`url(#clip-${gradId})`}>
          {showAreaRender && displayYears.map(yr => {
            const pts = byYear[yr] || [];
            if (!pts.length) return null;
            const leaving = isLeaving(yr);
            return <path key={yr} d={buildArea(pts)} fill={`url(#${gradId}-${yr})`}
              style={{'--rx-area-op': seriesOpacity(yr)}}
              className={`rx-area ${leaving ? 'rx-leaving' : ''} ${areaLeaving ? 'rx-area-leaving' : ''}`}/>;
          })}
          {displayYears.map(yr => {
            const pts = byYear[yr] || [];
            if (!pts.length) return null;
            const leaving = isLeaving(yr);
            return (
              <g key={yr}>
                <path d={buildPath(pts)} fill="none" stroke={yearColor(yr)}
                  strokeWidth={seriesWidth(yr)} strokeLinejoin="round" strokeLinecap="round"
                  opacity={seriesOpacity(yr)}
                  className={leaving ? 'rx-leaving' : ''}/>
                {!leaving && (
                  <path d={buildPath(pts)} fill="none" stroke="transparent" strokeWidth={12}
                    style={{cursor:'pointer'}}
                    onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
                )}
              </g>
            );
          })}
        </g>

        {eventsInView.map((ev, i) => {
          const doy = MONTH_DOY_US[ev.month - 1] + 15;
          const pts = byYear[ev.year] || [];
          let best = null, bestD = Infinity;
          for (const p of pts) { const d = Math.abs(p.doy - doy); if (d < bestD) { bestD = d; best = p; } }
          if (!best) return null;
          const cx = xFn(best.doy), cy = yFn(best.value);
          const isPinned = ev.year === pinnedYear;
          const nearRight = cx > W - padR - 80;
          const anchor = nearRight ? 'end' : 'middle';
          const lx = nearRight ? cx - 8 : cx;
          return (
            <g key={i} className={eventsLeaving ? 'rx-events-leaving' : ''}>
              <window.EventDot cx={cx} cy={cy} r={isPinned ? 5 : 3}
                fill={isPinned ? 'var(--bg)' : EVENT_COLOR} stroke={EVENT_COLOR} strokeWidth={1.5}
                delaySec={0}/>
              {isPinned && <line className="rx-event-beam" x1={cx} y1={padT+12} x2={cx} y2={cy-6} stroke={EVENT_COLOR} strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.6}/>}
              {isPinned && (
                <text x={lx} y={padT} textAnchor={anchor} dominantBaseline="hanging"
                  style={{fontFamily:'var(--font-mono)', fontSize:10, fill:EVENT_COLOR, fontWeight:600}}>
                  {ev.label}
                </text>
              )}
            </g>
          );
        })}

        {hover != null && (
          <g>
            <line x1={xFn(hover)} x2={xFn(hover)} y1={padT} y2={H-padB} stroke="var(--fg)" strokeOpacity="0.2" strokeWidth="1"/>
            {sortedAsc.map(yr => {
              const pt = getHoverPoint(yr, hover);
              if (!pt) return null;
              return (
                <circle key={yr} cx={xFn(pt.doy)} cy={yFn(pt.value)}
                  r={yr === pinnedYear ? 5 : yr === latestYear ? 4 : 3}
                  fill="var(--bg)" stroke={yearColor(yr)}
                  strokeWidth={yr === pinnedYear ? 2.5 : yr === latestYear ? 2 : 1.25}
                  style={{cursor:'pointer'}}
                  onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
              );
            })}
          </g>
        )}

        <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} className="axis-line"/>
        <line x1={padL} x2={padL}   y1={padT}    y2={H-padB} className="axis-line"/>
      </svg>

      {hover != null && (() => {
        const rows = [...sortedAsc].reverse()
          .map(yr => ({ yr, pt: getHoverPoint(yr, hover) }))
          .filter(r => r.pt);
        if (!rows.length) return null;
        const statEntry = stats[hover] || stats[hover-1] || stats[hover+1];
        const xPos = xFn(hover);
        const isRightSide = xPos > chartW * 0.75;
        return (
          <div className="hover-card" style={{
            left: `${(xPos / W * 100).toFixed(1)}%`,
            top: Math.max(10, Math.min(H - 140, mouseY - 40)),
            transform: isRightSide ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)',
          }}>
            <div className="hover-month">{doyToLabel(hover)}</div>
            <div className="hover-rows">
              {rows.map(({yr, pt}) => (
                <div key={yr} className="hover-row">
                  <span className="hover-year" style={{color: yearColor(yr)}}>{yr}</span>
                  <span className="hover-val">{window.fmt(pt.value, {decimals:3})}<span className="hover-unit"> {unit}</span></span>
                </div>
              ))}
              {showStats && statEntry && (
                <div className="hover-row hover-stat">
                  <span className="hover-year">média {statEntry.n}a</span>
                  <span className="hover-val">{window.fmt(statEntry.mean, {decimals:3})}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="ciclo-legend" style={{flexWrap:'wrap', gap:4}}>
        {[...selectedYears].sort((a,b)=>b-a).map(yr => (
          <span key={yr} className="legend-year"
            onClick={() => setPinnedYear(p => p === yr ? null : yr)}
            style={{
              cursor:'pointer', userSelect:'none', padding:'2px 6px',
              opacity: pinnedYear && pinnedYear !== yr ? 0.3 : yr === latestYear ? 1 : 0.7,
              outline: pinnedYear === yr ? `1px solid ${yearColor(yr)}` : 'none',
              borderRadius: 4,
            }}>
            <span className="legend-line" style={{background: yearColor(yr)}}/>
            {yr}
          </span>
        ))}
        {showStats && (
          <>
            <span className="legend-year" style={{opacity:0.6, userSelect:'none', padding:'2px 6px'}}>
              <span style={{display:'inline-block',width:16,height:2,borderTop:'2px dashed var(--fg)',opacity:0.5,verticalAlign:'middle',marginRight:2}}/>
              Média histórica
            </span>
            <span className="legend-year" style={{opacity:0.6, userSelect:'none', padding:'2px 6px'}}>
              <span style={{display:'inline-block',width:16,height:8,background:'var(--fg)',opacity:0.08,verticalAlign:'middle',marginRight:2,borderRadius:1}}/>
              P25–P75
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const CUTS = FRANGO_US_SERIES.filter(s => s.key !== 'proxy');

// ── Controls (price card — com dropdown de corte) ─────────────────────────────
function FrangoUSControls({
  years, selectedYears, setSelectedYears,
  showStats, setShowStats, showEvents, setShowEvents,
  chartStyle, setChartStyle,
  activeSeries, setActiveSeries,
}) {
  const { useState, useEffect, useRef } = React;
  const [yearDropOpen, setYearDropOpen] = useState(false);
  const [cutDropOpen,  setCutDropOpen]  = useState(false);
  const yearDropRef = useRef(null);
  const cutDropRef  = useRef(null);

  const presets = [
    { label: '3a',    yrs: years.slice(-3) },
    { label: '5a',    yrs: years.slice(-5) },
    { label: '10a',   yrs: years.slice(-10) },
    { label: 'Todos', yrs: years },
  ];
  const activePreset = presets.find(p => {
    const valid = p.yrs.filter(y => years.includes(y));
    return valid.length === selectedYears.length && valid.every(y => selectedYears.includes(y));
  });
  const toggleYear = yr => setSelectedYears(prev =>
    prev.includes(yr) ? (prev.length === 1 ? prev : prev.filter(y => y !== yr)) : [...prev, yr].sort((a,b)=>a-b)
  );

  useEffect(() => {
    if (!yearDropOpen) return;
    const h = e => { if (yearDropRef.current && !yearDropRef.current.contains(e.target)) setYearDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [yearDropOpen]);

  useEffect(() => {
    if (!cutDropOpen) return;
    const h = e => { if (cutDropRef.current && !cutDropRef.current.contains(e.target)) setCutDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [cutDropOpen]);

  const activeCut  = CUTS.find(s => s.key === activeSeries);
  const cutLabel   = activeCut ? activeCut.label : 'Corte';

  const selectCut = key => {
    setActiveSeries(key === activeSeries ? 'proxy' : key);
    setCutDropOpen(false);
  };

  return (
    <div className="card-controls">
      <div className="card-ctrl-row">
        <div className="year-seg">
          {presets.map(p => (
            <button key={p.label}
              className={`year-seg-btn ${activePreset?.label === p.label ? 'is-on' : ''}`}
              onClick={() => setSelectedYears(p.yrs.filter(y => years.includes(y)))}>
              {p.label}
            </button>
          ))}
          <div className="year-drop-wrap" ref={yearDropRef}>
            <button className={`year-seg-btn ${yearDropOpen ? 'is-active' : ''} ${!activePreset && !yearDropOpen ? 'is-on' : ''}`}
              onClick={() => setYearDropOpen(o => !o)}>
              Anos ▾
            </button>
            {yearDropOpen && (
              <div className="year-drop">
                {years.slice().reverse().map(yr => (
                  <div key={yr} className={`year-drop-item ${selectedYears.includes(yr) ? 'is-on' : ''}`}
                    onClick={() => toggleYear(yr)}>
                    <span className="year-drop-check">{selectedYears.includes(yr) ? '✓' : ''}</span>
                    {yr}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-ctrl-row">
        <div className="ctrl-btn-group">
          <button className={`ctrl-btn ${showStats ? 'is-on' : ''}`} onClick={() => setShowStats(s => !s)}>MÉDIA + FAIXA</button>
          <button className={`ctrl-btn ${showEvents ? 'is-on' : ''}`} onClick={() => setShowEvents(s => !s)}>EVENTOS</button>
          <div className="year-drop-wrap" ref={cutDropRef}>
            <button className={`ctrl-btn ${activeCut ? 'is-on' : ''} ${cutDropOpen ? 'is-active' : ''}`}
              onClick={() => setCutDropOpen(o => !o)}>
              {cutLabel} ▾
            </button>
            {cutDropOpen && (
              <div className="year-drop">
                {CUTS.map(s => (
                  <div key={s.key} className={`year-drop-item ${activeSeries === s.key ? 'is-on' : ''}`}
                    onClick={() => selectCut(s.key)}>
                    <span className="year-drop-check">{activeSeries === s.key ? '✓' : ''}</span>
                    {s.label}
                    {s.ticker && <span style={{marginLeft:6,opacity:0.5,fontSize:10}}>{s.ticker}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{marginLeft: 16}}>
          <div className="seg">
            <button className={`seg-btn ${chartStyle==='line'?'is-on':''}`} onClick={() => setChartStyle('line')}>Linha</button>
            <button className={`seg-btn ${chartStyle==='area'?'is-on':''}`} onClick={() => setChartStyle('area')}>Área</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Controls simples (Feed Grain e Spread — sem dropdown de corte) ────────────
function FrangoUSSimpleControls({
  years, selectedYears, setSelectedYears,
  showStats, setShowStats, showEvents, setShowEvents,
  chartStyle, setChartStyle,
}) {
  const { useState, useEffect, useRef } = React;
  const [yearDropOpen, setYearDropOpen] = useState(false);
  const yearDropRef = useRef(null);

  const presets = [
    { label: '3a',    yrs: years.slice(-3) },
    { label: '5a',    yrs: years.slice(-5) },
    { label: '10a',   yrs: years.slice(-10) },
    { label: 'Todos', yrs: years },
  ];
  const activePreset = presets.find(p => {
    const valid = p.yrs.filter(y => years.includes(y));
    return valid.length === selectedYears.length && valid.every(y => selectedYears.includes(y));
  });
  const toggleYear = yr => setSelectedYears(prev =>
    prev.includes(yr) ? (prev.length === 1 ? prev : prev.filter(y => y !== yr)) : [...prev, yr].sort((a,b)=>a-b)
  );

  useEffect(() => {
    if (!yearDropOpen) return;
    const h = e => { if (yearDropRef.current && !yearDropRef.current.contains(e.target)) setYearDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [yearDropOpen]);

  return (
    <div className="card-controls">
      <div className="card-ctrl-row">
        <div className="year-seg">
          {presets.map(p => (
            <button key={p.label}
              className={`year-seg-btn ${activePreset?.label === p.label ? 'is-on' : ''}`}
              onClick={() => setSelectedYears(p.yrs.filter(y => years.includes(y)))}>
              {p.label}
            </button>
          ))}
          <div className="year-drop-wrap" ref={yearDropRef}>
            <button className={`year-seg-btn ${yearDropOpen ? 'is-active' : ''} ${!activePreset && !yearDropOpen ? 'is-on' : ''}`}
              onClick={() => setYearDropOpen(o => !o)}>
              Anos ▾
            </button>
            {yearDropOpen && (
              <div className="year-drop">
                {years.slice().reverse().map(yr => (
                  <div key={yr} className={`year-drop-item ${selectedYears.includes(yr) ? 'is-on' : ''}`}
                    onClick={() => toggleYear(yr)}>
                    <span className="year-drop-check">{selectedYears.includes(yr) ? '✓' : ''}</span>
                    {yr}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="card-ctrl-row">
        <div className="ctrl-btn-group">
          <button className={`ctrl-btn ${showStats ? 'is-on' : ''}`} onClick={() => setShowStats(s => !s)}>MÉDIA + FAIXA</button>
          <button className={`ctrl-btn ${showEvents ? 'is-on' : ''}`} onClick={() => setShowEvents(s => !s)}>EVENTOS</button>
        </div>
        <div style={{marginLeft: 16}}>
          <div className="seg">
            <button className={`seg-btn ${chartStyle==='line'?'is-on':''}`} onClick={() => setChartStyle('line')}>Linha</button>
            <button className={`seg-btn ${chartStyle==='area'?'is-on':''}`} onClick={() => setChartStyle('area')}>Área</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Price Card ────────────────────────────────────────────────────────────────
const FrangoUSPriceCard = ({ data, accent }) => {
  const allPoints = React.useMemo(() => data.frango_us_daily || [], [data]);

  const [activeSeries, setActiveSeries] = React.useState('proxy');
  const [chartStyle, setChartStyle]     = React.useState('line');
  const [showStats, setShowStats]       = React.useState(false);
  const [showEvents, setShowEvents]     = React.useState(true);
  const [pinnedYear, setPinnedYear]     = React.useState(null);

  const seriesMeta = FRANGO_US_SERIES.find(s => s.key === activeSeries);

  const byYear = React.useMemo(() => {
    const out = {};
    for (const r of allPoints) {
      const v = r[activeSeries];
      if (v == null) continue;
      if (!out[r.year]) out[r.year] = [];
      out[r.year].push({ doy: MONTH_DOY_US[r.month - 1] + r.day, value: v });
    }
    for (const yr of Object.keys(out)) out[yr].sort((a, b) => a.doy - b.doy);
    return out;
  }, [allPoints, activeSeries]);

  const allYears = React.useMemo(() => Object.keys(byYear).map(Number).sort((a,b)=>a-b), [byYear]);

  const [selectedYears, setSelectedYears] = React.useState(() => allYears.slice(-5));

  React.useEffect(() => {
    if (allYears.length > 0 && selectedYears.filter(y => allYears.includes(y)).length === 0)
      setSelectedYears(allYears.slice(-5));
  }, [allYears.join(',')]);

  React.useEffect(() => { setPinnedYear(null); }, [selectedYears.join(','), activeSeries]);

  const latestRaw = React.useMemo(() => {
    return [...allPoints].filter(r => r[activeSeries] != null)
      .sort((a,b) => a.year!==b.year ? a.year-b.year : a.month!==b.month ? a.month-b.month : a.day-b.day)
      .slice(-1)[0] || null;
  }, [allPoints, activeSeries]);

  const yoyRaw = React.useMemo(() => {
    if (!latestRaw) return null;
    const candidates = allPoints.filter(r =>
      r.year === latestRaw.year - 1 && r.month === latestRaw.month && r[activeSeries] != null
    );
    let best = null, bestD = Infinity;
    for (const r of candidates) { const d = Math.abs(r.day - latestRaw.day); if (d < bestD) { bestD = d; best = r; } }
    return best;
  }, [allPoints, latestRaw, activeSeries]);

  const yoy = latestRaw && yoyRaw
    ? (latestRaw[activeSeries] - yoyRaw[activeSeries]) / Math.abs(yoyRaw[activeSeries])
    : null;
  const fmtPct = v => v == null ? '—' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';

  return (
    <section className="card card-full" data-card-id="us-frango-price">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">
            Bloomberg · {seriesMeta.ticker || 'Proxy XPG'} · Preço Frango EUA
            {seriesMeta.note && <span style={{marginLeft:8,opacity:0.6,fontSize:10}}>{seriesMeta.note}</span>}
          </div>
          <h3 className="card-title">{seriesMeta.label}</h3>
          <div className="card-price">
            {latestRaw && (<>
              <span className="card-value">{window.fmt(latestRaw[activeSeries], {decimals:3})}</span>
              <span className="card-unit">{seriesMeta.unit}</span>
              <span className={`card-delta ${yoy == null ? '' : yoy >= 0 ? 'is-up' : 'is-down'}`}>
                {fmtPct(yoy)}<span className="card-delta-label"> YoY</span>
              </span>
              <span className="card-date">
                {window.MONTHS_PT[latestRaw.month - 1]}/{String(latestRaw.year).slice(-2)}
              </span>
            </>)}
          </div>
        </div>
        <FrangoUSControls
          years={allYears}
          selectedYears={selectedYears} setSelectedYears={setSelectedYears}
          showStats={showStats} setShowStats={setShowStats}
          showEvents={showEvents} setShowEvents={setShowEvents}
          chartStyle={chartStyle} setChartStyle={setChartStyle}
          activeSeries={activeSeries} setActiveSeries={setActiveSeries}
        />
      </div>
      <FrangoUSChart
        byYear={byYear} allYears={allYears}
        selectedYears={selectedYears}
        pinnedYear={pinnedYear} setPinnedYear={setPinnedYear}
        chartStyle={chartStyle}
        showStats={showStats} showEvents={showEvents}
        events={EVENTS_FRANGO_US}
        accent={accent}
        unit={seriesMeta.unit}
      />
    </section>
  );
};

// ── Card genérico para Feed Grain e Spread ────────────────────────────────────
const FrangoUSSimpleCard = ({ data, seriesKey, cardId, title, eyebrow, unit, events, accent, defaultYears }) => {
  const allPoints = React.useMemo(() => data.frango_us_daily || [], [data]);

  const [chartStyle, setChartStyle] = React.useState('line');
  const [showStats, setShowStats]   = React.useState(false);
  const [showEvents, setShowEvents] = React.useState(true);
  const [pinnedYear, setPinnedYear] = React.useState(null);

  const byYear = React.useMemo(() => {
    const out = {};
    for (const r of allPoints) {
      const v = r[seriesKey];
      if (v == null) continue;
      if (!out[r.year]) out[r.year] = [];
      out[r.year].push({ doy: MONTH_DOY_US[r.month - 1] + r.day, value: v });
    }
    for (const yr of Object.keys(out)) out[yr].sort((a, b) => a.doy - b.doy);
    return out;
  }, [allPoints, seriesKey]);

  const allYears = React.useMemo(() => Object.keys(byYear).map(Number).sort((a,b)=>a-b), [byYear]);

  const initYears = () => allYears.slice(-(defaultYears || 5));
  const [selectedYears, setSelectedYears] = React.useState(initYears);

  React.useEffect(() => {
    if (allYears.length > 0 && selectedYears.filter(y => allYears.includes(y)).length === 0)
      setSelectedYears(allYears.slice(-(defaultYears || 5)));
  }, [allYears.join(',')]);

  React.useEffect(() => { setPinnedYear(null); }, [selectedYears.join(',')]);

  const latestRaw = React.useMemo(() => {
    return [...allPoints].filter(r => r[seriesKey] != null)
      .sort((a,b) => a.year!==b.year ? a.year-b.year : a.month!==b.month ? a.month-b.month : a.day-b.day)
      .slice(-1)[0] || null;
  }, [allPoints, seriesKey]);

  const yoyRaw = React.useMemo(() => {
    if (!latestRaw) return null;
    const candidates = allPoints.filter(r =>
      r.year === latestRaw.year - 1 && r.month === latestRaw.month && r[seriesKey] != null
    );
    let best = null, bestD = Infinity;
    for (const r of candidates) { const d = Math.abs(r.day - latestRaw.day); if (d < bestD) { bestD = d; best = r; } }
    return best;
  }, [allPoints, latestRaw, seriesKey]);

  const yoy = latestRaw && yoyRaw
    ? (latestRaw[seriesKey] - yoyRaw[seriesKey]) / Math.abs(yoyRaw[seriesKey])
    : null;
  const fmtPct = v => v == null ? '—' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';

  if (!allYears.length) return null;

  return (
    <section className="card card-full" data-card-id={cardId}>
      <div className="card-head">
        <div>
          <div className="card-eyebrow">{eyebrow}</div>
          <h3 className="card-title">{title}</h3>
          <div className="card-price">
            {latestRaw && (<>
              <span className="card-value">{window.fmt(latestRaw[seriesKey], {decimals:3})}</span>
              <span className="card-unit">{unit}</span>
              <span className={`card-delta ${yoy == null ? '' : yoy >= 0 ? 'is-up' : 'is-down'}`}>
                {fmtPct(yoy)}<span className="card-delta-label"> YoY</span>
              </span>
              <span className="card-date">
                {window.MONTHS_PT[latestRaw.month - 1]}/{String(latestRaw.year).slice(-2)}
              </span>
            </>)}
          </div>
        </div>
        <FrangoUSSimpleControls
          years={allYears}
          selectedYears={selectedYears} setSelectedYears={setSelectedYears}
          showStats={showStats} setShowStats={setShowStats}
          showEvents={showEvents} setShowEvents={setShowEvents}
          chartStyle={chartStyle} setChartStyle={setChartStyle}
        />
      </div>
      <FrangoUSChart
        byYear={byYear} allYears={allYears}
        selectedYears={selectedYears}
        pinnedYear={pinnedYear} setPinnedYear={setPinnedYear}
        chartStyle={chartStyle}
        showStats={showStats} showEvents={showEvents}
        events={events}
        accent={accent}
        unit={unit}
      />
    </section>
  );
};

// ── Tab principal ─────────────────────────────────────────────────────────────
const PoultryUSTab = ({ data, accent }) => {
  if (!data.frango_us_daily || !data.frango_us_daily.length) {
    return (
      <main className="main" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,minHeight:'60vh',color:'var(--fg-dim)'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
        </svg>
        <div style={{fontSize:16,fontWeight:500,color:'var(--fg)'}}>Sem dados de Frango US</div>
        <div style={{fontSize:13,textAlign:'center',maxWidth:320}}>
          Faça upload da planilha FrangoUS.xlsm para visualizar os gráficos.
        </div>
      </main>
    );
  }
  return (
    <main className="main">
      <FrangoUSPriceCard data={data} accent={accent}/>
      <FrangoUSSimpleCard
        data={data}
        seriesKey="feed_grain"
        cardId="us-feed-grain"
        title="Feed Grain"
        eyebrow="Bloomberg · Milho + Soja · Custo de Ração EUA"
        unit="USD/Kg"
        events={EVENTS_FEED_GRAIN}
        accent={accent}
        defaultYears={10}
      />
      <FrangoUSSimpleCard
        data={data}
        seriesKey="spread"
        cardId="us-spread"
        title="Spread Frango–Ração"
        eyebrow="Bloomberg · Proxy XPG − Feed Grain · Margem EUA"
        unit="USD/Kg"
        events={EVENTS_SPREAD}
        accent={accent}
        defaultYears={5}
      />
    </main>
  );
};

window.PoultryUSTab = PoultryUSTab;
