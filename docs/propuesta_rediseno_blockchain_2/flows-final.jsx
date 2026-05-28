// flows-final.jsx — Final batch of interactivity:
//   - PeerActionsFlow:        Per-peer actions menu (ping, sync, remove, details)
//   - ValidationRunFlow:      Animated chain validation running 7 rules with progress
//   - HealthLogsLive:         Auto-refreshing logs panel (mounts on Health screen)
//   - AssetDetailFlow:        User clicks an asset row in portfolio → asset detail
//   - MobileNavCtx + flows:   Mobile screen flow stack (send confirm, receive)
//   - NotificationDeepLinks:  Notification items navigate to context

const { useState: useSf, useEffect: useEf, useRef: useRf } = React;

/* ─── Peer actions ────────────────────────────────────────── */

function PeerActionsFlow({ data, onClose, onComplete }) {
  const peer = data.peer;
  const [pinging, setPinging] = useSf(false);
  const [pingResult, setPingResult] = useSf(null);
  const [removing, setRemoving] = useSf(false);

  const ping = () => {
    setPinging(true); setPingResult(null);
    setTimeout(() => {
      setPinging(false);
      setPingResult({ ok: peer.status !== 'offline', latency: peer.latency || (40 + Math.floor(Math.random() * 80)) });
    }, 1200);
  };

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-h">
          <h2 className="mono" style={{ fontSize: 14 }}>{peer.url}</h2>
          <p>{peer.region} · {peer.version} · {peer.status === 'online' ? 'En línea' : peer.status === 'syncing' ? 'Sincronizando' : 'Offline'}</p>
        </div>
        <div className="modal-b">
          <div className="card" style={{ padding: '4px 14px', marginBottom: 14 }}>
            <div className="kvs">
              <div>Altura</div><div className="mono">{peer.height}{peer.height < 11 && <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>(-{11 - peer.height} del consenso)</span>}</div>
              <div>Latencia</div><div className="mono">{peer.latency != null ? peer.latency + 'ms' : '—'}</div>
              <div>Versión</div><div className="mono">{peer.version}</div>
              <div>Última sync</div><div>{peer.lastSync}</div>
            </div>
          </div>

          {pingResult && (
            <div className={`drawer-banner ${pingResult.ok ? 'info' : 'danger'}`}>
              {pingResult.ok ? I.check : I.x}
              <div>{pingResult.ok ? <>Pong en <b>{pingResult.latency}ms</b> · peer respondió OK</> : <>El peer no responde · marcado como offline</>}</div>
            </div>
          )}

          <div className="section-h">Acciones</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              ['Ping (test de latencia)', I.bolt, ping, pinging, false],
              ['Forzar sincronización', I.refresh, () => onComplete && onComplete({ action: 'sync', peer }), false, peer.status === 'offline'],
              ['Ver bloques del peer', I.ext, () => onComplete && onComplete({ action: 'inspect', peer }), false, false],
              ['Reiniciar conexión', I.refresh, () => onComplete && onComplete({ action: 'reconnect', peer }), false, false],
            ].map(([l, ic, fn, busy, disabled], i, a) => (
              <button key={l} className="menu-item" disabled={busy || disabled}
                style={{ width: '100%', borderRadius: 0, padding: '12px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, opacity: disabled ? 0.5 : 1 }}
                onClick={fn}>
                <span style={{ color: 'var(--text-2)' }}>{ic}</span>
                <span>{l}</span>
                {busy && <span className="spinner" style={{ marginLeft: 'auto' }}></span>}
                {!busy && <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>{I.chev}</span>}
              </button>
            ))}
          </div>

          <div className="section-h" style={{ marginTop: 18 }}>Zona peligrosa</div>
          <div className="warn-box">
            {I.warn}
            <div>Al eliminar el peer, dejamos de propagarle bloques nuevos. Su cadena local sigue intacta y puede re-registrarse en cualquier momento.</div>
          </div>
          {!removing
            ? <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => setRemoving(true)}>{I.trash}<span>Eliminar peer</span></button>
            : (<div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRemoving(false)}>Cancelar</button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { onComplete && onComplete({ action: 'remove', peer }); onClose(); }}>Confirmar eliminación</button>
              </div>)
          }
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Validation run (animated 7-rules) ───────────────────── */

