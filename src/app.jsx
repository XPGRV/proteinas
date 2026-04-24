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
  const TWEAK_DEFAULTS = { palette: 'neon', typography: 'modern', density: 'comfortable' };

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
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--font-sans', typeStack.sans);
    document.documentElement.style.setProperty('--font-mono', typeStack.mono);
  }, [accent, typeStack, tweaks.density]);

  const onUpload = (d, m) => { setData(d); setMeta(m); window.__dashboardData = d; window.__dashboardMeta = m; };

  if (!data) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="28" viewBox="0 0 30 28" fill="none">
                <path d="M21.8508 21.1616H25.2486C26.5193 21.1616 27.4033 20.5815 27.4033 19.3936C27.4033 18.2058 26.5193 17.6257 25.2486 17.6257H21.8508V21.1616ZM21.8508 27.3218H26.3812C28.7845 27.3218 30.0276 26.0787 30.0276 23.6754V21.1616H29.9448C29.2541 23.2611 27.4586 23.8964 25.3315 23.8964H21.9613C21.8785 23.8964 21.8508 23.924 21.8508 24.0069V27.3218ZM15.4696 19.3936L18.9503 22.7638V16.0235L15.4696 19.3936ZM3.64641 27.3218H18.9503V26.5483C18.9503 25.1948 19.4199 24.4213 20.4972 24.0069V23.924H16.2155C15.9945 23.924 15.9116 23.8964 15.7459 23.7307L13.5083 21.4102L11.1878 23.7583C11.0773 23.8688 10.9945 23.924 10.7735 23.924H7.32044C7.12707 23.924 7.12707 23.8135 7.23757 23.703L11.6575 19.4213L7.1547 15.0566C7.0442 14.9461 7.07182 14.8356 7.26519 14.8356H10.7459C10.9392 14.8356 11.0221 14.8633 11.1326 15.0014L13.5635 17.4323L15.8564 15.0014C15.9669 14.8909 16.0497 14.8356 16.2155 14.8356H25.3039C27.4033 14.8356 29.2541 15.5262 29.9448 17.6257H30.0276V3.89641C30.0276 1.49309 28.7845 0.25 26.3812 0.25H3.64641C1.24309 0.25 0 1.49309 0 3.89641V23.703C0 26.0787 1.24309 27.3218 3.64641 27.3218Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div className="brand-title">Beef BR</div>
              <div className="brand-sub">acompanhamento setorial</div>
            </div>
          </div>
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
      <TopBar tab={tab} setTab={setTab} meta={meta} onUpload={onUpload}
        activeDataset={activeDataset} setActiveDataset={setActiveDataset}/>
      {activeDataset === 'beef_us' ? (
        <window.BeefUSTab data={data} accent={accent}/>
      ) : tab === 'precos' ? (
        <PrecosTab data={data} accent={accent}/>
      ) : (
        <AbatesTab data={data} accent={accent}/>
      )}
      {editMode && <TweaksPanel tweaks={tweaks} updateTweak={updateTweak}/>}
    </div>
  );
}

