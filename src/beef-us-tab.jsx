// Beef US Tab — Edgebeef + Ciclo do Boi US

const CicloBoiUS = ({ data, accent }) => {
  const W = 1000, H = 340;
  const padL = 60, padR = 60, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const secondaryColor = 'oklch(0.72 0.15 220)';

  const points = React.useMemo(() => {
    return (data.beef_us || [])
      .filter(r => r.pct_femeas != null)
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map(r => ({ year: r.year, month: r.month, t: r.year + (r.month - 1) / 12, v: r.pct_femeas }));
  }, [data]);

  const boiPoints = React.useMemo(() => {
    return (data.beef_us || [])
      .filter(r => r.boi_bezerro_mm12 != null)
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map(r => ({ year: r.year, month: r.month, t: r.year + (r.month - 1) / 12, v: r.boi_bezerro_mm12 }));
  }, [data]);

  const mm12 = React.useMemo(() => {
    return points.map((p, i) => {
      if (i < 11) return null;
      const avg = points.slice(i - 11, i + 1).reduce((s, x) => s + x.v, 0) / 12;
      return { ...p, mm: avg };
    }).filter(Boolean);
  }, [points]);

  const [hover, setHover] = React.useState(null);

  if (!points.length) return null;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  // Left Y axis: % Femeas 0–70
  const vLeftMin = 0, vLeftMax = 70;
  // Right Y axis: Boi/Bezerro 0.3–0.9
  const vRightMin = 0.3, vRightMax = 0.9;

  const xs = (t) => padL + ((t - tMin) / (tMax - tMin)) * chartW;
  const ysLeft = (v) => padT + (1 - (v - vLeftMin) / (vLeftMax - vLeftMin)) * chartH;
  const ysRight = (v) => padT + (1 - (v - vRightMin) / (vRightMax - vRightMin)) * chartH;

  const rawPath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xs(p.t).toFixed(1)},${ysLeft(p.v).toFixed(1)}`
  ).join(' ');

  const mmPath = mm12.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xs(p.t).toFixed(1)},${ysLeft(p.mm).toFixed(1)}`
  ).join(' ');

  const boiPath = boiPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xs(p.t).toFixed(1)},${ysRight(p.v).toFixed(1)}`
  ).join(' ');

  const yLeftTicks = [];
  for (let v = 0; v <= 70; v += 5) yLeftTicks.push(v);

  const yRightTicks = [];
  for (let v = 0.3; v <= 0.91; v = Math.round((v + 0.1) * 10) / 10) yRightTicks.push(v);

  const xTicks = [];
  for (let yr = Math.ceil(tMin); yr <= Math.floor(tMax); yr++) {
    if (yr % 2 === 0) xTicks.push(yr);
  }

  function accentHue(c) {
    const m = /oklch\([^)]+\)/.exec(c);
    if (!m) return 160;
    const parts = m[0].match(/[\d.]+/g);
    return parts ? parseFloat(parts[2]) : 160;
  }
  const rawColor = `oklch(0.60 0.07 ${accentHue(accent) + 200})`;

  const onMove = (e) => {
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

  const hoverMM = hover ? mm12.find(p => p.year === hover.year && p.month === hover.month) : null;
  const hoverBoi = hover ? boiPoints.find(p => p.year === hover.year && p.month === hover.month) : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>

        {/* Left Y ticks (% Femeas) */}
        {yLeftTicks.map(v => (
          <g key={`l${v}`}>
            <line x1={padL} x2={W - padR} y1={ysLeft(v)} y2={ysLeft(v)} className="grid-line"/>
            <text x={padL - 6} y={ysLeft(v)} className="tick-label" textAnchor="end" dominantBaseline="middle">{v}%</text>
          </g>
        ))}

        {/* Right Y ticks (Boi/Bezerro) */}
        {yRightTicks.map(v => (
          <text key={`r${v}`} x={W - padR + 6} y={ysRight(v)} className="tick-label" textAnchor="start" dominantBaseline="middle">{v.toFixed(1)}</text>
        ))}

        {/* Right axis label */}
        <text x={W - padR + 28} y={padT + chartH / 2} className="tick-label" textAnchor="middle"
          transform={`rotate(90, ${W - padR + 28}, ${padT + chartH / 2})`}
          style={{fontSize: 9, fill: 'var(--fg-dim)', opacity: 0.7}}>Boi/Bezerro</text>

        {/* X ticks */}
        {xTicks.map(yr => (
          <g key={yr}>
            <line x1={xs(yr)} x2={xs(yr)} y1={padT} y2={H - padB} className="grid-line" opacity="0.3"/>
            <text x={xs(yr)} y={H - padB + 14} className="tick-label" textAnchor="middle">{yr}</text>
          </g>
        ))}

        {/* Boi/Bezerro MM12 — thick, secondary color */}
        {boiPath && <path d={boiPath} fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.85"/>}

        {/* Raw mensal — thin, bluish */}
        <path d={rawPath} fill="none" stroke={rawColor} strokeWidth="1" strokeOpacity="0.5" strokeLinejoin="round"/>

        {/* MM12 %Femeas — thick, accent */}
        <path d={mmPath} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

        {/* Hover */}
        {hover && (
          <g>
            <line x1={xs(hover.t)} x2={xs(hover.t)} y1={padT} y2={H - padB}
              stroke="var(--fg)" strokeOpacity="0.15" strokeWidth="1"/>
            <circle cx={xs(hover.t)} cy={ysLeft(hover.v)} r={4}
              fill="var(--bg)" stroke={rawColor} strokeWidth="1.5"/>
            {hoverMM && (
              <circle cx={xs(hoverMM.t)} cy={ysLeft(hoverMM.mm)} r={4}
                fill="var(--bg)" stroke={accent} strokeWidth="2"/>
            )}
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
              <span className="hover-year" style={{color: rawColor}}>%Fêmeas</span>
              <span className="hover-val">{hover.v.toFixed(1)}<span className="hover-unit"> %</span></span>
            </div>
            {hoverMM && (
              <div className="hover-row">
                <span className="hover-year" style={{color: accent}}>MM12 %Fêmeas</span>
                <span className="hover-val">{hoverMM.mm.toFixed(1)}<span className="hover-unit"> %</span></span>
              </div>
            )}
            {hoverBoi && (
              <div className="hover-row">
                <span className="hover-year" style={{color: secondaryColor}}>Boi/Bezerro MM12</span>
                <span className="hover-val">{hoverBoi.v.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ciclo-legend">
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background: rawColor, opacity: 0.7}}/>
          %Fêmeas (mensal)
        </span>
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background: accent}}/>
          MM12 %Fêmeas
        </span>
        <span className="legend-year" style={{userSelect:'none', padding:'2px 6px'}}>
          <span className="legend-line" style={{background: secondaryColor}}/>
          Boi/Bezerro MM12 (eixo direito)
        </span>
      </div>
    </div>
  );
};

function BeefUSTab({ data, accent }) {
  return (
    <main className="main">
      <window.PriceCard
        title="Edgebeef" sub="Bloomberg · Margem dos frigoríficos"
        accent={accent} data={data}
        dataset="beef_us" field="edgebeef"
        unit="USD/cwt" decimals={1} fullWidth height={420}
      />
      <section className="card card-full">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">USDA · Ciclo pecuário</div>
            <h3 className="card-title">Ciclo do Boi</h3>
            <div className="card-sub">%Fêmeas no Abate + Boi/Bezerro MM12M</div>
          </div>
        </div>
        <CicloBoiUS data={data} accent={accent}/>
      </section>
    </main>
  );
}

Object.assign(window, { BeefUSTab });
