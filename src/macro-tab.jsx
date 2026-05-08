const { } = React;

function MacroTab() {
  return (
    <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--fg-dim)' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
        </svg>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg)', opacity: 0.5 }}>Macro</div>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Em construção</div>
      </div>
    </main>
  );
}

window.MacroTab = MacroTab;