const RULES = [
  ['Continuidad de hashes', 'Cada bloque referencia correctamente al anterior', '11/11'],
  ['Merkle root', 'El árbol de merkle de transacciones coincide con el header', '12/12'],
  ['Proof of Work', 'Cada nonce produce un hash con los ceros requeridos', '11/11'],
  ['Coinbase válida', 'Cada bloque incluye exactamente una transacción coinbase', '11/11'],
  ['Saldos suficientes', 'Ninguna tx gasta más de lo disponible', '0 dobles gastos'],
  ['Firmas válidas', 'Todas las transacciones tienen firma válida del sender', 'todas'],
  ['Timestamp monótono', 'Cada bloque tiene timestamp ≥ que el anterior', '12/12'],
];

function ValidationRunFlow({ data, onClose, onComplete }) {
  // step: 0..7 (current rule index being processed), 7 = done
  const [step, setStep] = useSf(0);
  const [progress, setProgress] = useSf(0);

  useEf(() => {
    if (step >= RULES.length) return;
    let p = 0;
    const dur = 450 + Math.random() * 300;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      p = Math.min(1, (t - start) / dur);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setTimeout(() => { setStep(s => s + 1); setProgress(0); }, 120);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const done = step >= RULES.length;

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-h">
          <h2>{done ? 'Validación completa' : 'Validando la cadena…'}</h2>
          <p>{done ? '7 / 7 reglas verificadas · 12 bloques sanos.' : 'Reglas en ejecución · ' + step + ' / ' + RULES.length}</p>
        </div>
        <div className="modal-b">
          <div className="card" style={{ padding: 0 }}>
            {RULES.map((r, i) => {
              const state = i < step ? 'done' : i === step && !done ? 'running' : 'queued';
              return (
                <div key={r[0]} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < RULES.length - 1 ? '1px solid var(--border)' : 0, opacity: state === 'queued' ? 0.5 : 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 50,
                    background: state === 'done' ? 'var(--success-soft)' : state === 'running' ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: state === 'done' ? 'var(--success)' : state === 'running' ? 'var(--accent)' : 'var(--text-3)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    {state === 'done' ? React.cloneElement(I.check, { props: { size: 16 } })
                    : state === 'running' ? <span className="spinner" style={{ width: 14, height: 14 }}></span>
                    : <span style={{ fontSize: 11, fontWeight: 600 }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r[0]}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{r[1]}</div>
                    {state === 'running' && (
                      <div style={{ marginTop: 6, height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: progress * 100 + '%', background: 'var(--accent)', transition: 'width 0.05s linear' }}></div>
                      </div>
                    )}
                  </div>
                  {state === 'done' && <span className="bdg bdg-active">{r[2]}</span>}
                </div>
              );
            })}
          </div>
          {done && (
            <div className="dry-run" style={{ marginTop: 14 }}>
              {I.shield}<span>Resultado:</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Cadena íntegra · 0 inconsistencias</span>
            </div>
          )}
        </div>
        <div className="modal-f">
          {!done && <button className="btn" onClick={onClose}>Detener</button>}
          {done && (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>{I.download}<span>Exportar reporte</span></button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Health Live Logs (mounts on HealthScreen) ───────────── */

const LOG_TEMPLATES = [
  ['INFO', 'tx.accepted', 'tx_$ sender=alice receiver=jose_jose'],
  ['INFO', 'peer.heartbeat', 'http://node-0$.basicchain.io:5001 alive'],
  ['DEBUG', 'mempool.scan', 'pending=3 valid=3 ttl_ok=3'],
  ['INFO', 'rate.update', 'BTC/USDT 79829.76 source=BINANCE'],
  ['INFO', 'block.relay', 'inbound block #11 from node-02'],
  ['WARN', 'rate.feed', 'Binance rate-limit · backoff 30s'],
  ['DEBUG', 'wallet.read', 'wallet=$ asset=USDT balance ok'],
  ['INFO', 'session.refresh', 'jwt rotated for user=$'],
  ['INFO', 'health.check', 'all components ok · uptime=$d'],
];

function HealthLogsLive() {
  const [logs, setLogs] = useSf(() => [
    ['INFO', '01:47:12', 'block.mined', 'height=11 nonce=482931 hash=0xa4f1...'],
    ['INFO', '01:47:08', 'consensus.resolved', 'chain unchanged · 11 blocks'],
    ['WARN', '01:42:01', 'exchange.feed', 'Binance rate-limit reached · backing off 60s'],
    ['INFO', '01:41:55', 'peer.connected', 'http://node-04...:5001 height=11'],
    ['INFO', '01:35:42', 'tx.accepted', 'tx_a1b2c3 sender=alice receiver=jose_jose'],
    ['INFO', '01:29:18', 'user.created', 'username=alice role=USER'],
    ['DEBUG', '01:23:00', 'mempool.purge', 'expired=0 invalid=0'],
  ]);
  const [paused, setPaused] = useSf(false);

  useEf(() => {
    if (paused) return;
    const id = setInterval(() => {
      const tpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      const t = new Date();
      const ts = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
      const msg = tpl[2].replace('$', Math.random().toString(36).slice(2, 6));
      setLogs(prev => [[tpl[0], ts, tpl[1], msg], ...prev].slice(0, 50));
    }, 1800 + Math.random() * 1400);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <>
      <div className="section-h">
        <span>Logs · últimos eventos</span>
        <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: paused ? 'var(--text-3)' : 'var(--success)', boxShadow: paused ? 'none' : '0 0 0 3px var(--success-soft)' }}></span>
            {paused ? 'Pausado' : 'En vivo'}
          </span>
          <button className="btn btn-sm btn-icon btn-ghost" onClick={() => setPaused(p => !p)} title={paused ? 'Reanudar' : 'Pausar'}>
            {paused ? <span style={{ fontSize: 12 }}>▶</span> : <span style={{ fontSize: 12 }}>⏸</span>}
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, fontFamily: 'var(--font-mono)', fontSize: 11, maxHeight: 320, overflowY: 'auto' }}>
        {logs.map(([lvl, t, ev, msg], i) => (
          <div key={i + t + ev} style={{ display: 'grid', gridTemplateColumns: '46px 60px 130px 1fr', gap: 8, padding: '6px 12px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 0, animation: i === 0 ? 'bulk-in 0.18s ease-out' : 'none' }}>
            <span style={{ color: lvl === 'WARN' ? 'var(--warning)' : lvl === 'ERROR' ? 'var(--danger)' : lvl === 'DEBUG' ? 'var(--text-3)' : 'var(--success)', fontWeight: 600 }}>{lvl}</span>
            <span className="muted">{t}</span>
            <span style={{ color: 'var(--accent-text)' }}>{ev}</span>
            <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Asset detail (clicked from User Portfolio) ──────────── */

function AssetDetailFlow({ data, onClose }) {
  const nav = useNav();
  const a = data.asset;
  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AssetPill asset={a.code} />
            <div>
              <h2 style={{ margin: 0 }}>{a.name}</h2>
              <p style={{ margin: 0 }}>{a.code} · {a.network || 'Red ' + a.code}</p>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        </div>
        <div className="modal-b">
          <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 14, background: 'var(--surface-2)' }}>
            <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu saldo</div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{a.balance}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>≈ {a.value} · {a.delta}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            <button className="btn" style={{ justifyContent: 'center', flexDirection: 'column', height: 64, gap: 4 }}
              onClick={() => { onClose(); nav.navigate('send'); }}>
              {I.arrowUp}<span style={{ fontSize: 11 }}>Enviar</span>
            </button>
            <button className="btn" style={{ justifyContent: 'center', flexDirection: 'column', height: 64, gap: 4 }}
              onClick={() => { onClose(); nav.openFlow('receive', { asset: a.code, address: '0xCAd…9X8Kp4' }); }}>
              {I.arrowDown}<span style={{ fontSize: 11 }}>Recibir</span>
            </button>
            <button className="btn" style={{ justifyContent: 'center', flexDirection: 'column', height: 64, gap: 4 }}
              onClick={() => { onClose(); nav.openFlow('convert', { from: a.code, to: a.code === 'USDT' ? 'BTC' : 'USDT' }); }}>
              {I.exchange}<span style={{ fontSize: 11 }}>Convertir</span>
            </button>
            <button className="btn" style={{ justifyContent: 'center', flexDirection: 'column', height: 64, gap: 4 }}
              onClick={() => { onClose(); nav.openFlow('withdraw', { asset: a.code, balance: a.balance.split(' ')[0], network: a.network || a.code }); }}>
              {I.ext}<span style={{ fontSize: 11 }}>Retirar</span>
            </button>
          </div>

          <div className="section-h">Últimos movimientos</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              ['Compra exchange', '+0.0148', 'mv-buy', I.arrowDown, 'hace 3 h'],
              ['Recibido', '+50.00', 'mv-buy', I.arrowDown, 'ayer'],
              ['Envío P2P', '-12.00', 'mv-sell', I.arrowUp, '08 may'],
            ].map((r, i, x) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < x.length - 1 ? '1px solid var(--border)' : 0, fontSize: 12.5 }}>
                <span className={`mv-ic ${r[2]}`}>{r[3]}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{r[0]}</span>
                <span className="mono">{r[1]} {a.code}</span>
                <span className="muted" style={{ fontSize: 11 }}>{r[4]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => { onClose(); nav.navigate('history'); }}>Ver historial completo</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile interactive flows (used inside <MobileApp/>) ─── */

function MobileSendConfirm({ onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 10, display: 'flex', flexDirection: 'column', animation: 'bulk-in 0.2s ease-out' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Confirmar envío</div>
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <Avatar name="Mateo Fernández" size={64} />
        <div style={{ fontWeight: 600, fontSize: 17, marginTop: 12 }}>Mateo Fernández</div>
        <div className="muted" style={{ fontSize: 12 }}>@mateo.f · verificado ✓</div>
        <div className="mono" style={{ fontSize: 36, fontWeight: 600, marginTop: 24, letterSpacing: '-0.02em' }}>120.00 cUSD</div>
        <div className="muted" style={{ fontSize: 13 }}>≈ $120.00 USD · gratis · instantáneo</div>
      </div>
      <div style={{ padding: 16 }}>
        <button className="btn btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center', fontSize: 14 }} onClick={onClose}>Confirmar envío</button>
      </div>
    </div>
  );
}

function MobileReceiveLive({ onClose }) {
  const [received, setReceived] = useSf(false);
  useEf(() => { const id = setTimeout(() => setReceived(true), 3500); return () => clearTimeout(id); }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        <div style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>Recibir cUSD</div>
      </div>
      {!received ? (
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="qr-wrap" style={{ marginBottom: 16 }}>
            <div className="qr" style={{ padding: 12 }}><FakeQR seed="mob-cUSD-jmartinez" size={200} /></div>
          </div>
          <div className="mono" style={{ fontSize: 12, padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 999, border: '1px solid var(--border)' }}>0xCAdEna…9X8Kp4</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="spinner" style={{ width: 10, height: 10 }}></span>
            Escuchando transacciones…
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'bulk-in 0.32s ease-out' }}>
          <div style={{ width: 80, height: 80, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
            {React.cloneElement(I.check, { props: { size: 40 } })}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Recibiste</div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>+50.00 cUSD</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>De Sofía Pérez</div>
        </div>
      )}
      {received && <div style={{ padding: 16 }}><button className="btn btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center' }} onClick={onClose}>Listo</button></div>}
    </div>
  );
}

Object.assign(window, { PeerActionsFlow, ValidationRunFlow, HealthLogsLive, AssetDetailFlow, MobileSendConfirm, MobileReceiveLive });
