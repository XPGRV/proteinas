// Poultry BR Tab — FrangoBR sheet data
const FRANGO_EVENTS = [
  { year: 2015, month: 10, label: 'Embargo russo à carne de frango brasileira' },
  { year: 2018, month: 3,  label: 'Carne Fraca — impacto exportações' },
  { year: 2020, month: 3,  label: 'COVID-19 — alta demanda doméstica, fechamento food service' },
  { year: 2020, month: 6,  label: 'China suspende importações de frango do Brasil (COVID)' },
  { year: 2021, month: 1,  label: 'Alta milho/soja — pressão custos feed grain' },
  { year: 2022, month: 2,  label: 'Guerra Ucrânia — disparada milho e soja (feed grain)' },
  { year: 2022, month: 11, label: 'Gripe aviária H5N1 — alertas globais, Brasil sem foco comercial' },
  { year: 2023, month: 5,  label: 'H5N1 detectado em aves silvestres no litoral do Brasil' },
  { year: 2023, month: 7,  label: 'Brasil mantém status zona livre — exportações preservadas' },
  { year: 2024, month: 5,  label: '1º foco H5N1 em granja comercial (RS) — embargo por vários países' },
  { year: 2024, month: 9,  label: 'Controle do foco; países iniciam revisão de embargos' },
];

const EmptyFrango = () => (
  <main className="main" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,minHeight:'60vh',color:'var(--fg-dim)'}}>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
    </svg>
    <div style={{fontSize:16,fontWeight:500,color:'var(--fg)'}}>Sem dados de frango</div>
    <div style={{fontSize:13,textAlign:'center',maxWidth:320}}>Faça upload da planilha FrangoBR.xlsm para visualizar os gráficos.</div>
  </main>
);

// ── Aba Produção ──────────────────────────────────────────────────────────────
const PoultryProducaoTab = ({ data, accent }) => {
  const [source, setSource] = React.useState('sidra');
  if (!data.frango || !data.frango.length) return <EmptyFrango />;

  const field = source === 'sidra' ? 'abates_sidra' : 'abates_sif';
  const sub   = source === 'sidra' ? 'SIDRA · Cabeças abatidas' : 'SIF · Cabeças abatidas';

  return (
    <main className="main">
      <window.PriceCard
        key={`abates-frango-${source}`}
        cardId="card-abates-frango"
        title="Abates de Frango" sub={sub}
        accent={accent} data={data}
        dataset="frango" field={field}
        unit="cab." big fullWidth height={420}
        events={FRANGO_EVENTS}
        headerExtra={
          <div className="seg" style={{marginBottom:4}}>
            <button className={`seg-btn ${source==='sidra'?'is-on':''}`} onClick={() => setSource('sidra')}>SIDRA</button>
            <button className={`seg-btn ${source==='sif'?'is-on':''}`} onClick={() => setSource('sif')}>SIF</button>
          </div>
        }
      />
    </main>
  );
};

// ── Aba Preços & Spreads ──────────────────────────────────────────────────────
const PoultryBRTab = ({ data, accent, tab }) => {
  if (tab === 'abates') return <PoultryProducaoTab data={data} accent={accent}/>;

  if (!data.frango || !data.frango.length) return <EmptyFrango />;

  return (
    <main className="main">
      <div className="grid-precos">
        <window.PriceCard
          cardId="card-frango-mi"
          title="Preço Frango · Mercado Interno"
          sub="Bloomberg · BACHSP Index"
          accent={accent} data={data} dataset="frango"
          field="frango_mi_brl_kg" unit="R$/kg" decimals={2}
          events={FRANGO_EVENTS}
        />
        <window.PriceCard
          cardId="card-frango-me"
          title="Preço Frango · Mercado Externo"
          sub="SECEX · Preço Frango Exportação"
          accent={accent} data={data} dataset="frango"
          field="frango_me_brl_kg" unit="R$/kg" decimals={2}
          events={FRANGO_EVENTS}
        />
        <window.PriceCard
          cardId="card-feed-grain"
          title="Feed Grain"
          sub="Cálculo próprio · 66% Corn - BAINCORN Index + 33% Soybean - BASMSBPA Index"
          accent={accent} data={data} dataset="frango"
          field="feed_grain_brl_kg" unit="R$/kg" decimals={2}
          events={FRANGO_EVENTS}
        />
      </div>

      <div className="section-header"><h2>Spreads</h2></div>

      <div className="grid-spreads">
        <window.PriceCard
          cardId="card-spread-mi-frango"
          title="Spread MI"
          sub="Cálculo próprio · Preço Frango MI - Feed Grain"
          accent={accent} data={data} dataset="frango"
          field="spread_mi" unit="R$/kg" decimals={2}
          events={FRANGO_EVENTS}
        />
        <window.PriceCard
          cardId="card-spread-me-frango"
          title="Spread ME"
          sub="Cálculo próprio · Preço Frango ME - Feed Grain"
          accent={accent} data={data} dataset="frango"
          field="spread_me" unit="R$/kg" decimals={2}
          events={FRANGO_EVENTS}
        />
      </div>
    </main>
  );
};

window.PoultryBRTab = PoultryBRTab;
