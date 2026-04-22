// Beef US Tab — Edgebeef diário + Ciclo do Boi US

// ── Edgebeef Daily Chart ──────────────────────────────────────────────────────
const EdgebeeefChart = ({ data, accent }) => {
  const W = 1000, H = 340;
  const padL = 64, padR = 24, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = React.useMemo(() => {
    return (data.edgebeef_daily || []).map(r => ({
      ...r,
      t: r.year + (r.month - 1) / 12 + (r.day - 1) / 365.25,
    }));
  }, [data]);

  const [hover, setHover] = React.useState(null);

  if (!points.length) return null;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const vals = points.map(p => p.value);
  const rawMin = vals.reduce((a, b) => Math.min(a, b), Infinity);
  const rawMax = vals.reduce((a, b) => Math.max(a, b), -Infinity);
  const step = rawMax - rawMin > 800 ? 200 : rawMax - rawMin > 400 ? 100 : 50;
  const vMin = Math.floor(rawMin / step) * step;
  const vMax = Math.ceil(rawMax / step) * step;

  const xs = t  => padL + ((t - tMin) / (tMax - tMin)) * chartW;
  const ys = v  => padT + (1 - (v - vMin) / (vMax - vMin)) * chartH;

  const path = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xs(p.t).toFixed(1)},${ys(p.value).toFixed(1)}`
  ).join(' ');

  const yTicks = [];
  for (let v = vMin; v <= vMax; v += step) yTicks.push(v);

  const xTicks = [];
  for (let yr = Math.ceil(tMin); yr <= Math.floor(tMax); yr++) xTicks.push(yr);

  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const t = tMin + ((px - padL) / chartW) * (tMax - tMin);
    let best = null, bestDist = Infinity;
    for (const p of points) {
      const d = Math.abs(p.t - t);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    setHover(best);
  };

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>

        {yTicks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={ys(v)} y2={ys(v)} className="grid-line"/>
            <text x={padL - 6} y={ys(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">{v}</text>
          </g>
        ))}

        {/* Zero line highlight */}
        {vMin < 0 && vMax > 0 && (
          <line x1={padL} x2={W - padR} y1={ys(0)} y2={ys(0)}
            stroke="var(--fg)" strokeOpacity="0.25" strokeWidth="1"/>
        )}

        {xTicks.map(yr => (
          <g key={yr}>
            <line x1={xs(yr)} x2={xs(yr)} y1={padT} y2={H - padB} className="grid-line" opacity="0.3"/>
            <text x={xs(yr)} y={H - padB + 14} className="tick-label" textAnchor="middle">{yr}</text>
          </g>
        ))}

        <path d={path} fill="none" stroke={accent} strokeWidth="1.25" strokeLinejoin="round" strokeOpacity="0.9"/>

        {hover && (
          <g>
            <line x1={xs(hover.t)} x2={xs(hover.t)} y1={padT} y2={H - padB}
              stroke="var(--fg)" strokeOpacity="0.15" strokeWidth="1"/>
            <circle cx={xs(hover.t)} cy={ys(hover.value)} r={4}
              fill="var(--bg)" stroke={accent} strokeWidth="1.5"/>
          </g>
        )}

        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} className="axis-line"/>
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} className="axis-line"/>
      </svg>

      {hover && (
        <div className="hover-card" style={{left: `calc(${(xs(hover.t)/W*100).toFixed(1)}% + 14px)`}}>
          <div className="hover-month">
            {String(hover.day).padStart(2,'0')}/{window.MONTHS_PT[hover.month-1]}/{hover.year}
          </div>
          <div className="hover-rows">
            <div className="hover-row">
              <span className="hover-year" style={{color: accent}}>Edgebeef</span>
              <span className="hover-val">{hover.value.toFixed(2)}<span className="hover-unit"> USD/cwt</span></span>
            </div>
          </div>
        </div>
      )}
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
