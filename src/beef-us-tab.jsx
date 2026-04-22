// Beef US Tab — Edgebeef sazonal diário + Ciclo do Boi US

const MONTH_DOY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

// ── Daily stats helper ────────────────────────────────────────────────────────
function buildDailyStats(byYear, histYears) {
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

// ── Edgebeef Seasonal Chart (pure rendering) ──────────────────────────────────
const EdgebeeefChart = ({
  byYear, allYears, selectedYears, pinnedYear, setPinnedYear,
  chartStyle, showStats, showEvents, events, accent,
}) => {
  const W = 1000, H = 380;
  const padL = 64, padR = 24, padT = 20, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const latestYear = Math.max(...selectedYears);
  const sortedAsc  = [...selectedYears].sort((a, b) => a - b);

  const [hover, setHover] = React.useState(null);
  React.useEffect(() => { setHover(null); }, [selectedYears.join(',')]);

  // Y range
  const { vMin, vMax, step } = React.useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const yr of selectedYears) {
      for (const p of (byYear[yr] || [])) {
        if (p.value < lo) lo = p.value;
        if (p.value > hi) hi = p.value;
      }
    }
    if (!isFinite(lo)) { lo = -100; hi = 100; }
    const range = hi - lo;
    const step = range > 800 ? 200 : range > 400 ? 100 : range > 200 ? 50 : 25;
    return {
      vMin: Math.floor((lo - range * 0.05) / step) * step,
      vMax: Math.ceil((hi  + range * 0.15) / step) * step,
      step,
    };
  }, [byYear, selectedYears.join(',')]);

  // Stats
  const stats = React.useMemo(() => {
    if (!showStats) return {};
    const latest = Math.max(...allYears);
    const fromYr = Math.max(allYears[0], latest - 10);
    const histYears = allYears.filter(y => y >= fromYr && y < latest);
    return buildDailyStats(byYear, histYears);
  }, [byYear, allYears, showStats]);

  const x = doy => padL + ((doy - 1) / 364) * chartW;
  const y = v   => padT + (1 - (v - vMin) / (vMax - vMin)) * chartH;

  const yearColor = yr => {
    if (yr === (pinnedYear || latestYear)) return accent;
    const palette = ['oklch(0.75 0.15 200)','oklch(0.68 0.16 255)','oklch(0.74 0.15 310)','oklch(0.78 0.17 35)','oklch(0.80 0.15 60)','oklch(0.72 0.16 0)','oklch(0.76 0.13 170)'];
    const age = latestYear - yr;
    return age - 1 < palette.length ? palette[age - 1] : 'oklch(0.48 0.01 260)';
  };

  const seriesOpacity = yr => {
    if (!pinnedYear) return yr === latestYear ? 1 : 0.7;
    return yr === pinnedYear ? 1 : 0.1;
  };
  const seriesWidth = yr => {
    if (pinnedYear) return yr === pinnedYear ? 2.5 : 1;
    return yr === latestYear ? 2 : 1.25;
  };

  const buildPath = pts =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.doy).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const buildArea = (pts) => {
    if (!pts.length) return '';
    const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.doy).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    return top + ` L${x(pts[pts.length-1].doy).toFixed(1)},${y(vMin).toFixed(1)} L${x(pts[0].doy).toFixed(1)},${y(vMin).toFixed(1)} Z`;
  };

  const yTicks = [];
  for (let v = vMin; v <= vMax; v += step) yTicks.push(v);

  // Stats band paths
  const statsDoys = Object.keys(stats).map(Number).sort((a,b)=>a-b);
  const statsMaxPath  = statsDoys.map((d,i) => `${i===0?'M':'L'}${x(d).toFixed(1)},${y(stats[d].max).toFixed(1)}`).join(' ');
  const statsMinPath  = [...statsDoys].reverse().map((d,i) => `${i===0?'M':'L'}${x(d).toFixed(1)},${y(stats[d].min).toFixed(1)}`).join(' ');
  const statsP75Path  = statsDoys.map((d,i) => `${i===0?'M':'L'}${x(d).toFixed(1)},${y(stats[d].p75).toFixed(1)}`).join(' ');
  const statsP25Path  = [...statsDoys].reverse().map((d,i) => `${i===0?'M':'L'}${x(d).toFixed(1)},${y(stats[d].p25).toFixed(1)}`).join(' ');
  const statsMeanPath = statsDoys.map((d,i) => `${i===0?'M':'L'}${x(d).toFixed(1)},${y(stats[d].mean).toFixed(1)}`).join(' ');

  // Events: position at mid-month doy
  const eventsInView = React.useMemo(() => {
    if (!showEvents) return [];
    return (window.EVENTS || []).filter(e => selectedYears.includes(e.year) && (!pinnedYear || e.year === pinnedYear));
  }, [showEvents, selectedYears, pinnedYear]);

  const EVENT_COLOR = 'oklch(0.85 0.18 80)';

  const getHoverPoint = (yr, doy) => {
    const pts = byYear[yr] || [];
    let best = null, bestD = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.doy - doy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return bestD <= 4 ? best : null;
  };

  const doyToLabel = doy => {
    let mo = 0;
    for (let m = 11; m >= 0; m--) { if (doy > MONTH_DOY[m]) { mo = m; break; } }
    return `${doy - MONTH_DOY[mo]} ${window.MONTHS_PT[mo]}`;
  };

  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const doy = Math.round(1 + ((px - padL) / chartW) * 364);
    setHover(Math.max(1, Math.min(365, doy)));
  };

  const gradId = 'edge-grad';

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
        </defs>

        {/* Y grid */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W-padR} y1={y(v)} y2={y(v)} className="grid-line"/>
            <text x={padL-6} y={y(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">{v}</text>
          </g>
        ))}
        {vMin < 0 && vMax > 0 && (
          <line x1={padL} x2={W-padR} y1={y(0)} y2={y(0)} stroke="var(--fg)" strokeOpacity="0.2" strokeWidth="1"/>
        )}

        {/* X ticks — months */}
        {MONTH_DOY.map((doy, mi) => (
          <g key={mi}>
            <line x1={x(doy+1)} x2={x(doy+1)} y1={padT} y2={H-padB} className="grid-line" opacity="0.3"/>
            <text x={x(doy+16)} y={H-padB+16} className="tick-label" textAnchor="middle">{window.MONTHS_PT[mi]}</text>
          </g>
        ))}

        {/* Stats band */}
        {showStats && statsDoys.length > 0 && (
          <g>
            <path d={statsMaxPath + ' ' + statsMinPath + ' Z'} fill="var(--fg)" opacity="0.05"/>
            <path d={statsP75Path + ' ' + statsP25Path + ' Z'} fill="var(--fg)" opacity="0.08"/>
            <path d={statsMeanPath} stroke="var(--fg)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" fill="none"/>
          </g>
        )}

        {/* Area fills */}
        {chartStyle === 'area' && sortedAsc.map(yr => {
          const pts = byYear[yr] || [];
          if (!pts.length) return null;
          return <path key={yr} d={buildArea(pts)} fill={`url(#${gradId}-${yr})`} opacity={seriesOpacity(yr)}/>;
        })}

        {/* Year lines */}
        {sortedAsc.map(yr => {
          const pts = byYear[yr] || [];
          if (!pts.length) return null;
          const stroke = yearColor(yr);
          return (
            <g key={yr}>
              <path d={buildPath(pts)} fill="none" stroke={stroke}
                strokeWidth={seriesWidth(yr)} strokeLinejoin="round" strokeLinecap="round"
                opacity={seriesOpacity(yr)}/>
              <path d={buildPath(pts)} fill="none" stroke="transparent" strokeWidth={12}
                style={{cursor:'pointer'}}
                onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
            </g>
          );
        })}

        {/* Event dots */}
        {eventsInView.map((ev, i) => {
          const doy = MONTH_DOY[ev.month - 1] + 15;
          const yr  = ev.year;
          const pts = byYear[yr] || [];
          let best = null, bestD = Infinity;
          for (const p of pts) { const d = Math.abs(p.doy - doy); if (d < bestD) { bestD = d; best = p; } }
          if (!best) return null;
          const cx = x(best.doy), cy = y(best.value);
          const isPinned = yr === pinnedYear;
          const nearRight = cx > W - padR - 80;
          const nearLeft  = cx < padL + 80;
          const anchor = nearRight ? 'end' : nearLeft ? 'start' : 'middle';
          const lx = nearRight ? cx - 8 : nearLeft ? cx + 8 : cx;
          const labelY = padT + 2;
          return (
            <g key={i}>
              {isPinned && <line x1={cx} y1={labelY+12} x2={cx} y2={cy-6} stroke={EVENT_COLOR} strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.6}/>}
              <circle cx={cx} cy={cy} r={isPinned ? 5 : 3}
                fill={isPinned ? 'var(--bg)' : EVENT_COLOR} stroke={EVENT_COLOR} strokeWidth={1.5}/>
              {isPinned && (
                <text x={lx} y={labelY} textAnchor={anchor} dominantBaseline="hanging"
                  style={{fontFamily:'var(--font-mono)', fontSize:10, fill:EVENT_COLOR, fontWeight:600}}>
                  {ev.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover */}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H-padB}
              stroke="var(--fg)" strokeOpacity="0.2" strokeWidth="1"/>
            {sortedAsc.map(yr => {
              const pt = getHoverPoint(yr, hover);
              if (!pt) return null;
              const isPinned = yr === pinnedYear, isCurrent = yr === latestYear;
              return (
                <circle key={yr} cx={x(pt.doy)} cy={y(pt.value)}
                  r={isPinned ? 5 : isCurrent ? 4 : 3}
                  fill="var(--bg)" stroke={yearColor(yr)}
                  strokeWidth={isPinned ? 2.5 : isCurrent ? 2 : 1.25}
                  style={{cursor:'pointer'}}
                  onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
              );
            })}
          </g>
        )}

        <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} className="axis-line"/>
        <line x1={padL} x2={padL} y1={padT} y2={H-padB} className="axis-line"/>
      </svg>

      {/* Hover card */}
      {hover != null && (() => {
        const rows = [...sortedAsc].reverse()
          .map(yr => ({ yr, pt: getHoverPoint(yr, hover) }))
          .filter(r => r.pt);
        if (!rows.length) return null;
        const statEntry = stats[hover] || stats[hover-1] || stats[hover+1];
        return (
          <div className="hover-card" style={{left:`calc(${(x(hover)/W*100).toFixed(1)}% + 14px)`}}>
            <div className="hover-month">{doyToLabel(hover)}</div>
            <div className="hover-rows">
              {rows.map(({yr, pt}) => (
                <div key={yr} className="hover-row">
                  <span className="hover-year" style={{color: yearColor(yr)}}>{yr}</span>
                  <span className="hover-val">{pt.value.toFixed(1)}<span className="hover-unit"> USD/cwt</span></span>
                </div>
              ))}
              {showStats && statEntry && (
                <div className="hover-row hover-stat">
                  <span className="hover-year">média {statEntry.n}a</span>
                  <span className="hover-val">{statEntry.mean.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
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

// ── Edgebeef Card (state + controls + chart) ──────────────────────────────────
const EdgebeeefCard = ({ data, accent, events }) => {
  const byYear = React.useMemo(() => {
    const out = {};
    for (const r of (data.edgebeef_daily || [])) {
      if (!out[r.year]) out[r.year] = [];
      out[r.year].push({ doy: MONTH_DOY[r.month - 1] + r.day, value: r.value });
    }
    for (const yr of Object.keys(out)) out[yr].sort((a, b) => a.doy - b.doy);
    return out;
  }, [data]);

  const allYears = React.useMemo(() => Object.keys(byYear).map(Number).sort((a,b)=>a-b), [byYear]);

  const presets = React.useMemo(() => [
    { label: '3a',   yrs: allYears.slice(-3) },
    { label: '5a',   yrs: allYears.slice(-5) },
    { label: '10a',  yrs: allYears.slice(-10) },
    { label: 'Todos', yrs: allYears },
  ], [allYears]);

  const [selectedYears, setSelectedYears] = React.useState(() => allYears.slice(-5));
  const [chartStyle, setChartStyle]       = React.useState('line');
  const [showStats, setShowStats]         = React.useState(false);
  const [showEvents, setShowEvents]       = React.useState(false);
  const [pinnedYear, setPinnedYear]       = React.useState(null);
  const [dropOpen, setDropOpen]           = React.useState(false);
  const dropRef = React.useRef(null);

  React.useEffect(() => {
    const close = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  React.useEffect(() => { setPinnedYear(null); }, [selectedYears.join(',')]);

  const activePreset = presets.find(p => {
    const valid = p.yrs.filter(y => allYears.includes(y));
    return valid.length === selectedYears.length && valid.every(y => selectedYears.includes(y));
  });

  return (
    <section className="card card-full">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">Bloomberg · Margem dos frigoríficos</div>
          <h3 className="card-title">Edgebeef</h3>
          <div className="card-sub">Série diária · USD/cwt</div>
        </div>
        <div className="card-controls">
          <div className="ctrl-btn-group">
            <div className="seg">
              <button className={`seg-btn ${chartStyle==='line'?'is-on':''}`} onClick={() => setChartStyle('line')}>Linha</button>
              <button className={`seg-btn ${chartStyle==='area'?'is-on':''}`} onClick={() => setChartStyle('area')}>Área</button>
            </div>
            <button className={`ctrl-btn ${showStats?'is-on':''}`} onClick={() => setShowStats(s => !s)}>MÉDIA + FAIXA</button>
            <button className={`ctrl-btn ${showEvents?'is-on':''}`} onClick={() => setShowEvents(s => !s)}>EVENTOS</button>
          </div>
          <div className="seg" ref={dropRef} style={{position:'relative'}}>
            {presets.map(p => (
              <button key={p.label}
                className={`year-seg-btn ${activePreset?.label === p.label ? 'is-on' : ''}`}
                onClick={() => setSelectedYears(p.yrs.filter(y => allYears.includes(y)))}>
                {p.label}
              </button>
            ))}
            <button
              className={`year-seg-btn ${dropOpen ? 'is-active' : ''} ${!activePreset && !dropOpen ? 'is-on' : ''}`}
              onClick={() => setDropOpen(o => !o)}>
              Anos
              <svg style={{marginLeft:4,verticalAlign:'middle'}} viewBox="0 0 10 6" width="9" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l4 4 4-4"/>
              </svg>
            </button>
            {dropOpen && (
              <div className="year-drop">
                {[...allYears].reverse().map(yr => (
                  <label key={yr} className="year-drop-item">
                    <input type="checkbox" checked={selectedYears.includes(yr)}
                      onChange={() => setSelectedYears(prev =>
                        prev.includes(yr)
                          ? prev.length > 1 ? prev.filter(y => y !== yr) : prev
                          : [...prev, yr]
                      )}/>
                    {yr}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <EdgebeeefChart
        byYear={byYear} allYears={allYears}
        selectedYears={selectedYears}
        pinnedYear={pinnedYear} setPinnedYear={setPinnedYear}
        chartStyle={chartStyle}
        showStats={showStats} showEvents={showEvents}
        events={events || []}
        accent={accent}
      />
    </section>
  );
};

// ── Ciclo do Boi US ───────────────────────────────────────────────────────────
const CicloBoiUS = ({ data, accent }) => {
  const W = 1000, H = 340;
  const padL = 56, padR = 64, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const secondaryColor = 'oklch(0.68 0.16 255)';

  const femPoints = React.useMemo(() => {
    return (data.beef_us || [])
      .filter(r => r.pct_femeas != null)
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map(r => ({ year: r.year, month: r.month, t: r.year + (r.month - 1) / 12, v: r.pct_femeas }));
  }, [data]);

  const boiPoints = React.useMemo(() => {
    return (data.beef_us || [])
      .filter(r => r.boi_bezerro_mm12 != null && typeof r.boi_bezerro_mm12 === 'number')
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map(r => ({ year: r.year, month: r.month, t: r.year + (r.month - 1) / 12, v: r.boi_bezerro_mm12 }));
  }, [data]);

  const [hover, setHover] = React.useState(null);

  if (!femPoints.length) return null;

  const tMin = femPoints[0].t;
  const tMax = femPoints[femPoints.length - 1].t;

  const femVals = femPoints.map(p => p.v);
  const femPad  = (Math.max(...femVals) - Math.min(...femVals)) * 0.15;
  const vLeftMin  = Math.floor((Math.min(...femVals) - femPad) / 2) * 2;
  const vLeftMax  = Math.ceil((Math.max(...femVals)  + femPad) / 2) * 2;

  const boiVals = boiPoints.map(p => p.v);
  const boiPad  = (Math.max(...boiVals) - Math.min(...boiVals)) * 0.15;
  const vRightMin = Math.floor((Math.min(...boiVals) - boiPad) * 20) / 20;
  const vRightMax = Math.ceil((Math.max(...boiVals)  + boiPad) * 20) / 20;

  const xs      = t => padL + ((t - tMin) / (tMax - tMin)) * chartW;
  const ysLeft  = v => padT + (1 - (v - vLeftMin)  / (vLeftMax  - vLeftMin))  * chartH;
  const ysRight = v => padT + (1 - (v - vRightMin) / (vRightMax - vRightMin)) * chartH;

  const femPath = femPoints.map((p, i) => `${i===0?'M':'L'}${xs(p.t).toFixed(1)},${ysLeft(p.v).toFixed(1)}`).join(' ');
  const boiPath = boiPoints.map((p, i) => `${i===0?'M':'L'}${xs(p.t).toFixed(1)},${ysRight(p.v).toFixed(1)}`).join(' ');

  const leftTicks = [], rightTicks = [];
  for (let v = Math.ceil(vLeftMin/2)*2; v <= vLeftMax; v += 2) leftTicks.push(v);
  const rStep = 0.05;
  for (let v = Math.round(vRightMin/rStep)*rStep; v <= vRightMax+0.001; v = Math.round((v+rStep)*1000)/1000) rightTicks.push(v);

  const xTicks = [];
  for (let yr = Math.ceil(tMin); yr <= Math.floor(tMax); yr++) {
    if (yr % 2 === 0) xTicks.push(yr);
  }

  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const t = tMin + ((px - padL) / chartW) * (tMax - tMin);
    let best = null, bestDist = Infinity;
    for (const p of femPoints) {
      const d = Math.abs(p.t - t);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    setHover(best);
  };

  const hoverBoi = hover ? boiPoints.find(p => p.year === hover.year && p.month === hover.month) : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>

        {leftTicks.map(v => (
          <g key={`l${v}`}>
            <line x1={padL} x2={W-padR} y1={ysLeft(v)} y2={ysLeft(v)} className="grid-line"/>
            <text x={padL-6} y={ysLeft(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">{v}%</text>
          </g>
        ))}
        {rightTicks.map(v => (
          <text key={`r${v}`} x={W-padR+6} y={ysRight(v)} className="tick-label" textAnchor="start" dominantBaseline="middle">{v.toFixed(2)}</text>
        ))}
        {xTicks.map(yr => (
          <g key={yr}>
            <line x1={xs(yr)} x2={xs(yr)} y1={padT} y2={H-padB} className="grid-line" opacity="0.3"/>
            <text x={xs(yr)} y={H-padB+14} className="tick-label" textAnchor="middle">{yr}</text>
          </g>
        ))}

        <path d={femPath} fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.6" strokeLinejoin="round"/>
        <path d={boiPath} fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

        {hover && (
          <g>
            <line x1={xs(hover.t)} x2={xs(hover.t)} y1={padT} y2={H-padB} stroke="var(--fg)" strokeOpacity="0.15" strokeWidth="1"/>
            <circle cx={xs(hover.t)} cy={ysLeft(hover.v)} r={4} fill="var(--bg)" stroke={accent} strokeWidth="1.5"/>
            {hoverBoi && <circle cx={xs(hoverBoi.t)} cy={ysRight(hoverBoi.v)} r={4} fill="var(--bg)" stroke={secondaryColor} strokeWidth="2"/>}
          </g>
        )}

        <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} className="axis-line"/>
        <line x1={padL} x2={padL}   y1={padT}    y2={H-padB} className="axis-line"/>
        <line x1={W-padR} x2={W-padR} y1={padT}  y2={H-padB} className="axis-line" strokeOpacity="0.4"/>
      </svg>

      {hover && (
        <div className="hover-card" style={{left:`calc(${(xs(hover.t)/W*100).toFixed(1)}% + 14px)`}}>
          <div className="hover-month">{window.MONTHS_PT[hover.month-1]}/{hover.year}</div>
          <div className="hover-rows">
            <div className="hover-row">
              <span className="hover-year" style={{color:accent}}>%Fêmeas</span>
              <span className="hover-val">{hover.v.toFixed(1)}<span className="hover-unit"> %</span></span>
            </div>
            {hoverBoi && (
              <div className="hover-row">
                <span className="hover-year" style={{color:secondaryColor}}>Boi/Bezerro</span>
                <span className="hover-val">{hoverBoi.v.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ciclo-legend">
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background:accent, opacity:0.7}}/>
          %Fêmeas (mensal)
        </span>
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background:secondaryColor}}/>
          Boi/Bezerro MM12M (eixo direito)
        </span>
      </div>
    </div>
  );
};

// ── Tab ───────────────────────────────────────────────────────────────────────
function BeefUSTab({ data, accent }) {
  const chartAccent = 'oklch(0.78 0.15 160)';
  return (
    <main className="main">
      <EdgebeeefCard data={data} accent={chartAccent} events={window.EVENTS || []}/>
      <section className="card card-full">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">USDA · Ciclo pecuário</div>
            <h3 className="card-title">Ciclo do Boi</h3>
            <div className="card-sub">%Fêmeas no Abate + Boi/Bezerro MM12M</div>
          </div>
        </div>
        <CicloBoiUS data={data} accent={chartAccent}/>
      </section>
    </main>
  );
}

Object.assign(window, { BeefUSTab });
