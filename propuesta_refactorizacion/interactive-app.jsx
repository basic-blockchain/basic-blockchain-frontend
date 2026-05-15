// interactive-app.jsx — Main interactive prototype
//   • Three roles (ADMIN / OPERATOR / USER) with role-switcher
//   • Real sidebar navigation via NavCtx
//   • Auth flow (login → 2FA → dashboard) with logout
//   • Modal flow router (P2P buy, treasury dual-approval, send confirm, KYC review)
//   • Toast notifications
//   • Tweaks panel (mood / type / surface)

const { useState: useS, useEffect: useE, useMemo: useM } = React;

const ROUTES = {
  admin: {
    dashboard: () => <AdminDashboard />,
    users:     () => <iframe src="Users.html" style={{ width: '100%', height: '100%', border: 0 }} />,
    treasury:  () => <TreasuryScreen />,
    wallets:   () => <WalletsScreen />,
    movements: () => <MovementsScreen role="admin" />,
    sends:     () => <SendsScreen />,
    chain:     () => <ChainScreen role="admin" />,
    mempool:   () => <MempoolScreen role="admin" />,
    nodes:     () => <NodesScreen role="admin" />,
    validation:() => <ValidationScreen role="admin" />,
    health:    () => <HealthScreen role="admin" />,
    currencies:() => <CurrencyCatalogScreen role="admin" />,
    rates:     () => <ExchangeRatesScreen role="admin" />,
    p2p:       () => <P2PScreen role="admin" />,
    exchange:  () => <ExchangeScreen role="admin" />,
    compliance:() => <ComplianceScreen role="admin" />,
    audit:     () => <AuditScreen role="admin" />,
    settings:  () => <SettingsScreen role="admin" />,
  },
  operator: {
    dashboard: () => <OperatorDashboard />,
    users:     () => <iframe src="Users.html" style={{ width: '100%', height: '100%', border: 0 }} />,
    wallets:   () => <WalletsScreen />,
    movements: () => <MovementsScreen role="operator" />,
    chain:     () => <ChainScreen role="operator" />,
    mempool:   () => <MempoolScreen role="operator" />,
    nodes:     () => <NodesScreen role="operator" />,
    compliance:() => <ComplianceScreen role="operator" />,
    p2p:       () => <P2PScreen role="operator" />,
    audit:     () => <AuditScreen role="operator" />,
    settings:  () => <SettingsScreen role="operator" />,
  },
  user: {
    portfolio: () => <UserPortfolio />,
    wallets:   () => <UserWalletDetail />,
    send:      () => <UserSendScreen />,
    history:   () => <MovementsScreen role="user" />,
    p2p:       () => <P2PScreen role="user" />,
    exchange:  () => <ExchangeScreen role="user" />,
    kyc:       () => <KycPlaceholder />,
    settings:  () => <SettingsScreen role="user" />,
  },
};

const DEFAULT_VIEW = { admin: 'dashboard', operator: 'dashboard', user: 'portfolio' };

function KycPlaceholder() {
  return (
    <div className="scr">
      <Sidebar role="user" active="kyc" />
      <div className="main">
        <TopBar crumbs={['Cuenta', 'Verificación']} env="" />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Verificación de identidad</h1>
              <p className="scr-sub">Tu nivel actual: <b>L2</b>. Subí a L3 para operar sin límites.</p>
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 22 }}>L2</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Estás verificada</div>
            <div className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>Subí a L3 enviando comprobante de fuente de fondos.</div>
            <button className="btn btn-primary">Solicitar L3</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PROTO_TWEAKS = /*EDITMODE-BEGIN*/{
  "mood": "sober",
  "type": "sans",
  "surface": "soft"
}/*EDITMODE-END*/;

function InteractiveApp() {
  const [t, setTweak] = useTweaks(PROTO_TWEAKS);
  const [authed, setAuthed] = useS(true);   // start logged in for direct demo access
  const [role, setRole] = useS('admin');
  const [view, setView] = useS('dashboard');
  const [flow, setFlow] = useS(null);
  const [toasts, setToasts] = useS([]);

  useE(() => {
    document.documentElement.dataset.mood = t.mood;
    document.documentElement.dataset.type = t.type;
    document.documentElement.dataset.surface = t.surface;
  }, [t.mood, t.type, t.surface]);

  const toast = (msg, kind = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, msg, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3400);
  };

  const switchRole = (r) => {
    setRole(r);
    setView(DEFAULT_VIEW[r]);
    setFlow(null);
    toast(`Cambiaste a vista ${ROLE[r].label}`, 'info');
  };

  const navContextValue = useM(() => ({
    role,
    navigate: (k) => {
      if (!ROUTES[role][k]) {
        toast(`"${k}" no está disponible en esta demo · vista ${ROLE[role].label}`, 'info');
        return;
      }
      setView(k);
    },
    openFlow: (type, data) => setFlow({ type, data }),
    toast,
  }), [role]);

  const onFlowComplete = (type) => {
    if (type === 'p2p-buy')         toast('Compra P2P completada · USDT en tu wallet', 'success');
    if (type === 'treasury-approval') toast('Distribución de tesorería ejecutada · 41 wallets impactadas', 'success');
    if (type === 'send-confirm')    toast('Envío realizado con éxito', 'success');
    if (type === 'kyc-review')      toast('Caso resuelto · siguiente en cola', 'success');
    if (type === 'exchange-order')  toast('Orden ejecutada · ver historial', 'success');
    if (type === 'receive')         toast('Pago recibido · saldo actualizado', 'success');
    if (type === 'withdraw')        toast('Retiro on-chain confirmado', 'success');
    if (type === 'dispute')         toast('Disputa resuelta · partes notificadas', 'success');
    if (type === 'convert')         toast('Conversión instantánea completada', 'success');
    if (type === 'mine-block')      toast('Bloque #12 agregado a la cadena · propagado a 3 peers', 'success');
  };

  if (!authed) {
    return (
      <NavCtx.Provider value={navContextValue}>
        <AuthFlow onAuthed={() => { setAuthed(true); toast('Bienvenida de vuelta, María', 'success'); }} />
        <TweaksPanelWrapper t={t} setTweak={setTweak} />
      </NavCtx.Provider>
    );
  }

  const Current = ROUTES[role][view] || ROUTES[role][DEFAULT_VIEW[role]];

  return (
    <NavCtx.Provider value={navContextValue}>
      <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
        <RoleSwitcher
          role={role}
          onChange={switchRole}
          onLogout={() => { setAuthed(false); }}
        />
        <Current />
      </div>

      <FlowRouter
        flow={flow}
        onClose={() => setFlow(null)}
        onComplete={() => onFlowComplete(flow?.type)}
      />

      <Toaster toasts={toasts} onDismiss={(id) => setToasts(ts => ts.filter(x => x.id !== id))} />

      <TweaksPanelWrapper t={t} setTweak={setTweak} />
    </NavCtx.Provider>
  );
}

