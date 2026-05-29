// flows-extra.jsx — Additional interactive flows
//   - ExchangeOrderFlow:   place an order with review + executing + filled
//   - ReceiveFlow:         live QR with payment-incoming animation
//   - WithdrawFlow:        on-chain withdraw with paste-verify + 2FA + broadcast
//   - DisputeResolutionFlow: admin resolves a P2P dispute with chat + evidence
//   - ConvertFlow:         quick swap between two assets
//   - NotificationsPanel:  popover from the topbar bell

const { useState: useSx, useEffect: useEx, useRef: useRx } = React;

/* ─── Exchange Order ──────────────────────────────────────── */

function ExchangeOrderFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSx(0); // 0 review, 1 executing, 2 filled
  const [progress, setProgress] = useSx(0);

  useEx(() => {
    if (step === 1) {
      let p = 0;
      const id = setInterval(() => {
        p += 100 / 18;
        if (p >= 100) { p = 100; clearInterval(id); setTimeout(() => setStep(2), 200); }
        setProgress(p);
      }, 60);
      return () => clearInterval(id);
    }
  }, [step]);

  const side = data.side || 'buy';
  const isBuy = side === 'buy';
  const pair = data.pair || 'BTC/USDT';
  const [base, quote] = pair.split('/');
  const price = data.price || '67,500.20';
  const amount = data.amount || '0.05000';
  const total = data.total || '3,375.01';
  const orderType = data.orderType || 'Mercado';

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-h">
          <h2>{step === 2 ? 'Orden ejecutada' : isBuy ? `Comprar ${base}` : `Vender ${base}`}</h2>
          <p>{step === 0 ? 'Revisá los detalles antes de enviar al libro.' : step === 1 ? 'Buscando contraparte en el libro de órdenes…' : 'Tu orden se ejecutó completa.'}</p>
        </div>

        <div className="modal-b">
          {step === 0 && (
            <>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AssetPill asset={base} /> → <AssetPill asset={quote} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <span className="bdg" style={{ background: isBuy ? 'var(--success-soft)' : 'var(--danger-soft)', color: isBuy ? 'var(--success)' : 'var(--danger)', border: 0 }}>
                      {isBuy ? 'Compra' : 'Venta'} · {orderType}
                    </span>
                  </div>
                </div>
                {[
                  ['Precio de mercado', price + ' ' + quote, true],
                  ['Cantidad', amount + ' ' + base, true],
                  ['Total estimado', total + ' ' + quote, true],
                  ['Comisión (0.1%)', '3.38 ' + quote, false],
                  ['Slippage máx.', '0.5%', false],
                ].map(([l, v, b], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 0, fontSize: 12.5 }}>
                    <span className="muted">{l}</span>
                    <span className="mono" style={{ fontWeight: b ? 600 : 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="dry-run" style={{ marginTop: 14 }}>
                {I.info}<span>Recibirás:</span>
                <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {isBuy ? amount + ' ' + base : (parseFloat(total.replace(',','')) - 3.38).toFixed(2) + ' ' + quote}
                </span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 50, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  <div className="spinner" style={{ width: 24, height: 24 }}></div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Ejecutando orden</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  Matched {Math.floor(progress)}% · {Math.floor(progress / 100 * 3)} contrapartes
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', margin: '0 0 8px' }}>
                <div style={{ height: '100%', width: progress + '%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.1s' }}></div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  {React.cloneElement(I.check, { props: { size: 36 } })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }} className="mono">
                  {isBuy ? '+' : '−'}{amount} {base}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>≈ ${total} {quote}</div>
              </div>
              <div className="card" style={{ padding: 14, marginTop: 14 }}>
                {[
                  ['Tipo', orderType + ' · ' + (isBuy ? 'Compra' : 'Venta')],
                  ['Precio promedio', price + ' ' + quote],
                  ['Total ejecutado', total + ' ' + quote],
                  ['Comisión', '3.38 ' + quote],
                  ['ID de orden', 'ORD-' + Math.random().toString(36).slice(2, 9).toUpperCase()],
                  ['Tiempo', '0.42 s'],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
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
            <button className="btn btn-primary"
              style={{ background: isBuy ? 'var(--success)' : 'var(--danger)', borderColor: 'transparent' }}
              onClick={() => setStep(1)}>
              Confirmar {isBuy ? 'compra' : 'venta'}
            </button>
          </>)}
          {step === 1 && (
            <button className="btn" onClick={onClose}>Cerrar (sigue corriendo)</button>
          )}
          {step === 2 && (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>Ver en historial</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Receive (live QR) ───────────────────────────────────── */

function ReceiveFlow({ data, onClose, onComplete }) {
  const [received, setReceived] = useSx(false);
  const [copied, setCopied] = useSx(false);
  const asset = data.asset || 'cUSD';
  const address = data.address || '0xCAdEna…9X8Kp4';
  const fullAddr = '0xCAdEna1234abcdef9X8Kp4z2a8b1c4d5e6f7891';

  useEx(() => {
    // Simulate incoming payment after a bit
    const id = setTimeout(() => setReceived(true), 4200);
    return () => clearTimeout(id);
  }, []);

  const copy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (received) {
    return (
      <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
        <div className="modal" style={{ width: 420 }}>
          <div className="modal-b">
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <div style={{ width: 80, height: 80, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', animation: 'bulk-in 0.32s ease-out' }}>
                {React.cloneElement(I.check, { props: { size: 40 } })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Recibiste</div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0' }} className="mono">
                +50.00 <span style={{ fontSize: 22 }}>{asset}</span>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>De <b style={{ color: 'var(--text)' }}>Sofía Pérez</b> · @sofia.p</div>
            </div>

            <div className="card" style={{ padding: 14, marginTop: 18 }}>
              {[
                ['Operación', 'TXN-' + Math.random().toString(36).slice(2, 9).toUpperCase()],
                ['Tu nuevo saldo', '1,096.68 ' + asset],
                ['Hora', new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })],
                ['Tipo', 'Envío interno · instantáneo'],
              ].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                  <span className="muted">{l}</span>
                  <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-f">
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>Ir a la wallet</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-h">
          <h2>Recibir {asset}</h2>
          <p>Compartí esta dirección o el QR para recibir transferencias.</p>
        </div>

        <div className="modal-b">
          <div style={{ textAlign: 'center' }}>
            <div className="qr-wrap" style={{ marginBottom: 14 }}>
              <div className="qr" style={{ padding: 14 }}>
                <FakeQR seed={`${asset}-${fullAddr}`} size={200} />
              </div>
              <div className="qr-logo">
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #1a1917, #3a3530)', color: '#faf9f6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>◆</div>
              </div>
            </div>

            <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Tu dirección {asset}</div>
            <div
              onClick={copy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              <span>{address}</span>
              <span style={{ color: copied ? 'var(--success)' : 'var(--accent)' }}>
                {copied ? React.cloneElement(I.check, { props: { size: 14 } }) : React.cloneElement(I.copy, { props: { size: 14 } })}
              </span>
            </div>
            {copied && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>Copiado al portapapeles</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={copy}>{I.copy}<span>{copied ? 'Copiado' : 'Copiar'}</span></button>
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }}>{I.download}<span>Compartir</span></button>
          </div>

          <div style={{ marginTop: 14, padding: 10, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12, color: 'var(--accent-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="spinner" style={{ width: 12, height: 12 }}></div>
            <span style={{ flex: 1 }}>Escuchando transacciones entrantes…</span>
            <span className="muted" style={{ fontSize: 10.5 }}>en vivo</span>
          </div>

          <div style={{ marginTop: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 11.5, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
            {React.cloneElement(I.info, { props: { size: 14 } })}
            <span>Sólo enviá <b style={{ color: 'var(--text)' }}>{asset}</b> a esta dirección en la red <b>Cadena</b>. Otros tokens podrían perderse.</span>
          </div>
        </div>

        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => setReceived(true)}>
            <span style={{ fontSize: 10.5, fontWeight: 400, marginRight: 6, color: 'rgba(250,249,246,0.65)' }}>(demo)</span>
            Simular pago entrante
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Withdraw (on-chain) ─────────────────────────────────── */

function WithdrawFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSx(0); // 0 amount+addr, 1 verify, 2 2fa, 3 broadcasting, 4 done
  const [addr, setAddr] = useSx('');
  const [pasted, setPasted] = useSx('');
  const [amount, setAmount] = useSx('250.00');
  const [otp, setOtp] = useSx(['','','','','','']);
  const [progress, setProgress] = useSx(0);
  const otpRefs = useRx([]);

  const asset = data.asset || 'USDT';
  const network = data.network || 'Ethereum (ERC-20)';
  const balance = data.balance || '24,420.50';
  const fee = '4.20';
  const expected = '0x4f1a9b2c8d77e2c0b4a1f9d8c3b5e7';

  const steps = ['Datos', 'Verificar', '2FA', 'Enviado'];

  useEx(() => {
    if (step === 3) {
      let p = 0;
      const id = setInterval(() => {
        p += 100 / 30;
        if (p >= 100) { p = 100; clearInterval(id); setTimeout(() => setStep(4), 200); }
        setProgress(p);
      }, 80);
      return () => clearInterval(id);
    }
  }, [step]);

  const addrMatches = pasted && pasted === addr;
  const otpFilled = otp.every(d => d.length === 1);

  const setOtpDigit = (i, v) => {
    if (v && !/^\d$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) otpRefs.current[i+1]?.focus();
  };

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div className="modal-h" style={{ paddingBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Retirar {asset} a una dirección externa</h2>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
          <Stepper steps={steps} current={Math.min(step, 3)} />
        </div>

        <div className="modal-b">
          {step === 0 && (<>
            <div className="warn-box">
              {I.warn}
              <div>
                <b>Los retiros on-chain son irreversibles.</b> Verificá la dirección y la red. Si te equivocás, no podemos recuperar los fondos.
              </div>
            </div>

            <div className="fld">
              <label>Red</label>
              <select defaultValue={network}>
                <option>Ethereum (ERC-20)</option>
                <option>Polygon</option>
                <option>Tron (TRC-20)</option>
                <option>Solana</option>
              </select>
            </div>

            <div className="fld">
              <label>Dirección de destino</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="mono"
                  value={addr}
                  onChange={e => setAddr(e.target.value)}
                  placeholder="0x… (pegá la dirección destino)"
                  style={{ paddingRight: 36, fontSize: 12 }}
                />
                <button className="btn btn-icon btn-ghost" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>{I.hash}</button>
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>O escaneá un QR · soportamos ENS y direcciones guardadas.</div>
            </div>

            <div className="fld">
              <label>Cantidad</label>
              <div style={{ position: 'relative' }}>
                <input className="mono" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: 18, height: 44, fontWeight: 500 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{asset}</span>
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Disponible: <b className="mono" style={{ color: 'var(--text)' }}>{balance} {asset}</b></div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {['25%','50%','75%','MÁX'].map(p => <button key={p} className="chip" style={{ height: 24, padding: '0 8px', fontSize: 11 }}>{p}</button>)}
              </div>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
              {[
                ['Recibirás', amount + ' ' + asset],
                ['Comisión de red', fee + ' ' + asset + ' (≈ $' + fee + ')'],
                ['Total debitado', (parseFloat(amount.replace(',','')) + parseFloat(fee)).toFixed(2) + ' ' + asset],
                ['Tiempo estimado', '~ 3 minutos'],
              ].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                  <span className="muted">{l}</span>
                  <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </>)}

          {step === 1 && (<>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Confirmá la dirección de destino</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Pegá de nuevo la dirección para verificarla.</div>
            </div>

            <div className="card" style={{ padding: 12, marginBottom: 14, background: 'var(--surface-2)' }}>
              <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Dirección original</div>
              <div className="mono" style={{ fontSize: 12, wordBreak: 'break-all' }}>{addr || expected}</div>
            </div>

            <div className="fld">
              <label>Pegá la dirección de nuevo</label>
              <input
                className="mono"
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                placeholder="0x…"
                style={{ fontSize: 12, borderColor: pasted ? (addrMatches ? 'var(--success)' : 'var(--danger)') : undefined }}
              />
              {pasted && (
                <div style={{ fontSize: 11.5, marginTop: 6, color: addrMatches ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {React.cloneElement(addrMatches ? I.check : I.x, { props: { size: 12 } })}
                  {addrMatches ? 'Las direcciones coinciden' : 'Las direcciones no coinciden'}
                </div>
              )}
            </div>

            <div className="warn-box" style={{ background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' }}>
              {React.cloneElement(I.shield, { props: { size: 14 } })}
              <div>Esta dirección no está en tu lista de contactos. La próxima vez podés guardarla para verificar más rápido.</div>
            </div>
          </>)}

          {step === 2 && (<>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--text)', color: 'var(--bg)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                {React.cloneElement(I.lock, { props: { size: 24 } })}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Código 2FA</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Ingresá el código de tu app autenticadora.</div>
            </div>
            <div className="otp-grid" style={{ justifyContent: 'center' }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  className={`otp-cell ${d ? 'filled' : ''}`}
                  style={{ textAlign: 'center', outline: 'none' }}
                  maxLength={1}
                  value={d}
                  onChange={e => setOtpDigit(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) otpRefs.current[i-1]?.focus(); }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>Demo · cualquier código funciona</div>
          </>)}

          {step === 3 && (<>
            <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 50, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <div className="spinner" style={{ width: 24, height: 24 }}></div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Transmitiendo a la red</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Confirmaciones: <b style={{ color: 'var(--text)' }}>{Math.floor(progress / 100 * 12)}</b> / 12
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.1s' }}></div>
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              TX hash: <span style={{ color: 'var(--text-2)' }}>0xa8c41f9d4c8b2e7…11e9</span>
            </div>
          </>)}

          {step === 4 && (<>
            <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
              <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                {React.cloneElement(I.check, { props: { size: 36 } })}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }} className="mono">−{amount} {asset}</div>
              <div className="muted" style={{ fontSize: 13 }}>Retiro completado · 12 confirmaciones</div>
            </div>
            <div className="card" style={{ padding: 14, marginTop: 14 }}>
              {[
                ['Destino', (addr || expected).slice(0, 12) + '…' + (addr || expected).slice(-6)],
                ['Red', network],
                ['Comisión', fee + ' ' + asset],
                ['Saldo restante', (parseFloat(balance.replace(',','')) - parseFloat(amount.replace(',','')) - parseFloat(fee)).toFixed(2) + ' ' + asset],
                ['TX hash', '0xa8c4…11e9'],
              ].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                  <span className="muted">{l}</span>
                  <span className="mono" style={{ fontWeight: 500, fontSize: 11.5 }}>{v}</span>
                </div>
              ))}
            </div>
          </>)}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!addr || !amount} onClick={() => setStep(1)} style={!addr || !amount ? { opacity: 0.5 } : {}}>Verificar dirección</button>
          </>)}
          {step === 1 && (<>
            <button className="btn" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" disabled={!addrMatches} onClick={() => setStep(2)} style={!addrMatches ? { opacity: 0.5 } : {}}>Continuar</button>
          </>)}
          {step === 2 && (<>
            <button className="btn" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-primary" disabled={!otpFilled} onClick={() => setStep(3)} style={!otpFilled ? { opacity: 0.5 } : {}}>Firmar y transmitir</button>
          </>)}
          {step === 3 && <button className="btn" onClick={onClose}>Cerrar (sigue corriendo)</button>}
          {step === 4 && (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>{I.ext}<span>Ver en explorador</span></button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Dispute Resolution (admin) ──────────────────────────── */

function DisputeResolutionFlow({ data, onClose, onComplete }) {
  const [decision, setDecision] = useSx(null);
  const [note, setNote] = useSx('');
  const [submitted, setSubmitted] = useSx(false);

  if (submitted) {
    const label = decision === 'buyer'  ? 'Reembolsado al comprador'
                : decision === 'seller' ? 'Liberado al vendedor'
                : decision === 'split'  ? 'Operación dividida 50/50'
                : 'Escalado a legales';
    return (
      <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
        <div className="modal" style={{ width: 460 }}>
          <div className="modal-b">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                {React.cloneElement(I.check, { props: { size: 28 } })}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Disputa resuelta</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{label} · ambas partes notificadas</div>
            </div>
          </div>
          <div className="modal-f">
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>Siguiente disputa</button>
          </div>
        </div>
      </div>
    );
  }

  const buyer = data.buyer || 'Valentina Sosa';
  const seller = data.seller || 'GauchoCripto';
  const amount = data.amount || '1,820.00';
  const asset = data.asset || 'USDT';
  const opId = data.opId || '4821';

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 760, maxHeight: '88vh' }}>
        <div className="modal-h" style={{ paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ margin: 0 }}>Disputa P2P #{opId}</h2>
                <span className="bdg" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: 0 }}>SLA: 4 min</span>
              </div>
              <p style={{ margin: 0 }}>{amount} {asset} · vía Mercado Pago · abierta hace 3h 56m</p>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
        </div>

        <div className="modal-b" style={{ paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Comprador</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={buyer} size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{buyer}</div>
                  <div className="muted" style={{ fontSize: 11 }}>L2 · 142 ops · 98.4%</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>Reclamó que <b>no recibió los USDT</b>. Adjuntó comprobante de transferencia bancaria.</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Vendedor</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={seller} size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{seller}</div>
                  <div className="muted" style={{ fontSize: 11 }}>L3 · 412 ops · 96.1%</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>Declara que <b>nunca recibió el pago</b>. Adjuntó captura de su cuenta bancaria.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Conversación</div>
              {[
                { who: 'sys', msg: 'Operación P2P-' + opId + ' iniciada · ' + amount + ' ' + asset, t: '17:42' },
                { who: 'buyer', msg: 'Hola, ya hice la transferencia de $2.27M ARS a tu CBU.', t: '17:48' },
                { who: 'seller', msg: 'No me llegó nada. ¿Cuándo la hiciste?', t: '17:58' },
                { who: 'buyer', msg: 'A las 17:46 desde Brubank. Te paso el comprobante 📎', t: '18:01' },
                { who: 'seller', msg: 'Esa transferencia no figura en mi cuenta. ¿Mandaste al CBU correcto?', t: '18:14' },
                { who: 'buyer', msg: 'Sí, copié el de tu perfil. Quiero abrir disputa.', t: '18:25' },
                { who: 'sys', msg: 'Disputa abierta · compliance notificada', t: '18:26' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.who === 'sys' ? 'center' : m.who === 'buyer' ? 'flex-start' : 'flex-end', marginBottom: 5 }}>
                  <div style={{
                    maxWidth: '78%',
                    padding: m.who === 'sys' ? '3px 8px' : '6px 10px',
                    borderRadius: m.who === 'sys' ? 999 : 10,
                    background: m.who === 'buyer' ? 'var(--surface-2)' : m.who === 'seller' ? 'var(--info-soft)' : 'transparent',
                    color: m.who === 'sys' ? 'var(--text-3)' : 'var(--text)',
                    fontSize: m.who === 'sys' ? 10.5 : 12,
                  }}>
                    {m.who !== 'sys' && (
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 1, fontWeight: 600 }}>
                        {m.who === 'buyer' ? buyer : seller} · {m.t}
                      </div>
                    )}
                    {m.msg}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Evidencia</div>
              <div className="card" style={{ padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 44, background: 'var(--surface-2)', borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600, color: 'var(--accent-text)' }}>PDF</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>Comprobante Brubank.pdf</div>
                    <div className="muted" style={{ fontSize: 10.5 }}>de comprador · 124 KB</div>
                  </div>
                  <button className="btn btn-sm btn-icon btn-ghost">{I.eye}</button>
                </div>
              </div>
              <div className="card" style={{ padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 44, background: 'var(--surface-2)', borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600, color: 'var(--info)' }}>JPG</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>Saldo cuenta seller.jpg</div>
                    <div className="muted" style={{ fontSize: 10.5 }}>de vendedor · 312 KB</div>
                  </div>
                  <button className="btn btn-sm btn-icon btn-ghost">{I.eye}</button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Análisis automático</div>
                <div className="card" style={{ padding: 10 }}>
                  {[
                    ['CBU origen → CBU declarado', 'match'],
                    ['Importe coincide', 'match'],
                    ['Concepto no menciona "crypto"', 'match'],
                    ['CBU destino existe en banco', 'warn'],
                  ].map(([l, st], i) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0, fontSize: 11 }}>
                      <span>{l}</span>
                      <span style={{ color: st === 'match' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                        {st === 'match' ? '✓' : '⚠'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Resolución (visible para ambas partes)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Justificá tu decisión…"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', minHeight: 56, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-f" style={{ flexWrap: 'wrap', gap: 6 }}>
          <button className="btn btn-danger" onClick={() => { setDecision('buyer'); setSubmitted(true); }}>{I.arrowDown}<span>Reembolsar al comprador</span></button>
          <button className="btn" onClick={() => { setDecision('seller'); setSubmitted(true); }}>{I.check}<span>Liberar al vendedor</span></button>
          <button className="btn" onClick={() => { setDecision('split'); setSubmitted(true); }}>Dividir 50/50</button>
          <div style={{ flex: 1 }}></div>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { setDecision('escalate'); setSubmitted(true); }}>{I.warn}<span>Escalar a legales</span></button>
        </div>
      </div>
    </div>
  );
}

/* ─── Convert (instant swap) ──────────────────────────────── */

function ConvertFlow({ data, onClose, onComplete }) {
  const [from, setFrom] = useSx(data.from || 'USDT');
  const [to, setTo] = useSx(data.to || 'BTC');
  const [amount, setAmount] = useSx('500');
  const [executed, setExecuted] = useSx(false);

  const rates = { 'USDT-BTC': 1/67500.20, 'BTC-USDT': 67500.20, 'USDT-ETH': 1/3450, 'ETH-USDT': 3450, 'USDT-USDC': 1, 'USDC-USDT': 1, 'BTC-ETH': 67500.20/3450, 'ETH-BTC': 3450/67500.20, 'USDT-SOL': 1/165, 'SOL-USDT': 165, 'USDT-cUSD': 1, 'cUSD-USDT': 1 };
  const r = rates[from + '-' + to] || 1;
  const out = (parseFloat(amount || '0') * r);
  const outFmt = out > 1 ? out.toFixed(4) : out.toFixed(8);

  if (executed) {
    return (
      <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
        <div className="modal" style={{ width: 420 }}>
          <div className="modal-b">
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                {React.cloneElement(I.exchange, { props: { size: 32 } })}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }} className="mono">+{outFmt} {to}</div>
              <div className="muted" style={{ fontSize: 13 }}>Conversión instantánea desde {amount} {from}</div>
            </div>
            <div className="card" style={{ padding: 14, marginTop: 14 }}>
              {[
                ['Tipo de cambio', '1 ' + from + ' = ' + (r > 1 ? r.toFixed(4) : r.toFixed(8)) + ' ' + to],
                ['Comisión', '0%'],
                ['Tiempo', 'Instantáneo'],
              ].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                  <span className="muted">{l}</span>
                  <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-f">
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>Ir a {to}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-h">
          <h2>Convertir activos</h2>
          <p>Conversión instantánea sin comisión, dentro de la plataforma.</p>
        </div>
        <div className="modal-b">
          <div className="card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Desde</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select value={from} onChange={e => setFrom(e.target.value)} style={{ border: 0, background: 'transparent', font: 'inherit', fontSize: 14, fontWeight: 600, padding: 0 }}>
                {['USDT','BTC','ETH','SOL','USDC','cUSD'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input className="mono" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1, textAlign: 'right', border: 0, font: 'inherit', fontSize: 22, fontWeight: 500, padding: 0, background: 'transparent', outline: 'none', letterSpacing: '-0.01em' }} />
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Disponible: 24,420.50 {from} · <a href="#" style={{ color: 'var(--accent-text)' }}>Usar máx</a></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-12px 0', position: 'relative', zIndex: 1 }}>
            <button
              className="btn btn-icon"
              style={{ width: 32, height: 32, borderRadius: 50, background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
              onClick={() => { const f = from; setFrom(to); setTo(f); }}
            >
              <span style={{ transform: 'rotate(90deg)', display: 'inline-flex' }}>{I.exchange}</span>
            </button>
          </div>

          <div className="card" style={{ padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>A</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select value={to} onChange={e => setTo(e.target.value)} style={{ border: 0, background: 'transparent', font: 'inherit', fontSize: 14, fontWeight: 600, padding: 0 }}>
                {['USDT','BTC','ETH','SOL','USDC','cUSD'].filter(a => a !== from).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div className="mono" style={{ flex: 1, textAlign: 'right', fontSize: 22, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>{outFmt}</div>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>≈ ${parseFloat(amount || '0').toFixed(2)} USD</div>
          </div>

          <div className="dry-run" style={{ marginTop: 14 }}>
            {I.info}<span>Tipo de cambio:</span>
            <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>1 {from} = {r > 1 ? r.toFixed(4) : r.toFixed(8)} {to}</span>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => setExecuted(true)}>Convertir {amount} {from}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Notifications Panel (inline popover) ────────────────── */

function NotificationsPanel({ onClose, role }) {
  const nav = useNav();
  const items = {
    admin: [
      { kind: 'danger', t: 'Hot USDT al 18%', d: 'Wallet corporativa cerca del piso operativo · acción requerida', when: '12 min', read: false, link: { type: 'nav', target: 'treasury' } },
      { kind: 'warn',   t: 'Disputa P2P #4821', d: 'SLA vence en 4 min · sin asignar', when: '38 min', read: false, link: { type: 'flow', target: 'dispute', data: { buyer: 'Valentina Sosa', seller: 'GauchoCripto', amount: '1,820.00', asset: 'USDT', opId: '4821' } } },
      { kind: 'info',   t: '2ª aprobación pendiente', d: 'Sergio R. firmó la distribución a 41 wallets', when: '1 h', read: false, link: { type: 'nav', target: 'treasury' } },
      { kind: 'success',t: 'Compliance al día', d: 'Cola del turno cerrada con 96.4% SLA', when: '3 h', read: true, link: { type: 'nav', target: 'compliance' } },
      { kind: 'info',   t: 'Backup semanal completado', d: 'Snapshot de datos blockchain guardado', when: '8 h', read: true, link: { type: 'nav', target: 'audit' } },
    ],
    operator: [
      { kind: 'warn',  t: 'AML alert · Mateo F.', d: 'Asignado a vos · SLA 27 min', when: '6 min', read: false, link: { type: 'flow', target: 'kyc-review', data: { user: 'Mateo Fernández', country: '🇲🇽', kind: 'AML alert', risk: 'Alto', age: '6 min' } } },
      { kind: 'info',  t: 'Nuevo KYC L2', d: 'Lucía González pidió revisión', when: '24 min', read: false, link: { type: 'flow', target: 'kyc-review', data: { user: 'Lucía González', country: '🇦🇷', kind: 'KYC L2', risk: 'Bajo', age: '24 min' } } },
      { kind: 'success',t: 'Caso resuelto', d: 'KYC de Sofía Pérez aprobado', when: '1 h', read: true, link: { type: 'nav', target: 'compliance' } },
    ],
    user: [
      { kind: 'success',t: 'Recibiste 120 cUSD', d: 'De Sofía Pérez · "Cena 🍕"', when: '12 min', read: false, link: { type: 'nav', target: 'history' } },
      { kind: 'info',  t: 'Tu compra P2P se confirmó', d: '500 USDT acreditados', when: '2 h', read: false, link: { type: 'nav', target: 'wallets' } },
      { kind: 'warn',  t: 'Verificación L3 recomendada', d: 'Estás cerca de tu límite mensual', when: '1 d', read: true, link: { type: 'nav', target: 'kyc' } },
    ],
  }[role || 'admin'];

  const handleClick = (it) => {
    onClose();
    if (it.link?.type === 'nav') nav.navigate(it.link.target);
    else if (it.link?.type === 'flow') nav.openFlow(it.link.target, it.link.data);
  };

  const colorOf = (k) => k === 'danger' ? 'var(--danger)' : k === 'warn' ? 'var(--warning)' : k === 'success' ? 'var(--success)' : 'var(--info)';

  return (
    <div
      style={{
        position: 'fixed', top: 60, right: 24, zIndex: 90,
        width: 360, maxHeight: '70vh',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        animation: 'menu-in 0.14s ease-out',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Notificaciones</div>
        <a href="#" style={{ fontSize: 11.5, color: 'var(--accent-text)', fontWeight: 500 }}
           onClick={(e) => { e.preventDefault(); nav.toast('Marcadas como leídas', 'success'); onClose(); }}>
          Marcar todas leídas
        </a>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {items.map((it, i) => (
          <div key={i}
               onClick={() => handleClick(it)}
               style={{ padding: '10px 14px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 0, display: 'flex', gap: 10, background: it.read ? 'transparent' : 'var(--surface)', cursor: 'pointer', position: 'relative', transition: 'background 0.1s' }}
               onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
               onMouseLeave={e => e.currentTarget.style.background = it.read ? 'transparent' : 'var(--surface)'}>
            {!it.read && <span style={{ position: 'absolute', top: 14, right: 12, width: 7, height: 7, borderRadius: 50, background: 'var(--accent)' }}></span>}
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'color-mix(in oklab, ' + colorOf(it.kind) + ' 18%, transparent)', color: colorOf(it.kind), display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {React.cloneElement(it.kind === 'success' ? I.check : it.kind === 'warn' ? I.warn : it.kind === 'danger' ? I.ban : I.info, { props: { size: 14 } })}
            </div>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.t}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{it.d}</div>
              <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>hace {it.when}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <a href="#" style={{ fontSize: 11.5, color: 'var(--accent-text)', fontWeight: 500 }}
           onClick={(e) => { e.preventDefault(); onClose(); nav.navigate('audit'); }}>
          Ver todas las notificaciones →
        </a>
      </div>
    </div>
  );
}

Object.assign(window, {
  ExchangeOrderFlow, ReceiveFlow, WithdrawFlow, DisputeResolutionFlow, ConvertFlow,
  NotificationsPanel,
});
