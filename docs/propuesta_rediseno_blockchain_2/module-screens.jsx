// module-screens.jsx — Wallets, Movements/Sends, P2P, Exchange

function WalletsScreen() {
  const nav = useNav();
  const wallets = [
    { id: 'w_1', user: 'Lucía González', email: 'lucia.gonzalez@gmail.com', asset: 'BTC', addr: 'bc1q4x8m92r9k2lm5j8h3n4', net: 'Bitcoin', bal: '0.842', usd: '$56,835', status: 'active' },
    { id: 'w_2', user: 'Mateo Fernández', email: 'mateo.f@protonmail.com', asset: 'ETH', addr: '0x4f1a9b2c8d77e2c0b4a1f9', net: 'Ethereum', bal: '12.4031', usd: '$42,790', status: 'active' },
    { id: 'w_3', user: 'Sofía Pérez', email: 'sofia.p@dropi.co', asset: 'USDT', addr: '0x88a1d4cc01f9a4e2b1d8c5', net: 'Ethereum', bal: '8,420.00', usd: '$8,420', status: 'frozen' },
    { id: 'w_4', user: 'Diego López', email: 'd.lopez@outlook.com', asset: 'USDC', addr: '0xa12b3cff20b8d4e1c9a2f5', net: 'Ethereum', bal: '12,500.00', usd: '$12,500', status: 'active' },
    { id: 'w_5', user: 'Valentina Sosa', email: 'vale.sosa@gmail.com', asset: 'SOL', addr: 'So1Drp9XKpFx2m4n8q5r1', net: 'Solana', bal: '142.50', usd: '$23,512', status: 'active' },
    { id: 'w_6', user: 'Tomás Acosta', email: 'tacosta@gmail.com', asset: 'BTC', addr: 'bc1q8p4n5k3l9m2r7t1y6u', net: 'Bitcoin', bal: '0.0124', usd: '$837', status: 'frozen' },
    { id: 'w_7', user: 'Camila Romero', email: 'camila.r@gmail.com', asset: 'USDT', addr: '0xCAdEna01b9c2d4e5f1a8b7', net: 'Polygon', bal: '5,200.00', usd: '$5,200', status: 'active' },
    { id: 'w_8', user: 'Joaquín Silva', email: 'jsilva@dropi.co', asset: 'ETH', addr: '0xff20b8d4e1c9a2f5b8d6c3', net: 'Ethereum', bal: '4.8210', usd: '$16,632', status: 'active' },
    { id: 'w_9', user: 'Martina Castro', email: 'martina.c@gmail.com', asset: 'cUSD', addr: '0xCAdE1234na01b9c2d4e5f1', net: 'Cadena', bal: '14,200.00', usd: '$14,200', status: 'active' },
    { id: 'w_10', user: 'Benjamín Núñez', email: 'b.nunez@gmail.com', asset: 'MATIC', addr: '0xa12b3cff20b8d4e1c9a2f5', net: 'Polygon', bal: '8,420.00', usd: '$6,062', status: 'active' },
  ];
  return (
    <div className="scr">
      <Sidebar role="admin" active="wallets" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Wallets']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Wallets</h1>
              <p className="scr-sub">Todas las wallets de la plataforma · vista consolidada.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.download}<span>Exportar</span></button>
              <button className="btn btn-sm" onClick={() => nav.toast('Selección vacía · marcá filas para congelar en lote', 'info')}>{I.freeze}<span>Congelar selección</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Wallets totales</div><div className="vl">14,820</div><div className="ds">14 activos distintos</div></div>
            <div className="bigstat"><div className="lb">Activas</div><div className="vl" style={{ color: 'var(--success)' }}>14,012</div><div className="ds">94.5%</div></div>
            <div className="bigstat"><div className="lb">Congeladas</div><div className="vl" style={{ color: 'var(--info)' }}>728</div><div className="ds">$3.4M afectado</div></div>
            <div className="bigstat"><div className="lb">Inactivas (&gt;180d)</div><div className="vl muted">80</div><div className="ds">Candidatas a archivar</div></div>
          </div>

          <div className="toolbar">
            <div className="tabs">
              <button className="tab active">Todas <span className="count">14820</span></button>
              <button className="tab">Activas <span className="count">14012</span></button>
              <button className="tab">Congeladas <span className="count">728</span></button>
              <button className="tab">Inactivas <span className="count">80</span></button>
            </div>
            <div className="toolbar-search">{I.search}<input placeholder="Buscar por dirección, ID o usuario…" /></div>
            <span className="chip">Activo · Cualquiera {I.chevD}</span>
            <span className="chip">Red · Cualquiera {I.chevD}</span>
            <span className="chip">Saldo &gt; 0 {I.chevD}</span>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="tbl-cb"><input type="checkbox" className="cbx" /></th>
                  <th>Usuario</th>
                  <th>Activo</th>
                  <th>Red</th>
                  <th>Dirección</th>
                  <th className="num">Saldo</th>
                  <th className="num">USD</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {wallets.map(w => (
                  <tr key={w.id} style={{ cursor: 'pointer' }}
                      onClick={() => nav.openFlow('wallet-detail', { wallet: w })}>
                    <td className="tbl-cb" onClick={e => e.stopPropagation()}><input type="checkbox" className="cbx" /></td>
                    <td><div className="cell-user"><Avatar name={w.user} size={24} /><div><div className="name">{w.user}</div><div className="em">{w.email}</div></div></div></td>
                    <td><AssetPill asset={w.asset} /></td>
                    <td className="muted">{w.net}</td>
                    <td><AddrChip addr={w.addr + '00000000'} head={8} tail={4} /></td>
                    <td className="num mono">{w.bal}</td>
                    <td className="num mono">{w.usd}</td>
                    <td><span className={`bdg bdg-${w.status === 'frozen' ? 'frozen' : 'active'}`}>{w.status === 'frozen' ? 'Congelada' : 'Activa'}</span></td>
                    <td className="row-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-icon btn-ghost" onClick={() => nav.toast('Acciones rápidas próximamente · usá el drawer por ahora', 'info')}>{I.more}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pager">
              <div>Mostrando <strong>1–10</strong> de <strong>14.820</strong></div>
              <div className="pager-pgs">
                <button className="btn btn-sm btn-icon">{I.chevL}</button>
                <span style={{ alignSelf: 'center', fontSize: 12, padding: '0 6px' }}>Página 1 de 1.482</span>
                <button className="btn btn-sm btn-icon">{I.chev}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementsScreen({ role = 'admin' }) {
  const nav = useNav();
  const rows = [
    { type: 'P2P · Compra', cls: 'mv-buy', icon: I.arrowDown, user: 'Lucía González', asset: 'USDT', amount: '500.00', usd: '$500', counter: 'usr_00481', status: 'completed', when: 'hace 8 min' },
    { type: 'Retiro on-chain', cls: 'mv-wd', icon: I.arrowUp, user: 'Mateo Fernández', asset: 'ETH', amount: '2.5000', usd: '$8,625', counter: '0x88…f1a', status: 'pending', when: 'hace 14 min' },
    { type: 'Exchange · Venta', cls: 'mv-sell', icon: I.arrowUp, user: 'Sofía Pérez', asset: 'BTC', amount: '0.024000', usd: '$1,620', counter: 'BTC→USDT', status: 'completed', when: 'hace 21 min' },
    { type: 'Depósito on-chain', cls: 'mv-dep', icon: I.arrowDown, user: 'Diego López', asset: 'USDC', amount: '10,000.00', usd: '$10,000', counter: '0xa1…b3c', status: 'completed', when: 'hace 32 min' },
    { type: 'P2P · Venta', cls: 'mv-sell', icon: I.arrowUp, user: 'Valentina Sosa', asset: 'SOL', amount: '42.500', usd: '$7,012', counter: 'usr_00271', status: 'completed', when: 'hace 1 h' },
    { type: 'Envío interno', cls: 'mv-buy', icon: I.arrowDown, user: 'Tomás Acosta', asset: 'cUSD', amount: '120.00', usd: '$120', counter: 'usr_00345', status: 'completed', when: 'hace 1 h' },
    { type: 'Retiro on-chain', cls: 'mv-wd', icon: I.arrowUp, user: 'Camila Romero', asset: 'USDT', amount: '1,200.00', usd: '$1,200', counter: '0xCa…na0', status: 'failed', when: 'hace 2 h' },
    { type: 'Exchange · Compra', cls: 'mv-buy', icon: I.arrowDown, user: 'Joaquín Silva', asset: 'ETH', amount: '0.5000', usd: '$1,725', counter: 'USDT→ETH', status: 'completed', when: 'hace 2 h' },
    { type: 'P2P · Compra', cls: 'mv-buy', icon: I.arrowDown, user: 'Martina Castro', asset: 'USDT', amount: '2,500.00', usd: '$2,500', counter: 'usr_00089', status: 'completed', when: 'hace 3 h' },
    { type: 'Emisión tesorería', cls: 'mv-dep', icon: I.arrowDown, user: 'Benjamín Núñez', asset: 'cUSD', amount: '500.00', usd: '$500', counter: 'admin@dropi.co', status: 'completed', when: 'hace 4 h' },
  ];
  return (
    <div className="scr">
      <Sidebar role={role} active="movements" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Movimientos']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Movimientos</h1>
              <p className="scr-sub">Historial consolidado · P2P, exchange, on-chain y emisiones de tesorería.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.cal}<span>Últimos 30 días</span></button>
              <button className="btn btn-sm">{I.download}<span>Exportar CSV</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Operaciones 24h</div><div className="vl">2.184</div><div className="ds"><span className="pill pill-up">+8.2%</span></div></div>
            <div className="bigstat"><div className="lb">Volumen 24h</div><div className="vl">$1.92M</div><div className="ds">Promedio op: $880</div></div>
            <div className="bigstat"><div className="lb">Pendientes</div><div className="vl" style={{ color: 'var(--warning)' }}>34</div><div className="ds">Tiempo medio 12 min</div></div>
            <div className="bigstat"><div className="lb">Fallidas (7d)</div><div className="vl" style={{ color: 'var(--danger)' }}>17</div><div className="ds">0.13% del total</div></div>
          </div>

          <div className="toolbar">
            <div className="tabs">
              <button className="tab active">Todos <span className="count">10K</span></button>
              <button className="tab">P2P <span className="count">3.1K</span></button>
              <button className="tab">Exchange <span className="count">4.8K</span></button>
              <button className="tab">On-chain <span className="count">1.4K</span></button>
              <button className="tab">Tesorería <span className="count">98</span></button>
            </div>
            <div className="toolbar-search">{I.search}<input placeholder="Buscar por usuario, hash o ID…" /></div>
            <span className="chip">Activo · Cualquiera {I.chevD}</span>
            <span className="chip">Estado · Cualquiera {I.chevD}</span>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Activo</th>
                  <th className="num">Monto</th>
                  <th className="num">USD</th>
                  <th>Contraparte / Detalle</th>
                  <th>Estado</th>
                  <th>Cuando</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }}
                      onClick={() => nav.openFlow('tx-detail', {
                        tx: { id: 'tx_' + Math.random().toString(36).slice(2, 9), sender: r.user, receiver: r.counter, amount: r.amount, currency: r.asset, fee: '0.0001', age: '—', size: 320 },
                        status: r.status,
                        block: r.status === 'completed' ? 11 - i : null,
                        confirmedAt: r.status === 'completed' ? '2026-05-14 01:47' : null,
                      })}>
                    <td><div className="mv-type"><span className={`mv-ic ${r.cls}`}>{r.icon}</span>{r.type}</div></td>
                    <td><div className="cell-user"><Avatar name={r.user} size={22} /><div className="name">{r.user}</div></div></td>
                    <td><AssetPill asset={r.asset} /></td>
                    <td className="num mono">{r.amount}</td>
                    <td className="num mono">{r.usd}</td>
                    <td className="muted mono" style={{ fontSize: 11.5 }}>{r.counter}</td>
                    <td><span className={`bdg bdg-${r.status === 'completed' ? 'active' : r.status === 'pending' ? 'pending_kyc' : 'banned'}`}>{r.status === 'completed' ? 'Completado' : r.status === 'pending' ? 'Pendiente' : 'Fallido'}</span></td>
                    <td className="muted">{r.when}</td>
                    <td><button className="btn btn-sm btn-icon btn-ghost">{I.ext}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function P2PScreen({ role = 'admin' }) {
  const nav = useNav();
  const offers = [
    { dir: 'sell', name: 'CryptoMaria', verified: true, completed: 1248, rate: 98.2, price: '1,250.50', limit: '50 – 5,000', methods: ['Mercado Pago', 'Transferencia', 'Cash'], asset: 'USDT' },
    { dir: 'sell', name: 'PesosBTC',   verified: true, completed: 8412, rate: 99.4, price: '1,248.00', limit: '500 – 12,000', methods: ['Transferencia bancaria', 'Brubank'], asset: 'USDT' },
    { dir: 'sell', name: 'GauchoCripto', verified: false, completed: 142, rate: 96.1, price: '1,255.10', limit: '100 – 1,500', methods: ['Mercado Pago'], asset: 'USDT' },
    { dir: 'sell', name: 'TradeAR', verified: true, completed: 412, rate: 97.8, price: '1,251.80', limit: '200 – 8,000', methods: ['Uala', 'Transferencia'], asset: 'USDT' },
    { dir: 'buy',  name: 'NorteCambio', verified: true, completed: 2841, rate: 99.0, price: '1,243.00', limit: '500 – 10,000', methods: ['Transferencia bancaria'], asset: 'USDT' },
    { dir: 'buy',  name: 'SurCoin', verified: true, completed: 642, rate: 98.5, price: '1,241.50', limit: '100 – 4,000', methods: ['Mercado Pago', 'Brubank'], asset: 'USDT' },
  ];
  return (
    <div className="scr">
      <Sidebar role={role} active="p2p" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Mercado P2P']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Mercado P2P</h1>
              <p className="scr-sub">Ofertas activas · {role === 'admin' ? 'vista administrativa con métricas y gestión de disputas' : 'cola de moderación'}.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => nav.openFlow('dispute', { buyer: 'Valentina Sosa', seller: 'GauchoCripto', amount: '1,820.00', asset: 'USDT', opId: '4821' })}>{I.warn}<span>Disputas (3)</span></button>
              {role === 'admin' && <button className="btn btn-sm btn-primary">{I.cog}<span>Ajustes del mercado</span></button>}
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Ofertas activas</div><div className="vl">412</div><div className="ds">218 compra · 194 venta</div></div>
            <div className="bigstat"><div className="lb">Precio promedio USDT</div><div className="vl">$1,248.40<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>ARS</span></div><div className="ds"><span className="pill pill-up">+0.4%</span> 24h</div></div>
            <div className="bigstat"><div className="lb">Volumen 24h</div><div className="vl">$782K</div><div className="ds">3.1k operaciones</div></div>
            <div className="bigstat"><div className="lb">Disputas abiertas</div><div className="vl" style={{ color: 'var(--danger)' }}>3</div><div className="ds">SLA 4h · 1 vencida</div></div>
          </div>

          <div className="tabstrip">
            <a className="active">Quiero comprar</a>
            <a>Quiero vender</a>
            <a>Mis órdenes</a>
            {role === 'admin' && <a style={{ marginLeft: 'auto', color: 'var(--danger)' }}>Disputas · 3</a>}
          </div>

          <div className="toolbar" style={{ borderRadius: 'var(--radius-lg)' }}>
            <span className="chip active">Activo · USDT {I.chevD}</span>
            <span className="chip">Pago · Todos {I.chevD}</span>
            <span className="chip">Cantidad · 1.000 ARS {I.chevD}</span>
            <span className="chip">Solo verificados {I.chevD}</span>
            <div style={{ flex: 1 }}></div>
            <div className="toggle"><input type="checkbox" defaultChecked /> Online ahora</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            {offers.slice(0, 6).map((o, i) => (
              <div key={i} className="p2p-offer">
                <div className="seller">
                  <Avatar name={o.name} size={32} />
                  <div style={{ flex: 1 }}>
                    <div className="name">{o.name} {o.verified && <span style={{ color: 'var(--success)', fontSize: 11, marginLeft: 4 }}>● verificado</span>}</div>
                    <div className="meta">{o.completed.toLocaleString('es-AR')} operaciones · {o.rate}% completadas</div>
                  </div>
                </div>
                <div className="price-big">${o.price}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>ARS / {o.asset}</span></div>
                <div className="limits">Límite: {o.limit} {o.asset}</div>
                <div className="methods">{o.methods.map(m => <span key={m} className="method">{m}</span>)}</div>
                <button className={`btn btn-sm`} style={{ width: '100%', justifyContent: 'center', background: o.dir === 'sell' ? 'var(--success)' : 'var(--danger)', color: '#fff', borderColor: 'transparent' }}
                  onClick={() => nav.openFlow('p2p-buy', { offer: o, side: o.dir === 'sell' ? 'buy' : 'sell' })}>
                  {o.dir === 'sell' ? 'Comprar' : 'Vender'} {o.asset}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExchangeScreen({ role = 'admin' }) {
  const nav = useNav();
  const bids = [
    [67500.20, 0.4821, 32554], [67499.80, 0.2104, 14201], [67498.50, 1.2042, 81216], [67497.10, 0.0842, 5685],
    [67495.60, 0.5212, 35185], [67494.00, 2.1100, 142413], [67492.50, 0.3320, 22411], [67490.10, 0.8910, 60136],
  ];
  const asks = [
    [67502.10, 0.3201, 21607], [67503.50, 0.5102, 34457], [67505.00, 1.0410, 70286], [67506.80, 0.1820, 12286],
    [67508.20, 0.7541, 50920], [67510.00, 0.4012, 27090], [67512.50, 0.2210, 14920], [67515.00, 1.5200, 102622],
  ];
  return (
    <div className="scr">
      <Sidebar role={role} active="exchange" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Exchange']} />
        <div className="page">
          <div className="scr-h">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: 50, background: 'linear-gradient(135deg, #f7931a, #e07b00)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>B</span>
                <h1 className="scr-title">BTC / USDT</h1>
                {I.chevD}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12 }}>
                <div><div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Último</div><div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--success)' }}>67,500.20</div></div>
                <div><div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>24h %</div><div style={{ fontWeight: 600, color: 'var(--success)', fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>+2.41%</div></div>
                <div><div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Volumen</div><div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>$184.2M</div></div>
                <div><div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Máx 24h</div><div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>68,124.00</div></div>
                <div><div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mín 24h</div><div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>65,890.50</div></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px 280px', gap: 12 }}>
            {/* Chart */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="tabs">
                  <button className="tab">1m</button>
                  <button className="tab">5m</button>
                  <button className="tab active">15m</button>
                  <button className="tab">1H</button>
                  <button className="tab">4H</button>
                  <button className="tab">1D</button>
                </div>
                <button className="btn btn-sm btn-icon btn-ghost">{I.cog}</button>
              </div>
              <svg viewBox="0 0 600 220" style={{ width: '100%', height: 220 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f7a3a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1f7a3a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160, 200].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#e6e3db" strokeDasharray="2 4" />)}
                {/* candles */}
                {Array.from({length: 40}).map((_, i) => {
                  const seed = i * 7919;
                  const r1 = ((seed * 9301 + 49297) % 233280) / 233280;
                  const r2 = ((seed * 7919 + 12345) % 233280) / 233280;
                  const cx = 15 + i * 14.5;
                  const baseY = 110 + Math.sin(i * 0.4) * 30 + (i / 40) * -40;
                  const open = baseY + r1 * 20 - 10;
                  const close = baseY + r2 * 20 - 10;
                  const up = close < open;
                  const top = Math.min(open, close);
                  const high = top - 8 * r1;
                  const low = Math.max(open, close) + 8 * r2;
                  const c = up ? '#1f7a3a' : '#ad2820';
                  return (
                    <g key={i}>
                      <line x1={cx} x2={cx} y1={high} y2={low} stroke={c} strokeWidth={1} />
                      <rect x={cx - 4} y={top} width={8} height={Math.abs(close - open) || 1} fill={c} />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Order book */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600 }}>Libro de órdenes</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '6px 14px', fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>
                <span>Precio (USDT)</span><span>BTC</span><span>Total</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {asks.slice(0, 6).reverse().map((r, i) => (
                  <div key={i} className="ob-row ob-sell">
                    <span className="price mono">{r[0].toFixed(2)}</span>
                    <span className="qty mono">{r[1].toFixed(4)}</span>
                    <span className="total mono">{r[2].toLocaleString('en-US')}</span>
                  </div>
                ))}
                <div style={{ padding: '8px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>67,500.20</span>
                  <span className="muted" style={{ fontSize: 11 }}>≈ $67,500.20</span>
                </div>
                {bids.slice(0, 6).map((r, i) => (
                  <div key={i} className="ob-row ob-buy">
                    <span className="price mono">{r[0].toFixed(2)}</span>
                    <span className="qty mono">{r[1].toFixed(4)}</span>
                    <span className="total mono">{r[2].toLocaleString('en-US')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade panel */}
            <div className="trade-card">
              <div className="trade-tabs">
                <div className="trade-tab buy active">Comprar BTC</div>
                <div className="trade-tab sell">Vender BTC</div>
              </div>
              <div className="tabs" style={{ marginBottom: 12 }}>
                <button className="tab active">Mercado</button>
                <button className="tab">Límite</button>
                <button className="tab">Stop</button>
              </div>

              <div className="fld">
                <label>Disponible</label>
                <div className="mono" style={{ fontSize: 13, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>12,420.50 USDT</div>
              </div>
              <div className="fld">
                <label>Cantidad</label>
                <div style={{ position: 'relative' }}>
                  <input className="mono" defaultValue="0.05000" />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-3)' }}>BTC</span>
                </div>
              </div>
              <div className="fld">
                <label>Total</label>
                <div style={{ position: 'relative' }}>
                  <input className="mono" defaultValue="3,375.01" />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-3)' }}>USDT</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 12 }}>
                {['25%','50%','75%','100%'].map(p => (
                  <button key={p} className="chip" style={{ height: 24, padding: '0 6px', fontSize: 11, justifyContent: 'center' }}>{p}</button>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', height: 36, justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)' }}
                onClick={() => nav.openFlow('exchange-order', { side: 'buy', pair: 'BTC/USDT', price: '67,500.20', amount: '0.05000', total: '3,375.01', orderType: 'Mercado' })}>
                Comprar 0.05 BTC
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendsScreen() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="admin" active="sends" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Envíos']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Envíos</h1>
              <p className="scr-sub">Transferencias entre wallets · internas y on-chain.</p>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('send-confirm', { to: 'Mateo Fernández', handle: '@mateo.f', amount: '120.00', asset: 'cUSD', note: 'Pago de servicios' })}>{I.plus}<span>Nuevo envío</span></button>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Envíos 24h</div><div className="vl">1.420</div><div className="ds">Internos 84% · On-chain 16%</div></div>
            <div className="bigstat"><div className="lb">Volumen 24h</div><div className="vl">$684K</div><div className="ds">Promedio: $482</div></div>
            <div className="bigstat"><div className="lb">Pendientes on-chain</div><div className="vl" style={{ color: 'var(--warning)' }}>12</div><div className="ds">Confirmaciones &lt; 3</div></div>
            <div className="bigstat"><div className="lb">Comisiones cobradas</div><div className="vl">$1,420</div><div className="ds">Últimos 7 días</div></div>
          </div>

          <div className="tabstrip">
            <a className="active">Todos</a>
            <a>Internos</a>
            <a>On-chain</a>
            <a>Pendientes</a>
            <a>Fallidos</a>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>De</th>
                  <th>Para</th>
                  <th>Activo</th>
                  <th className="num">Monto</th>
                  <th>Hash / Ref</th>
                  <th>Estado</th>
                  <th>Cuando</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Interno', from: 'Lucía González', to: 'Mateo Fernández', asset: 'cUSD', amount: '120.00', ref: 'ref_a82bc4', status: 'completed', when: 'hace 4 min' },
                  { type: 'On-chain', from: 'Sofía Pérez', to: '0xa12b3cff20…2f5', asset: 'USDT', amount: '500.00', ref: '0x4f1a…d77e', status: 'pending', when: 'hace 8 min', conf: '1 / 12' },
                  { type: 'Interno', from: 'Diego López', to: 'Valentina Sosa', asset: 'USDT', amount: '250.00', ref: 'ref_92c1aa', status: 'completed', when: 'hace 12 min' },
                  { type: 'Tesorería', from: 'Hot USDT', to: '41 wallets (lote)', asset: 'USDT', amount: '20,500.00', ref: 'batch_99', status: 'completed', when: 'hace 25 min' },
                  { type: 'On-chain', from: 'Tomás Acosta', to: 'bc1q4x8m92r…', asset: 'BTC', amount: '0.0240', ref: '0xab12…cd34', status: 'completed', when: 'hace 38 min', conf: '24 / 12' },
                  { type: 'Interno', from: 'Camila Romero', to: 'Joaquín Silva', asset: 'cUSD', amount: '85.50', ref: 'ref_c41a82', status: 'completed', when: 'hace 1 h' },
                  { type: 'On-chain', from: 'Martina Castro', to: '0x88a1d4cc01…', asset: 'USDC', amount: '1,200.00', ref: '0xff20…b8d4', status: 'failed', when: 'hace 2 h' },
                  { type: 'Interno', from: 'Benjamín Núñez', to: 'Lucía González', asset: 'USDT', amount: '40.00', ref: 'ref_84n21x', status: 'completed', when: 'hace 3 h' },
                ].map((r, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }}
                      onClick={() => nav.openFlow('send-detail', { row: r })}>
                    <td><span className="bdg" style={{ background: r.type === 'On-chain' ? '#ecf6fa' : r.type === 'Tesorería' ? '#ede9fe' : 'var(--surface-2)', color: r.type === 'On-chain' ? 'var(--info)' : r.type === 'Tesorería' ? '#5b21b6' : 'var(--text-2)', border: '1px solid var(--border)' }}>{r.type}</span></td>
                    <td><div className="cell-user"><Avatar name={r.from} size={22} /><div className="name">{r.from}</div></div></td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{r.to}</td>
                    <td><AssetPill asset={r.asset} /></td>
                    <td className="num mono">{r.amount}</td>
                    <td className="mono muted" style={{ fontSize: 11 }}>{r.ref}{r.conf && <div style={{ fontSize: 10.5 }}>{r.conf} conf</div>}</td>
                    <td><span className={`bdg bdg-${r.status === 'completed' ? 'active' : r.status === 'pending' ? 'pending_kyc' : 'banned'}`}>{r.status === 'completed' ? 'Completado' : r.status === 'pending' ? 'Pendiente' : 'Fallido'}</span></td>
                    <td className="muted">{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WalletsScreen, MovementsScreen, P2PScreen, ExchangeScreen, SendsScreen });