function TopBar({ tab, setTab, meta, onUpload, activeDataset, setActiveDataset }) {
  const [brandOpen, setBrandOpen] = useState(false);
  const menuRef = useRef(null);
  React.useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setBrandOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const brandLabel = activeDataset === 'beef_us' ? 'US' : 'BR';

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="28" viewBox="0 0 30 28" fill="none">
            <path d="M21.8508 21.1616H25.2486C26.5193 21.1616 27.4033 20.5815 27.4033 19.3936C27.4033 18.2058 26.5193 17.6257 25.2486 17.6257H21.8508V21.1616ZM21.8508 27.3218H26.3812C28.7845 27.3218 30.0276 26.0787 30.0276 23.6754V21.1616H29.9448C29.2541 23.2611 27.4586 23.8964 25.3315 23.8964H21.9613C21.8785 23.8964 21.8508 23.924 21.8508 24.0069V27.3218ZM15.4696 19.3936L18.9503 22.7638V16.0235L15.4696 19.3936ZM3.64641 27.3218H18.9503V26.5483C18.9503 25.1948 19.4199 24.4213 20.4972 24.0069V23.924H16.2155C15.9945 23.924 15.9116 23.8964 15.7459 23.7307L13.5083 21.4102L11.1878 23.7583C11.0773 23.8688 10.9945 23.924 10.7735 23.924H7.32044C7.12707 23.924 7.12707 23.8135 7.23757 23.703L11.6575 19.4213L7.1547 15.0566C7.0442 14.9461 7.07182 14.8356 7.26519 14.8356H10.7459C10.9392 14.8356 11.0221 14.8633 11.1326 15.0014L13.5635 17.4323L15.8564 15.0014C15.9669 14.8909 16.0497 14.8356 16.2155 14.8356H25.3039C27.4033 14.8356 29.2541 15.5262 29.9448 17.6257H30.0276V3.89641C30.0276 1.49309 28.7845 0.25 26.3812 0.25H3.64641C1.24309 0.25 0 1.49309 0 3.89641V23.703C0 26.0787 1.24309 27.3218 3.64641 27.3218Z" fill="currentColor"/>
          </svg>
        </div>
        <div style={{position:'relative'}} ref={menuRef}>
          <div className="brand-title brand-dropdown" onClick={() => setBrandOpen(o => !o)}>
            Beef <span>{brandLabel}</span>
            <svg className="brand-caret" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </div>
          <div className="brand-sub">acompanhamento setorial · abr/26</div>
          {brandOpen && (
            <div className="brand-menu" style={{display:'block'}}>
              <div className={`brand-menu-item ${activeDataset==='beef_br'?'is-active':''}`}
                onClick={() => { setActiveDataset('beef_br'); setBrandOpen(false); }}>
                Beef BR
              </div>
              <div className={`brand-menu-item ${activeDataset==='beef_us'?'is-active':''}`}
                onClick={() => { setActiveDataset('beef_us'); setBrandOpen(false); }}>
                Beef US
              </div>
              <div className="brand-menu-item brand-menu-soon">Pork BR <span className="brand-menu-tag">em breve</span></div>
            </div>
          )}
        </div>
      </div>
      {activeDataset !== 'beef_us' && (
        <nav className="tabs">
          <button className={`tab ${tab==='precos'?'is-on':''}`} onClick={() => setTab('precos')}>
            <span className="tab-dot"/>Preços & Spreads
          </button>
          <button className={`tab ${tab==='abates'?'is-on':''}`} onClick={() => setTab('abates')}>
            <span className="tab-dot"/>Abates
          </button>
        </nav>
      )}
      {(() => {
        // meta = { br: {source, updated}, us: {source, updated} }
        // Mostra o log da planilha da aba actual; migra formato antigo (meta plano sem .br/.us)
        const currentMeta = activeDataset === 'beef_us'
          ? (meta?.us ?? null)
          : (meta?.br ?? (meta?.updated ? meta : null)); // compat com meta plano legado
        return <window.UploadWidget onLoad={onUpload} lastUpdate={currentMeta?.updated} currentSource={currentMeta?.source}/>;
      })()}
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
        <PriceCard title="Preço Carne · Mercado Interno" sub="Bloomberg · BAMTCACA Index"
          accent={accent} data={computedData} dataset="beef"
          field="beef_carcass_brl_kg" usdField="carcass_mi_usd"
          unit="R$/kg" usdUnit="US$/kg" hasUSD decimals={2}/>
        <PriceCard title="Preço Carne · Mercado Externo" sub="Bloomberg · BACAINDX Index"
          accent={accent} data={data} dataset="beef"
          field="beef_me_brl_kg" usdField="beef_me_usd_kg"
          unit="R$/kg" usdUnit="US$/kg" hasUSD decimals={2}/>
        <PriceCard title="Preço Boi" sub="Bloomberg · BAINPECU Index"
          accent={accent} data={data} dataset="beef"
          field="cattle_brl_kg" usdField="cattle_usd_kg"
          unit="R$/kg" usdUnit="US$/kg" hasUSD decimals={2}/>
      </div>

      <div className="section-header"><h2>Spreads</h2></div>

      <div className="grid-spreads">
        <PriceCard title="Spread MI" sub="Cálculo próprio · Preço Carne MI − Preço Boi"
          accent={accent} data={data} dataset="beef"
          field="spread_mi" unit="R$/kg" decimals={2}/>
        <PriceCard title="Spread ME" sub="Cálculo próprio · Preço Carne ME − Preço Boi"
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

      <section className="card card-full">
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
  fullWidth, height = 320, headerExtra,
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
    <section className={`card ${fullWidth ? 'card-full' : ''}`}>
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

Object.assign(window, { App, PriceCard });
