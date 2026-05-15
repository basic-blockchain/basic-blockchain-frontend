// chain-screens.jsx — Blockchain-primitive screens to match the real product
//   ChainScreen, MempoolScreen, NodesScreen, ValidationScreen, HealthScreen
//   CurrencyCatalogScreen, ExchangeRatesScreen
//
// These cover the gap between the original "Cadena" proposal and the actual
// basic-blockchain-simulator product the team is building today.

const { useState: useSc, useEffect: useEc } = React;

/* ─── Helpers ─────────────────────────────────────────────── */

function hashShort(s, n = 8) {
  if (!s) return '—';
  return s.slice(0, n) + '…' + s.slice(-4);
}

function mkBlock(i, prev) {
  const seed = i * 9973;
  const r = (k) => ((seed * (k + 1) * 2654435761) >>> 0) / 4294967296;
  const hex = (n) => Array.from({ length: n }, (_, k) => '0123456789abcdef'[Math.floor(r(k * 3) * 16)]).join('');
  const ts = new Date('2026-05-14T01:47:00Z').getTime() - (i * 1000 * 60 * 6) - Math.floor(r(99) * 1000 * 60 * 4);
  const numTx = i === 0 ? 0 : 1 + Math.floor(r(7) * 4);
  return {
    height: i,
    hash: '0x' + hex(64),
    prev: i === 0 ? 'Genesis' : prev,
    merkle: '0x' + hex(64),
    nonce: i === 0 ? 0 : 100000 + Math.floor(r(11) * 900000),
    difficulty: 4,
    timestamp: new Date(ts).toISOString(),
    miner: i === 0 ? 'genesis' : ['admin_platform', 'alice', 'jose_jose'][Math.floor(r(17) * 3)],
    size: numTx === 0 ? 240 : 240 + numTx * 280,
    txs: numTx,
    reward: i === 0 ? 0 : 50,
  };
}

const CHAIN = (() => {
  const blocks = [];
  for (let i = 0; i < 12; i++) {
    const prev = i === 0 ? 'Genesis' : blocks[i - 1].hash;
    blocks.push(mkBlock(i, prev));
  }
  return blocks.reverse();
})();

const PEERS = [
  { url: 'http://node-01.basicchain.io:5001', status: 'online', height: 11, latency: 38, version: 'v0.4.2', region: '🇺🇸 us-east-1', lastSync: 'hace 4 s' },
  { url: 'http://node-02.basicchain.io:5001', status: 'online', height: 11, latency: 82, version: 'v0.4.2', region: '🇩🇪 eu-central-1', lastSync: 'hace 7 s' },
  { url: 'http://node-03.basicchain.io:5001', status: 'syncing', height: 8, latency: 124, version: 'v0.4.1', region: '🇸🇬 ap-south-1', lastSync: 'hace 2 min' },
  { url: 'http://localhost:5001', status: 'online', height: 11, latency: 4, version: 'v0.4.2', region: '🏠 local', lastSync: 'ahora' },
  { url: 'http://node-05.basicchain.io:5001', status: 'offline', height: 7, latency: null, version: 'v0.4.0', region: '🇧🇷 sa-east-1', lastSync: 'hace 3 h' },
];

const MEMPOOL = [
  { id: 'tx_a1b2c3', sender: 'alice', receiver: 'jose_jose', amount: '12.50', currency: 'BTC', fee: '0.0001', age: '2 min', size: 240 },
  { id: 'tx_d4e5f6', sender: 'admin_platform', receiver: 'alice', amount: '500.00', currency: 'USDT', fee: '0.50', age: '4 min', size: 312 },
  { id: 'tx_g7h8i9', sender: 'jose_jose', receiver: 'alice', amount: '8.20', currency: 'ETH', fee: '0.002', age: '8 min', size: 280 },
];

/* ─── Chain ───────────────────────────────────────────────── */

