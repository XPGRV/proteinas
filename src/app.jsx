// Main app — 2 tabs (Preços/Spreads, Abates)
const { useState, useEffect, useMemo, useRef } = React;

const PALETTES = {
  neon:       { name: 'Néon',       accent: 'oklch(0.82 0.18 155)' },
  cyan:       { name: 'Ciano',      accent: 'oklch(0.78 0.14 210)' },
  amber:      { name: 'Âmbar',      accent: 'oklch(0.78 0.16 75)' },
  magenta:    { name: 'Magenta',    accent: 'oklch(0.72 0.20 340)' },
  terracotta: { name: 'Terracota',  accent: 'oklch(0.65 0.13 45)' },
  ice:        { name: 'Gelo',       accent: 'oklch(0.88 0.04 240)' },
};

const TYPE_STACKS = {
  modern:    { name: 'Moderno',    sans: '"Inter Tight", system-ui, sans-serif',  mono: '"Geist Mono", ui-monospace, monospace' },
  editorial: { name: 'Editorial',  sans: '"Instrument Serif", Georgia, serif',    mono: '"JetBrains Mono", monospace' },
  swiss:     { name: 'Suíça',      sans: '"Space Grotesk", system-ui, sans-serif', mono: '"Space Mono", ui-monospace, monospace' },
  humanist:  { name: 'Humanista',  sans: '"Work Sans", system-ui, sans-serif',     mono: '"IBM Plex Mono", ui-monospace, monospace' },
};


