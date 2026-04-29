// BimonthlyCard — gráfico bimestral com modo Sazonal e Contínuo

const BM_LABELS = ['Jan/Fev','Mar/Abr','Mai/Jun','Jul/Ago','Set/Out','Nov/Dez'];
const BM_SHORT  = ['J/F','M/A','M/J','J/A','S/O','N/D'];

// Deduplica dados mensais → bimestrais (1 ponto por bimestre)
function toBimonthly(rows, fieldKeys) {
  const map = {};
  for (const r of rows) {
    const bm  = Math.ceil(r.month / 2); // 1-6
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

// ── Seasonal (eixo bimestral, linhas por ano) ─────────────────────────────────
function BimonthlySeasonalChart({ bmRows, fields, selectedYears, height = 380 }) {
  const svgRef = React.useRef(null);
  const [W, setW] = React.useState(760);
  const [hoverBm, setHoverBm] = React.useState(null);
  const [hoverX, setHoverX] = React.useState(0);
  const [mouseY, setMouseY] = React.useState(0);

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
      if (!selectedYears.includes(r.year)) continue;
      if (!s[r.year]) s[r.year] = {};
      s[r.year][r.bimonth] = r;
    }
    return s;
  }, [bmRows, selectedYears]);

  const allVals = React.useMemo(() =>
    bmRows.filter(r => selectedYears.includes(r.year))
      .flatMap(r => fields.map(f => r[f.key]).filter(v => v != null)),
    [bmRows, selectedYears, fields]
  );

  if (!allVals.length) {
    return <div style={{height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)', fontSize:13}}>Sem dados</div>;
  }

  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.08, yMax = maxV + span * 0.08;

  const x   = bm => padL + ((bm - 1) / 5) * chartW;
  const y    = v  => padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const fmt  = v  => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(1).replace('.', ',') + '%';

  const sortedYears  = [...selectedYears].sort((a, b) => b - a);
  const latestYear   = sortedYears[0];
  const yearOpacity  = yr => yr === latestYear ? 1.0 : yr === sortedYears[1] ? 0.55 : 0.33;
  const yTicks = Array.from({length: 5}, (_, i) => yMin + (yMax - yMin) * (i / 4));

  const onMouseMove = React.useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const bm = Math.round(((e.clientX - rect.left - padL) / chartW) * 5) + 1;
    if (bm >= 1 && bm <= 6) {
      setHoverBm(bm);
      setHoverX(x(bm));
      setMouseY(e.clientY - rect.top);
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

        {/* Zero line */}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)}
            stroke="var(--fg-dim)" strokeWidth={0.8} strokeDasharray="4 2" opacity={0.35}/>
        )}

        {/* X axis */}
        <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="var(--border)" strokeWidth={1}/>
        {[1,2,3,4,5,6].map(bm => (
          <g key={bm}>
            <line x1={x(bm)} x2={x(bm)} y1={padT + chartH} y2={padT + chartH + 4} stroke="var(--fg-dim)" strokeWidth={0.5}/>
            <text x={x(bm)} y={padT + chartH + 15} textAnchor="middle" fontSize={9} fill="var(--fg-dim)">{BM_LABELS[bm - 1]}</text>
          </g>
        ))}

        {/* Lines: por ano × empresa */}
        {sortedYears.map(yr => {
          const op = yearOpacity(yr);
          return fields.map(f => {
            let path = '', inPath = false;
            for (let bm = 1; bm <= 6; bm++) {
              const v = seasonal[yr]?.[bm]?.[f.key];
              if (v != null) {
                const pt = `${x(bm).toFixed(1)},${y(v).toFixed(1)}`;
                path += inPath ? `L${pt}` : `M${pt}`;
                inPath = true;
              } else { inPath = false; }
            }
            return path ? (
              <path key={`${yr}-${f.key}`} d={path} fill="none"
                stroke={f.color} strokeWidth={yr === latestYear ? 2 : 1.5}
                strokeDasharray={yr === latestYear ? 'none' : '5 3'}
                opacity={op} clipPath="url(#bm-sea-clip)"/>
            ) : null;
          });
        })}

        {/* Dots para o ano mais recente */}
        {fields.map(f => [1,2,3,4,5,6].map(bm => {
          const v = seasonal[latestYear]?.[bm]?.[f.key];
          return v != null ? (
            <circle key={`${f.key}-${bm}`} cx={x(bm)} cy={y(v)} r={3}
              fill={f.color} stroke="var(--bg-panel)" strokeWidth={1.5}
              clipPath="url(#bm-sea-clip)"/>
          ) : null;
        }))}

        {/* Hover */}
        {hoverBm && (
          <line x1={x(hoverBm)} x2={x(hoverBm)} y1={padT} y2={padT + chartH}
            stroke="var(--fg-dim)" strokeWidth={1} strokeDasharray="3 2" opacity={0.5}/>
        )}
      </svg>

      {/* Tooltip */}
      {hoverBm && (() => {
        const isRight = hoverX > W * 0.75;
        return (
          <div className="hover-card" style={{
            left:`${(hoverX / W * 100).toFixed(1)}%`,
            top: Math.max(10, Math.min(H - 130, mouseY - 40)),
            transform: isRight ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)',
          }}>
            <div className="hover-month">{BM_LABELS[hoverBm - 1]}</div>
            <div className="hover-rows">
              {sortedYears.map(yr => (
                <React.Fragment key={yr}>
                  {sortedYears.length > 1 && (
                    <div style={{fontSize:10, color:'var(--fg-dim)', marginTop:4, marginBottom:1}}>{yr}</div>
                  )}
                  {fields.map(f => (
                    <div key={f.key} className="hover-row">
                      <span className="hover-year" style={{color: f.color}}>{f.label}</span>
                      <span className="hover-val">{fmt(seasonal[yr]?.[hoverBm]?.[f.key])}</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legenda */}
      <div className="ciclo-legend">
        {fields.map(f => (
          <span key={f.key} className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
            <span className="legend-line" style={{background: f.color}}/>
            {f.label}
          </span>
        ))}
        {sortedYears.length > 1 && (
          <span className="legend-year" style={{opacity:0.45, userSelect:'none', padding:'2px 6px', fontSize:10}}>
            · anos anteriores tracejados
          </span>
        )}
      </div>
    </div>
  );
}

// ── Continuous (eixo temporal bimestral) ──────────────────────────────────────
function BimonthlyContChart({ bmRows, fields, rangeYears, height = 380 }) {
  const svgRef = React.useRef(null);
  const [W, setW] = React.useState(760);
  const [hovered, setHovered] = React.useState(null);

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

  const firstOrd  = filtered[0].year * 6 + filtered[0].bimonth - 1;
  const lastOrd   = filtered[filtered.length - 1].year * 6 + filtered[filtered.length - 1].bimonth - 1;
  const totalBms  = lastOrd - firstOrd || 1;

  const xOf    = r   => padL + ((r.year * 6 + r.bimonth - 1 - firstOrd) / totalBms) * chartW;
  const xOfOrd = ord => padL + ((ord - firstOrd) / totalBms) * chartW;
  const yOf    = v   => padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const fmt    = v   => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(1).replace('.', ',') + '%';

  const yTicks = Array.from({length: 5}, (_, i) => yMin + (yMax - yMin) * (i / 4));

  // X ticks: ≤6 anos → step=3 bimestres (semestral); >6 anos → step=6 (anual)
  const rangeYrsNum = totalBms / 6;
  const stepBms  = rangeYrsNum <= 6 ? 3 : 6;
  const xTicks   = [];
  const tickStart = Math.ceil(firstOrd / stepBms) * stepBms;
  for (let ord = tickStart; ord <= lastOrd; ord += stepBms) {
    const yr = Math.floor(ord / 6);
    const bm = (ord % 6) + 1;
    const label = stepBms === 3
      ? `${BM_SHORT[bm - 1]}/${String(yr).slice(-2)}`
      : String(yr);
    xTicks.push({ x: xOfOrd(ord), label });
  }

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

        {/* Zero line */}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={padL} x2={W - padR} y1={yOf(0)} y2={yOf(0)}
            stroke="var(--fg-dim)" strokeWidth={0.8} strokeDasharray="4 2" opacity={0.35}/>
        )}

        <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="var(--border)" strokeWidth={1}/>

        {/* X ticks */}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} x2={t.x} y1={padT + chartH} y2={padT + chartH + 4} stroke="var(--fg-dim)" strokeWidth={0.5}/>
            <text x={t.x} y={padT + chartH + 14} textAnchor="middle" fontSize={10} fill="var(--fg-dim)">{t.label}</text>
          </g>
        ))}

        {/* Lines por empresa */}
        {fields.map(f => {
          let path = '', inPath = false;
          for (const r of filtered) {
            const v = r[f.key];
            if (v != null) {
              const pt = `${xOf(r).toFixed(1)},${yOf(v).toFixed(1)}`;
              path += inPath ? `L${pt}` : `M${pt}`;
              inPath = true;
            } else { inPath = false; }
          }
          return path ? (
            <path key={f.key} d={path} fill="none" stroke={f.color} strokeWidth={2}
              strokeLinejoin="round" clipPath="url(#bm-cont-clip)"/>
          ) : null;
        })}

        {/* Hover crosshair + dots */}
        {hovered && (
          <g>
            <line x1={hovered.x} x2={hovered.x} y1={padT} y2={padT + chartH}
              stroke="var(--fg-dim)" strokeWidth={1} strokeDasharray="3 2" opacity={0.5}/>
            {fields.map(f => {
              const v = hovered.row[f.key];
              return v != null ? (
                <circle key={f.key} cx={hovered.x} cy={yOf(v)} r={4}
                  fill={f.color} stroke="var(--bg-panel)" strokeWidth={2}/>
              ) : null;
            })}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (() => {
        const r = hovered.row;
        const isRight = hovered.x > W * 0.75;
        return (
          <div className="hover-card" style={{
            left:`${(hovered.x / W * 100).toFixed(1)}%`,
            top: Math.max(10, Math.min(H - 110, hovered.mouseY - 40)),
            transform: isRight ? 'translateX(calc(-100% - 16px))' : 'translateX(16px)',
          }}>
            <div className="hover-month">{BM_LABELS[r.bimonth - 1]}/{r.year}</div>
            <div className="hover-rows">
              {fields.map(f => (
                <div key={f.key} className="hover-row">
                  <span className="hover-year" style={{color: f.color}}>{f.label}</span>
                  <span className="hover-val">{fmt(r[f.key])}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legenda */}
      <div className="ciclo-legend">
        {fields.map(f => (
          <span key={f.key} className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
            <span className="legend-line" style={{background: f.color}}/>
            {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── BimonthlyCard ─────────────────────────────────────────────────────────────
function BimonthlyCard({ cardId, title, sub, data, dataset, fields, height = 380 }) {
  const [mode, setMode]         = React.useState('seasonal');
  const [range, setRange]       = React.useState('5');
  const [selYears, setSelYears] = React.useState(null); // null = usar default

  const allRows  = data[dataset] || [];
  const fieldKeys = fields.map(f => f.key);
  const bmRows   = React.useMemo(() => toBimonthly(allRows, fieldKeys), [allRows, fieldKeys.join(',')]);
  const years    = React.useMemo(() => [...new Set(bmRows.map(r => r.year))].sort((a, b) => a - b), [bmRows]);
  const latest   = years[years.length - 1];

  const PRESETS = [
    { label:'3a',    yrs: [latest, latest-1, latest-2] },
    { label:'5a',    yrs: [latest, latest-1, latest-2, latest-3, latest-4] },
    { label:'10a',   yrs: Array.from({length:10}, (_, i) => latest - i) },
    { label:'Todos', yrs: years },
  ];

  const defaultYears = React.useMemo(
    () => [latest, latest-1, latest-2, latest-3, latest-4].filter(y => years.includes(y)),
    [latest, years.join(',')]
  );
  const activeYears = selYears ?? defaultYears;
  const activePreset = PRESETS.find(p => {
    const valid = p.yrs.filter(y => years.includes(y));
    return valid.length === activeYears.length && valid.every(y => activeYears.includes(y));
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
          <div className="card-ctrl-row">
            <div className="seg">
              <button className={`seg-btn ${mode === 'seasonal'    ? 'is-on' : ''}`} onClick={() => setMode('seasonal')}>Sazonal</button>
              <button className={`seg-btn ${mode === 'continuous'  ? 'is-on' : ''}`} onClick={() => setMode('continuous')}>Contínuo</button>
            </div>
          </div>

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
        <BimonthlySeasonalChart bmRows={bmRows} fields={fields} selectedYears={activeYears} height={height}/>
      ) : (
        <BimonthlyContChart bmRows={bmRows} fields={fields} rangeYears={rangeNum} height={height}/>
      )}
    </section>
  );
}

window.BimonthlyCard = BimonthlyCard;
