// Production USDA — quarterly forecast comparison chart

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const PT_MON_ABBR = {
  jan:'Jan', fev:'Fev', mar:'Mar', abr:'Abr', mai:'Mai', jun:'Jun',
  jul:'Jul', ago:'Ago', set:'Set', out:'Out', nov:'Nov', dez:'Dez',
};

// ── ProductionControls ────────────────────────────────────────────────────────
function ProductionControls({
  histYears, selectedHistYears, setSelectedHistYears,
  pairs, pairIdx, setPairIdx,
  showStats, setShowStats,
  chartStyle, setChartStyle,
}) {
  const { useState, useEffect, useRef } = React;
  const [histDropOpen, setHistDropOpen] = useState(false);
  const [pairDropOpen, setPairDropOpen] = useState(false);
  const histRef = useRef(null);
  const pairRef = useRef(null);

  const presets = [
    { label: '3a',    yrs: histYears.slice(-3) },
    { label: '5a',    yrs: histYears.slice(-5) },
    { label: '10a',   yrs: histYears.slice(-10) },
    { label: 'Todos', yrs: histYears },
  ];

  const activePreset = presets.find(p => {
    const valid = p.yrs.filter(y => histYears.includes(y));
    return valid.length === selectedHistYears.length && valid.every(y => selectedHistYears.includes(y));
  });

  const toggleHistYear = yr => setSelectedHistYears(prev =>
    prev.includes(yr)
      ? (prev.length === 1 ? prev : prev.filter(y => y !== yr))
      : [...prev, yr].sort((a, b) => a - b)
  );

  useEffect(() => {
    if (!histDropOpen) return;
    const h = e => { if (histRef.current && !histRef.current.contains(e.target)) setHistDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [histDropOpen]);

  useEffect(() => {
    if (!pairDropOpen) return;
    const h = e => { if (pairRef.current && !pairRef.current.contains(e.target)) setPairDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [pairDropOpen]);

  const fmtSnap = s => {
    if (!s) return '';
    const [mo, yr] = s.split('-');
    return (PT_MON_ABBR[mo] || mo) + '-' + yr;
  };
  const fmtPair = pair => `${fmtSnap(pair.b)} vs ${fmtSnap(pair.a)}`;

  return (
    <div className="card-controls">
      <div className="card-ctrl-row">
        {/* Historical year presets */}
        <div className="year-seg">
          {presets.map(p => (
            <button key={p.label}
              className={`year-seg-btn ${activePreset?.label === p.label ? 'is-on' : ''}`}
              onClick={() => setSelectedHistYears(p.yrs.filter(y => histYears.includes(y)))}>
              {p.label}
            </button>
          ))}
          <div className="year-drop-wrap" ref={histRef}>
            <button
              className={`year-seg-btn ${histDropOpen ? 'is-active' : ''} ${!activePreset && !histDropOpen ? 'is-on' : ''}`}
              onClick={() => setHistDropOpen(o => !o)}>
              Anos ▾
            </button>
            {histDropOpen && (
              <div className="year-drop">
                {histYears.slice().reverse().map(yr => (
                  <div key={yr} className={`year-drop-item ${selectedHistYears.includes(yr) ? 'is-on' : ''}`}
                    onClick={() => toggleHistYear(yr)}>
                    <span className="year-drop-check">{selectedHistYears.includes(yr) ? '✓' : ''}</span>
                    {yr}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparison pair dropdown */}
        <div className="year-drop-wrap" ref={pairRef} style={{marginLeft: 12}}>
          <button
            className={`year-seg-btn ${pairDropOpen ? 'is-active' : ''}`}
            style={{minWidth: 148, justifyContent: 'space-between'}}
            onClick={() => setPairDropOpen(o => !o)}>
            {pairs[pairIdx] ? fmtPair(pairs[pairIdx]) : '—'} ▾
          </button>
          {pairDropOpen && (
            <div className="year-drop" style={{minWidth: 160}}>
              {pairs.map((pair, i) => (
                <div key={i} className={`year-drop-item ${i === pairIdx ? 'is-on' : ''}`}
                  onClick={() => { setPairIdx(i); setPairDropOpen(false); }}>
                  <span className="year-drop-check">{i === pairIdx ? '✓' : ''}</span>
                  {fmtPair(pair)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-ctrl-row">
        <div className="ctrl-btn-group">
          <button className={`ctrl-btn ${showStats ? 'is-on' : ''}`} onClick={() => setShowStats(s => !s)}>
            MÉDIA + FAIXA
          </button>
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

// ── ProductionChart ───────────────────────────────────────────────────────────
function ProductionChart({
  histSeries,          // { year: [q1..q4] }  — pure-historical context lines
  indexedA, indexedB,  // { year: { values:[..], forecast:[..] } } — both snapshots
  compYears,           // years that have forecast in at least one snapshot (both have data)
  selectedHistYears,   // pure-historical years selected for context
  pair, showStats, chartStyle, accent,
}) {
  const W = 1000, H = 340;
  const padL = 72, padR = 24, padT = 20, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Unified palette across ALL visible years (hist + forecast)
  const allShownYears = [...new Set([...selectedHistYears, ...compYears])].sort((a,b) => a-b);
  const latestYear    = allShownYears.length ? Math.max(...allShownYears) : 0;

  const yearColor = yr => {
    const palette = [
      'oklch(0.75 0.15 200)', // age 1
      'oklch(0.68 0.16 255)', // age 2
      'oklch(0.74 0.15 310)', // age 3
      'oklch(0.78 0.17 35)',  // age 4
      'oklch(0.80 0.15 60)',  // age 5
      'oklch(0.72 0.16 0)',   // age 6
      'oklch(0.76 0.13 170)', // age 7
    ];
    const age = latestYear - yr;
    if (age === 0) return accent;
    return age - 1 < palette.length ? palette[age - 1] : 'oklch(0.48 0.01 260)';
  };

  // Y range
  const allVals = [];
  for (const yr of selectedHistYears) (histSeries[yr] || []).forEach(v => v != null && allVals.push(v));
  for (const yr of compYears) {
    (indexedA[yr]?.values || []).forEach(v => v != null && allVals.push(v));
    (indexedB[yr]?.values || []).forEach(v => v != null && allVals.push(v));
  }
  if (!allVals.length) return <div style={{padding:40, color:'var(--fg-dim)'}}>Sem dados de produção</div>;

  const lo = Math.min(...allVals), hi = Math.max(...allVals);
  const rng = hi - lo || 1;
  const yMin = lo - rng * 0.05, yMax = hi + rng * 0.18;

  const x = qi => padL + (qi / 3) * chartW;
  const y = v  => padT + (1 - (v - yMin) / (yMax - yMin)) * chartH;

  // Y ticks
  const rawStep = (yMax - yMin) / 5;
  const mag  = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const nn   = rawStep / mag;
  const nice = nn < 1.5 ? 1 : nn < 3 ? 2 : nn < 7 ? 5 : 10;
  const step = nice * mag;
  const yTicks = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + step * 0.01; v += step)
    yTicks.push(parseFloat(v.toPrecision(10)));

  const buildPath = vals => {
    const pts = vals.map((v, i) => v != null ? [x(i), y(v)] : null).filter(Boolean);
    if (!pts.length) return '';
    return pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  };

  // Split a series into solid (historical) and dashed (forecast) paths.
  // The dashed path anchors from the last solid point for visual continuity.
  const buildMixed = (values, forecast) => {
    const solid = [], dashed = [];
    for (let i = 0; i < 4; i++) {
      if (values[i] == null) continue;
      if (!forecast[i]) {
        solid.push([x(i), y(values[i])]);
      } else {
        if (dashed.length === 0 && solid.length > 0) dashed.push(solid[solid.length - 1]);
        dashed.push([x(i), y(values[i])]);
      }
    }
    const toPath = pts => pts.map((p, j) => `${j===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return { solidPath: toPath(solid), dashedPath: toPath(dashed) };
  };

  const buildAreaPath = vals => {
    const pts = vals.map((v, i) => v != null ? [x(i), y(v)] : null).filter(Boolean);
    if (!pts.length) return '';
    const top = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return top + ` L${pts[pts.length-1][0].toFixed(1)},${y(yMin).toFixed(1)} L${pts[0][0].toFixed(1)},${y(yMin).toFixed(1)} Z`;
  };

  // Stats band over historical context years
  const stats = React.useMemo(() => {
    if (!showStats) return null;
    const byQ = [[], [], [], []];
    for (const yr of selectedHistYears) {
      (histSeries[yr] || []).forEach((v, qi) => { if (v != null) byQ[qi].push(v); });
    }
    return byQ.map(vals => {
      if (vals.length < 2) return null;
      const s = [...vals].sort((a, b) => a - b);
      return { min: s[0], max: s[s.length-1], p25: s[Math.floor(s.length*.25)], p75: s[Math.floor(s.length*.75)], mean: vals.reduce((a,b)=>a+b,0)/vals.length };
    });
  }, [showStats, histSeries, selectedHistYears]);

  const [hover, setHover] = React.useState(null);
  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    setHover(Math.max(0, Math.min(3, Math.round(((px - padL) / chartW) * 3))));
  };

  const fmtSnap = s => { if (!s) return ''; const [mo, yr] = s.split('-'); return (PT_MON_ABBR[mo] || mo) + '-' + yr; };
  const fmtVal  = v => v == null ? '—' : Math.round(v).toLocaleString('pt-BR');

  const sortedHist = [...selectedHistYears].sort((a,b) => a-b).filter(yr => histSeries[yr]);
  const gradId = 'prod-grad';

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>

        <defs>
          {sortedHist.map(yr => (
            <linearGradient key={yr} id={`${gradId}-${yr}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor={yearColor(yr)} stopOpacity="0.20"/>
              <stop offset="100%" stopColor={yearColor(yr)} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>

        {/* Y grid + ticks */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W-padR} y1={y(v)} y2={y(v)} className="grid-line"/>
            <text x={padL-6} y={y(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">
              {(v/1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* X axis — quarters */}
        {QUARTERS.map((q, i) => (
          <g key={q}>
            <line x1={x(i)} x2={x(i)} y1={padT} y2={H-padB} className="grid-line" opacity="0.35"/>
            <text x={x(i)} y={H-padB+16} className="tick-label" textAnchor="middle">{q}</text>
          </g>
        ))}

        {/* Stats band */}
        {stats && (
          <g>
            <path d={(() => {
              const top = stats.map((s,i) => s ? `${i===0?'M':'L'}${x(i)},${y(s.max)}` : '').join(' ');
              const bot = [...stats].map((s,i) => s ? `L${x(i)},${y(s.min)}` : '').reverse().join(' ');
              return top + ' ' + bot + ' Z';
            })()} fill="var(--fg)" opacity="0.05"/>
            <path d={(() => {
              const top = stats.map((s,i) => s ? `${i===0?'M':'L'}${x(i)},${y(s.p75)}` : '').join(' ');
              const bot = [...stats].map((s,i) => s ? `L${x(i)},${y(s.p25)}` : '').reverse().join(' ');
              return top + ' ' + bot + ' Z';
            })()} fill="var(--fg)" opacity="0.08"/>
            <path d={stats.map((s,i) => s ? `${i===0?'M':'L'}${x(i)},${y(s.mean)}` : '').join(' ')}
              stroke="var(--fg)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" fill="none"/>
          </g>
        )}

        {/* ── Pure-historical context years (single solid line) ── */}
        {sortedHist.map(yr => {
          const vals = histSeries[yr];
          const clr  = yearColor(yr);
          const isLatest = yr === Math.max(...sortedHist);
          return (
            <g key={yr}>
              {chartStyle === 'area' && (
                <path d={buildAreaPath(vals)} fill={`url(#${gradId}-${yr})`} opacity={isLatest ? 0.9 : 0.6}/>
              )}
              <path d={buildPath(vals)} fill="none" stroke={clr}
                strokeWidth={isLatest ? 2 : 1.25}
                opacity={isLatest ? 1 : 0.8}
                strokeLinejoin="round" strokeLinecap="round"/>
            </g>
          );
        })}

        {/* ── Comparison years (both A and B lines per year) ── */}
        {compYears.map(yr => {
          const clr = yearColor(yr);
          const a   = indexedA[yr];
          const b   = indexedB[yr];
          return (
            <g key={yr}>
              {/* Line A — older snapshot, muted (40% opacity) */}
              {a && (() => {
                const { solidPath, dashedPath } = buildMixed(a.values, a.forecast);
                return (
                  <g opacity={0.38}>
                    {solidPath  && <path d={solidPath}  fill="none" stroke={clr} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>}
                    {dashedPath && <path d={dashedPath} fill="none" stroke={clr} strokeWidth={1.5} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round"/>}
                  </g>
                );
              })()}
              {/* Line B — newer snapshot, full opacity */}
              {b && (() => {
                const { solidPath, dashedPath } = buildMixed(b.values, b.forecast);
                return (
                  <g>
                    {solidPath  && <path d={solidPath}  fill="none" stroke={clr} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>}
                    {dashedPath && <path d={dashedPath} fill="none" stroke={clr} strokeWidth={2.5} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round"/>}
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Hover crosshair + dots */}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H-padB} stroke="var(--fg)" strokeOpacity="0.2" strokeWidth="1"/>
            {sortedHist.map(yr => {
              const v = histSeries[yr]?.[hover];
              if (v == null) return null;
              return <circle key={yr} cx={x(hover)} cy={y(v)} r={3.5} fill="var(--bg)" stroke={yearColor(yr)} strokeWidth={1.5}/>;
            })}
            {compYears.map(yr => {
              const clr = yearColor(yr);
              const va  = indexedA[yr]?.values[hover];
              const vb  = indexedB[yr]?.values[hover];
              return (
                <g key={yr}>
                  {va != null && <circle cx={x(hover)} cy={y(va)} r={4}   fill="var(--bg)" stroke={clr} strokeWidth={1.5} opacity={0.5}/>}
                  {vb != null && <circle cx={x(hover)} cy={y(vb)} r={4.5} fill="var(--bg)" stroke={clr} strokeWidth={2}/>}
                </g>
              );
            })}
          </g>
        )}

        <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} className="axis-line"/>
        <line x1={padL} x2={padL}   y1={padT}    y2={H-padB} className="axis-line"/>
      </svg>

      {/* Hover card */}
      {hover != null && (() => {
        const rows = [];
        // Comparison years first (newest on top)
        for (const yr of [...compYears].reverse()) {
          const clr = yearColor(yr);
          const va  = indexedA[yr]?.values[hover];
          const vb  = indexedB[yr]?.values[hover];
          const fcA = indexedA[yr]?.forecast[hover];
          const fcB = indexedB[yr]?.forecast[hover];
          if (vb != null) rows.push({ label: `${yr} · ${fmtSnap(pair?.b)}${fcB?' (fc)':''}`, color: clr, val: vb });
          if (va != null) rows.push({ label: `${yr} · ${fmtSnap(pair?.a)}${fcA?' (fc)':''}`, color: clr, val: va, muted: true });
        }
        // Historical context
        for (const yr of [...sortedHist].reverse()) {
          const v = histSeries[yr]?.[hover];
          if (v != null) rows.push({ label: String(yr), color: yearColor(yr), val: v });
        }
        return (
          <div className="hover-card" style={{left:`calc(${(x(hover)/W*100).toFixed(1)}% + 14px)`}}>
            <div className="hover-month">{QUARTERS[hover]}</div>
            <div className="hover-rows">
              {rows.map((r, i) => (
                <div key={i} className="hover-row" style={r.muted ? {opacity:0.5} : {}}>
                  <span className="hover-year" style={{color: r.color}}>{r.label}</span>
                  <span className="hover-val">{fmtVal(r.val)}<span className="hover-unit"> 000 lb</span></span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="ciclo-legend" style={{flexWrap:'wrap', gap:4}}>
        {/* Historical context years */}
        {[...sortedHist].reverse().map(yr => (
          <span key={yr} className="legend-year" style={{padding:'2px 6px', opacity: yr===Math.max(...sortedHist)?1:0.75, userSelect:'none'}}>
            <span className="legend-line" style={{background: yearColor(yr)}}/>
            {yr}
          </span>
        ))}
        {/* Comparison years */}
        {compYears.map(yr => {
          const clr = yearColor(yr);
          return (
            <React.Fragment key={yr}>
              {/* B — newer, full */}
              <span className="legend-year" style={{padding:'2px 6px', userSelect:'none'}}>
                <span style={{display:'inline-block',width:22,height:0,borderTop:`2.5px solid ${clr}`,verticalAlign:'middle',marginRight:4}}/>
                {yr} {fmtSnap(pair?.b)}
              </span>
              {/* A — older, muted */}
              <span className="legend-year" style={{padding:'2px 6px', opacity:0.45, userSelect:'none'}}>
                <span style={{display:'inline-block',width:22,height:0,borderTop:`1.5px dashed ${clr}`,verticalAlign:'middle',marginRight:4}}/>
                {yr} {fmtSnap(pair?.a)}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── ProductionCard ────────────────────────────────────────────────────────────
function ProductionCard({ data, accent }) {
  const { useState, useMemo, useEffect } = React;
  const production = data.production;
  if (!production?.snapshots?.length || !production?.bySnapshot) return null;

  const { snapshots, bySnapshot } = production;

  const toByYQ = records => {
    const out = {};
    for (const r of (records || [])) {
      if (!out[r.year]) out[r.year] = { values:[null,null,null,null], forecast:[false,false,false,false] };
      out[r.year].values[r.quarter - 1]   = r.value;
      out[r.year].forecast[r.quarter - 1] = r.isForecast;
    }
    return out;
  };

  // Consecutive pairs, newest first: { a: older, b: newer }
  const pairs = useMemo(() => {
    const p = [];
    for (let i = snapshots.length - 1; i >= 1; i--) p.push({ a: snapshots[i-1], b: snapshots[i] });
    return p;
  }, [snapshots]);

  const [pairIdx, setPairIdx] = useState(0);
  const pair = pairs[Math.min(pairIdx, pairs.length - 1)];

  const indexedA = useMemo(() => toByYQ(pair ? bySnapshot[pair.a] : []), [bySnapshot, pair?.a]);
  const indexedB = useMemo(() => toByYQ(pair ? bySnapshot[pair.b] : []), [bySnapshot, pair?.b]);

  // (i) Comparison years: have at least one forecast quarter in either snapshot
  //     AND both A and B have at least one non-null value for this year
  const compYears = useMemo(() => {
    const allYrs = new Set([...Object.keys(indexedA), ...Object.keys(indexedB)].map(Number));
    return [...allYrs].filter(yr => {
      const a = indexedA[yr], b = indexedB[yr];
      const hasA = a && a.values.some(v => v != null);
      const hasB = b && b.values.some(v => v != null);
      if (!hasA || !hasB) return false; // (i) skip if either snapshot has no data
      return (a && a.forecast.some(f => f)) || (b && b.forecast.some(f => f));
    }).sort((a, b) => a - b);
  }, [indexedA, indexedB]);

  // Pure historical years: all 4 quarters non-forecast in both, and not a comp year
  const histYears = useMemo(() => {
    const compSet = new Set(compYears);
    const allYrs  = new Set([...Object.keys(indexedA), ...Object.keys(indexedB)].map(Number));
    return [...allYrs].filter(yr => {
      if (compSet.has(yr)) return false;
      const a = indexedA[yr], b = indexedB[yr];
      return (!a || a.forecast.every(f => !f)) && (!b || b.forecast.every(f => !f));
    }).sort((a, b) => a - b);
  }, [indexedA, indexedB, compYears]);

  const [selectedHistYears, setSelectedHistYears] = useState(() => histYears.slice(-5));
  const [showStats, setShowStats]                 = useState(false);
  const [chartStyle, setChartStyle]               = useState('line');

  useEffect(() => { setSelectedHistYears(histYears.slice(-5)); }, [pairIdx, histYears.join(',')]);

  // Historical series from the newer snapshot (B) for accuracy
  const histSeries = useMemo(() => {
    const out = {};
    for (const yr of selectedHistYears) {
      const d = indexedB[yr] || indexedA[yr];
      if (d) out[yr] = d.values;
    }
    return out;
  }, [indexedA, indexedB, selectedHistYears]);

  const fmtSnap = s => { if (!s) return ''; const [mo, yr] = s.split('-'); return (PT_MON_ABBR[mo]||mo)+'-'+yr; };

  return (
    <section className="card card-full">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">USDA · Produção bovina trimestral · 000 lb</div>
          <h3 className="card-title">Revisão de Forecast</h3>
          <div className="card-sub">
            {pair ? `${fmtSnap(pair.b)} vs ${fmtSnap(pair.a)}` : ''}
            {' · '}contínuo = realizado · tracejado = projeção
          </div>
        </div>
        <ProductionControls
          histYears={histYears}
          selectedHistYears={selectedHistYears} setSelectedHistYears={setSelectedHistYears}
          pairs={pairs} pairIdx={pairIdx} setPairIdx={setPairIdx}
          showStats={showStats} setShowStats={setShowStats}
          chartStyle={chartStyle} setChartStyle={setChartStyle}
        />
      </div>
      <ProductionChart
        histSeries={histSeries}
        indexedA={indexedA} indexedB={indexedB}
        compYears={compYears}
        selectedHistYears={selectedHistYears}
        pair={pair}
        showStats={showStats} chartStyle={chartStyle}
        accent={accent}
      />
    </section>
  );
}

Object.assign(window, { ProductionCard });
