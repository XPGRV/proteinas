// ContinuousChart — série contínua (não sazonal) com controles simplificados

const MONTHS_PT_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function filterByRangeYears(rows, field, rangeYears) {
  const valid = rows.filter(r => r[field] != null);
  if (!valid.length || rangeYears === 'all') return valid;
  const last = valid[valid.length - 1];
  const cutOrd = last.year * 12 + last.month - 1 - rangeYears * 12;
  return valid.filter(r => r.year * 12 + r.month - 1 > cutOrd);
}

function ContinuousChart({ rows, field, accent, unit = '', decimals = 1, height = 360, events = [], showEvents = true, chartStyle = 'line' }) {
  const svgRef = React.useRef(null);
  const [hovered, setHovered] = React.useState(null);
  const [svgW, setSvgW] = React.useState(760);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver(([e]) => setSvgW(Math.floor(e.contentRect.width)));
    obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const W = svgW, H = height;
  const padL = 58, padR = 20, padT = 14, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const valid = React.useMemo(() => rows.filter(r => r[field] != null), [rows, field]);

  if (!valid.length) {
    return (
      <div style={{height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)', fontSize:13}}>
        Sem dados
      </div>
    );
  }

  const vals   = valid.map(r => r[field]);
  const minV   = Math.min(...vals);
  const maxV   = Math.max(...vals);
  const span   = maxV - minV || 1;
  const yMin   = minV - span * 0.04;
  const yMax   = maxV + span * 0.04;

  const firstOrd  = valid[0].year * 12 + valid[0].month - 1;
  const lastOrd   = valid[valid.length - 1].year * 12 + valid[valid.length - 1].month - 1;
  const totalMons = lastOrd - firstOrd || 1;

  const xOf = row => padL + ((row.year * 12 + row.month - 1 - firstOrd) / totalMons) * chartW;
  const yOf = v   => padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // Y ticks
  const yTicks = Array.from({length: 5}, (_, i) => yMin + (yMax - yMin) * (i / 4));

  // X ticks — alvo ~7 labels; intervalo "bonito" em meses
  const xOf_ord = ord => padL + ((ord - firstOrd) / totalMons) * chartW;
  const NICE_STEPS = [1, 2, 3, 6, 12, 24, 36, 60, 120];
  const rawStep = totalMons / 7;
  const stepMons = NICE_STEPS.find(s => s >= rawStep) || 120;
  const xTicks = [];
  const tickStart = Math.ceil(firstOrd / stepMons) * stepMons;
  for (let ord = tickStart; ord <= lastOrd; ord += stepMons) {
    const yr = Math.floor(ord / 12);
    const mo = (ord % 12) + 1;
    xTicks.push({ yr, mo, x: xOf_ord(ord), label: stepMons >= 12 ? String(yr) : `${MONTHS_PT_ABR[mo - 1]}/${String(yr).slice(-2)}` });
  }

  // SVG path
  const pts = valid.map(r => `${xOf(r).toFixed(1)},${yOf(r[field]).toFixed(1)}`);
  const linePath = `M${pts.join('L')}`;
  const areaPath = `${linePath}L${xOf(valid[valid.length-1]).toFixed(1)},${(padT+chartH).toFixed(1)}L${padL},${(padT+chartH).toFixed(1)}Z`;

  // Hover
  const onMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left - padL) / chartW;
    const ord = firstOrd + px * totalMons;
    let best = null, bestD = Infinity;
    for (const r of valid) {
      const d = Math.abs(r.year * 12 + r.month - 1 - ord);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (best) setHovered({ x: xOf(best), y: yOf(best[field]), row: best });
  };

  // Visible events
  const visEvts = showEvents
    ? events.filter(ev => { const o = ev.year * 12 + ev.month - 1; return o >= firstOrd && o <= lastOrd; })
    : [];

  const fmt = v => v == null ? '—' : Number(v).toFixed(decimals).replace('.', ',');
  const clipId = `cc-clip-${field}`;
  const gradId = `cc-grad-${field}`;

  return (
    <div style={{position:'relative'}}>
      <svg ref={svgRef} width="100%" height={H} style={{display:'block', overflow:'visible'}}
        onMouseMove={onMouseMove} onMouseLeave={() => setHovered(null)}>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT - 2} width={chartW} height={chartH + 6}/>
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={accent} stopOpacity={0.22}/>
            <stop offset="100%" stopColor={accent} stopOpacity={0.01}/>
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yOf(v)} y2={yOf(v)}
              stroke="var(--grid)" strokeWidth={0.7} opacity={i === 0 ? 0 : 0.55}
              style={{opacity:0, animation:`rx-grid-fade 0.5s ease-out ${i * 0.06}s forwards`}}
            />
            <text x={padL - 6} y={yOf(v) + 4} textAnchor="end" fontSize={10} fill="var(--fg-dim)">
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* Axis baseline */}
        <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="var(--border)" strokeWidth={1}/>

        {/* X labels */}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} x2={t.x} y1={padT + chartH} y2={padT + chartH + 4} stroke="var(--fg-dim)" strokeWidth={0.5}/>
            <text x={t.x} y={padT + chartH + 14} textAnchor="middle" fontSize={10} fill="var(--fg-dim)">{t.label}</text>
          </g>
        ))}

        {/* Events */}
        {visEvts.map((ev, i) => {
          const ex = padL + ((ev.year * 12 + ev.month - 1 - firstOrd) / totalMons) * chartW;
          return (
            <line key={i} x1={ex} x2={ex} y1={padT} y2={padT + chartH}
              stroke="var(--fg-dim)" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.45}
              clipPath={`url(#${clipId})`}/>
          );
        })}

        {/* Area */}
        {chartStyle === 'area' && (
          <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`}/>
        )}

        {/* Line */}
        {chartStyle !== 'bars' && (
          <path d={linePath} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round"
            clipPath={`url(#${clipId})`}/>
        )}

        {/* Bars */}
        {chartStyle === 'bars' && (() => {
          const bw = Math.max(1, chartW / totalMons - 0.5);
          return valid.map((r, i) => {
            const bx = xOf(r) - bw / 2;
            const by = yOf(r[field]);
            return <rect key={i} x={bx} y={by} width={bw} height={(padT + chartH) - by}
              fill={accent} opacity={0.75} clipPath={`url(#${clipId})`}/>;
          });
        })()}

        {/* Hover crosshair */}
        {hovered && (
          <g>
            <line x1={hovered.x} x2={hovered.x} y1={padT} y2={padT + chartH}
              stroke="var(--fg-dim)" strokeWidth={1} strokeDasharray="3 2" opacity={0.5}/>
            <circle cx={hovered.x} cy={hovered.y} r={4} fill={accent}
              stroke="var(--bg-panel)" strokeWidth={2}/>
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (() => {
        const r = hovered.row;
        const label = `${MONTHS_PT_ABR[r.month - 1]}/${String(r.year).slice(-2)}`;
        const tipW = 100;
        const tipX = hovered.x + 12 + tipW > svgW ? hovered.x - tipW - 8 : hovered.x + 12;
        return (
          <div style={{
            position:'absolute', top: Math.max(4, hovered.y - 38), left: tipX,
            background:'var(--bg-panel)', border:'1px solid var(--border)',
            borderRadius:6, padding:'4px 8px', fontSize:11,
            pointerEvents:'none', boxShadow:'var(--shadow)', zIndex:10, whiteSpace:'nowrap',
          }}>
            <div style={{color:'var(--fg-dim)', marginBottom:2}}>{label}</div>
            <div style={{color:accent, fontWeight:600}}>
              {fmt(r[field])} <span style={{color:'var(--fg-dim)', fontWeight:400}}>{unit}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── ContinuousCard ────────────────────────────────────────────────────────────
function ContinuousCard({ cardId, title, sub, accent, data, dataset, field, unit = '', decimals = 1, height = 360, events: eventsProp, footerNote }) {
  const [range, setRange]           = React.useState('5a');
  const [chartStyle, setChartStyle] = React.useState('area');

  const eventsData = []; // eventos desativados neste gráfico
  const allRows    = data[dataset] || [];

  const rangeNum = range === 'all' ? 'all' : parseInt(range);
  const rows = React.useMemo(() => filterByRangeYears(allRows, field, rangeNum), [allRows, field, rangeNum]);

  // Latest value header stats
  const lastRow  = rows[rows.length - 1] || null;
  const prevRow  = rows.length >= 2 ? rows[rows.length - 2] : null;
  const yoyRow   = lastRow ? [...rows].reverse().find(r => r.year === lastRow.year - 1 && r.month === lastRow.month) : null;
  const pct = (a, b) => (a == null || b == null || b === 0) ? null : (a - b) / Math.abs(b);
  const mom  = pct(lastRow?.[field], prevRow?.[field]);
  const yoy  = pct(lastRow?.[field], yoyRow?.[field]);
  const fmtPct = v => v == null ? '—' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
  const fmtVal = v => v == null ? '—' : Number(v).toFixed(decimals).replace('.', ',');

  return (
    <section className="card card-full" data-card-id={cardId}>
      <div className="card-head">
        <div>
          <div className="card-eyebrow">{sub}</div>
          <h3 className="card-title">{title}</h3>
          <div className="card-price">
            <span className="card-value">{fmtVal(lastRow?.[field])}</span>
            <span className="card-unit">{unit}</span>
            <span className={`card-delta ${mom == null ? '' : mom >= 0 ? 'is-up' : 'is-down'}`}>
              {fmtPct(mom)}<span className="card-delta-label"> MoM</span>
            </span>
            <span className={`card-delta ${yoy == null ? '' : yoy >= 0 ? 'is-up' : 'is-down'}`}>
              {fmtPct(yoy)}<span className="card-delta-label"> YoY</span>
            </span>
          </div>
        </div>

        {/* Controles simplificados — sem Média+Faixa, sem Barras, sem Eventos, sem seleção individual de anos */}
        <div className="card-controls">
          <div className="card-ctrl-row">
            <div className="year-seg">
              {[['3a',3],['5a',5],['10a',10],['Todos','all']].map(([label, val]) => (
                <button key={label}
                  className={`year-seg-btn ${range === String(val) ? 'is-on' : ''}`}
                  onClick={() => setRange(String(val))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-ctrl-row">
            <div className="seg">
              {[['line','Linha'],['area','Área']].map(([v, l]) => (
                <button key={v} className={`seg-btn ${chartStyle === v ? 'is-on' : ''}`}
                  onClick={() => setChartStyle(v)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ContinuousChart
        rows={rows} field={field} accent={accent}
        unit={unit} decimals={decimals} height={height}
        events={eventsData} showEvents={false}
        chartStyle={chartStyle}
      />

      {footerNote && (
        <div style={{padding:'6px 0 4px', fontSize:11, color:'var(--fg-dim)', lineHeight:1.6}}>
          {footerNote}
        </div>
      )}
    </section>
  );
}

window.ContinuousCard = ContinuousCard;
