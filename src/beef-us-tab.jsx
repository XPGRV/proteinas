// Beef US Tab — Edgebeef diário + Ciclo do Boi US

// ── Edgebeef Seasonal Chart (daily granularity, by year) ─────────────────────
const MONTH_DOY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // day-of-year at start of each month

const EdgebeeefChart = ({ data, accent }) => {
  const W = 1000, H = 360;
  const padL = 64, padR = 24, padT = 14, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Group daily data by year
  const byYear = React.useMemo(() => {
    const out = {};
    for (const r of (data.edgebeef_daily || [])) {
      if (!out[r.year]) out[r.year] = [];
      out[r.year].push({ doy: MONTH_DOY[r.month - 1] + r.day, value: r.value });
    }
    // sort each year by doy
    for (const yr of Object.keys(out)) out[yr].sort((a, b) => a.doy - b.doy);
    return out;
  }, [data]);

  const allYears = React.useMemo(() => Object.keys(byYear).map(Number).sort((a,b)=>a-b), [byYear]);
  const latestYear = allYears[allYears.length - 1];

  const [selectedYears, setSelectedYears] = React.useState(() => allYears.slice(-5));
  const [pinnedYear, setPinnedYear] = React.useState(null);
  const [hover, setHover] = React.useState(null); // doy

  React.useEffect(() => { setPinnedYear(null); }, [selectedYears.join(',')]);

  if (!allYears.length) return null;

  // Y range from selected years
  let rawMin = Infinity, rawMax = -Infinity;
  for (const yr of selectedYears) {
    for (const p of (byYear[yr] || [])) {
      if (p.value < rawMin) rawMin = p.value;
      if (p.value > rawMax) rawMax = p.value;
    }
  }
  const range = rawMax - rawMin;
  const step = range > 800 ? 200 : range > 400 ? 100 : range > 200 ? 50 : 25;
  const vMin = Math.floor((rawMin - range * 0.05) / step) * step;
  const vMax = Math.ceil((rawMax  + range * 0.15) / step) * step;

  const x = doy => padL + (doy / 365) * chartW;
  const y = v   => padT + (1 - (v - vMin) / (vMax - vMin)) * chartH;

  const yearColor = yr => {
    if (yr === (pinnedYear || latestYear)) return accent;
    const palette = ['oklch(0.75 0.15 200)','oklch(0.68 0.16 255)','oklch(0.74 0.15 310)','oklch(0.78 0.17 35)','oklch(0.80 0.15 60)','oklch(0.72 0.16 0)','oklch(0.76 0.13 170)'];
    const age = latestYear - yr;
    return age - 1 < palette.length ? palette[age - 1] : `oklch(0.48 0.01 260)`;
  };

  const seriesOpacity = yr => {
    if (!pinnedYear) return yr === latestYear ? 1 : 0.7;
    return yr === pinnedYear ? 1 : 0.1;
  };

  const buildPath = (pts) => pts.map((p, i) => `${i===0?'M':'L'}${x(p.doy).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const yTicks = [];
  for (let v = vMin; v <= vMax; v += step) yTicks.push(v);

  const sortedAsc = [...selectedYears].sort((a,b)=>a-b);

  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const doy = Math.round(((px - padL) / chartW) * 365);
    setHover(Math.max(1, Math.min(365, doy)));
  };

  // For hover: find nearest point in each year to the hovered doy
  const getHoverPoint = (yr, doy) => {
    const pts = byYear[yr] || [];
    let best = null, bestD = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.doy - doy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return bestD <= 5 ? best : null;
  };

  // Find doy→date label from any year
  const doyToLabel = doy => {
    let mo = 11;
    for (let m = 0; m < 12; m++) { if (MONTH_DOY[m] > doy - 1) { mo = m - 1; break; } }
    mo = Math.max(0, mo);
    const day = doy - MONTH_DOY[mo];
    return `${day} ${window.MONTHS_PT[mo]}`;
  };

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>

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

        {/* X ticks — month labels */}
        {MONTH_DOY.map((doy, mi) => (
          <g key={mi}>
            <line x1={x(doy+1)} x2={x(doy+1)} y1={padT} y2={H-padB} className="grid-line" opacity="0.3"/>
            <text x={x(doy+15)} y={H-padB+16} className="tick-label" textAnchor="middle">{window.MONTHS_PT[mi]}</text>
          </g>
        ))}

        {/* Year lines */}
        {sortedAsc.map(yr => {
          const pts = byYear[yr] || [];
          if (!pts.length) return null;
          const stroke = yearColor(yr);
          const isCurrent = yr === latestYear;
          const isPinned = yr === pinnedYear;
          return (
            <g key={yr}>
              <path d={buildPath(pts)} fill="none" stroke={stroke}
                strokeWidth={isPinned ? 2.5 : isCurrent ? 2 : 1.25}
                strokeLinejoin="round" strokeLinecap="round"
                opacity={seriesOpacity(yr)}/>
              {/* wide hitbox */}
              <path d={buildPath(pts)} fill="none" stroke="transparent" strokeWidth={12}
                style={{cursor:'pointer'}}
                onClick={() => setPinnedYear(p => p === yr ? null : yr)}/>
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
              const isPinned = yr === pinnedYear;
              const isCurrent = yr === latestYear;
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
        const rows = sortedAsc.map(yr => ({ yr, pt: getHoverPoint(yr, hover) })).filter(r => r.pt);
        if (!rows.length) return null;
        return (
          <div className="hover-card" style={{left: `calc(${(x(hover)/W*100).toFixed(1)}% + 14px)`}}>
            <div className="hover-month">{doyToLabel(hover)}</div>
            <div className="hover-rows">
              {[...rows].reverse().map(({yr, pt}) => (
                <div key={yr} className="hover-row">
                  <span className="hover-year" style={{color: yearColor(yr)}}>{yr}</span>
                  <span className="hover-val">{pt.value.toFixed(1)}<span className="hover-unit"> USD/cwt</span></span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legend + year selector */}
      <div className="ciclo-legend" style={{flexWrap:'wrap', gap:4}}>
        {[...allYears].reverse().map(yr => (
          <span key={yr} className="legend-year"
            onClick={() => {
              setSelectedYears(prev =>
                prev.includes(yr) ? (prev.length > 1 ? prev.filter(y => y !== yr) : prev)
                                  : [...prev, yr]
              );
            }}
            style={{
              cursor:'pointer', userSelect:'none', padding:'2px 6px',
              opacity: selectedYears.includes(yr) ? (pinnedYear && pinnedYear !== yr ? 0.3 : yr === latestYear ? 1 : 0.8) : 0.25,
              outline: pinnedYear === yr ? `1px solid ${yearColor(yr)}` : 'none',
              borderRadius: 4,
            }}>
            <span className="legend-line" style={{background: yearColor(yr)}}/>
            {yr}
          </span>
        ))}
      </div>
    </div>
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

  // Condensed Y ranges from actual data
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

  const femPath = femPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xs(p.t).toFixed(1)},${ysLeft(p.v).toFixed(1)}`
  ).join(' ');
  const boiPath = boiPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xs(p.t).toFixed(1)},${ysRight(p.v).toFixed(1)}`
  ).join(' ');

  // Y ticks
  const leftTicks = [], rightTicks = [];
  const leftStep = 2;
  for (let v = Math.ceil(vLeftMin / leftStep) * leftStep; v <= vLeftMax; v += leftStep) leftTicks.push(v);
  const rightStep = 0.05;
  for (let v = Math.round(vRightMin / rightStep) * rightStep; v <= vRightMax + 0.001; v = Math.round((v + rightStep) * 1000) / 1000) rightTicks.push(v);

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
            <line x1={padL} x2={W - padR} y1={ysLeft(v)} y2={ysLeft(v)} className="grid-line"/>
            <text x={padL - 6} y={ysLeft(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">{v}%</text>
          </g>
        ))}

        {rightTicks.map(v => (
          <text key={`r${v}`} x={W - padR + 6} y={ysRight(v)} className="tick-label" textAnchor="start" dominantBaseline="middle">{v.toFixed(2)}</text>
        ))}

        {xTicks.map(yr => (
          <g key={yr}>
            <line x1={xs(yr)} x2={xs(yr)} y1={padT} y2={H - padB} className="grid-line" opacity="0.3"/>
            <text x={xs(yr)} y={H - padB + 14} className="tick-label" textAnchor="middle">{yr}</text>
          </g>
        ))}

        {/* %Fêmeas mensal — fino */}
        <path d={femPath} fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.6" strokeLinejoin="round"/>

        {/* Boi/Bezerro MM12 — grosso */}
        <path d={boiPath} fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

        {hover && (
          <g>
            <line x1={xs(hover.t)} x2={xs(hover.t)} y1={padT} y2={H - padB}
              stroke="var(--fg)" strokeOpacity="0.15" strokeWidth="1"/>
            <circle cx={xs(hover.t)} cy={ysLeft(hover.v)} r={4}
              fill="var(--bg)" stroke={accent} strokeWidth="1.5"/>
            {hoverBoi && (
              <circle cx={xs(hoverBoi.t)} cy={ysRight(hoverBoi.v)} r={4}
                fill="var(--bg)" stroke={secondaryColor} strokeWidth="2"/>
            )}
          </g>
        )}

        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} className="axis-line"/>
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} className="axis-line"/>
        <line x1={W - padR} x2={W - padR} y1={padT} y2={H - padB} className="axis-line" strokeOpacity="0.4"/>
      </svg>

      {hover && (
        <div className="hover-card" style={{left: `calc(${(xs(hover.t)/W*100).toFixed(1)}% + 14px)`}}>
          <div className="hover-month">{window.MONTHS_PT[hover.month - 1]}/{hover.year}</div>
          <div className="hover-rows">
            <div className="hover-row">
              <span className="hover-year" style={{color: accent}}>%Fêmeas</span>
              <span className="hover-val">{hover.v.toFixed(1)}<span className="hover-unit"> %</span></span>
            </div>
            {hoverBoi && (
              <div className="hover-row">
                <span className="hover-year" style={{color: secondaryColor}}>Boi/Bezerro</span>
                <span className="hover-val">{hoverBoi.v.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ciclo-legend">
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background: accent, opacity: 0.7}}/>
          %Fêmeas (mensal)
        </span>
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background: secondaryColor}}/>
          Boi/Bezerro MM12M (eixo direito)
        </span>
      </div>
    </div>
  );
};

// ── Tab ───────────────────────────────────────────────────────────────────────
function BeefUSTab({ data, accent }) {
  const chartAccent = 'oklch(0.78 0.15 160)'; // verde para destaque nos gráficos
  return (
    <main className="main">
      <section className="card card-full">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">Bloomberg · Margem dos frigoríficos</div>
            <h3 className="card-title">Edgebeef</h3>
            <div className="card-sub">Série diária · USD/cwt</div>
          </div>
        </div>
        <EdgebeeefChart data={data} accent={chartAccent}/>
      </section>

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
