// mobile-screens.jsx — Mobile responsive variants

function MobileLogin() {
  return (
    <div className="mob">
      <div className="mob-screen">
        <MobStatus />
        <div className="mob-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, marginTop: 12 }}>
            <div className="mark" style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #1a1917, #3a3833)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 13, fontWeight: 700 }}>◆</div>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Cadena</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 6px' }}>Hola de nuevo</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 28px' }}>Ingresá para ver tu portafolio.</p>

          <div className="fld"><label>Email</label><input defaultValue="jmartinez@gmail.com" /></div>
          <div className="fld"><label>Contraseña</label><input type="password" defaultValue="••••••••••" /></div>

          <button className="btn btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 14, marginTop: 8 }}>Continuar</button>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>¿Olvidaste tu clave?</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>
              {React.cloneElement(I.shield, { props: { size: 14 } })}
              <span>Face ID</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 28, fontSize: 12.5, color: 'var(--text-2)', textAlign: 'center' }}>
            ¿Sos nuevo? <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Crear cuenta</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileDashboard() {
  return (
    <div className="mob">
      <div className="mob-screen">
        <MobStatus />
        <div className="mob-content" style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Avatar name="Juliana Martínez" size={36} />
            <div style={{ flex: 1 }}>
              <div className="muted" style={{ fontSize: 11 }}>Hola</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Juliana</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 50, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', position: 'relative' }}>
              {React.cloneElement(I.info, { props: { size: 16 } })}
              <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 50, background: 'var(--danger)' }}></span>
            </div>
          </div>

          <div className="wallet-hero" style={{ padding: 16, borderRadius: 16 }}>
            <div className="lbl" style={{ fontSize: 10.5 }}>Patrimonio total</div>
            <div className="bal" style={{ fontSize: 28, marginTop: 2 }}>$48,217.42</div>
            <div className="sub" style={{ fontSize: 11.5 }}>+$1,420 (+3.0%) 30d</div>
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="wh-btn primary" style={{ flex: 1, justifyContent: 'center', padding: '8px 8px' }}>{I.arrowUp}<span>Enviar</span></button>
              <button className="wh-btn" style={{ flex: 1, justifyContent: 'center', padding: '8px 8px' }}>{I.arrowDown}<span>Recibir</span></button>
              <button className="wh-btn" style={{ flex: 1, justifyContent: 'center', padding: '8px 8px' }}>{I.exchange}<span>Convertir</span></button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'hidden' }}>
            {[
              ['P2P', 'Mejor: 1,248 ARS', '+0.4%'],
              ['Exchange', 'BTC $67.5k', '+2.4%'],
              ['Recompensa', '$2.40 cUSD', 'recibir'],
            ].map(([l, s, t], i) => (
              <div key={i} className="card" style={{ flex: 1, padding: 10, fontSize: 11 }}>
                <div style={{ fontWeight: 600, fontSize: 11.5 }}>{l}</div>
                <div className="muted" style={{ marginTop: 2, fontSize: 10.5 }}>{s}</div>
                <div style={{ color: t.startsWith('+') ? 'var(--success)' : 'var(--accent)', marginTop: 4, fontSize: 10.5, fontWeight: 500 }}>{t}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Mis activos</div>
            <span style={{ color: 'var(--accent-text)', fontSize: 11.5, fontWeight: 500 }}>Ver todos</span>
          </div>
          {[
            ['USDT', '24,420.50', '$24,420.50', '#26a17b', 'U'],
            ['BTC', '0.18420', '$12,420.10', '#f7931a', 'B'],
            ['ETH', '2.4012', '$8,284.14', '#627eea', 'E'],
            ['SOL', '12.4', '$2,046.00', '#9945ff', 'S'],
          ].map(([a, b, u, c, l], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: 50, background: c, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{l}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{b}</div>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{u}</div>
            </div>
          ))}
        </div>
        <MobTabBar active="home" />
      </div>
    </div>
  );
}

function MobileWallet() {
  return (
    <div className="mob">
      <div className="mob-screen">
        <MobStatus />
        <div className="mob-content" style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }}>{I.chevL}</button>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Recibir cUSD</div>
            <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }}>{I.cog}</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 16 }}>
            <div className="qr-wrap">
              <div className="qr" style={{ padding: 16 }}>
                <FakeQR seed="cUSD-jmartinez-9X8Kp4z2" size={220} />
              </div>
              <div className="qr-logo">
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #1a1917, #3a3530)', color: '#faf9f6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>◆</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Tu dirección cUSD</div>
            <div className="mono" style={{ fontSize: 12, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              0xCAdEna…9X8Kp4
              <button className="copy-btn" style={{ color: 'var(--accent)' }}>{I.copy}</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn" style={{ flex: 1, justifyContent: 'center', height: 40 }}>{I.copy}<span>Copiar</span></button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: 40 }}>{I.download}<span>Compartir</span></button>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 11.5, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
            {React.cloneElement(I.info, { props: { size: 14 } })}
            <span>Sólo enviá <b style={{ color: 'var(--text)' }}>cUSD</b> a esta dirección. La red es <b>Cadena</b>. Otros tokens podrían perderse.</span>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Esperando</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--accent-soft)', borderRadius: 'var(--radius)' }}>
              <div className="spinner" style={{ color: 'var(--accent)' }}></div>
              <div style={{ flex: 1, fontSize: 12 }}>
                <div style={{ fontWeight: 500 }}>Escuchando transacciones…</div>
                <div className="muted" style={{ fontSize: 11 }}>Te avisamos cuando llegue</div>
              </div>
            </div>
          </div>
        </div>
        <MobTabBar active="wallet" />
      </div>
    </div>
  );
}

