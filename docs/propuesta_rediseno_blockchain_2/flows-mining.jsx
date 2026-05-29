// flows-mining.jsx — Mining flow and transaction detail drawer

const { useState: useSm, useEffect: useEm, useRef: useRm } = React;

/* ─── Mine Block flow (PoW animation) ─────────────────────── */

function MineBlockFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSm(0); // 0 ready, 1 mining, 2 mined
  const [nonce, setNonce] = useSm(0);
  const [hash, setHash] = useSm('');
  const [iter, setIter] = useSm(0);
  const difficulty = 4;
  const targetPrefix = '0'.repeat(difficulty);

  useEm(() => {
    if (step !== 1) return;
    let n = 0; let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      // Burn through 8 attempts per frame
      for (let i = 0; i < 8; i++) {
        n++;
        const h = (Math.random() * 16 ** 12).toString(16).padStart(12, '0');
        // Most attempts don't match; cheat to finish in ~3-4s with believable nonce
        if (n > 240 && Math.random() < 0.04) {
          const finalNonce = 100000 + Math.floor(Math.random() * 900000);
          const finalHash = targetPrefix + h.slice(difficulty);
          setNonce(finalNonce);
          setHash('0x' + finalHash + 'a8c4f9d12b3e7f1a9b2c8d77');
          setIter(n);
          setTimeout(() => setStep(2), 220);
          return;
        }
        if (i === 0) {
          setHash('0x' + h + 'a8c4f9d');
          setNonce(n);
        }
      }
      setIter(n);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [step]);

  const newBlockHeight = (window.CHAIN ? window.CHAIN[0].height : 11) + 1;

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div className="modal-h">
          <h2>{step === 2 ? 'Bloque minado' : 'Minar nuevo bloque'}</h2>
          <p>{step === 0
            ? 'Se incluirá la transacción coinbase + todas las pendientes del mempool.'
            : step === 1
            ? 'Buscando un nonce que produzca un hash con ' + difficulty + ' ceros iniciales…'
            : 'Tu bloque fue aceptado por la red y agregado a la cadena.'}</p>
        </div>

        <div className="modal-b">
          {step === 0 && (
            <>
              <div className="card" style={{ padding: 14 }}>
                {[
                  ['Próxima altura', '#' + newBlockHeight],
                  ['Previous hash', '0xa4f1...d77e'],
                  ['Transacciones a incluir', '3 del mempool + 1 coinbase = 4'],
                  ['Recompensa de bloque', '50 BTC → admin_platform'],
                  ['Fees acumulados', '$3.21'],
                  ['Dificultad', difficulty + ' (' + targetPrefix + '...)'],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 0, fontSize: 12.5 }}>
                    <span className="muted">{l}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="dry-run" style={{ marginTop: 14 }}>
                {I.info}<span>Tiempo estimado:</span>
                <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>~3-5 segundos</span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12, animation: 'bulk-in 0.4s ease-out infinite alternate' }}>⛏</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Proof of Work</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{iter.toLocaleString('en-US')} intentos · {nonce.toLocaleString('en-US')} nonce actual</div>
              </div>

              <div style={{ padding: 14, background: '#0a0a0a', color: '#86efac', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ color: '#6a6a64', marginBottom: 4 }}>$ mining... target prefix: <span style={{ color: '#ffaa00' }}>{targetPrefix}</span></div>
                <div style={{ wordBreak: 'break-all' }}>nonce: <span style={{ color: '#67e8f9' }}>{nonce.toLocaleString('en-US')}</span></div>
                <div style={{ wordBreak: 'break-all', marginTop: 4 }}>hash: <span style={{ color: '#fda4af' }}>{hash || '...'}</span></div>
              </div>

              <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>El espacio de búsqueda es 2^32 · estamos probando ~8 hashes por frame</div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  {React.cloneElement(I.check, { props: { size: 36 } })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Bloque #{newBlockHeight} minado</div>
                <div className="muted" style={{ fontSize: 13 }}>Propagando a {window.PEERS ? window.PEERS.filter(p => p.status === 'online').length : 3} peers…</div>
              </div>

              <div className="card" style={{ padding: 14, marginTop: 14 }}>
                {[
                  ['Altura', '#' + newBlockHeight],
                  ['Nonce ganador', nonce.toLocaleString('en-US')],
                  ['Hash', hash.slice(0, 26) + '…'],
                  ['Transacciones', '4 (3 + coinbase)'],
                  ['Intentos', iter.toLocaleString('en-US')],
                  ['Tiempo', '3.4 s'],
                  ['Recompensa', '50 BTC + $3.21 fees'],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                    <span className="muted">{l}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              <span style={{ display: 'inline-flex', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>⛏</span>
              <span>Empezar a minar</span>
            </button>
          </>)}
          {step === 1 && <button className="btn" onClick={onClose}>Cerrar (sigue corriendo)</button>}
          {step === 2 && (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>{I.ext}<span>Ver en explorer</span></button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Transaction detail (drawer-style modal) ─────────────── */

function TransactionDetailFlow({ data, onClose }) {
  const tx = data.tx || {};
  const status = data.status || 'completed';
  const block = data.block;
  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Detalle de transacción</h2>
            <p>{tx.id} · {status === 'pending' ? 'en mempool' : 'confirmada en bloque #' + block}</p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        </div>

        <div className="modal-b">
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>De</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{tx.sender}</div>
              </div>
              <div style={{ color: 'var(--accent)', fontSize: 18 }}>→</div>
              <div style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Para</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{tx.receiver}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }} className="mono">{tx.amount} <span style={{ fontSize: 18 }}>{tx.currency}</span></div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Fee: {tx.fee} {tx.currency}</div>
            </div>

            <div className="kvs">
              <div>Estado</div><div><span className={`bdg ${status === 'completed' ? 'bdg-active' : 'bdg-pending_kyc'}`}>{status === 'completed' ? 'Confirmada' : 'En mempool'}</span></div>
              <div>Hash</div><div className="mono" style={{ fontSize: 11 }}>{tx.id} <button className="copy-btn">{I.copy}</button></div>
              <div>Bloque</div><div className="mono">{block != null ? '#' + block : 'pendiente'}</div>
              {data.confirmedAt && (<><div>Confirmada en</div><div className="mono">{data.confirmedAt}</div></>)}
              <div>Tamaño</div><div className="mono">{tx.size} bytes</div>
              <div>Confirmaciones</div><div>{status === 'completed' ? '12 / 12' : '0 / 12'}</div>
              <div>Firma</div><div><span className="bdg bdg-active">válida ✓</span></div>
            </div>
          </div>

          <div className="section-h">Trazas</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              ['tx.created', tx.sender + ' firmó la transacción', status === 'pending' ? 'hace 2 min' : '01:46:38'],
              ['mempool.accepted', 'Validación de firma + saldo OK', status === 'pending' ? 'hace 2 min' : '01:46:39'],
              ['mempool.relayed', 'Broadcast a 4 peers', status === 'pending' ? 'hace 1 min' : '01:46:42'],
              ...(status === 'completed' ? [
                ['block.included', 'Incluida en bloque #' + block, '01:47:08'],
                ['block.confirmed', '12 confirmaciones · final', '01:48:14'],
              ] : []),
            ].map((ev, i, arr) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 10, padding: '8px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 0, fontSize: 11.5 }}>
                <span className="mono" style={{ color: 'var(--accent-text)' }}>{ev[0]}</span>
                <span style={{ color: 'var(--text-2)' }}>{ev[1]}</span>
                <span className="muted">{ev[2]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary">{I.ext}<span>Ver en explorer</span></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MineBlockFlow, TransactionDetailFlow });
