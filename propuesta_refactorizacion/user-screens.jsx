// user-screens.jsx — End-user (USER-VIEWER) views

function UserPortfolio() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="user" active="portfolio" />
      <div className="main">
        <TopBar crumbs={['Cuenta', 'Mi portafolio']} env="" search="Buscar en mis movimientos…" />
        <div className="page">
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="wallet-hero">
              <div className="lbl">Patrimonio total</div>
              <div className="bal">$48,217.42</div>
              <div className="sub">≈ 60,156,738 ARS · <span style={{ color: '#86efac' }}>+$1,420 (+3.0%) 30d</span></div>
              <div className="acts">
                <button className="wh-btn primary" onClick={() => nav.navigate('send')}>{I.arrowUp}<span>Enviar</span></button>
                <button className="wh-btn" onClick={() => nav.openFlow('receive', { asset: 'USDT', address: '0x4f1a9b…cc01' })}>{I.arrowDown}<span>Recibir</span></button>
                <button className="wh-btn" onClick={() => nav.openFlow('convert', { from: 'USDT', to: 'BTC' })}>{I.exchange}<span>Convertir</span></button>
                <button className="wh-btn" onClick={() => nav.navigate('p2p')}>{I.plus}<span>Comprar</span></button>
              </div>
            </div>
            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11.5 }}>Verificación</div>
                    <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Nivel L2</div>
                  </div>
                  <span className="bdg bdg-active">Verificado</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>Operás con un límite de <b style={{ color: 'var(--text)' }}>USD 50,000</b> mensuales. Subí a L3 para operar sin límite.</div>
              </div>
              <button className="btn btn-sm btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>Mejorar a L3</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Mis activos</div>
                <a href="#" style={{ color: 'var(--accent-text)', fontSize: 12, fontWeight: 500 }}>Ver todas las wallets →</a>
              </div>
              <div className="card">
                <table className="tbl" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Activo</th>
                      <th className="num">Balance</th>
                      <th className="num">Valor</th>
                      <th>30d</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['USDT', 'Tether USD', '24,420.50', '$24,420.50', [10,12,11,13,12,14,13,15,14,16,15,17], '#26a17b', '+0.0%'],
                      ['BTC',  'Bitcoin',    '0.18420',   '$12,420.10', [8,9,7,10,12,11,13,15,14,17,16,18], '#f7931a', '+4.2%'],
                      ['ETH',  'Ethereum',   '2.4012',    '$8,284.14',  [6,7,8,6,7,8,9,10,11,10,11,12], '#627eea', '+2.8%'],
                      ['SOL',  'Solana',     '12.4',      '$2,046.00',  [12,11,13,14,15,14,13,15,16,18,17,19], '#9945ff', '+8.4%'],
                      ['cUSD', 'Cadena USD', '1,046.68',  '$1,046.68',  [10,10,10,10,10,10,10,10,10,10,10,10], '#1a1917', '0.0%'],
                    ].map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <AssetPill asset={r[0]} />
                            <span className="muted" style={{ fontSize: 11.5 }}>{r[1]}</span>
                          </div>
                        </td>
                        <td className="num mono">{r[2]} <span className="muted" style={{ fontSize: 11 }}>{r[0]}</span></td>
                        <td className="num mono">{r[3]}</td>
                        <td><Sparkline data={r[4]} color={r[5]} fill /></td>
                        <td><span className={r[6].startsWith('+') && r[6] !== '+0.0%' ? 'pill pill-up' : r[6].startsWith('-') ? 'pill pill-dn' : 'pill pill-neu'}>{r[6]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Últimos movimientos</div>
                <a href="#" style={{ color: 'var(--accent-text)', fontSize: 12, fontWeight: 500 }}>Ver historial completo →</a>
              </div>
              <div className="card">
                {[
                  ['Compra P2P', 'Vendedor: PesosBTC', '+500.00 USDT', 'mv-buy', I.arrowDown, 'hace 4 min'],
                  ['Envío interno', 'Para Mateo F.', '-120.00 cUSD', 'mv-sell', I.arrowUp, 'hace 1 h'],
                  ['Exchange', 'USDT → BTC', '+0.0148 BTC', 'mv-buy', I.arrowDown, 'hace 3 h'],
                  ['Recibido', 'De Sofía P.', '+85.50 cUSD', 'mv-dep', I.arrowDown, 'hace 1 d'],
                  ['Retiro on-chain', 'a 0x88…f1a', '-2.0000 ETH', 'mv-wd', I.arrowUp, 'hace 2 d'],
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 4 ? '1px solid var(--border)' : 0 }}>
                    <span className={`mv-ic ${r[3]}`} style={{ width: 30, height: 30, fontSize: 14 }}>{r[4]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r[0]}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{r[1]}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 500, fontSize: 13 }}>{r[2]}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{r[5]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="card" style={{ padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Atajos</div>
                {[
                  ['Comprar USDT en P2P', I.exchange],
                  ['Solicitar pago a alguien', I.arrowDown],
                  ['Programar envío recurrente', I.cal],
                  ['Activar 2FA', I.shield],
                ].map(([l, ic], i) => (
                  <a key={i} href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--accent)' }}>{ic}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>{l}</span>
                    {I.chev}
                  </a>
                ))}
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Mejor precio P2P</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button className="chip active" style={{ flex: 1, justifyContent: 'center' }}>Comprar</button>
                  <button className="chip" style={{ flex: 1, justifyContent: 'center' }}>Vender</button>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>1 USDT ≈</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>1,248.40 ARS</div>
                <div className="pill pill-up" style={{ marginTop: 4 }}>+0.4% 24h</div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>Comprar ahora</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserWalletDetail() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="user" active="wallets" />
      <div className="main">
        <TopBar crumbs={['Cuenta', 'Mis wallets', 'cUSD']} env="" />
        <div className="page">
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 320px', gap: 18 }}>
            <div>
              <div className="wallet-hero" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AssetPill asset="cUSD" />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Red Cadena · estable nativo</span>
                </div>
                <div className="bal" style={{ marginTop: 12 }}>1,046.68 cUSD</div>
                <div className="sub">≈ $1,046.68 USD</div>
                <div className="acts">
                  <button className="wh-btn primary" onClick={() => nav.navigate('send')}>{I.arrowUp}<span>Enviar</span></button>
                  <button className="wh-btn" onClick={() => nav.openFlow('receive', { asset: 'cUSD', address: '0xCAdEna…9X8Kp4' })}>{I.arrowDown}<span>Recibir</span></button>
                  <button className="wh-btn" onClick={() => nav.openFlow('convert', { from: 'cUSD', to: 'USDT' })}>{I.exchange}<span>Convertir</span></button>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Movimientos de esta wallet</div>
                  <a href="#" style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 500 }}>Ver todos</a>
                </div>
                <table className="tbl" style={{ fontSize: 12.5 }}>
                  <tbody>
                    {[
                      ['Recibido de Mateo F.', '+120.00 cUSD', 'mv-buy', I.arrowDown, 'hoy 09:24'],
                      ['Envío a Sofía P.', '-85.50 cUSD', 'mv-sell', I.arrowUp, 'ayer 18:12'],
                      ['Conversión USDT → cUSD', '+500.00 cUSD', 'mv-buy', I.arrowDown, 'ayer 14:01'],
                      ['Emisión tesorería', '+500.00 cUSD', 'mv-dep', I.arrowDown, '10 may 09:01'],
                      ['Envío a Lucía G.', '-40.00 cUSD', 'mv-sell', I.arrowUp, '08 may 17:20'],
                    ].map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className={`mv-ic ${r[2]}`}>{r[3]}</span>
                            <span style={{ fontWeight: 500 }}>{r[0]}</span>
                          </div>
                        </td>
                        <td className="num mono">{r[1]}</td>
                        <td className="muted">{r[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Recibir cUSD</div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>Escaneá o copiá tu dirección</div>
                <div className="qr-wrap" style={{ marginBottom: 14 }}>
                  <div className="qr">
                    <FakeQR seed="cUSD-jmartinez-9X8Kp4z2" size={180} />
                  </div>
                  <div className="qr-logo">
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #1a1917, #3a3530)', color: '#faf9f6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>◆</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu dirección</div>
                  <div className="addr-chip" style={{ alignSelf: 'center' }}>
                    <span>0xCAdEna…9X8Kp4</span>
                    <button className="copy-btn" title="Copiar">{I.copy}</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => nav.openFlow('receive', { asset: 'cUSD', address: '0xCAdEna…9X8Kp4' })}>{I.arrowDown}<span>Recibir más</span></button>
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => nav.openFlow('withdraw', { asset: 'cUSD', balance: '1,046.68', network: 'Cadena' })}>{I.ext}<span>Retirar</span></button>
                </div>
                <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 11.5, color: 'var(--text-2)', textAlign: 'left', display: 'flex', gap: 8 }}>
                  {React.cloneElement(I.info, { props: { size: 14 } })}
                  <span>Sólo enviá <b style={{ color: 'var(--text)' }}>cUSD</b> a esta dirección. Otros tokens en la misma red podrían perderse.</span>
                </div>
              </div>

              <div className="card" style={{ padding: 14, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Otras wallets</div>
                {[
                  ['BTC', '0.184', '$12,420'],
                  ['ETH', '2.401', '$8,284'],
                  ['USDT', '24,420.50', '$24,420'],
                  ['SOL', '12.4', '$2,046'],
                ].map(([a, b, u], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0 }}>
                    <AssetPill asset={a} />
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }} className="mono">{b}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }} className="mono">{u}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserSendScreen() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="user" active="send" />
      <div className="main">
        <TopBar crumbs={['Cuenta', 'Enviar / Recibir']} env="" />
        <div className="page">
          <div style={{ maxWidth: 920, margin: '0 auto' }}>
            <div className="tabstrip">
              <a className="active">Enviar</a>
              <a>Recibir</a>
              <a>Solicitar</a>
              <a>Programar</a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Enviar fondos</h3>
                <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 12.5 }}>Movimientos internos son instantáneos y sin costo.</p>

                <div className="fld">
                  <label>Destinatario</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <button className="chip active">Usuario Cadena</button>
                    <button className="chip">Email</button>
                    <button className="chip">Dirección on-chain</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input defaultValue="@mateo.f" />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--success)', fontSize: 11.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ● Mateo Fernández
                    </span>
                  </div>
                </div>

                <div className="fld">
                  <label>Desde</label>
                  <select defaultValue="cusd">
                    <option value="cusd">cUSD · 1,046.68 disponible</option>
                    <option>USDT · 24,420.50 disponible</option>
                    <option>BTC · 0.184 disponible</option>
                  </select>
                </div>

                <div className="amount-input">
                  <div className="amt">120.00</div>
                  <div className="ccy">cUSD · ≈ $120.00 USD</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12 }}>
                    {['25%','50%','75%','MÁX'].map(p => <button key={p} className="chip" style={{ height: 24, padding: '0 8px', fontSize: 11 }}>{p}</button>)}
                  </div>
                </div>

                <div className="fld" style={{ marginTop: 12 }}>
                  <label>Nota (opcional)</label>
                  <input defaultValue="Devolución cena" placeholder="¿Para qué es este envío?" />
                </div>

                <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Comisión</span><span className="mono" style={{ color: 'var(--success)' }}>Gratis</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Tiempo estimado</span><span>Instantáneo</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}><span style={{ color: 'var(--text)' }}>Mateo recibe</span><span className="mono" style={{ color: 'var(--text)', fontWeight: 500 }}>120.00 cUSD</span></div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', height: 38, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => nav.openFlow('send-confirm', {
                    to: 'Mateo Fernández', handle: '@mateo.f',
                    amount: '120.00', asset: 'cUSD', note: 'Devolución cena',
                  })}>Revisar y enviar</button>
              </div>

              <div>
                <div className="card" style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Contactos frecuentes</div>
                  {[
                    ['Mateo Fernández', '@mateo.f', '3 envíos este mes'],
                    ['Sofía Pérez', '@sofia.p', '12 envíos · favorita'],
                    ['Lucía González', '@lucia.gz', 'última vez 8 may'],
                    ['Diego López', '@d.lopez', 'última vez 2 may'],
                  ].map(([n, h, m], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0 }}>
                      <Avatar name={n} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{n}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{h} · {m}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Tip de seguridad</div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    {React.cloneElement(I.shield, { props: { size: 16 } })}
                    <span>Verificá siempre el nombre del destinatario antes de confirmar. Los envíos internos no son reversibles.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { UserPortfolio, UserWalletDetail, UserSendScreen });
