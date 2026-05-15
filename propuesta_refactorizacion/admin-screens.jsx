// admin-screens.jsx — Admin dashboard + Treasury

function AdminDashboard() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="admin" active="dashboard" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Resumen']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Buen día, admin 👋</h1>
              <p className="scr-sub">Resumen operativo · 12 may 2026 · 09:41</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.refresh}<span>Sincronizar</span></button>
              <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('treasury-approval', {
                source: 'Hot · USDT',
                destination: 'Lote CSV (41 wallets)',
                amount: '20,500.00',
                asset: 'USDT',
                perWallet: '500.00',
              })}>{I.plus}<span>Nueva operación</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat">
              <div className="lb">Usuarios activos</div>
              <div className="vl">8.247</div>
              <div className="ds"><span className="pill pill-up">+182</span> esta semana</div>
            </div>
            <div className="bigstat">
              <div className="lb">Saldo bajo gestión</div>
              <div className="vl">$24.8M</div>
              <div className="ds"><span className="pill pill-up">+3.4%</span> 30 días</div>
            </div>
            <div className="bigstat">
              <div className="lb">Volumen 24h</div>
              <div className="vl">$1.92M</div>
              <div className="ds">P2P · 41% / Exchange · 59%</div>
            </div>
            <div className="bigstat">
              <div className="lb">Cola compliance</div>
              <div className="vl">23</div>
              <div className="ds"><span style={{ color: 'var(--danger)' }}>4 prioritarios</span> · SLA 4h</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Volumen últimos 30 días</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11.5 }}>Operaciones P2P + Exchange + on-chain</div>
                </div>
                <div className="tabs">
                  <button className="tab active">30D</button>
                  <button className="tab">90D</button>
                  <button className="tab">1A</button>
                </div>
              </div>
              <svg viewBox="0 0 600 180" style={{ width: '100%', height: 180 }}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2456e6" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2456e6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#e6e3db" strokeDasharray="2 4" />)}
                <path d="M 0 130 L 30 122 L 60 128 L 90 110 L 120 116 L 150 95 L 180 102 L 210 84 L 240 92 L 270 70 L 300 76 L 330 62 L 360 80 L 390 56 L 420 64 L 450 44 L 480 58 L 510 38 L 540 50 L 570 30 L 600 42 L 600 180 L 0 180 Z" fill="url(#ag)" />
                <path d="M 0 130 L 30 122 L 60 128 L 90 110 L 120 116 L 150 95 L 180 102 L 210 84 L 240 92 L 270 70 L 300 76 L 330 62 L 360 80 L 390 56 L 420 64 L 450 44 L 480 58 L 510 38 L 540 50 L 570 30 L 600 42" stroke="#2456e6" strokeWidth="2" fill="none" />
              </svg>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Composición del saldo</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginBottom: 14 }}>Por activo en wallets de usuarios</div>
              {[
                ['USDT', 42, '#26a17b'], ['BTC', 28, '#f7931a'], ['ETH', 18, '#627eea'], ['USDC', 7, '#2775ca'], ['Otros', 5, '#999']
              ].map(([a, p, c]) => (
                <div key={a} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 500 }}>{a}</span><span className="mono">{p}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: p + '%', background: c, borderRadius: 3 }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Eventos críticos hoy</div>
                <a href="#" style={{ color: 'var(--accent-text)', fontSize: 12, fontWeight: 500 }}
                  onClick={(e) => { e.preventDefault(); nav.navigate('audit'); }}>Ver auditoría →</a>
              </div>
              {[
                ['warn', 'Wallet corporativa USDT al 18% del piso operativo', 'hace 12 min'],
                ['danger', '3 cuentas baneadas por alerta AML — vol $24.1k', 'hace 1 h'],
                ['info', 'Soft-delete masivo · 41 cuentas inactivas >180d', 'hace 3 h'],
                ['warn', 'P2P offer #4821 disputa abierta — escalada a ops', 'hace 5 h'],
              ].map(([k, msg, ago], i) => (
                <div key={i} className="audit-item" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <div className="audit-dot" style={{ background: k === 'danger' ? 'var(--danger)' : k === 'warn' ? 'var(--warning)' : 'var(--info)' }}></div>
                  <div className="audit-meta"><div style={{ fontSize: 12.5 }}>{msg}</div></div>
                  <div className="audit-when">{ago}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Top movimientos del día</div>
                <a href="#" style={{ color: 'var(--accent-text)', fontSize: 12, fontWeight: 500 }}
                  onClick={(e) => { e.preventDefault(); nav.navigate('movements'); }}>Ver todos →</a>
              </div>
              <table className="tbl" style={{ fontSize: 12 }}>
                <tbody>
                {[
                  ['Withdraw', '0.8 BTC', '$54.0k', '#user_00132', 'mv-wd', I.arrowUp],
                  ['P2P Sell', '12.5k USDT', '$12.5k', '#user_00089', 'mv-sell', I.arrowUp],
                  ['Deposit', '4.2 ETH', '$14.5k', '#user_00271', 'mv-dep', I.arrowDown],
                  ['Exchange', '600 USDC → SOL', '$600', '#user_00345', 'mv-buy', I.arrowDown],
                ].map((r, i) => (
                  <tr key={i}>
                    <td><span className={`mv-ic ${r[4]}`} style={{ display: 'inline-grid', width: 22, height: 22, borderRadius: 6, placeItems: 'center' }}>{r[5]}</span></td>
                    <td style={{ fontWeight: 500 }}>{r[0]}</td>
                    <td className="mono">{r[1]}</td>
                    <td className="num mono">{r[2]}</td>
                    <td className="muted mono" style={{ fontSize: 11 }}>{r[3]}</td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TreasuryScreen() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="admin" active="treasury" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Tesorería']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Tesorería</h1>
              <p className="scr-sub">Wallets corporativas que respaldan los saldos de usuarios.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.download}<span>Reporte</span></button>
              <button className="btn btn-sm">{I.plus}<span>Nueva wallet corporativa</span></button>
              <button className="btn btn-sm btn-primary">{I.exchange}<span>Recargar cuentas usuarios</span></button>
            </div>
          </div>

          <div className="bigstat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="kpi-dark">
              <div className="lb">Reserva total corporativa</div>
              <div className="vl">$31.4M</div>
              <div className="ds">Ratio cobertura usuarios: <b style={{ color: '#86efac' }}>1.26x</b></div>
            </div>
            <div className="bigstat">
              <div className="lb">Saldo emitido a usuarios</div>
              <div className="vl">$24.8M</div>
              <div className="ds">8.247 wallets · 14 activos distintos</div>
            </div>
            <div className="bigstat">
              <div className="lb">Disponible para emitir</div>
              <div className="vl" style={{ color: 'var(--success)' }}>$6.6M</div>
              <div className="ds"><span style={{ color: 'var(--warning)' }}>USDT bajo</span> · resto holgado</div>
            </div>
          </div>

          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Wallets corporativas por activo</div>
            <div className="tabs">
              <button className="tab active">Todas</button>
              <button className="tab">Cold</button>
              <button className="tab">Hot</button>
              <button className="tab">Fee</button>
            </div>
          </div>

          <div className="treasury-grid">
            {[
              { asset: 'USDT', cls: 'asset-usdt', bal: '4.8M USDT', usd: '$4.80M', sub: '78% del piso operativo', warn: true, kind: 'Hot · operativa', addr: '0x4f1a9b2c…d77e' },
              { asset: 'BTC',  cls: 'asset-btc',  bal: '128.42 BTC', usd: '$8.66M', sub: 'Reserva fría', kind: 'Cold storage', addr: 'bc1q4x8…m92r' },
              { asset: 'ETH',  cls: 'asset-eth',  bal: '2,140 ETH',  usd: '$7.38M', sub: 'Multi-sig 3 de 5', kind: 'Cold storage', addr: '0xa12b3c…ff20' },
              { asset: 'USDC', cls: 'asset-usdc', bal: '6.2M USDC', usd: '$6.20M', sub: 'Reserva fría', kind: 'Cold storage', addr: '0x88a1d4…cc01' },
              { asset: 'SOL',  cls: 'asset-sol',  bal: '12,400 SOL', usd: '$2.05M', sub: 'Buffer rotativo', kind: 'Hot · operativa', addr: 'So1Drp…9XKp' },
              { asset: 'cUSD', cls: 'asset-cusd', bal: '2.31M cUSD', usd: '$2.31M', sub: 'Token nativo', kind: 'Mint authority', addr: '0xCAdE…na01' },
            ].map((w, i) => (
              <div key={i} className="treasury-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="t-asset"><AssetPill asset={w.asset} /></div>
                    <div className="t-bal mono">{w.bal}</div>
                    <div className="t-sub">≈ {w.usd}</div>
                  </div>
                  <span className="bdg bdg-active" style={{ fontSize: 10 }}>{w.kind}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11.5, color: 'var(--text-3)' }}>
                  <AddrChip addr={w.addr.replace('…','0000000000000000')} head={8} tail={5} />
                  {w.warn && <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{React.cloneElement(I.warn, { props: { size: 12 }})}{w.sub}</span>}
                </div>
                <div className="t-foot">
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => nav.openFlow('treasury-approval', {
                      source: w.kind + ' · ' + w.asset,
                      destination: 'Lote CSV (41 wallets)',
                      amount: '20,500.00',
                      asset: w.asset,
                      perWallet: '500.00',
                    })}>Emitir a usuarios</button>
                  <button className="btn btn-sm btn-icon" onClick={() => nav.openFlow('convert', { from: w.asset, to: w.asset === 'USDT' ? 'BTC' : 'USDT' })}>{I.exchange}</button>
                  <button className="btn btn-sm btn-icon">{I.more}</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
            <div className="card">
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>Operaciones de tesorería recientes</span>
                <a href="#" style={{ color: 'var(--accent-text)', fontSize: 12, fontWeight: 500 }}>Ver todas →</a>
              </div>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>Operación</th><th>Activo</th><th>Monto</th><th>Origen → Destino</th><th>Aprobado por</th><th>Cuando</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Emisión a usuario', 'USDT', '500.00', 'Hot USDT → usr_00132', 'admin@dropi.co', 'hace 8 min'],
                    ['Rebalance', 'BTC', '2.50', 'Cold → Hot', 'multi-sig (3/5)', 'hace 1 h'],
                    ['Mint', 'cUSD', '50,000', 'Mint authority → Reserva', 'admin@dropi.co', 'hace 2 h'],
                    ['Recolección de fees', 'ETH', '0.412', '7 wallets → Fee', 'sistema', 'hace 3 h'],
                    ['Emisión masiva', 'USDC', '12,400', 'Hot USDC → 41 usuarios', 'ops@dropi.co', 'hace 6 h'],
                  ].map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r[0]}</td>
                      <td className="mono">{r[1]}</td>
                      <td className="num mono">{r[2]}</td>
                      <td className="muted" style={{ fontSize: 11.5 }}>{r[3]}</td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{r[4]}</td>
                      <td className="muted">{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Recargar wallets de usuarios</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginBottom: 14 }}>Distribución manual o vía regla automática</div>

              <div className="fld"><label>Origen</label>
                <select defaultValue="hot-usdt"><option value="hot-usdt">Hot · USDT · 4.8M disponible</option></select>
              </div>
              <div className="fld"><label>Destino</label>
                <select defaultValue="batch"><option value="batch">Lote CSV (41 wallets)</option><option>Usuario individual</option><option>Regla automática</option></select>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Monto por wallet</label><input className="mono" defaultValue="500.00 USDT" /></div>
                <div className="fld"><label>Monto total</label><input className="mono" defaultValue="20,500.00 USDT" readOnly /></div>
              </div>

              <div className="warn-box">
                {React.cloneElement(I.info, { props: { size: 14 } })}
                <div style={{ color: 'var(--info)' }}>Requiere aprobación de 2 administradores. Quedará en cola hasta el segundo OK.</div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 34 }}
                onClick={() => nav.openFlow('treasury-approval', {
                  source: 'Hot · USDT',
                  destination: 'Lote CSV (41 wallets)',
                  amount: '20,500.00',
                  asset: 'USDT',
                  perWallet: '500.00',
                })}>Enviar para aprobación</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, TreasuryScreen });