function ChainScreen({ role = 'admin' }) {
  const nav = useNav();
  const [selected, setSelected] = useSc(CHAIN[0].height);
  const block = CHAIN.find(b => b.height === selected) || CHAIN[0];

  return (
    <div className="scr">
      <Sidebar role={role} active="chain" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Chain']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Cadena de bloques</h1>
              <p className="scr-sub">Explorador on-chain · altura actual <b>{CHAIN[0].height}</b></p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.refresh}<span>Sincronizar</span></button>
              <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('mine-block', {})}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14 }}>⛏</span>
                <span>Minar bloque</span>
              </button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Altura</div><div className="vl">{CHAIN[0].height}</div><div className="ds">{CHAIN.length} bloques en cadena</div></div>
            <div className="bigstat"><div className="lb">Tiempo medio</div><div className="vl">5m 42s</div><div className="ds">objetivo: 6m</div></div>
            <div className="bigstat"><div className="lb">Dificultad</div><div className="vl">4</div><div className="ds">leading zeros · PoW</div></div>
            <div className="bigstat"><div className="lb">Último bloque</div><div className="vl">hace 12s</div><div className="ds">por <span className="mono">{CHAIN[0].miner}</span></div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
            <div className="card">
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Bloques recientes</div>
                <span className="muted" style={{ fontSize: 11 }}>{CHAIN.length} de {CHAIN.length}</span>
              </div>
              <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                {CHAIN.map(b => (
                  <div
                    key={b.height}
                    onClick={() => setSelected(b.height)}
                    style={{
                      display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 12,
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selected === b.height ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, color: selected === b.height ? 'var(--accent-text)' : 'var(--accent)', fontFamily: 'var(--font-mono)' }}>#{b.height}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>PREV {hashShort(b.prev, 8)}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>MERKLE {hashShort(b.merkle, 8)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                      <div>{b.txs} tx · <b className="mono">{b.nonce}</b></div>
                      <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{timeAgo(b.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{block.height}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Bloque #{block.height}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{fmtDateTime(block.timestamp)} · minado por <span className="mono" style={{ color: 'var(--text-2)' }}>{block.miner}</span></div>
                </div>
                <span className="bdg bdg-active">Confirmado</span>
              </div>

              <div className="kvs">
                <div>Hash</div><div className="mono" style={{ fontSize: 11 }}>{hashShort(block.hash, 16)} <button className="copy-btn">{I.copy}</button></div>
                <div>Previous hash</div><div className="mono" style={{ fontSize: 11 }}>{hashShort(block.prev, 16)}</div>
                <div>Merkle root</div><div className="mono" style={{ fontSize: 11 }}>{hashShort(block.merkle, 16)}</div>
                <div>Nonce</div><div className="mono">{block.nonce.toLocaleString('en-US')}</div>
                <div>Difficulty</div><div className="mono">{block.difficulty} <span className="muted" style={{ fontSize: 11 }}>(hash empieza con {block.difficulty} ceros)</span></div>
                <div>Tamaño</div><div className="mono">{block.size} bytes</div>
                <div>Transacciones</div><div>{block.txs}</div>
                <div>Recompensa</div><div className="mono">{block.reward} BTC <span className="muted" style={{ fontSize: 11 }}>coinbase</span></div>
              </div>

              {block.txs > 0 && (
                <>
                  <div className="section-h" style={{ marginTop: 18 }}>Transacciones</div>
                  <div className="card" style={{ padding: 0 }}>
                    {[...Array(block.txs)].map((_, i) => {
                      const isCoinbase = i === 0;
                      return (
                        <div key={i} style={{ padding: '10px 12px', borderBottom: i < block.txs - 1 ? '1px solid var(--border)' : 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                          <span className={`mv-ic ${isCoinbase ? 'mv-dep' : 'mv-buy'}`} style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                            {isCoinbase ? '⛏' : '→'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div className="mono" style={{ fontSize: 11.5 }}>
                              {isCoinbase ? <span style={{ color: 'var(--accent)' }}>COINBASE({block.miner})</span> : 'alice'} → {isCoinbase ? block.miner : 'jose_jose'}
                            </div>
                            <div className="muted mono" style={{ fontSize: 10.5, marginTop: 2 }}>tx_{Math.random().toString(36).slice(2, 10)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontWeight: 500 }}>{isCoinbase ? block.reward : (10 + i * 5).toFixed(2)} BTC</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mempool ─────────────────────────────────────────────── */

function MempoolScreen({ role = 'admin' }) {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role={role} active="mempool" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Mempool']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Mempool</h1>
              <p className="scr-sub">Transacciones pendientes de confirmación · se incluyen en el próximo bloque.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.refresh}<span>Refrescar</span></button>
              <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('mine-block', {})}>⛏<span>Minar ahora</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Pendientes</div><div className="vl">{MEMPOOL.length}</div><div className="ds">la más antigua hace 8 min</div></div>
            <div className="bigstat"><div className="lb">Fees acumulados</div><div className="vl">$3.21</div><div className="ds">a recompensar al minero</div></div>
            <div className="bigstat"><div className="lb">Tamaño total</div><div className="vl">832 B</div><div className="ds">de 1 MB por bloque</div></div>
            <div className="bigstat"><div className="lb">Tiempo medio espera</div><div className="vl">4m 22s</div><div className="ds">hasta confirmación</div></div>
          </div>

          <div className="section-h">Transacciones pendientes ({MEMPOOL.length})</div>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>TX hash</th>
                  <th>De → Para</th>
                  <th className="num">Monto</th>
                  <th className="num">Fee</th>
                  <th>Tamaño</th>
                  <th>Esperando</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {MEMPOOL.map(tx => (
                  <tr key={tx.id} style={{ cursor: 'default' }}
                      onClick={() => nav.openFlow('tx-detail', { tx, status: 'pending' })}>
                    <td className="mono" style={{ fontSize: 11.5 }}>{tx.id}</td>
                    <td><span className="mono" style={{ fontSize: 11.5 }}>{tx.sender}</span> <span className="muted">→</span> <span className="mono" style={{ fontSize: 11.5 }}>{tx.receiver}</span></td>
                    <td className="num mono">{tx.amount} <span className="muted" style={{ fontSize: 11 }}>{tx.currency}</span></td>
                    <td className="num mono muted" style={{ fontSize: 11.5 }}>{tx.fee} {tx.currency}</td>
                    <td className="muted" style={{ fontSize: 11.5 }}>{tx.size} B</td>
                    <td><span className="bdg bdg-pending_kyc">{tx.age}</span></td>
                    <td><button className="btn btn-sm btn-icon btn-ghost">{I.ext}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-h" style={{ marginTop: 18 }}>Historial reciente (últimos 50)</div>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr><th>Bloque</th><th>De</th><th>Para</th><th className="num">Monto</th><th>Confirmado</th></tr>
              </thead>
              <tbody>
                {[
                  { b: 11, from: 'alice', to: 'jose_jose', amt: '250.00', cur: 'BTC', when: '2026-05-14 01:47' },
                  { b: 10, from: 'COINBASE(admin_platform)', to: 'admin_platform', amt: '50.00', cur: 'BTC', when: '2026-05-14 01:41' },
                  { b: 9,  from: 'jose_jose', to: 'alice', amt: '1.00', cur: 'BTC', when: '2026-05-14 01:35' },
                  { b: 8,  from: 'admin_platform', to: 'jose_jose', amt: '123.00', cur: 'BTC', when: '2026-05-14 01:29' },
                  { b: 8,  from: 'COINBASE(admin_platform)', to: 'admin_platform', amt: '50.00', cur: 'BTC', when: '2026-05-14 01:23' },
                ].map((r, i) => (
                  <tr key={i} onClick={() => nav.openFlow('tx-detail', { tx: { id: 'tx_h' + i, sender: r.from, receiver: r.to, amount: r.amt, currency: r.cur, fee: '0.0001', age: '—', size: 240 }, status: 'completed', block: r.b, confirmedAt: r.when })}>
                    <td><a href="#" className="mono" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>#{r.b}</a></td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{r.from.startsWith('COIN') ? <span style={{ color: 'var(--accent)' }}>{r.from}</span> : r.from}</td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{r.to}</td>
                    <td className="num mono">{r.amt} <span className="muted" style={{ fontSize: 11 }}>{r.cur}</span></td>
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

/* ─── Nodes ───────────────────────────────────────────────── */

function NodesScreen({ role = 'admin' }) {
  const nav = useNav();
  const [newUrl, setNewUrl] = useSc('http://localhost:5001');
  return (
    <div className="scr">
      <Sidebar role={role} active="nodes" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Nodos']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Red de nodos</h1>
              <p className="scr-sub">Peers conectados, sincronización y consenso PoW.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => nav.toast('Consenso resuelto · cadena local sigue siendo la más larga (11 bloques)', 'success')}>
                {I.refresh}<span>Resolver consenso</span>
              </button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Peers totales</div><div className="vl">{PEERS.length}</div><div className="ds">{PEERS.filter(p => p.status === 'online').length} en línea</div></div>
            <div className="bigstat"><div className="lb">Altura consenso</div><div className="vl">11</div><div className="ds">3 nodos coinciden</div></div>
            <div className="bigstat"><div className="lb">Latencia media</div><div className="vl">62ms</div><div className="ds">peers online</div></div>
            <div className="bigstat"><div className="lb">Estado red</div><div className="vl" style={{ color: 'var(--success)' }}>Saludable</div><div className="ds">consenso estable</div></div>
          </div>

          <div className="section-h">
            <span>Peers registrados</span>
            <div className="right">
              <span className="muted" style={{ fontSize: 11.5 }}>Auto-sync cada 30s</span>
            </div>
          </div>

          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Región</th>
                  <th>Versión</th>
                  <th className="num">Altura</th>
                  <th className="num">Latencia</th>
                  <th>Estado</th>
                  <th>Último sync</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {PEERS.map((p, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 11.5 }}>{p.url}</td>
                    <td>{p.region}</td>
                    <td className="mono muted" style={{ fontSize: 11 }}>{p.version}</td>
                    <td className="num mono">
                      {p.height}
                      {p.height < 11 && <span className="muted" style={{ fontSize: 10.5, marginLeft: 4 }}>(-{11 - p.height})</span>}
                    </td>
                    <td className="num mono">{p.latency != null ? p.latency + 'ms' : '—'}</td>
                    <td>
                      <span className={`bdg ${p.status === 'online' ? 'bdg-active' : p.status === 'syncing' ? 'bdg-pending_kyc' : 'bdg-banned'}`}>
                        {p.status === 'online' ? 'En línea' : p.status === 'syncing' ? 'Sincronizando' : 'Offline'}
                      </span>
                    </td>
                    <td className="muted">{p.lastSync}</td>
                    <td><button className="btn btn-sm btn-icon btn-ghost">{I.more}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-h" style={{ marginTop: 18 }}>Registrar nuevo peer</div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="http://node-XX.basicchain.io:5001"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--surface)' }}
              />
              <button className="btn btn-primary" onClick={() => nav.toast('Peer registrado · negociando handshake…', 'info')}>
                {I.plus}<span>Registrar</span>
              </button>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              Al registrar, el nodo intercambia su altura y hash de cabecera. Si la cadena remota es más larga y válida, se inicia consenso automático.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Validation ──────────────────────────────────────────── */

function ValidationScreen({ role = 'admin' }) {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role={role} active="validation" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Validación']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Validación de cadena</h1>
              <p className="scr-sub">Verificación bloque a bloque · integridad criptográfica y reglas de consenso.</p>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => nav.toast('Re-validación iniciada · 12 bloques en cola', 'info')}>{I.refresh}<span>Re-validar cadena</span></button>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Bloques válidos</div><div className="vl" style={{ color: 'var(--success)' }}>12 / 12</div><div className="ds">100% integridad</div></div>
            <div className="bigstat"><div className="lb">Última validación</div><div className="vl">hace 4 min</div><div className="ds">auto · cada 5 min</div></div>
            <div className="bigstat"><div className="lb">Tiempo total</div><div className="vl">82ms</div><div className="ds">validación completa</div></div>
            <div className="bigstat"><div className="lb">Inconsistencias</div><div className="vl" style={{ color: 'var(--success)' }}>0</div><div className="ds">en últimas 24h</div></div>
          </div>

          <div className="section-h">Reglas verificadas</div>
          <div className="card">
            {[
              { label: 'Continuidad de hashes (previous_hash)', desc: 'Cada bloque referencia correctamente al anterior', status: 'pass', count: '11/11' },
              { label: 'Merkle root', desc: 'El árbol de merkle de transacciones coincide con el header', status: 'pass', count: '12/12' },
              { label: 'Proof of Work', desc: 'Cada nonce produce un hash con los ceros requeridos', status: 'pass', count: '11/11' },
              { label: 'Coinbase válida', desc: 'Cada bloque incluye exactamente una transacción coinbase', status: 'pass', count: '11/11' },
              { label: 'Saldos suficientes', desc: 'Ninguna tx gasta más de lo disponible', status: 'pass', count: '0 dobles gastos' },
              { label: 'Firmas válidas', desc: 'Todas las transacciones tienen firma válida del sender', status: 'pass', count: 'todas' },
              { label: 'Timestamp monótono', desc: 'Cada bloque tiene timestamp ≥ que el anterior', status: 'pass', count: '12/12' },
            ].map((rule, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 6 ? '1px solid var(--border)' : 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center' }}>
                  {React.cloneElement(I.check, { props: { size: 16 } })}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{rule.label}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{rule.desc}</div>
                </div>
                <span className="bdg bdg-active">{rule.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Health ──────────────────────────────────────────────── */

function HealthScreen({ role = 'admin' }) {
  return (
    <div className="scr">
      <Sidebar role={role} active="health" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Health']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Salud del nodo</h1>
              <p className="scr-sub">Componentes, métricas y logs operativos.</p>
            </div>
            <button className="btn btn-sm">{I.download}<span>Exportar diagnóstico</span></button>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Uptime</div><div className="vl">14d 8h</div><div className="ds">SLA 99.97%</div></div>
            <div className="bigstat"><div className="lb">RPS</div><div className="vl">42</div><div className="ds">promedio 5 min</div></div>
            <div className="bigstat"><div className="lb">Latencia API</div><div className="vl">P95 38ms</div><div className="ds">P99 124ms</div></div>
            <div className="bigstat"><div className="lb">DB size</div><div className="vl">142 MB</div><div className="ds">+2.4 MB hoy</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <div>
              <div className="section-h">Componentes</div>
              <div className="card">
                {[
                  ['Node (Python · Flask)', 'v0.4.2 · puerto 5000', 'ok'],
                  ['Database (PostgreSQL)', 'cadena · 142 MB · 38 conexiones', 'ok'],
                  ['Auth service (JWT)', 'rotación de claves OK · refresh tokens ok', 'ok'],
                  ['Mempool relay', 'broadcast a 3 peers', 'ok'],
                  ['Block validator', '12/12 bloques · re-validación cada 5 min', 'ok'],
                  ['Exchange rates feed', 'Binance · última sync hace 8 min', 'warn'],
                  ['Frontend (Vue.js)', 'build 2026.05.14 · CDN cache hit 96%', 'ok'],
                ].map(([name, sub, st], i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 6 ? '1px solid var(--border)' : 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 50, background: st === 'ok' ? 'var(--success)' : 'var(--warning)', boxShadow: '0 0 0 4px ' + (st === 'ok' ? 'var(--success-soft)' : 'var(--warning-soft)') }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>
                    </div>
                    <span className={`bdg ${st === 'ok' ? 'bdg-active' : 'bdg-pending_kyc'}`}>{st === 'ok' ? 'OK' : 'Degradado'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="section-h">Logs · últimos eventos</div>
              <div className="card" style={{ padding: 0, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {[
                  ['INFO', '01:47:12', 'block.mined', 'height=11 nonce=482931 hash=0xa4f1...'],
                  ['INFO', '01:47:08', 'consensus.resolved', 'chain unchanged · 11 blocks'],
                  ['WARN', '01:42:01', 'exchange.feed', 'Binance rate-limit reached · backing off 60s'],
                  ['INFO', '01:41:55', 'peer.connected', 'http://node-04...:5001 height=11'],
                  ['INFO', '01:35:42', 'tx.accepted', 'tx_a1b2c3 sender=alice receiver=jose_jose'],
                  ['INFO', '01:29:18', 'user.created', 'username=alice role=USER'],
                  ['DEBUG', '01:23:00', 'mempool.purge', 'expired=0 invalid=0'],
                ].map(([lvl, t, ev, msg], i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px 60px 130px 1fr', gap: 8, padding: '6px 12px', borderBottom: i < 6 ? '1px solid var(--border)' : 0 }}>
                    <span style={{ color: lvl === 'WARN' ? 'var(--warning)' : lvl === 'ERROR' ? 'var(--danger)' : lvl === 'DEBUG' ? 'var(--text-3)' : 'var(--success)', fontWeight: 600 }}>{lvl}</span>
                    <span className="muted">{t}</span>
                    <span style={{ color: 'var(--accent-text)' }}>{ev}</span>
                    <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
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

/* ─── Currency Catalog ────────────────────────────────────── */

function CurrencyCatalogScreen({ role = 'admin' }) {
  return (
    <div className="scr">
      <Sidebar role={role} active="currencies" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Catálogo de monedas']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Catálogo de monedas</h1>
              <p className="scr-sub">Activos soportados por la plataforma · símbolo, decimales y estado.</p>
            </div>
            <button className="btn btn-sm btn-primary">{I.plus}<span>Agregar moneda</span></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
            <div className="card">
              <table className="tbl">
                <thead>
                  <tr><th>Activo</th><th>Code</th><th>Nombre</th><th className="num">Decimales</th><th>Tipo</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {[
                    ['BTC', 'BTC', 'Bitcoin', 8, 'native'],
                    ['ETH', 'ETH', 'Ether', 8, 'native'],
                    ['NATIVE', 'NATIVE', 'Native', 8, 'platform'],
                    ['SOL', 'SOL', 'Solana', 8, 'native'],
                    ['USDC', 'USDC', 'USDCoin', 8, 'stablecoin'],
                    ['USDT', 'USDT', 'Tether', 8, 'stablecoin'],
                  ].map(([asset, code, name, dec, type], i) => (
                    <tr key={code}>
                      <td><AssetPill asset={asset} /></td>
                      <td className="mono" style={{ fontWeight: 500 }}>{code}</td>
                      <td>{name}</td>
                      <td className="num mono">{dec}</td>
                      <td><span className="bdg" style={{ background: type === 'platform' ? '#ede9fe' : type === 'stablecoin' ? 'var(--success-soft)' : 'var(--accent-soft)', color: type === 'platform' ? '#5b21b6' : type === 'stablecoin' ? 'var(--success)' : 'var(--accent-text)', border: 0 }}>{type}</span></td>
                      <td><span className="bdg bdg-active">Activa</span></td>
                      <td><button className="btn btn-sm btn-icon btn-ghost">{I.edit}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Agregar moneda</div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>Quedará disponible para wallets y rates al activarse.</div>

                <div className="fld"><label>Code</label><input className="mono" placeholder="NATIVE" /></div>
                <div className="fld"><label>Nombre</label><input placeholder="Native" /></div>
                <div className="fld-row">
                  <div className="fld"><label>Decimales</label><input className="mono" defaultValue="8" /></div>
                  <div className="fld"><label>Estado</label>
                    <select defaultValue="active"><option value="active">Activa</option><option>Inactiva</option></select>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Crear</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Exchange Rates ──────────────────────────────────────── */

function ExchangeRatesScreen({ role = 'admin' }) {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role={role} active="rates" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Tasas de cambio']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Tasas de cambio</h1>
              <p className="scr-sub">Feed automático desde proveedores y rates manuales para activos internos.</p>
            </div>
            <button className="btn btn-sm">{I.refresh}<span>Refrescar</span></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Sincronizar desde proveedor</div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>Los pares deben coincidir con monedas activas del catálogo.</div>
              <div className="fld-row">
                <div className="fld"><label>Proveedor</label>
                  <select defaultValue="binance">
                    <option value="binance">Binance</option>
                    <option>Coinbase</option>
                    <option>Kraken</option>
                  </select>
                </div>
                <div className="fld"><label>Pares</label><input className="mono" defaultValue="BTC/USDT,ETH/USDT" /></div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => nav.toast('Sincronización Binance completa · 2 pares actualizados', 'success')}>
                Sincronizar ahora
              </button>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Tasa manual</div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>Se guarda con source MANUAL · prioridad sobre feed.</div>
              <div className="fld-row">
                <div className="fld"><label>From</label><input className="mono" defaultValue="NATIVE" /></div>
                <div className="fld"><label>To</label><input className="mono" defaultValue="USDT" /></div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Rate</label><input className="mono" defaultValue="1.05" /></div>
                <div className="fld"><label>Fee rate</label><input className="mono" defaultValue="0" /></div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Guardar tasa</button>
            </div>
          </div>

          <div className="section-h">Tasas vigentes</div>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr><th>Par</th><th className="num">Rate</th><th className="num">Fee</th><th>Source</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {[
                  ['ETH', 'USDT', '2,268.26', '0.00', 'BINANCE', '2026-05-14 01:57'],
                  ['BTC', 'USDT', '79,829.76', '0.00', 'BINANCE', '2026-05-14 01:57'],
                  ['ETH', 'USDT', '2,269.25', '0.00', 'BINANCE', '2026-05-14 01:52'],
                  ['BTC', 'USDT', '79,839.25', '0.00', 'BINANCE', '2026-05-14 01:52'],
                  ['ETH', 'USDT', '2,269.37', '0.00', 'BINANCE', '2026-05-14 01:47'],
                  ['NATIVE', 'USDT', '1.05', '0.00', 'MANUAL', '2026-05-14 00:14'],
                  ['SOL', 'USDT', '165.42', '0.00', 'BINANCE', '2026-05-14 01:47'],
                ].map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className="mono" style={{ fontWeight: 600 }}>{r[0]} <span className="muted">→</span> {r[1]}</span>
                    </td>
                    <td className="num mono">{r[2]}</td>
                    <td className="num mono muted" style={{ fontSize: 11.5 }}>{r[3]}</td>
                    <td><span className="bdg" style={{ background: r[4] === 'MANUAL' ? 'var(--accent-soft)' : 'var(--success-soft)', color: r[4] === 'MANUAL' ? 'var(--accent-text)' : 'var(--success)', border: 0 }}>{r[4]}</span></td>
                    <td className="mono muted" style={{ fontSize: 11.5 }}>{r[5]}</td>
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

Object.assign(window, {
  ChainScreen, MempoolScreen, NodesScreen, ValidationScreen, HealthScreen,
  CurrencyCatalogScreen, ExchangeRatesScreen,
  CHAIN, MEMPOOL, PEERS,
});