/* ─── Role switcher (top-floating) ─────────────────────────── */

function RoleSwitcher({ role, onChange, onLogout }) {
  const [open, setOpen] = useS(false);
  const ROLES = [
    ['admin',    'Admin',    '#7c3aed'],
    ['operator', 'Operator', '#0891b2'],
    ['user',     'Usuario',  '#1f7a3a'],
  ];
  return (
    <div style={{
      position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
      zIndex: 80, display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(20,18,12,0.86)', color: '#faf9f6',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 999, padding: 4,
      boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      fontSize: 12,
    }}>
      <div style={{ padding: '4px 10px 4px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(250,249,246,0.5)' }}>Demo</div>
      {ROLES.map(([k, l, c]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            appearance: 'none', border: 0,
            padding: '6px 12px',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            background: role === k ? '#faf9f6' : 'transparent',
            color: role === k ? '#1a1917' : '#faf9f6',
            borderRadius: 999, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 50, background: c }}></span>
          {l}
        </button>
      ))}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }}></div>
      <button
        onClick={onLogout}
        title="Demo: ver flujo de login"
        style={{
          appearance: 'none', border: 0, background: 'transparent',
          color: 'rgba(250,249,246,0.7)', cursor: 'pointer',
          padding: '6px 10px', fontSize: 11.5, fontWeight: 500,
          fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        {React.cloneElement(I.lock, { props: { size: 12 } })}
        <span>Login</span>
      </button>
      <a
        href="Versions.html"
        title="Comparar versiones"
        style={{
          color: 'rgba(250,249,246,0.7)', textDecoration: 'none',
          padding: '6px 10px 6px 6px', fontSize: 11.5, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        {React.cloneElement(I.columns, { props: { size: 12 } })}
        <span>Versiones</span>
      </a>
    </div>
  );
}

/* ─── Toaster ──────────────────────────────────────────────── */

function Toaster({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            background: '#1a1917', color: '#faf9f6',
            padding: '10px 14px 10px 12px', borderRadius: 999,
            fontSize: 12.5, fontWeight: 500,
            boxShadow: '0 16px 48px rgba(20,18,12,0.18), 0 4px 16px rgba(20,18,12,0.12)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            animation: 'bulk-in 0.18s ease-out',
            pointerEvents: 'auto', cursor: 'pointer',
          }}
        >
          <span style={{ color: t.kind === 'success' ? '#5cd784' : t.kind === 'info' ? '#67e8f9' : '#fda4af' }}>
            {t.kind === 'success' ? I.check : I.info}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ─── Tweaks panel wrapper ────────────────────────────────── */

function TweaksPanelWrapper({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Mood" subtitle="Paleta y carácter de la marca" />
      <TweakSelect label="Tema" value={t.mood}
        options={[
          { value: 'sober',     label: 'Sober · Stripe / Mercury' },
          { value: 'terminal',  label: 'Terminal · Bloomberg dark' },
          { value: 'editorial', label: 'Editorial · FT cream' },
          { value: 'vivid',     label: 'Vivid · violeta crypto' },
        ]}
        onChange={(v) => setTweak('mood', v)} />

      <TweakSection label="Tipografía" subtitle="El sistema cambia toda la voz" />
      <TweakRadio label="Sistema" value={t.type}
        options={[
          { value: 'sans',  label: 'Sans' },
          { value: 'mono',  label: 'Mono' },
          { value: 'serif', label: 'Serif' },
        ]}
        onChange={(v) => setTweak('type', v)} />

      <TweakSection label="Superficies" subtitle="Cómo se sienten cards y bordes" />
      <TweakRadio label="Tratamiento" value={t.surface}
        options={[
          { value: 'flat',  label: 'Flat' },
          { value: 'soft',  label: 'Soft' },
          { value: 'sharp', label: 'Sharp' },
        ]}
        onChange={(v) => setTweak('surface', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<InteractiveApp />);
