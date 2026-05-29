// flows-mobile.jsx — Fully interactive mobile app
// Wraps the device frame in a phone-style navigation: tabs, overlay sheets,
// send/receive/p2p flows. Accessible via the "Demo · móvil" button in the role
// switcher and via the Versions index.

const { useState: useSM, useEffect: useEM, useRef: useRM } = React;

/* ─── Mobile App shell ────────────────────────────────────── */

function MobileApp({ onClose }) {
  const [tab, setTab] = useSM('home');
  const [sheet, setSheet] = useSM(null); // 'send' | 'receive' | 'send-confirm' | 'received'
  const [authed, setAuthed] = useSM(true);

  const goTab = (t) => { setTab(t); setSheet(null); };
  const openSheet = (s) => setSheet(s);
  const closeSheet = () => setSheet(null);

  if (!authed) {
    return (
      <MobileShell onClose={onClose}>
        <MobileLoginInteractive onSubmit={() => setAuthed(true)} />
      </MobileShell>
    );
  }

  return (
    <MobileShell onClose={onClose}>
      {/* Base tab */}
      {tab === 'home' && <MobileHomeInteractive onTab={goTab} onSheet={openSheet} />}
      {tab === 'wallet' && <MobileWalletInteractive onTab={goTab} onSheet={openSheet} />}
      {tab === 'send' && <MobileSendInteractive onSheet={openSheet} onTab={goTab} />}
      {tab === 'p2p' && <MobileP2PInteractive onSheet={openSheet} />}
      {tab === 'profile' && <MobileProfileInteractive onLogout={() => setAuthed(false)} />}

      {/* Bottom tabbar (always visible when authed) */}
      <MobileTabBarInteractive active={tab} onChange={goTab} />

      {/* Overlay sheets */}
      {sheet === 'send' && <MobileSendSheet onClose={closeSheet} onConfirm={() => openSheet('send-confirm')} />}
      {sheet === 'send-confirm' && <MobileSendConfirmSheet onClose={closeSheet} onSent={() => openSheet('sent')} />}
      {sheet === 'sent' && <MobileSentSheet onClose={() => { closeSheet(); goTab('wallet'); }} />}
      {sheet === 'receive' && <MobileReceiveSheet onClose={closeSheet} />}
      {sheet === 'p2p-offer' && <MobileP2POfferSheet onClose={closeSheet} />}
      {sheet === 'asset-detail' && <MobileAssetDetailSheet data={sheet.data} onClose={closeSheet} onSend={() => openSheet('send')} onReceive={() => openSheet('receive')} />}
    </MobileShell>
  );
}

/* ─── Shell ───────────────────────────────────────────────── */

function MobileShell({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,18,12,0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, color: '#faf9f6' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(250,249,246,0.7)' }}>Vista móvil · demo interactiva</div>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#faf9f6', borderColor: 'rgba(255,255,255,0.15)' }} onClick={onClose}>{I.close}<span>Cerrar</span></button>
        </div>
        <div className="mob">
          <div className="mob-screen" style={{ position: 'relative' }}>
            <MobStatus />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Login ───────────────────────────────────────────────── */