function MobileSend() {
  return (
    <div className="mob">
      <div className="mob-screen">
        <MobStatus />
        <div className="mob-content" style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }}>{I.chevL}</button>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Enviar</div>
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
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
            <div className="amt">120.00</div>
            <div className="ccy">cUSD · ≈ $120.00 USD</div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {['25%','50%','75%','MÁX'].map(p => <button key={p} className="chip" style={{ flex: 1, justifyContent: 'center' }}>{p}</button>)}
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

          <button className="btn btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 14, marginTop: 4 }}>
            Deslizar para enviar →
          </button>
        </div>
        <MobTabBar active="send" />
      </div>
    </div>
  );
}

function MobileP2P() {
  return (
    <div className="mob">
      <div className="mob-screen">
        <MobStatus />
        <div className="mob-content" style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>Mercado P2P</div>
            <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }}>{I.filter}</button>
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: 'var(--surface)', borderRadius: 7, fontSize: 12.5, fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>Comprar</div>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 500 }}>Vender</div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflow: 'hidden' }}>
            <span className="chip active">USDT</span>
            <span className="chip">BTC</span>
            <span className="chip">cUSD</span>
            <span className="chip">{I.chevD}</span>
          </div>

          {[
            { name: 'CryptoMaria', verified: true, ops: 1248, rate: 98.2, price: '1,250.50', limit: '50 – 5,000', methods: ['Mercado Pago', 'Transferencia'] },
            { name: 'PesosBTC', verified: true, ops: 8412, rate: 99.4, price: '1,248.00', limit: '500 – 12,000', methods: ['Transferencia'] },
            { name: 'TradeAR', verified: true, ops: 412, rate: 97.8, price: '1,251.80', limit: '200 – 8,000', methods: ['Uala'] },
          ].map((o, i) => (
            <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
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
                <div className="muted" style={{ fontSize: 11 }}>Lím: {o.limit}</div>
                <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', borderColor: 'transparent' }}>Comprar</button>
              </div>
            </div>
          ))}
        </div>
        <MobTabBar active="p2p" />
      </div>
    </div>
  );
}

Object.assign(window, { MobileLogin, MobileDashboard, MobileWallet, MobileSend, MobileP2P });