function App({ data: propData, initialData, initialMeta }) {
  const TWEAK_DEFAULTS = { palette: 'neon', typography: 'modern', density: 'comfortable', theme: 'aurora' };

  // ── Todos os hooks ANTES de qualquer return condicional ──────────────────────
  const [data, setData] = useState(propData || initialData);
  const [meta, setMeta] = useState(initialMeta || null);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useState(false);
  const [tab, setTab] = useState('precos');
  const [activeDataset, setActiveDataset] = useState('beef_br');

  useEffect(() => {
    const onUpload = (e) => {
      if (e.detail?.data) { setData(e.detail.data); setMeta(e.detail.meta || null); }
    };
    window.addEventListener('dashboard-data-updated', onUpload);
    return () => window.removeEventListener('dashboard-data-updated', onUpload);
  }, []);

  // Cross-tab navigation from the ticker (clicking ABATES on Preços tab → switch
  // to Abates and let the ticker re-trigger the scroll once the card is mounted).
  useEffect(() => {
    const onGoto = (e) => {
      const t = e.detail?.target || '';
      const precosCards = ['card-cattle','card-carne-mi','card-carne-me','card-spread-mi','card-spread-me'];
      const abatesCards = ['card-abates','card-femeas','card-ciclo'];
      if (activeDataset !== 'beef_br') setActiveDataset('beef_br');
      if (precosCards.includes(t)) setTab('precos');
      else if (abatesCards.includes(t)) setTab('abates');
    };
    window.addEventListener('rx-goto-card', onGoto);
    return () => window.removeEventListener('rx-goto-card', onGoto);
  }, [activeDataset]);

  useEffect(() => {
    const onMsg = (e) => {
      const m = e.data;
      if (!m || typeof m !== 'object') return;
      if (m.type === '__activate_edit_mode') setEditMode(true);
      else if (m.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const updateTweak = (key, val) => {
    setTweaks(prev => {
      const next = { ...prev, [key]: val };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
      return next;
    });
  };

  const accent = activeDataset === 'beef_us'
    ? 'oklch(0.72 0.18 240)'
    : tweaks.accent || PALETTES[tweaks.palette].accent;
  const typeStack = TYPE_STACKS[tweaks.typography];

  useEffect(() => {
    document.documentElement.dataset.density = tweaks.density;
    document.documentElement.dataset.theme = tweaks.theme || 'refined';
    // Theme drives accent unless user picks a custom palette swatch.
    const themeAccent = (window.THEMES && window.THEMES[tweaks.theme]?.accent) || accent;
    const finalAccent = activeDataset === 'beef_us' ? 'oklch(0.72 0.18 240)' : themeAccent;
    document.documentElement.style.setProperty('--accent', finalAccent);
    document.documentElement.style.setProperty('--font-sans', typeStack.sans);
    document.documentElement.style.setProperty('--font-mono', typeStack.mono);
  }, [accent, typeStack, tweaks.density, tweaks.theme, activeDataset]);

  const onUpload = (d, m) => { setData(d); setMeta(m); window.__dashboardData = d; window.__dashboardMeta = m; };

  if (!data) {
    return (
      <div className="app app-empty">
        <header className="topbar topbar-slim">
          <div className="topbar-title">
            <h1>Setorial</h1>
            <div className="topbar-sub">acompanhamento setorial</div>
          </div>
          <div className="topbar-spacer"/>
          <window.UploadWidget onLoad={onUpload} lastUpdate={null} currentSource={null}/>
        </header>
        <main className="main" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,minHeight:'60vh',color:'var(--fg-dim)'}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
          </svg>
          <div style={{fontSize:16,fontWeight:500,color:'var(--fg)'}}>Nenhum dado encontrado</div>
          <div style={{fontSize:13,textAlign:'center',maxWidth:320}}>Faça upload da planilha BeefBR.xlsm ou BeefUS.xlsm para começar.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab}
        activeDataset={activeDataset} setActiveDataset={setActiveDataset}/>
      <div className="app-content">
        <TopBar meta={meta} onUpload={onUpload} activeDataset={activeDataset}/>
        <TickerBar data={data} activeDataset={activeDataset}/>
        {activeDataset === 'beef_us' ? (
          <window.BeefUSTab data={data} accent={accent}/>
        ) : tab === 'precos' ? (
          <PrecosTab data={data} accent={accent}/>
        ) : (
          <AbatesTab data={data} accent={accent}/>
        )}
      </div>
      {editMode && <TweaksPanel tweaks={tweaks} updateTweak={updateTweak}/>}
    </div>
  );
}

// ---------------- Sidebar ----------------
const SIcon = {
  bar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="9" width="4" height="11" rx="1"/></svg>,
  abates: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18l5-6 4 4 4-7 5 9"/><path d="M3 21h18"/></svg>,
  flag: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v17"/><path d="M4 4h13l-2 4 2 4H4"/></svg>,
  globe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>,
  pig: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13a7 6 0 0114 0v3a3 3 0 01-3 3h-1l-1 2h-2l-1-2H8a3 3 0 01-3-3z"/><circle cx="9" cy="12" r="0.6" fill="currentColor"/><path d="M16 11l2-2"/></svg>,
};

function Sidebar({ tab, setTab, activeDataset, setActiveDataset }) {
  const onPick = (ds, sub) => {
    setActiveDataset(ds);
    if (sub) setTab(sub);
  };
  const isBR = activeDataset === 'beef_br';
  const isUS = activeDataset === 'beef_us';
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logobox">
          <img src="src/xp-asset-logo.svg" alt="XP Asset Management" className="sidebar-brand-logo"/>
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">Setorial</div>
          <div className="sidebar-brand-sub">Dashboard · abr/26</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Mercados</div>

        <div className="sidebar-group">
          <div className="sidebar-group-header">
            <span className="sidebar-item-icon">{SIcon.flag}</span>
            <span>Beef BR</span>
          </div>
          <button
            className={`sidebar-item ${isBR && tab==='precos' ? 'is-on' : ''}`}
            onClick={() => onPick('beef_br', 'precos')}>
            <span className="sidebar-item-icon">{SIcon.bar}</span>
            <span className="sidebar-item-label">Preços & Spreads</span>
          </button>
          <button
            className={`sidebar-item ${isBR && tab==='abates' ? 'is-on' : ''}`}
            onClick={() => onPick('beef_br', 'abates')}>
            <span className="sidebar-item-icon">{SIcon.abates}</span>
            <span className="sidebar-item-label">Abates</span>
          </button>
        </div>

        <button
          className={`sidebar-item ${isUS ? 'is-on' : ''}`}
          onClick={() => onPick('beef_us')}
          style={{marginTop:6}}>
          <span className="sidebar-item-icon">{SIcon.globe}</span>
          <span className="sidebar-item-label">Beef US</span>
        </button>
      </div>

      <div className="sidebar-spacer"/>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Em breve</div>
        <button className="sidebar-item" disabled style={{opacity:0.5, cursor:'default'}}>
          <span className="sidebar-item-icon">{SIcon.pig}</span>
          <span className="sidebar-item-label">Pork BR</span>
          <span className="sidebar-soon">soon</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar({ meta, onUpload, activeDataset }) {
  const title = activeDataset === 'beef_us' ? 'Beef US' : 'Beef BR';
  const currentMeta = activeDataset === 'beef_us'
    ? (meta?.us ?? null)
    : (meta?.br ?? (meta?.updated ? meta : null));
  return (
    <header className="topbar topbar-slim">
      <div className="topbar-title">
        <h1>{title}</h1>
      </div>
      <div className="topbar-spacer"/>
      <window.UploadWidget onLoad={onUpload} lastUpdate={currentMeta?.updated} currentSource={currentMeta?.source}/>
    </header>
  );
}

// ---------------- Preços Tab ----------------
function PrecosTab({ data, accent }) {
  const computedBeef = useMemo(() => data.beef.map(r => ({
    ...r,
    carcass_mi_usd: (r.beef_carcass_brl_kg != null && r.usdbrl) ? r.beef_carcass_brl_kg / r.usdbrl : null,
  })), [data]);
  const computedData = useMemo(() => ({ ...data, beef: computedBeef }), [data, computedBeef]);

  return (
    <main className="main">
      <div className="grid-precos">
        <PriceCard cardId="card-carne-mi" title="Preço Carne · Mercado Interno" sub="Bloomberg · BAMTCACA Index"
          accent={accent} data={computedData} dataset="beef"
          field="beef_carcass_brl_kg" usdField="carcass_mi_usd"
          unit="R$/kg" usdUnit="US$/kg" hasUSD decimals={2}/>
        <PriceCard cardId="card-carne-me" title="Preço Carne · Mercado Externo" sub="Bloomberg · BACAINDX Index"
          accent={accent} data={data} dataset="beef"
          field="beef_me_brl_kg" usdField="beef_me_usd_kg"
          unit="R$/kg" usdUnit="US$/kg" hasUSD decimals={2}/>
        <PriceCard cardId="card-cattle" title="Preço Boi" sub="Bloomberg · BAINPECU Index"
          accent={accent} data={data} dataset="beef"
          field="cattle_brl_kg" usdField="cattle_usd_kg"
          unit="R$/kg" usdUnit="US$/kg" hasUSD decimals={2}/>
      </div>

      <div className="section-header"><h2>Spreads</h2></div>

      <div className="grid-spreads">
        <PriceCard cardId="card-spread-mi" title="Spread MI" sub="Cálculo próprio · Preço Carne MI − Preço Boi"
          accent={accent} data={data} dataset="beef"
          field="spread_mi" unit="R$/kg" decimals={2}/>
        <PriceCard cardId="card-spread-me" title="Spread ME" sub="Cálculo próprio · Preço Carne ME − Preço Boi"
          accent={accent} data={data} dataset="beef"
          field="spread_me" unit="R$/kg" decimals={2}/>
      </div>
    </main>
  );
}

// ---------------- Abates Tab ----------------
function AbatesTab({ data, accent }) {
  const [abatesSource, setAbatesSource] = useState('sidra');
  const [showEventsCiclo, setShowEventsCiclo] = useState(true);
  const abatesDataset = abatesSource === 'sidra' ? 'abates' : 'beef';
  const abatesField   = abatesSource === 'sidra' ? 'total'  : 'abates_total';
  const abatesSub     = abatesSource === 'sidra' ? 'SIDRA · Cabeças abatidas' : 'SIF · Cabeças abatidas';

  return (
    <main className="main">
      <PriceCard
        key={`abates-${abatesSource}`}
        cardId="card-abates"
        title="Abates Totais" sub={abatesSub}
        accent={accent} data={data}
        dataset={abatesDataset} field={abatesField}
        unit="cab." big fullWidth height={420}
        headerExtra={
          <div className="seg" style={{marginBottom: 4}}>
            <button className={`seg-btn ${abatesSource==='sidra'?'is-on':''}`} onClick={() => setAbatesSource('sidra')}>SIDRA</button>
            <button className={`seg-btn ${abatesSource==='sif'?'is-on':''}`} onClick={() => setAbatesSource('sif')}>SIF</button>
          </div>
        }
      />

      <section className="card card-full" data-card-id="card-ciclo">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">SIF · Ciclo pecuário</div>
            <h3 className="card-title">Ciclo do Boi</h3>
            <div className="card-sub">Série mensal + média móvel 12 meses (MM12)</div>
          </div>
          <div className="card-controls" style={{alignSelf:'center'}}>
            <div className="ctrl-btn-group">
              <button className={`ctrl-btn ${showEventsCiclo ? 'is-on' : ''}`} onClick={() => setShowEventsCiclo(v => !v)}>EVENTOS</button>
            </div>
          </div>
        </div>
        <window.CicloDoBoi data={data} accent={accent} events={window.EVENTS || []} showEvents={showEventsCiclo}/>
      </section>

      <PriceCard
        cardId="card-femeas"
        title="% Fêmeas no Abate" sub="SIF · sazonal mês-a-mês"
        accent={accent} data={data}
        dataset="beef" field="pct_femeas"
        unit="%" decimals={0} height={340}/>

    </main>
  );
}

// ---------------- PriceCard ----------------
function PriceCard({
  title, sub, accent, data, dataset, field, usdField,
  unit, usdUnit, hasUSD, decimals, big,
  fullWidth, height = 320, headerExtra, cardId,
}) {
  const years = useMemo(() => window.availableYears(data, dataset, field), [data, dataset, field]);
  const latest = years[years.length - 1];
  const defaultYears = useMemo(
    () => [latest, latest-1, latest-2, latest-3, latest-4].filter(y => years.includes(y)),
    [latest, years.join(',')]
  );

  const [selectedYears, setSelectedYears] = useState(defaultYears);
  const [showStats, setShowStats] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [chartStyle, setChartStyle] = useState('line');
  const [currency, setCurrency] = useState('brl');

  const activeField = (hasUSD && currency === 'usd' && usdField) ? usdField : field;
  const activeUnit  = (hasUSD && currency === 'usd') ? (usdUnit || 'US$/kg') : unit;

  const latestRow = window.latestNonNull(data, dataset, activeField);
  const latestValue = latestRow?.[activeField];
  const prevMonthRow = latestRow ? data[dataset].find(r => {
    const m2 = latestRow.month === 1 ? 12 : latestRow.month - 1;
    const y2 = latestRow.month === 1 ? latestRow.year - 1 : latestRow.year;
    return r.year === y2 && r.month === m2;
  }) : null;
  const yoyRow = latestRow ? data[dataset].find(r =>
    r.year === latestRow.year - 1 && r.month === latestRow.month
  ) : null;

  const pctChange = (a, b) => (a == null || b == null || b === 0) ? null : (a - b) / Math.abs(b);
  const mom = pctChange(latestValue, prevMonthRow?.[activeField]);
  const yoy = pctChange(latestValue, yoyRow?.[activeField]);
  const fmtPct = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + (v*100).toFixed(1) + '%';

  return (
    <section className={`card ${fullWidth ? 'card-full' : ''}`} data-card-id={cardId}>
      <div className="card-head">
        <div>
          <div className="card-eyebrow">{sub}</div>
          <h3 className="card-title">{title}</h3>
          <div className="card-price">
            <span className="card-value">{window.fmt(latestValue, {decimals, big})}</span>
            <span className="card-unit">{activeUnit}</span>
            <span className={`card-delta ${mom == null ? '' : mom >= 0 ? 'is-up' : 'is-down'}`}>
              {fmtPct(mom)}<span className="card-delta-label"> MoM</span>
            </span>
            <span className={`card-delta ${yoy == null ? '' : yoy >= 0 ? 'is-up' : 'is-down'}`}>
              {fmtPct(yoy)}<span className="card-delta-label"> YoY</span>
            </span>
            {latestRow && (
              <span className="card-date">{window.MONTHS_PT[latestRow.month-1]}/{String(latestRow.year).slice(-2)}</span>
            )}
          </div>
        </div>
        <div className="card-head-right">
          {headerExtra}
          <ChartControls
            years={years}
            selectedYears={selectedYears} setSelectedYears={setSelectedYears}
            showStats={showStats} setShowStats={setShowStats}
            showEvents={showEvents} setShowEvents={setShowEvents}
            chartStyle={chartStyle} setChartStyle={setChartStyle}
            currency={currency} setCurrency={setCurrency}
            hasUSD={hasUSD}
          />
        </div>
      </div>

      <window.SeasonalChart
        data={data} dataset={dataset} field={activeField}
        selectedYears={selectedYears}
        showStats={showStats} showEvents={showEvents}
        events={window.EVENTS} chartStyle={chartStyle}
        accent={accent} unit={activeUnit} decimals={decimals} big={big}
        height={height}
      />
    </section>
  );
}

// ---------------- ChartControls ----------------
function ChartControls({
  years, selectedYears, setSelectedYears,
  showStats, setShowStats,
  showEvents, setShowEvents,
  chartStyle, setChartStyle,
  currency, setCurrency, hasUSD,
}) {
  const latest = years[years.length - 1];
  const [dropOpen, setDropOpen] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const dropRef = useRef(null);
  const eventsTimerRef = useRef(null);

  const presets = [
    { label: '3a',    yrs: [latest, latest-1, latest-2] },
    { label: '5a',    yrs: [latest, latest-1, latest-2, latest-3, latest-4] },
    { label: '10a',   yrs: Array.from({length:10}, (_, i) => latest - i) },
    { label: 'Todos', yrs: years },
  ];

  const applyPreset = (yrs) => setSelectedYears(yrs.filter(y => years.includes(y)));

  const activePreset = presets.find(p => {
    const valid = p.yrs.filter(y => years.includes(y));
    return valid.length === selectedYears.length && valid.every(y => selectedYears.includes(y));
  });

  const toggleYear = (yr) => {
    setSelectedYears(prev => prev.includes(yr)
      ? (prev.length === 1 ? prev : prev.filter(y => y !== yr))
      : [...prev, yr].sort((a, b) => a - b));
  };

  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const onEventsEnter = () => {
    eventsTimerRef.current = setTimeout(() => setShowEventsList(true), 3000);
  };
  const onEventsLeave = () => {
    clearTimeout(eventsTimerRef.current);
    setShowEventsList(false);
  };

  const activeEvents = window.EVENTS.filter(e => selectedYears.includes(e.year));

  return (
    <div className="card-controls">
      {/* Row 1: year presets as unified segmented control */}
      <div className="card-ctrl-row">
        <div className="year-seg">
          {presets.map(p => (
            <button key={p.label} className={`year-seg-btn ${activePreset?.label === p.label ? 'is-on' : ''}`} onClick={() => applyPreset(p.yrs)}>{p.label}</button>
          ))}
          <div className="year-drop-wrap" ref={dropRef}>
            <button className={`year-seg-btn ${dropOpen ? 'is-active' : ''} ${!activePreset && !dropOpen ? 'is-on' : ''}`} onClick={() => setDropOpen(o => !o)}>
              Anos ▾
            </button>
            {dropOpen && (
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

      {/* Row 2: toggles + chart style + currency */}
      <div className="card-ctrl-row">
        <div className="ctrl-btn-group">
          <button
            className={`ctrl-btn ${showStats && chartStyle !== 'bars' ? 'is-on' : ''} ${chartStyle === 'bars' ? 'is-disabled' : ''}`}
            onClick={() => chartStyle !== 'bars' && setShowStats(v => !v)}>
            MÉDIA + FAIXA
          </button>
          <div className="events-toggle-wrap" onMouseEnter={onEventsEnter} onMouseLeave={onEventsLeave}>
            <button className={`ctrl-btn ${showEvents ? 'is-on' : ''}`} onClick={() => setShowEvents(v => !v)}>
              EVENTOS
            </button>
          {showEventsList && (
            <div className="events-list-popup">
              <div className="events-list-title">Eventos nos anos selecionados</div>
              {activeEvents.length === 0 ? (
                <div style={{fontSize:11, color:'var(--fg-dim)'}}>Nenhum evento nos anos selecionados.</div>
              ) : activeEvents.map((ev, i) => (
                <div key={i} className="events-list-item">
                  <span className="events-list-date">{window.MONTHS_PT[ev.month-1]}/{ev.year}</span>
                  <span className="events-list-label">{ev.label}</span>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
        <div style={{marginLeft: 16}}>
          <div className="seg">
            {[['line','Linha'],['area','Área'],['bars','Barras']].map(([v, l]) => (
              <button key={v} className={`seg-btn ${chartStyle===v?'is-on':''}`} onClick={() => setChartStyle(v)}>{l}</button>
            ))}
          </div>
        </div>
        {hasUSD && (
          <div className="currency-toggle" style={{marginLeft: 16}}>
            <button className={`cur-btn ${currency==='brl'?'is-on':''}`} onClick={() => setCurrency('brl')}>R$</button>
            <button className={`cur-btn ${currency==='usd'?'is-on':''}`} onClick={() => setCurrency('usd')}>US$</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Toggle ----------------
function Toggle({ label, value, onChange, disabled }) {
  return (
    <label className="toggle" style={disabled ? {opacity: 0.3, cursor: 'not-allowed', pointerEvents: 'none'} : {}}>
      <span className={`toggle-box ${value && !disabled ? 'is-on' : ''}`}>
        {value && !disabled && <svg viewBox="0 0 10 10" width="10" height="10"><path d="M2,5 L4,7 L8,3" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>}
      </span>
      <input type="checkbox" checked={value && !disabled} onChange={e => onChange(e.target.checked)} disabled={disabled} style={{display:'none'}}/>
      <span>{label}</span>
    </label>
  );
}

// ---------------- TweaksPanel ----------------
function TweaksPanel({ tweaks, updateTweak }) {
  return (
    <aside className="tweaks">
      <div className="tweaks-head">
        <div className="tweaks-title">Tweaks</div>
        <div className="tweaks-sub">Ajustes em tempo real</div>
      </div>
      <div className="tweak-block">
        <div className="tweak-label">Tema</div>
        {window.ThemePicker && <window.ThemePicker value={tweaks.theme || 'refined'} onChange={(v) => updateTweak('theme', v)}/>}
      </div>
      <div className="tweak-block">
        <div className="tweak-label">Paleta (accent)</div>
        <div className="swatch-row">
          {Object.entries(PALETTES).map(([k, p]) => (
            <button key={k} className={`swatch ${tweaks.palette===k?'is-on':''}`} onClick={() => updateTweak('palette', k)}>
              <span className="swatch-dot" style={{background: p.accent}}/>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tweak-block">
        <div className="tweak-label">Tipografia</div>
        <div className="type-list">
          {Object.entries(TYPE_STACKS).map(([k, t]) => (
            <button key={k} className={`type-btn ${tweaks.typography===k?'is-on':''}`}
              onClick={() => updateTweak('typography', k)} style={{fontFamily: t.sans}}>
              <span>{t.name}</span>
              <span className="type-sample" style={{fontFamily: t.mono}}>R$ 285,42</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tweak-block">
        <div className="tweak-label">Densidade</div>
        <div className="seg-inline">
          {[['compact','Compacta'],['comfortable','Confortável']].map(([v, l]) => (
            <button key={v} className={`seg-btn ${tweaks.density===v?'is-on':''}`} onClick={() => updateTweak('density', v)}>{l}</button>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ---------------- TickerBar ----------------
// Maps each ticker symbol → the data-card-id of the chart card it represents.
// The card itself sets that data-card-id (see PriceCard / AbatesTab below).
function TickerBar({ data, activeDataset }) {
  const trackRef = useRef(null);

  const items = useMemo(() => {
    const ds = activeDataset === 'beef_us' ? 'beef_us' : 'beef';
    if (!data[ds] || !data[ds].length) return [];
    const rows = data[ds];
    const fields = activeDataset === 'beef_us'
      ? [
          ['CATTLE',     'cattle_usd_kg',         'US$/kg', 'us-edgebeef'],
          ['BEEF',       'beef_me_usd_kg',        'US$/kg', 'us-edgebeef'],
          ['SPREAD',     'spread_me',             'US$/kg', 'us-edgebeef'],
          ['ABATES',     'abates_total',          'cab',    'us-production'],
          ['%FÊMEAS',    'pct_femeas',            '%',      'us-ciclo'],
        ]
      : [
          ['BOI',        'cattle_brl_kg',         'R$/kg',  'card-cattle'],
          ['CARNE·MI',   'beef_carcass_brl_kg',   'R$/kg',  'card-carne-mi'],
          ['CARNE·ME',   'beef_me_brl_kg',        'R$/kg',  'card-carne-me'],
          ['SPREAD·MI',  'spread_mi',             'R$/kg',  'card-spread-mi'],
          ['SPREAD·ME',  'spread_me',             'R$/kg',  'card-spread-me'],
          ['USD/BRL',    'usdbrl',                'R$',     null],
          ['ABATES',     'abates_total',          'cab',    'card-abates'],
          ['%FÊMEAS',    'pct_femeas',            '%',      'card-femeas'],
        ];
    return fields.map(([sym, f, u, target]) => {
      let last = null, prev = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][f] != null) {
          if (last == null) last = rows[i];
          else { prev = rows[i]; break; }
        }
      }
      if (!last) return null;
      const v = last[f], p = prev?.[f];
      const delta = (p == null || p === 0) ? null : (v - p) / Math.abs(p);
      return { sym, value: v, unit: u, delta, field: f, target };
    }).filter(Boolean);
  }, [data, activeDataset]);

  // Scroll to the matching card on click. If user clicks ABATES tab and we're
  // on Preços, switch tab first via a custom event the App listens to.
  const onItemClick = (target) => {
    if (!target) return;
    const el = document.querySelector(`[data-card-id="${target}"]`);
    if (el) {
      // smooth, with a small offset for the topbar / ticker
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      // brief highlight pulse
      el.classList.remove('rx-card-target');
      void el.offsetWidth;
      el.classList.add('rx-card-target');
      setTimeout(() => el.classList.remove('rx-card-target'), 1600);
    } else {
      // not on this tab — broadcast intent
      window.dispatchEvent(new CustomEvent('rx-goto-card', { detail: { target } }));
      setTimeout(() => onItemClick(target), 80);
    }
  };

  // Constant scroll speed: ~70 px/sec regardless of content length.
  // Track width changes when the track contents (items × 2) change.
  useEffect(() => {
    if (!trackRef.current) return;
    const measure = () => {
      const w = trackRef.current.scrollWidth / 2; // half because we duplicated
      const PX_PER_SEC = 70;
      const dur = Math.max(20, Math.round(w / PX_PER_SEC));
      trackRef.current.style.setProperty('--rx-dur', dur + 's');
    };
    // Wait a tick for layout
    const t = setTimeout(measure, 30);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [items, activeDataset]);

  if (!items.length) return null;
  // Duplicate for seamless scroll
  const tape = [...items, ...items];
  return (
    <div className="rx-ticker">
      <div className="rx-ticker-track" ref={trackRef}>
        {tape.map((it, i) => {
          const fmt = it.unit === 'cab' ? window.fmtCompact(it.value) :
                      it.unit === '%' ? it.value.toFixed(1) :
                      it.value.toFixed(2).replace('.', ',');
          const dir = it.delta == null ? '' : it.delta >= 0 ? 'is-up' : 'is-down';
          const arrow = it.delta == null ? '' : it.delta >= 0 ? '▲' : '▼';
          const pct = it.delta == null ? '' : ((it.delta >= 0 ? '+' : '') + (it.delta * 100).toFixed(2) + '%');
          return (
            <span className="rx-ticker-item" key={i}
                  onClick={() => onItemClick(it.target)}
                  title={it.target ? 'Ir para o gráfico' : ''}>
              <span className="rx-ticker-symbol">{it.sym}</span>
              <span className="rx-ticker-value">{fmt}</span>
              <span style={{color:'var(--fg-mute)', fontSize:10}}>{it.unit}</span>
              {it.delta != null && (
                <span className={`rx-ticker-delta ${dir}`}>{arrow} {pct}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { App, PriceCard });