function MobileLoginInteractive({ onSubmit }) {
  const [loading, setLoading] = useSM(false);
  return (
    <div className="mob-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, marginTop: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #1a1917, #3a3833)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 13, fontWeight: 700 }}>◆</div>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Cadena</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 6px' }}>Hola de nuevo</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 28px' }}>Ingresá para ver tu portafolio.</p>
      <div className="fld"><label>Email</label><input defaultValue="jmartinez@gmail.com" /></div>
      <div className="fld"><label>Contraseña</label><input type="password" defaultValue="••••••••••" /></div>
      <button className="btn btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 14, marginTop: 8 }}
        disabled={loading}
        onClick={() => { setLoading(true); setTimeout(onSubmit, 700); }}>
        {loading ? <><span className="spinner"></span><span>Ingresando…</span></> : 'Continuar'}
      </button>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
        <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>¿Olvidaste tu clave?</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>
          {React.cloneElement(I.shield, { props: { size: 14 } })}
          <span>Face ID</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Home ────────────────────────────────────────────────── */

function MobileHomeInteractive({ onTab, onSheet }) {
  return (
    <div className="mob-content" style={{ padding: '8px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar name="Juliana Martínez" size={36} />
        <div style={{ flex: 1 }}>
          <div className="muted" style={{ fontSize: 11 }}>Hola</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Juliana</div>
        </div>
        <div onClick={() => onSheet('notifications')} style={{ width: 32, height: 32, borderRadius: 50, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', position: 'relative', cursor: 'pointer' }}>
          {React.cloneElement(I.info, { props: { size: 16 } })}
          <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 50, background: 'var(--danger)' }}></span>
        </div>
      </div>

      <div className="wallet-hero" style={{ padding: 16, borderRadius: 16 }}>
        <div className="lbl" style={{ fontSize: 10.5 }}>Patrimonio total</div>
        <div className="bal" style={{ fontSize: 28, marginTop: 2 }}>$48,217.42</div>
        <div className="sub" style={{ fontSize: 11.5 }}>+$1,420 (+3.0%) 30d</div>
        <div className="acts" style={{ marginTop: 12 }}>
          <button className="wh-btn primary" style={{ flex: 1, justifyContent: 'center', padding: '8px 8px' }} onClick={() => onSheet('send')}>{I.arrowUp}<span>Enviar</span></button>
          <button className="wh-btn" style={{ flex: 1, justifyContent: 'center', padding: '8px 8px' }} onClick={() => onSheet('receive')}>{I.arrowDown}<span>Recibir</span></button>
          <button className="wh-btn" style={{ flex: 1, justifyContent: 'center', padding: '8px 8px' }} onClick={() => onTab('p2p')}>{I.exchange}<span>Convertir</span></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'hidden' }}>
        {[
          ['P2P', 'Mejor: 1,248 ARS', '+0.4%', 'p2p'],
          ['Exchange', 'BTC $67.5k', '+2.4%', 'p2p'],
          ['Recompensa', '$2.40 cUSD', 'recibir', null],
        ].map(([l, s, t, tab], i) => (
          <div key={i} className="card" style={{ flex: 1, padding: 10, fontSize: 11, cursor: tab ? 'pointer' : 'default' }} onClick={() => tab && onTab(tab)}>
            <div style={{ fontWeight: 600, fontSize: 11.5 }}>{l}</div>
            <div className="muted" style={{ marginTop: 2, fontSize: 10.5 }}>{s}</div>
            <div style={{ color: t.startsWith('+') ? 'var(--success)' : 'var(--accent)', marginTop: 4, fontSize: 10.5, fontWeight: 500 }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Mis activos</div>
        <span style={{ color: 'var(--accent-text)', fontSize: 11.5, fontWeight: 500 }} onClick={() => onTab('wallet')}>Ver todos</span>
      </div>
      {[
        ['USDT', '24,420.50', '$24,420.50', '#26a17b', 'U'],
        ['BTC', '0.18420', '$12,420.10', '#f7931a', 'B'],
        ['ETH', '2.4012', '$8,284.14', '#627eea', 'E'],
        ['SOL', '12.4', '$2,046.00', '#9945ff', 'S'],
      ].map(([a, b, u, c, l], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0, cursor: 'pointer' }} onClick={() => onTab('wallet')}>
          <span style={{ width: 30, height: 30, borderRadius: 50, background: c, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{l}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{a}</div>
            <div className="muted mono" style={{ fontSize: 11 }}>{b}</div>
          </div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{u}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Wallet tab (focused on cUSD with receive shortcut) ──── */

function MobileWalletInteractive({ onTab, onSheet }) {
  return (
    <div className="mob-content" style={{ padding: '8px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }} onClick={() => onTab('home')}>{I.chevL}</button>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Mis wallets</div>
        <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }} onClick={() => onSheet('receive')}>{I.plus}</button>
      </div>

      {[
        { code: 'cUSD', bal: '1,046.68', usd: '$1,046.68', color: '#1a1917', primary: true },
        { code: 'USDT', bal: '24,420.50', usd: '$24,420.50', color: '#26a17b' },
        { code: 'BTC', bal: '0.18420', usd: '$12,420.10', color: '#f7931a' },
        { code: 'ETH', bal: '2.4012', usd: '$8,284.14', color: '#627eea' },
        { code: 'SOL', bal: '12.4', usd: '$2,046.00', color: '#9945ff' },
      ].map((w, i) => (
        <div key={w.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 0, cursor: 'pointer' }} onClick={() => onSheet('receive')}>
          <span style={{ width: 36, height: 36, borderRadius: 50, background: w.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{w.code[0]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{w.code}{w.primary && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6, fontWeight: 500 }}>● principal</span>}</div>
            <div className="muted mono" style={{ fontSize: 11.5 }}>{w.bal}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{w.usd}</div>
            <div style={{ fontSize: 10.5, color: 'var(--accent-text)', fontWeight: 500 }}>Recibir →</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Send tab (clicking opens send sheet) ────────────────── */

function MobileSendInteractive({ onSheet, onTab }) {
  return (
    <div className="mob-content" style={{ padding: '8px 16px 0' }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Enviar</div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 10, marginBottom: 14 }}>
        {['Usuario', 'Email', 'On-chain'].map((l, i) => (
          <div key={l} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: i === 0 ? 'var(--surface)' : 'transparent', color: i === 0 ? 'var(--text)' : 'var(--text-2)', borderRadius: 7, fontSize: 12, fontWeight: 600, boxShadow: i === 0 ? 'var(--shadow-sm)' : 'none' }}>{l}</div>
        ))}
      </div>

      <div className="fld">
        <label>Buscar destinatario</label>
        <input placeholder="@usuario, email o nombre…" />
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '14px 0 8px' }}>Contactos frecuentes</div>

      {[
        { name: 'Mateo Fernández', handle: '@mateo.f', sub: '3 envíos este mes' },
        { name: 'Sofía Pérez', handle: '@sofia.p', sub: '12 envíos · favorita' },
        { name: 'Lucía González', handle: '@lucia.gz', sub: 'última vez 8 may' },
        { name: 'Diego López', handle: '@d.lopez', sub: 'última vez 2 may' },
      ].map((c, i, a) => (
        <div key={c.handle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer' }} onClick={() => onSheet('send')}>
          <Avatar name={c.name} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>{c.handle} · {c.sub}</div>
          </div>
          {I.chev}
        </div>
      ))}
    </div>
  );
}

/* ─── P2P ─────────────────────────────────────────────────── */

function MobileP2PInteractive({ onSheet }) {
  return (
    <div className="mob-content" style={{ padding: '8px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>Mercado P2P</div>
        <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }}>{I.filter}</button>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: 'var(--surface)', borderRadius: 7, fontSize: 12.5, fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>Comprar</div>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 500 }}>Vender</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <span className="chip active">USDT</span>
        <span className="chip">BTC</span>
        <span className="chip">cUSD</span>
      </div>

      {[
        { name: 'CryptoMaria', ops: 1248, rate: 98.2, price: '1,250.50' },
        { name: 'PesosBTC', ops: 8412, rate: 99.4, price: '1,248.00' },
        { name: 'TradeAR', ops: 412, rate: 97.8, price: '1,251.80' },
      ].map((o, i) => (
        <div key={i} className="card" style={{ padding: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => onSheet('p2p-offer')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar name={o.name} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.name} <span style={{ color: 'var(--success)', fontSize: 10, marginLeft: 4 }}>●</span></div>
              <div className="muted" style={{ fontSize: 10.5 }}>{o.ops.toLocaleString('es-AR')} ops · {o.rate}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>${o.price}</div>
              <div className="muted" style={{ fontSize: 10 }}>ARS/USDT</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="muted" style={{ fontSize: 11 }}>Toca para comprar</div>
            {I.chev}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Profile / Cuenta ────────────────────────────────────── */

function MobileProfileInteractive({ onLogout }) {
  return (
    <div className="mob-content" style={{ padding: '8px 16px 0' }}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Avatar name="Juliana Martínez" size={64} />
        <div style={{ fontWeight: 600, fontSize: 17, marginTop: 12 }}>Juliana Martínez</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>jmartinez@gmail.com</div>
        <span className="bdg bdg-active" style={{ marginTop: 8, display: 'inline-flex' }}>Verificada L2</span>
      </div>

      <div className="section-h">Cuenta</div>
      <div className="card" style={{ padding: 0 }}>
        {[
          ['Verificación KYC', 'L2 · subir a L3', I.shield],
          ['Métodos de pago', '3 cuentas vinculadas', I.wallet],
          ['Seguridad', '2FA activado · Face ID', I.lock],
          ['Notificaciones', 'Email + Push', I.info],
        ].map(([l, sub, ic], i, a) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center' }}>{ic}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{l}</div>
              <div className="muted" style={{ fontSize: 11 }}>{sub}</div>
            </div>
            {I.chev}
          </div>
        ))}
      </div>

      <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 18, color: 'var(--danger)' }} onClick={onLogout}>Cerrar sesión</button>
    </div>
  );
}

/* ─── Tab bar ─────────────────────────────────────────────── */

function MobileTabBarInteractive({ active, onChange }) {
  const items = [
    ['home', 'Inicio', I.chart],
    ['wallet', 'Wallets', I.wallet],
    ['send', 'Enviar', I.exchange],
    ['p2p', 'P2P', I.users],
    ['profile', 'Cuenta', I.user],
  ];
  return (
    <div className="mob-tabbar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      {items.map(([k, l, ic]) => (
        <div key={k} className={`mob-tab ${active === k ? 'active' : ''}`}
             onClick={() => onChange(k)}
             style={{ cursor: 'pointer', padding: '4px 0' }}>
          {React.cloneElement(ic, { props: { size: 18 } })}
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Sheets (overlay over a tab) ─────────────────────────── */

function MobileSheet({ title, onClose, children, footer }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'bulk-in 0.2s ease-out' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{title}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>{children}</div>
      {footer && <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>{footer}</div>}
    </div>
  );
}

function MobileSendSheet({ onClose, onConfirm }) {
  const [amount, setAmount] = useSM('120.00');
  return (
    <MobileSheet
      title="Enviar"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center', fontSize: 14 }} onClick={onConfirm}>Revisar y enviar</button>
      }
    >
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Para</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name="Mateo Fernández" size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Mateo Fernández</div>
            <div className="muted" style={{ fontSize: 11 }}>@mateo.f · verificado ✓</div>
          </div>
          <button className="btn btn-sm btn-icon btn-ghost">{I.x}</button>
        </div>
      </div>

      <div className="amount-input">
        <input className="mono" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', textAlign: 'center', border: 0, background: 'transparent', font: 'inherit', fontSize: 36, fontWeight: 600, outline: 'none', letterSpacing: '-0.02em' }} />
        <div className="ccy">cUSD · ≈ ${amount} USD</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {[['25%', 261.67],['50%', 523.34],['75%', 785.01],['MÁX', 1046.68]].map(([p, v]) => (
          <button key={p} className="chip" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAmount(v.toFixed(2))}>{p}</button>
        ))}
      </div>

      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span className="muted">Desde</span><span>cUSD · 1,046.68 disp.</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span className="muted">Comisión</span><span style={{ color: 'var(--success)' }}>Gratis</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Tiempo</span><span>Instantáneo</span></div>
      </div>

      <div className="fld" style={{ marginTop: 14 }}>
        <label>Nota (opcional)</label>
        <input defaultValue="Devolución cena" />
      </div>
    </MobileSheet>
  );
}

function MobileSendConfirmSheet({ onClose, onSent }) {
  return (
    <MobileSheet
      title="Confirmar envío"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center', fontSize: 14 }} onClick={onSent}>
          {React.cloneElement(I.lock, { props: { size: 14 } })}<span>Confirmar con Face ID</span>
        </button>
      }
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Avatar name="Mateo Fernández" size={64} />
        <div style={{ fontWeight: 600, fontSize: 17, marginTop: 12 }}>Mateo Fernández</div>
        <div className="muted" style={{ fontSize: 12 }}>@mateo.f · verificado ✓</div>
        <div className="mono" style={{ fontSize: 36, fontWeight: 600, marginTop: 24, letterSpacing: '-0.02em' }}>120.00 cUSD</div>
        <div className="muted" style={{ fontSize: 13 }}>≈ $120.00 USD · gratis · instantáneo</div>
      </div>

      <div className="warn-box" style={{ background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' }}>
        {React.cloneElement(I.shield, { props: { size: 14 } })}
        <div>Los envíos internos son <b>irreversibles</b>. Verificá que el destinatario sea correcto.</div>
      </div>
    </MobileSheet>
  );
}

function MobileSentSheet({ onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'bulk-in 0.2s ease-out' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', marginBottom: 16, animation: 'bulk-in 0.32s ease-out' }}>
          {React.cloneElement(I.check, { props: { size: 40 } })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Enviaste</div>
        <div className="mono" style={{ fontSize: 32, fontWeight: 600, marginTop: 4, letterSpacing: '-0.02em' }}>−120.00 cUSD</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>A Mateo Fernández · operación TXN-A8C4F9</div>

        <div className="card" style={{ padding: 12, marginTop: 24, width: '100%', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}><span className="muted">Saldo restante</span><span className="mono">926.68 cUSD</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}><span className="muted">Hora</span><span className="mono">{new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></div>
        </div>
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center' }} onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}

function MobileReceiveSheet({ onClose }) {
  const [received, setReceived] = useSM(false);
  const [copied, setCopied] = useSM(false);
  useEM(() => { const id = setTimeout(() => setReceived(true), 4200); return () => clearTimeout(id); }, []);

  if (received) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'bulk-in 0.2s ease-out' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', marginBottom: 16, animation: 'bulk-in 0.32s ease-out' }}>
            {React.cloneElement(I.check, { props: { size: 40 } })}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Recibiste</div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 600, marginTop: 4, letterSpacing: '-0.02em' }}>+50.00 cUSD</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>De Sofía Pérez</div>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center' }} onClick={onClose}>Ir a la wallet</button>
        </div>
      </div>
    );
  }

  return (
    <MobileSheet title="Recibir cUSD" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <div className="qr-wrap">
          <div className="qr" style={{ padding: 16 }}>
            <FakeQR seed="cUSD-jmartinez-9X8Kp4z2" size={200} />
          </div>
          <div className="qr-logo">
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #1a1917, #3a3530)', color: '#faf9f6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>◆</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Tu dirección cUSD</div>
        <div
          onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="mono"
          style={{ fontSize: 12, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          0xCAdEna…9X8Kp4
          <span style={{ color: copied ? 'var(--success)' : 'var(--accent)' }}>{copied ? React.cloneElement(I.check, { props: { size: 12 } }) : React.cloneElement(I.copy, { props: { size: 12 } })}</span>
        </div>
        {copied && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>Copiado al portapapeles</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', height: 40 }} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{I.copy}<span>{copied ? 'Copiado' : 'Copiar'}</span></button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: 40 }}>{I.download}<span>Compartir</span></button>
      </div>

      <div style={{ marginTop: 14, padding: 10, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12, color: 'var(--accent-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="spinner" style={{ width: 12, height: 12 }}></div>
        <span style={{ flex: 1 }}>Escuchando transacciones entrantes…</span>
        <span className="muted" style={{ fontSize: 10.5 }}>en vivo</span>
      </div>

      <button className="btn btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 11.5 }} onClick={() => setReceived(true)}>
        <span style={{ color: 'var(--text-3)', marginRight: 6 }}>(demo)</span>
        Simular pago entrante
      </button>
    </MobileSheet>
  );
}

function MobileP2POfferSheet({ onClose }) {
  const [step, setStep] = useSM(0);
  return (
    <MobileSheet
      title={step === 0 ? 'Comprar USDT' : step === 1 ? 'Pagar' : '¡Listo!'}
      onClose={onClose}
      footer={
        step === 0
          ? <button className="btn btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center' }} onClick={() => setStep(1)}>Continuar al pago</button>
          : step === 1
          ? <button className="btn btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center' }} onClick={() => setStep(2)}>Marcar pago realizado</button>
          : <button className="btn btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center' }} onClick={onClose}>Ir a la wallet</button>
      }
    >
      {step === 0 && (<>
        <div className="card" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name="CryptoMaria" size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>CryptoMaria ●</div>
              <div className="muted" style={{ fontSize: 11 }}>1.248 ops · 98.2%</div>
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>$1,250.50</div>
          </div>
        </div>
        <div className="fld"><label>Comprar</label><input className="mono" defaultValue="500.00" /></div>
        <div className="fld"><label>Método de pago</label><select defaultValue="mp"><option value="mp">Mercado Pago</option><option>Transferencia</option></select></div>
      </>)}

      {step === 1 && (<>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="muted" style={{ fontSize: 11 }}>Transferí exactamente</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>$625,250</div>
          <div className="muted" style={{ fontSize: 12 }}>ARS · vía Mercado Pago</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          {[['Alias', 'cripto.maria.usdt'], ['CBU', '0000003100099876543210'], ['Concepto', 'P2P-' + Math.random().toString(36).slice(2,6).toUpperCase()]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: 11.5 }}>{l}</span>
              <span className="mono" style={{ fontSize: 11.5, fontWeight: 500 }}>{v} <button className="copy-btn" style={{ marginLeft: 6 }}>{I.copy}</button></span>
            </div>
          ))}
        </div>
        <div className="warn-box" style={{ marginTop: 14, fontSize: 11.5 }}>{I.warn}<div>Transferí desde una cuenta a tu nombre, sin mencionar cripto.</div></div>
      </>)}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            {React.cloneElement(I.check, { props: { size: 36 } })}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>¡500 USDT recibidos!</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Operación P2P-481928</div>
        </div>
      )}
    </MobileSheet>
  );
}

Object.assign(window, { MobileApp });
