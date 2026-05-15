// flows.jsx — Interactive multi-step flows
//   - AuthFlow:         Login → 2FA → role selection → dashboard
//   - P2PBuyFlow:       5-step P2P purchase with seller chat + payment confirmation
//   - TreasuryFlow:     Dual-approval treasury distribution
//   - SendConfirmFlow:  Slide-to-confirm send between users
//   - KYCReviewFlow:    Operator KYC/AML review with docs preview + decision

const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

/* ─── small bits ─── */

function Stepper({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 50,
              display: 'grid', placeItems: 'center',
              fontSize: 11, fontWeight: 600,
              background: i < current ? 'var(--success)' : i === current ? 'var(--text)' : 'var(--surface-2)',
              color: i <= current ? '#faf9f6' : 'var(--text-3)',
              border: i === current ? '2px solid var(--text)' : '1px solid var(--border)',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: 11.5, fontWeight: i === current ? 600 : 500,
              color: i <= current ? 'var(--text)' : 'var(--text-3)',
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < current ? 'var(--success)' : 'var(--border)' }}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Auth flow ───────────────────────────────────────────── */

function AuthFlow({ onAuthed }) {
  const [step, setStep] = useStateF('login');

  if (step === 'login') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)' }}>
        <div style={{ width: '100%', height: '100%' }}>
          <LoginShell onSubmit={() => setStep('otp')} />
        </div>
      </div>
    );
  }
  if (step === 'otp') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--surface)' }}>
        <OtpShell onSubmit={onAuthed} onBack={() => setStep('login')} />
      </div>
    );
  }
  return null;
}

function LoginShell({ onSubmit }) {
  const [email, setEmail] = useStateF('admin@dropi.co');
  const [pwd, setPwd] = useStateF('Cad3na!2026');
  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-brand"><div className="mark">◆</div><span>Cadena</span></div>
        <div className="auth-form">
          <h1>Ingresar</h1>
          <p className="sub">Accedé a tu panel de la plataforma.</p>
          <div className="fld">
            <label>Email o usuario</label>
            <input value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="fld">
            <label>Contraseña <a href="#" style={{ float: 'right', fontSize: 11, color: 'var(--accent-text)', fontWeight: 500 }}>¿Olvidaste?</a></label>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
          </div>
          <label className="toggle" style={{ marginBottom: 16 }}>
            <input type="checkbox" defaultChecked /> Mantener sesión en este dispositivo
          </label>
          <button className="btn btn-primary" style={{ width: '100%', height: 36, justifyContent: 'center' }}
            onClick={onSubmit}>Continuar</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 11.5, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            <span>o</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
          </div>
          <button className="btn" style={{ width: '100%', height: 34, justifyContent: 'center' }}>
            Ingresar con SSO corporativo
          </button>
        </div>
        <div className="auth-foot"><span>© 2026 Cadena</span></div>
      </div>
      <div className="auth-right">
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Plataforma</div>
          <p className="quote">"Operaciones, cumplimiento y tesorería sobre la misma capa de datos blockchain — sin reconciliaciones manuales."</p>
        </div>
        <div className="role-card">
          <h4>Demo · podés operar como cualquier rol</h4>
          <div className="role-list">
            <div className="role-item"><span className="role-dot" style={{ background: '#a78bfa' }}></span><div><b>ADMIN</b><span>Gobierno total · tesorería + auditoría</span></div></div>
            <div className="role-item"><span className="role-dot" style={{ background: '#67e8f9' }}></span><div><b>OPERATOR</b><span>KYC, congelar, mover fondos por política</span></div></div>
            <div className="role-item"><span className="role-dot" style={{ background: '#86efac' }}></span><div><b>USER-VIEWER</b><span>Cliente final · wallets, P2P y envíos</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OtpShell({ onSubmit, onBack }) {
  const [digits, setDigits] = useStateF(['', '', '', '', '', '']);
  const inputs = useRefF([]);

  const setDigit = (i, v) => {
    if (v && !/^\d$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const filled = digits.every(d => d.length === 1);
  useEffectF(() => { if (filled) setTimeout(onSubmit, 320); }, [filled]);

  useEffectF(() => { inputs.current[0]?.focus(); }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', padding: 40, background: 'var(--surface)' }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #1a1917, #3a3833)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 13, fontWeight: 700 }}>◆</div>
          <span style={{ fontWeight: 600 }}>Cadena</span>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
          {React.cloneElement(I.lock, { props: { size: 20 } })}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 6px' }}>Verificá tu identidad</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13.5, margin: '0 0 24px', lineHeight: 1.5 }}>
          Ingresá el código de 6 dígitos de tu app autenticadora.
          <span className="muted" style={{ fontSize: 11.5, display: 'block', marginTop: 4 }}>Demo · cualquier código funciona</span>
        </p>
        <div className="otp-grid">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              className={`otp-cell ${d ? 'filled' : ''}`}
              style={{ textAlign: 'center', outline: 'none' }}
              maxLength={1}
              value={d}
              onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !d && i > 0) inputs.current[i-1]?.focus();
              }}
            />
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', height: 38, justifyContent: 'center', fontSize: 13 }}
          disabled={!filled}
          onClick={onSubmit}>{filled ? 'Verificar y entrar' : `Ingresá ${6 - digits.filter(Boolean).length} dígitos más`}</button>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: 'var(--accent-text)', fontWeight: 500 }}>← Volver</a>
          <span>Reintentar en 0:42</span>
        </div>
        <div style={{ marginTop: 28, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
          {React.cloneElement(I.shield, { props: { size: 14 } })}
          <span>Conexión protegida desde <span className="mono" style={{ color: 'var(--text)' }}>200.45.183.112</span> · Buenos Aires, AR</span>
        </div>
      </div>
    </div>
  );
}

