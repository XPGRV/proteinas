// Poultry US Tab — FrangoUS.xlsm data
const PoultryUSTab = ({ data, accent }) => {
  return (
    <main className="main" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,minHeight:'60vh',color:'var(--fg-dim)'}}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
      </svg>
      <div style={{fontSize:16,fontWeight:500,color:'var(--fg)'}}>Em construção</div>
      <div style={{fontSize:13,textAlign:'center',maxWidth:320}}>
        Faça upload da planilha FrangoUS.xlsm para visualizar os gráficos.
      </div>
    </main>
  );
};

window.PoultryUSTab = PoultryUSTab;
