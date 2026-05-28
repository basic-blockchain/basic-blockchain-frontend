// platform.jsx — Design canvas with all platform screens

const PLATFORM_TWEAKS = /*EDITMODE-BEGIN*/{
  "mood": "sober",
  "type": "sans",
  "surface": "soft"
}/*EDITMODE-END*/;

function PlatformApp() {
  const [t, setTweak] = useTweaks(PLATFORM_TWEAKS);

  React.useEffect(() => {
    document.documentElement.dataset.mood = t.mood;
    document.documentElement.dataset.type = t.type;
    document.documentElement.dataset.surface = t.surface;
  }, [t.mood, t.type, t.surface]);

  return (
    <>
      <TweaksPanel>
        <TweakSection label="Mood" subtitle="Paleta y carácter de la marca" />
        <TweakSelect label="Tema" value={t.mood}
          options={[
            { value: 'sober',     label: 'Sober · Stripe / Mercury' },
            { value: 'terminal',  label: 'Terminal · Bloomberg dark' },
            { value: 'editorial', label: 'Editorial · FT cream + serif-friendly' },
            { value: 'vivid',     label: 'Vivid · violeta crypto moderno' },
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

        <TweakSection label="Superficies" subtitle="Cómo se sienten cards, botones y bordes" />
        <TweakRadio label="Tratamiento" value={t.surface}
          options={[
            { value: 'flat',  label: 'Flat' },
            { value: 'soft',  label: 'Soft' },
            { value: 'sharp', label: 'Sharp' },
          ]}
          onChange={(v) => setTweak('surface', v)} />
      </TweaksPanel>
      <PlatformCanvas />
    </>
  );
}

const PlatformCanvas = () => (
  <DesignCanvas>
    {/* ─── 1. Acceso ───────────────────────────────────────── */}
    <DCSection id="auth" title="Acceso a la plataforma" subtitle="Login, registro y verificación 2FA · compartido por todos los roles">
      <DCArtboard id="login" label="Login" width={1200} height={760}>
        <LoginScreen />
      </DCArtboard>
      <DCArtboard id="register" label="Registro · paso 2" width={1200} height={760}>
        <RegisterScreen />
      </DCArtboard>
      <DCArtboard id="otp" label="Verificación 2FA" width={1200} height={760}>
        <OtpScreen />
      </DCArtboard>
    </DCSection>

    {/* ─── 2. Admin ────────────────────────────────────────── */}
    <DCSection id="admin" title="Vista ADMIN" subtitle="Gobierno total · usuarios, tesorería, configuración, eliminación">
      <DCArtboard id="admin-dash" label="Resumen" width={1400} height={900}>
        <AdminDashboard />
      </DCArtboard>
      <DCArtboard id="admin-users" label="Usuarios · módulo embebido" width={1400} height={900}>
        <iframe src="Users.html" style={{ width: '100%', height: '100%', border: 0 }} />
      </DCArtboard>
      <DCArtboard id="admin-treasury" label="Tesorería" width={1400} height={900}>
        <TreasuryScreen />
      </DCArtboard>
      <DCArtboard id="admin-wallets" label="Wallets" width={1400} height={900}>
        <WalletsScreen />
      </DCArtboard>
      <DCArtboard id="admin-movs" label="Movimientos" width={1400} height={900}>
        <MovementsScreen role="admin" />
      </DCArtboard>
      <DCArtboard id="admin-sends" label="Envíos" width={1400} height={900}>
        <SendsScreen />
      </DCArtboard>
      <DCArtboard id="admin-p2p" label="Mercado P2P · admin" width={1400} height={900}>
        <P2PScreen role="admin" />
      </DCArtboard>
      <DCArtboard id="admin-exchange" label="Exchange" width={1400} height={900}>
        <ExchangeScreen role="admin" />
      </DCArtboard>
      <DCArtboard id="admin-compliance" label="Compliance" width={1400} height={900}>
        <ComplianceScreen role="admin" />
      </DCArtboard>
      <DCArtboard id="admin-audit" label="Auditoría" width={1400} height={900}>
        <AuditScreen role="admin" />
      </DCArtboard>
      <DCArtboard id="admin-settings" label="Ajustes" width={1400} height={900}>
        <SettingsScreen role="admin" />
      </DCArtboard>
    </DCSection>

    {/* ─── 3. Operator ─────────────────────────────────────── */}
    <DCSection id="operator" title="Vista OPERATOR" subtitle="Operativa diaria · KYC, congelar/desbanear, gestión de disputas">
      <DCArtboard id="op-dash" label="Resumen operativo" width={1400} height={900}>
        <OperatorDashboard />
      </DCArtboard>
      <DCArtboard id="op-compliance" label="Cola de compliance" width={1400} height={900}>
        <ComplianceScreen role="operator" />
      </DCArtboard>
      <DCArtboard id="op-p2p" label="P2P · moderación" width={1400} height={900}>
        <P2PScreen role="operator" />
      </DCArtboard>
      <DCArtboard id="op-movs" label="Movimientos · sólo lectura" width={1400} height={900}>
        <MovementsScreen role="operator" />
      </DCArtboard>
    </DCSection>

    {/* ─── 4. User Viewer ──────────────────────────────────── */}
    <DCSection id="user" title="Vista USER-VIEWER" subtitle="Cliente final · portafolio, wallets, P2P, exchange y envíos">
      <DCArtboard id="u-portfolio" label="Mi portafolio" width={1400} height={900}>
        <UserPortfolio />
      </DCArtboard>
      <DCArtboard id="u-wallet" label="Detalle de wallet · QR + copia" width={1400} height={900}>
        <UserWalletDetail />
      </DCArtboard>
      <DCArtboard id="u-send" label="Enviar / Recibir" width={1400} height={900}>
        <UserSendScreen />
      </DCArtboard>
      <DCArtboard id="u-p2p" label="Mercado P2P" width={1400} height={900}>
        <P2PScreen role="user" />
      </DCArtboard>
      <DCArtboard id="u-exchange" label="Exchange" width={1400} height={900}>
        <ExchangeScreen role="user" />
      </DCArtboard>
    </DCSection>

    {/* ─── 5. Mobile ───────────────────────────────────────── */}
    <DCSection id="mobile" title="Responsive · móvil" subtitle="Versión mobile para el cliente final · iOS / Android">
      <DCArtboard id="m-login" label="Login móvil" width={380} height={740}>
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
          <MobileLogin />
        </div>
      </DCArtboard>
      <DCArtboard id="m-dash" label="Inicio" width={380} height={740}>
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
          <MobileDashboard />
        </div>
      </DCArtboard>
      <DCArtboard id="m-wallet" label="Recibir · QR" width={380} height={740}>
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
          <MobileWallet />
        </div>
      </DCArtboard>
      <DCArtboard id="m-send" label="Enviar" width={380} height={740}>
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
          <MobileSend />
        </div>
      </DCArtboard>
      <DCArtboard id="m-p2p" label="P2P" width={380} height={740}>
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
          <MobileP2P />
        </div>
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<PlatformApp />);

window.PlatformApp = PlatformApp;