/* ─── P2P Buy Flow ────────────────────────────────────────── */

function P2PBuyFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useStateF(0);
  const [amount, setAmount] = useStateF('500.00');
  const [method, setMethod] = useStateF(data.offer.methods[0]);

  const offer = data.offer;
  const arsTotal = (parseFloat(amount.replace(',', '')) * parseFloat(offer.price.replace(',', ''))).toFixed(2);

  const steps = ['Monto', 'Pagar', 'Esperar', 'Recibido'];

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-h" style={{ paddingBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Comprar {offer.asset}</h2>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
          <Stepper steps={steps} current={step} />
        </div>

        <div className="modal-b" style={{ paddingTop: 4 }}>
          {step === 0 && (
            <>
              <div className="card" style={{ padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={offer.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{offer.name} {offer.verified && <span style={{ color: 'var(--success)', fontSize: 11, marginLeft: 4 }}>● verificado</span>}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{offer.completed.toLocaleString('es-AR')} operaciones · {offer.rate}% completadas · tiempo medio 4 min</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>${offer.price}</div>
                    <div className="muted" style={{ fontSize: 10.5 }}>ARS / {offer.asset}</div>
                  </div>
                </div>
              </div>

              <div className="fld">
                <label>Quiero comprar</label>
                <div style={{ position: 'relative' }}>
                  <input className="mono" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: 18, height: 44, fontWeight: 500 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{offer.asset}</span>
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Pagás aproximadamente <b className="mono" style={{ color: 'var(--text)' }}>${arsTotal}</b> ARS · Límite del vendedor: {offer.limit} {offer.asset}</div>
              </div>

              <div className="fld">
                <label>Método de pago</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {offer.methods.map(m => (
                    <button key={m} className={`chip ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="warn-box" style={{ background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' }}>
                {React.cloneElement(I.shield, { props: { size: 14 } })}
                <div>Tus fondos quedan bloqueados en escrow. Si el vendedor no libera, podés abrir una disputa con compliance.</div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tenés que transferir</div>
                <div className="mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>${arsTotal}</div>
                <div className="muted" style={{ fontSize: 12 }}>ARS · vía {method}</div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Datos del vendedor</div>
                {[
                  ['Nombre', offer.name + ' (verificado)'],
                  ['CBU / CVU', '0000003100099876543210'],
                  ['Alias', 'cripto.maria.usdt'],
                  ['Concepto', 'P2P-' + Math.random().toString(36).slice(2, 8).toUpperCase()],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="muted" style={{ fontSize: 12 }}>{l}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {v}
                      <button className="copy-btn">{I.copy}</button>
                    </span>
                  </div>
                ))}
              </div>

              <div className="warn-box" style={{ marginTop: 14 }}>
                {I.warn}
                <div>Transferí <b>desde una cuenta a tu nombre</b>. No incluyas referencias a cripto en el motivo. Después tocá "Marcar pago realizado".</div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', padding: '12px 0 18px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 50, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  <div className="spinner" style={{ width: 24, height: 24 }}></div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Esperando confirmación del vendedor</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{offer.name} tiene hasta <b style={{ color: 'var(--text)' }}>15 minutos</b> para confirmar tu pago y liberar los {offer.asset}.</div>
              </div>

              <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Chat con vendedor</div>
                {[
                  { who: 'sys', msg: 'Operación iniciada · ' + amount + ' ' + offer.asset, t: 'hace 2 min' },
                  { who: 'you', msg: 'Hola, ya hice la transferencia.', t: 'hace 1 min' },
                  { who: 'them', msg: '¡Recibido! Te libero ahora mismo 👍', t: 'hace 12 s' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.who === 'you' ? 'flex-end' : m.who === 'sys' ? 'center' : 'flex-start', marginBottom: 6 }}>
                    <div style={{
                      maxWidth: '75%',
                      padding: '6px 10px',
                      borderRadius: m.who === 'sys' ? 999 : 12,
                      background: m.who === 'you' ? 'var(--accent)' : m.who === 'them' ? 'var(--surface)' : 'transparent',
                      color: m.who === 'you' ? '#fff' : 'var(--text)',
                      fontSize: 12,
                      border: m.who === 'them' ? '1px solid var(--border)' : 0,
                    }}>
                      {m.who === 'sys' ? <span className="muted" style={{ fontSize: 10.5 }}>{m.msg}</span> : m.msg}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                <input placeholder="Escribir mensaje…" style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, font: 'inherit' }} />
                <button className="btn btn-sm">Enviar</button>
              </div>

              <div style={{ marginTop: 14, padding: 10, fontSize: 11.5, color: 'var(--danger)', textAlign: 'center' }}>
                <a href="#" style={{ color: 'inherit' }}>Abrir disputa con compliance →</a>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                  {React.cloneElement(I.check, { props: { size: 36 } })}
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>¡Recibiste {amount} {offer.asset}!</div>
                <div className="muted" style={{ fontSize: 13 }}>El vendedor liberó los fondos · operación P2P-481928</div>
              </div>

              <div className="card" style={{ padding: 14, marginTop: 18 }}>
                {[
                  ['Recibido en wallet', amount + ' ' + offer.asset + ' (≈ $' + amount + ' USD)'],
                  ['Pagaste', '$' + arsTotal + ' ARS vía ' + method],
                  ['Tipo de cambio', '1 ' + offer.asset + ' = ' + offer.price + ' ARS'],
                  ['Vendedor', offer.name],
                  ['Comisión', 'Gratis'],
                  ['Tiempo total', '3 min 24 s'],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 0 }}>
                    <span className="muted" style={{ fontSize: 12 }}>{l}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setStep(1)}>Continuar al pago</button>
          </>)}
          {step === 1 && (<>
            <button className="btn" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Marcar pago realizado</button>
          </>)}
          {step === 2 && (<>
            <button className="btn" onClick={onClose}>Minimizar</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              <span className="muted" style={{ fontSize: 10.5, fontWeight: 400, marginRight: 6, color: 'rgba(250,249,246,0.65)' }}>(demo)</span>
              Simular liberación del vendedor
            </button>
          </>)}
          {step === 3 && (<>
            <button className="btn" onClick={() => { onComplete && onComplete({ amount, asset: offer.asset }); onClose(); }}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete({ amount, asset: offer.asset }); onClose(); }}>Ir a mi wallet</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Treasury dual-approval ──────────────────────────────── */

function TreasuryApprovalFlow({ data, onClose, onComplete, currentAdmin = 'admin@dropi.co' }) {
  const [step, setStep] = useStateF(0); // 0 review, 1 sign, 2 waiting, 3 executing, 4 done
  const [pwd, setPwd] = useStateF('');
  const [approver2Signed, setApprover2Signed] = useStateF(false);
  const [progress, setProgress] = useStateF(0);

  const steps = ['Revisar', 'Firmar', '2ª aprobación', 'Ejecutado'];

  useEffectF(() => {
    if (step === 3) {
      let p = 0;
      const id = setInterval(() => {
        p += 100 / 25;
        if (p >= 100) { p = 100; clearInterval(id); setStep(4); }
        setProgress(p);
      }, 80);
      return () => clearInterval(id);
    }
  }, [step]);

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 600 }}>
        <div className="modal-h" style={{ paddingBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2>Distribución de tesorería</h2>
              <p>Requiere doble aprobación (2 de 5 administradores).</p>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
          <Stepper steps={steps} current={Math.min(step, 3)} />
        </div>

        <div className="modal-b" style={{ paddingTop: 4 }}>
          {step === 0 && (
            <>
              <div className="card" style={{ padding: 14 }}>
                {[
                  ['Operación', 'Distribución a usuarios (lote)'],
                  ['Origen', data.source + ' · 4.8M disponible'],
                  ['Destino', data.destination],
                  ['Monto total', data.amount + ' ' + data.asset],
                  ['Por wallet', data.perWallet + ' ' + data.asset],
                  ['Valor USD', '≈ $' + data.amount + ' USD'],
                  ['Solicitante', currentAdmin],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 0, fontSize: 12.5 }}>
                    <span className="muted">{l}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="warn-box" style={{ marginTop: 14, background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' }}>
                {React.cloneElement(I.shield, { props: { size: 14 } })}
                <div>
                  <b>Política de aprobación dual.</b> Esta operación va a la cola hasta que un segundo administrador firme. Si nadie firma en 24 h, expira.
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--text)', color: 'var(--bg)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  {React.cloneElement(I.lock, { props: { size: 24 } })}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Firmá la operación</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Ingresá tu clave de transacción + código del autenticador.</div>
              </div>
              <div className="fld">
                <label>Clave de transacción</label>
                <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••••" autoFocus />
              </div>
              <div className="fld">
                <label>Código 2FA</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['4','9','2','7','1','3'].map((d, i) => <div key={i} className="otp-cell" style={{ width: 40, height: 44, fontSize: 18 }}>{d}</div>)}
                </div>
              </div>
            </>
          )}

          {(step === 2 || step === 3) && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 50, background: approver2Signed ? 'var(--success-soft)' : 'var(--warning-soft)', color: approver2Signed ? 'var(--success)' : 'var(--warning)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  {approver2Signed
                    ? React.cloneElement(I.check, { props: { size: 24 } })
                    : <div className="spinner" style={{ width: 22, height: 22 }}></div>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {step === 3 ? 'Ejecutando en blockchain…' : approver2Signed ? 'Ambas firmas listas' : 'Esperando 2ª aprobación'}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {step === 3 ? 'Emitiendo a 41 wallets · podés cerrar este modal' :
                   approver2Signed ? 'Tocá "Ejecutar ahora" para emitir' :
                   'Sergio R. y Daniela K. están en línea'}
                </div>
              </div>

              <div className="card" style={{ padding: 0 }}>
                {[
                  { name: 'María Acosta', email: currentAdmin, status: 'signed', when: 'hace 8 s', me: true },
                  { name: 'Sergio Romero', email: 'sergio@dropi.co', status: approver2Signed ? 'signed' : 'pending', when: approver2Signed ? 'hace 2 s' : 'en línea · pendiente' },
                  { name: 'Daniela Kim', email: 'daniela@dropi.co', status: 'idle', when: 'en línea' },
                  { name: 'Pablo Iturri', email: 'pablo@dropi.co', status: 'idle', when: 'offline' },
                  { name: 'Renata Vega', email: 'renata@dropi.co', status: 'idle', when: 'offline' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderBottom: i < 4 ? '1px solid var(--border)' : 0 }}>
                    <Avatar name={a.name} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name} {a.me && <span className="muted" style={{ fontWeight: 400 }}>(vos)</span>}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>{a.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`bdg ${a.status === 'signed' ? 'bdg-active' : a.status === 'pending' ? 'bdg-pending_kyc' : 'bdg-deleted'}`}>
                        {a.status === 'signed' ? 'Firmado' : a.status === 'pending' ? 'Notificado' : '—'}
                      </span>
                      <div className="muted" style={{ fontSize: 10.5, marginTop: 3 }}>{a.when}</div>
                    </div>
                  </div>
                ))}
              </div>

              {step === 3 && (
                <div style={{ marginTop: 14 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Confirmaciones blockchain · {Math.floor(progress / 100 * 12)}/12</span>
                    <span>{Math.floor(progress)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: progress + '%', background: 'var(--success)', borderRadius: 3, transition: 'width 0.1s' }}></div>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                  {React.cloneElement(I.check, { props: { size: 36 } })}
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>Operación ejecutada</div>
                <div className="muted" style={{ fontSize: 13 }}>41 wallets recibieron {data.perWallet} {data.asset} · TX 0x4f1a…d77e</div>
              </div>

              <div className="card" style={{ padding: 14, marginTop: 14 }}>
                {[
                  ['Wallets impactadas', '41'],
                  ['Total emitido', data.amount + ' ' + data.asset],
                  ['Comisión de red', '0.0021 ETH ≈ $7.25'],
                  ['Firmas', 'María A. · Sergio R.'],
                  ['Hash de aprobación', '0xa8c4…11e9'],
                  ['Anclado en auditoría', '✓ inmutable'],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 0, fontSize: 12.5 }}>
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
            <button className="btn btn-primary" onClick={() => setStep(1)}>Firmar y enviar</button>
          </>)}
          {step === 1 && (<>
            <button className="btn" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" disabled={!pwd} onClick={() => setStep(2)}>Firmar operación</button>
          </>)}
          {step === 2 && (<>
            <button className="btn" onClick={onClose}>Cerrar (queda en cola)</button>
            {!approver2Signed ? (
              <button className="btn btn-primary" onClick={() => setApprover2Signed(true)}>
                <span style={{ fontSize: 10.5, fontWeight: 400, marginRight: 6, color: 'rgba(250,249,246,0.65)' }}>(demo)</span>
                Simular firma de Sergio
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setStep(3)}>Ejecutar ahora</button>
            )}
          </>)}
          {step === 3 && (
            <button className="btn" onClick={onClose}>Cerrar (sigue corriendo)</button>
          )}
          {step === 4 && (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>Ver en auditoría</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Send confirm flow (slide to confirm) ────────────────── */

function SendConfirmFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useStateF(0); // 0 review, 1 success
  const [drag, setDrag] = useStateF(0);
  const trackRef = useRefF(null);
  const dragging = useRefF(false);

  const onDown = (e) => {
    dragging.current = true;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging.current || !trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let pct = (clientX - r.left - 24) / (r.width - 48);
    pct = Math.max(0, Math.min(1, pct));
    setDrag(pct);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (drag > 0.92) {
      setDrag(1);
      setTimeout(() => setStep(1), 200);
    } else {
      setDrag(0);
    }
  };

  useEffectF(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  });

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-h">
          <h2>{step === 0 ? 'Confirmar envío' : '¡Enviado!'}</h2>
          <p>{step === 0 ? 'Revisá los datos. Los envíos internos no son reversibles.' : 'El destinatario ya tiene los fondos.'}</p>
        </div>
        <div className="modal-b">
          {step === 0 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <Avatar name={data.to} size={48} />
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{data.to}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{data.handle} · verificado ✓</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                {[
                  ['Monto', data.amount + ' ' + data.asset],
                  ['Valor USD', '≈ $' + data.amount + ' USD'],
                  ['Comisión', 'Gratis'],
                  ['Tiempo estimado', 'Instantáneo'],
                  ['Nota', data.note || '—'],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 0, fontSize: 12.5 }}>
                    <span className="muted">{l}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div
                ref={trackRef}
                style={{ marginTop: 18, position: 'relative', height: 48, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(90deg, var(--success) 0%, var(--success) ${drag * 100}%, transparent ${drag * 100}%)`,
                  opacity: 0.18,
                  transition: dragging.current ? 'none' : 'all 0.2s',
                }}></div>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 600, color: drag > 0.5 ? 'var(--success)' : 'var(--text-2)' }}>
                  Deslizá para confirmar →
                </div>
                <div
                  onMouseDown={onDown}
                  onTouchStart={onDown}
                  style={{
                    position: 'absolute', top: 4, left: 4 + drag * (trackRef.current ? trackRef.current.clientWidth - 48 - 8 : 320),
                    width: 40, height: 40, borderRadius: 50,
                    background: drag > 0.92 ? 'var(--success)' : 'var(--text)',
                    color: '#faf9f6',
                    display: 'grid', placeItems: 'center',
                    cursor: 'grab',
                    transition: dragging.current ? 'background 0.1s' : 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >{React.cloneElement(I.chev, { props: { size: 16 } })}</div>
              </div>
              <div className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                o tocá el botón para confirmar
              </div>
            </>
          )}

          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                {React.cloneElement(I.check, { props: { size: 36 } })}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }} className="mono">−{data.amount} {data.asset}</div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>{data.to} recibió tu envío</div>

              <div className="card" style={{ padding: 14, textAlign: 'left' }}>
                {[
                  ['Operación', 'TXN-' + Math.random().toString(36).slice(2, 9).toUpperCase()],
                  ['Hora', new Date().toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
                  ['Tu saldo restante', (1046.68 - parseFloat(data.amount)).toFixed(2) + ' ' + data.asset],
                ].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                    <span className="muted">{l}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-f">
          {step === 0 ? (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary"
              onClick={() => { setDrag(1); setTimeout(() => setStep(1), 200); }}>
              Confirmar y enviar
            </button>
          </>) : (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>{I.download}<span>Compartir recibo</span></button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── KYC Review (operator) ───────────────────────────────── */

function KYCReviewFlow({ data, onClose, onComplete }) {
  const [decision, setDecision] = useStateF(null);
  const [note, setNote] = useStateF('');
  const [submitted, setSubmitted] = useStateF(false);

  if (submitted) {
    return (
      <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
        <div className="modal" style={{ width: 420 }}>
          <div className="modal-b">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 50, background: decision === 'reject' ? 'var(--danger-soft)' : 'var(--success-soft)', color: decision === 'reject' ? 'var(--danger)' : 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                {React.cloneElement(I.check, { props: { size: 28 } })}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                Caso {decision === 'approve' ? 'aprobado' : decision === 'reject' ? 'rechazado' : 'enviado para reenvío'}
              </div>
              <div className="muted" style={{ fontSize: 12.5 }}>Resuelto en 1m 24s · siguiente caso disponible en cola.</div>
            </div>
          </div>
          <div className="modal-f">
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(); onClose(); }}>Siguiente caso</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 720 }}>
        <div className="modal-h" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Avatar name={data.user} size={36} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{data.user} <span style={{ fontSize: 14, fontWeight: 400 }}>{data.country}</span></div>
                <div className="muted" style={{ fontSize: 12 }}>{data.kind} · hace {data.age}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5 }}>
              <span className="bdg" style={{ background: data.risk === 'Crítico' ? 'var(--danger-soft)' : data.risk === 'Alto' ? 'var(--warning-soft)' : 'var(--success-soft)', color: data.risk === 'Crítico' ? 'var(--danger)' : data.risk === 'Alto' ? 'var(--warning)' : 'var(--success)', border: 0 }}>Riesgo {data.risk}</span>
              <span className="muted">SLA en 3h 12m</span>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        </div>

        <div className="modal-b" style={{ paddingTop: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Documento de identidad</div>
              <div style={{ aspectRatio: '1.6', background: 'linear-gradient(135deg, #1a3a6e 0%, #2456e6 100%)', borderRadius: 8, padding: 16, color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', opacity: 0.7 }}>REPÚBLICA ARGENTINA</div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>DOCUMENTO NACIONAL DE IDENTIDAD</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                  <div style={{ width: 60, height: 80, background: 'rgba(255,255,255,0.18)', borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 9, opacity: 0.6 }}>FOTO</div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.7 }}>
                    <div><span style={{ opacity: 0.6 }}>Apellido</span></div>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{data.user.split(' ').slice(-1)[0].toUpperCase()}</div>
                    <div><span style={{ opacity: 0.6 }}>Nombre</span></div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{data.user.split(' ')[0].toUpperCase()}</div>
                  </div>
                </div>
                <div className="mono" style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 11, letterSpacing: '0.04em' }}>34.281.749</div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>{I.eye}<span>Ampliar</span></button>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Frente</button>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Reverso</button>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Selfie</button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Verificación automática</div>
              <div className="card" style={{ padding: 12 }}>
                {[
                  ['OCR coincide con DB', 'pass'],
                  ['Liveness selfie', 'pass'],
                  ['Match facial 94.2%', 'pass'],
                  ['Lista OFAC', data.kind === 'Sanciones OFAC' ? 'fail' : 'pass'],
                  ['Lista PEP', 'pass'],
                  ['Riesgo geográfico', 'warn'],
                  ['Patrón de operación', data.kind === 'AML alert' ? 'fail' : 'pass'],
                ].map(([l, st], i) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                    <span>{l}</span>
                    <span className={`bdg bdg-${st === 'pass' ? 'active' : st === 'warn' ? 'pending_kyc' : 'banned'}`} style={{ fontSize: 10 }}>
                      {st === 'pass' ? '✓' : st === 'warn' ? '⚠' : '✕'} {st === 'pass' ? 'OK' : st === 'warn' ? 'Atención' : 'Falló'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Nota interna</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Visible para el equipo de compliance…"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', minHeight: 70, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-f">
          <button className="btn btn-danger" onClick={() => { setDecision('reject'); setSubmitted(true); }}>{I.x}<span>Rechazar</span></button>
          <button className="btn" onClick={() => { setDecision('request'); setSubmitted(true); }}>{I.refresh}<span>Pedir reenvío</span></button>
          <div style={{ flex: 1 }}></div>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { setDecision('approve'); setSubmitted(true); }}>{I.check}<span>Aprobar</span></button>
        </div>
      </div>
    </div>
  );
}

/* ─── Router ──────────────────────────────────────────────── */

function FlowRouter({ flow, onClose, onComplete }) {
  if (!flow) return null;
  if (flow.type === 'p2p-buy') return <P2PBuyFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'treasury-approval') return <TreasuryApprovalFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'send-confirm') return <SendConfirmFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'kyc-review') return <KYCReviewFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  // Extra flows (defined in flows-extra.jsx)
  if (flow.type === 'exchange-order' && window.ExchangeOrderFlow) return <window.ExchangeOrderFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'receive' && window.ReceiveFlow) return <window.ReceiveFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'withdraw' && window.WithdrawFlow) return <window.WithdrawFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'dispute' && window.DisputeResolutionFlow) return <window.DisputeResolutionFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'convert' && window.ConvertFlow) return <window.ConvertFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'mine-block' && window.MineBlockFlow) return <window.MineBlockFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  if (flow.type === 'tx-detail' && window.TransactionDetailFlow) return <window.TransactionDetailFlow data={flow.data} onClose={onClose} onComplete={onComplete} />;
  return null;
}

Object.assign(window, { AuthFlow, P2PBuyFlow, TreasuryApprovalFlow, SendConfirmFlow, KYCReviewFlow, FlowRouter, Stepper });
