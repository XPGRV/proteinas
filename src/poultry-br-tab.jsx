// Poultry BR Tab — FrangoBR sheet data
const PoultryBRTab = ({ data, accent }) => {
  if (!data.frango || !data.frango.length) {
    return (
      <main className="main" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,minHeight:'60vh',color:'var(--fg-dim)'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
        </svg>
        <div style={{fontSize:16,fontWeight:500,color:'var(--fg)'}}>Sem dados de frango</div>
        <div style={{fontSize:13,textAlign:'center',maxWidth:320}}>Faça upload da planilha FrangoBR.xlsm para visualizar os gráficos.</div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="grid-precos">
        <window.PriceCard
          cardId="card-frango-mi"
          title="Preço Frango · Mercado Interno"
          sub="FrangoBR · Coluna L"
          accent={accent} data={data} dataset="frango"
          field="frango_mi_brl_kg" unit="R$/kg" decimals={2}
        />
        <window.PriceCard
          cardId="card-frango-me"
          title="Preço Frango · Mercado Externo"
          sub="FrangoBR · Coluna N"
          accent={accent} data={data} dataset="frango"
          field="frango_me_brl_kg" unit="R$/kg" decimals={2}
        />
        <window.PriceCard
          cardId="card-feed-grain"
          title="Feed Grain"
          sub="FrangoBR · Coluna H"
          accent={accent} data={data} dataset="frango"
          field="feed_grain_brl_kg" unit="R$/kg" decimals={2}
        />
      </div>

      <div className="section-header"><h2>Spreads</h2></div>

      <div className="grid-spreads">
        <window.PriceCard
          cardId="card-spread-mi-frango"
          title="Spread MI"
          sub="FrangoBR · Coluna O"
          accent={accent} data={data} dataset="frango"
          field="spread_mi" unit="R$/kg" decimals={2}
        />
        <window.PriceCard
          cardId="card-spread-me-frango"
          title="Spread ME"
          sub="FrangoBR · Coluna Q"
          accent={accent} data={data} dataset="frango"
          field="spread_me" unit="R$/kg" decimals={2}
        />
      </div>
    </main>
  );
};

window.PoultryBRTab = PoultryBRTab;
