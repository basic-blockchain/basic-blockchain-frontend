// flows-onboarding.jsx — Wallet creation, user creation, permissions, 2FA setup
//
// WalletCreateFlow:   choose asset → reveal seed → verify 3 words → done
// CreateUserFlow:     identity → role+KYC → permissions → invite
// PermissionsFlow:    grouped toggles per category (mint/treasury/compliance...)
// TwoFASetupFlow:     method → scan QR + manual key → verify → backup codes
//
// All modals use the standard .modal-scrim/.modal pattern from styles.css so
// they render correctly in both light and dark themes (the original Vue impl
// of the seed-phrase modal had a transparency bug in light mode).

const { useState: useSo, useEffect: useEo, useRef: useRo } = React;

/* ─── BIP39-like word pool (subset, demo) ─────────────────── */

const BIP39_DEMO = [
  'abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse',
  'access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act',
  'action','actor','actress','actual','adapt','add','addict','address','adjust','admit',
  'adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent',
  'agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert',
];

const genSeed = (n = 12) => {
  const r = () => BIP39_DEMO[Math.floor(Math.random() * BIP39_DEMO.length)];
  return Array.from({ length: n }, r);
};

/* ─── Permission catalog ──────────────────────────────────── */

const PERMISSIONS = [
  { group: 'Tokens', items: [
    { code: 'MINT', label: 'Acuñar tokens (mint)', desc: 'Emitir nuevos tokens a wallets desde la autoridad de mint', risk: 'high' },
    { code: 'BURN', label: 'Quemar tokens', desc: 'Reducir suministro circulante', risk: 'high' },
  ]},
  { group: 'Transacciones', items: [
    { code: 'APPROVE_TX', label: 'Aprobar transacciones', desc: 'Firmar como segundo aprobador en operaciones que requieren dual sign', risk: 'high' },
    { code: 'REJECT_TX', label: 'Rechazar transacciones', desc: 'Bloquear operaciones pendientes en compliance', risk: 'med' },
    { code: 'EXPORT_TX', label: 'Exportar transacciones', desc: 'Descargar historial completo en CSV/JSON', risk: 'low' },
  ]},
  { group: 'Usuarios y wallets', items: [
    { code: 'USER_MANAGE', label: 'Gestionar usuarios', desc: 'Crear, editar y eliminar cuentas', risk: 'med' },
    { code: 'WALLET_FREEZE', label: 'Congelar wallets', desc: 'Bloquear operativa de cualquier wallet', risk: 'med' },
    { code: 'WALLET_UNFREEZE', label: 'Descongelar wallets', desc: 'Reactivar wallets congeladas', risk: 'med' },
  ]},
  { group: 'Compliance', items: [
    { code: 'KYC_REVIEW', label: 'Revisar KYC', desc: 'Aprobar o rechazar verificaciones de identidad', risk: 'med' },
    { code: 'AML_INVESTIGATE', label: 'Investigar AML', desc: 'Acceso a la cola de alertas y bloqueos', risk: 'med' },
    { code: 'P2P_DISPUTE', label: 'Resolver disputas P2P', desc: 'Decidir disputas entre comprador y vendedor', risk: 'med' },
  ]},
  { group: 'Tesorería', items: [
    { code: 'TREASURY_VIEW', label: 'Ver tesorería', desc: 'Acceso a wallets corporativas (solo lectura)', risk: 'low' },
    { code: 'TREASURY_MANAGE', label: 'Gestionar tesorería', desc: 'Proponer distribuciones, requiere aprobación dual', risk: 'high' },
  ]},
  { group: 'Sistema', items: [
    { code: 'PEER_MANAGE', label: 'Administrar nodos', desc: 'Agregar/eliminar peers y forzar consenso', risk: 'med' },
    { code: 'CONFIG_EDIT', label: 'Editar configuración', desc: 'Cambiar ajustes globales de la plataforma', risk: 'high' },
    { code: 'AUDIT_VIEW', label: 'Ver auditoría', desc: 'Acceso al log inmutable de eventos', risk: 'low' },
  ]},
];

const DEFAULT_PERMS_BY_ROLE = {
  ADMIN:    ['MINT','BURN','APPROVE_TX','REJECT_TX','EXPORT_TX','USER_MANAGE','WALLET_FREEZE','WALLET_UNFREEZE','KYC_REVIEW','AML_INVESTIGATE','P2P_DISPUTE','TREASURY_VIEW','TREASURY_MANAGE','PEER_MANAGE','CONFIG_EDIT','AUDIT_VIEW'],
  OPERATOR: ['APPROVE_TX','REJECT_TX','EXPORT_TX','WALLET_FREEZE','WALLET_UNFREEZE','KYC_REVIEW','AML_INVESTIGATE','P2P_DISPUTE','TREASURY_VIEW','AUDIT_VIEW'],
  VIEWER:   [],
};

/* ─── Wallet Create Flow ──────────────────────────────────── */

function WalletCreateFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSo(0); // 0 asset, 1 reveal, 2 verify, 3 done
  const [asset, setAsset] = useSo(data?.asset || 'NATIVE');
  const [label, setLabel] = useSo('');
  const [seed] = useSo(() => genSeed(12));
  const [revealed, setRevealed] = useSo(false);
  const [acknowledged, setAcknowledged] = useSo(false);
  const [copied, setCopied] = useSo(false);

  // Verify: pick 3 random positions to challenge
  const [challenge] = useSo(() => {
    const pos = new Set();
    while (pos.size < 3) pos.add(Math.floor(Math.random() * 12));
    return [...pos].sort((a, b) => a - b);
  });
  const [answers, setAnswers] = useSo(['', '', '']);
  const correct = answers.every((a, i) => a.trim().toLowerCase() === seed[challenge[i]]);

  const address = '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

  const ASSETS = [
    { code: 'NATIVE', name: 'Native', desc: 'Token nativo de la plataforma', recommended: true },
    { code: 'BTC',    name: 'Bitcoin', desc: 'Red Bitcoin' },
    { code: 'ETH',    name: 'Ether',   desc: 'Red Ethereum' },
    { code: 'USDT',   name: 'Tether',  desc: 'Stablecoin · Ethereum' },
    { code: 'USDC',   name: 'USD Coin','desc': 'Stablecoin · Ethereum' },
    { code: 'SOL',    name: 'Solana',  desc: 'Red Solana' },
  ];

  const steps = ['Activo', 'Frase semilla', 'Verificar', 'Listo'];

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && step < 3 && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-h" style={{ paddingBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>{step === 3 ? '¡Wallet creada!' : 'Crear nueva wallet'}</h2>
              <p>{step === 0 ? 'Elegí el activo · cada wallet maneja un solo tipo.'
                : step === 1 ? 'Anotá esta frase ahora. No se vuelve a mostrar.'
                : step === 2 ? 'Confirmá tu frase escribiendo las palabras pedidas.'
                : 'Tu wallet está lista para recibir fondos.'}</p>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose} disabled={step === 3 && !acknowledged}>{I.close}</button>
          </div>
          <Stepper steps={steps} current={step} />
        </div>

        <div className="modal-b">
          {step === 0 && (
            <>
              <div className="fld"><label>Etiqueta (opcional)</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: ahorros, gastos diarios…" />
              </div>
              <div className="fld"><label>Activo</label></div>
              <div className="card" style={{ padding: 0 }}>
                {ASSETS.map((a, i, arr) => (
                  <label key={a.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer', background: asset === a.code ? 'var(--accent-soft)' : 'transparent' }}>
                    <input type="radio" name="asset" checked={asset === a.code} onChange={() => setAsset(a.code)} style={{ accentColor: 'var(--accent)' }} />
                    <AssetPill asset={a.code === 'NATIVE' ? 'cUSD' : a.code} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name} {a.recommended && <span className="bdg bdg-active" style={{ marginLeft: 6, fontSize: 10 }}>recomendado</span>}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{a.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="warn-box">
                {I.warn}
                <div>
                  <b>Esta es la única vez</b> que vas a ver esta frase de 12 palabras. Si la perdés, no podrás firmar transferencias desde esta wallet. <b>Nunca la compartas con nadie.</b>
                </div>
              </div>

              <div style={{ position: 'relative', marginTop: 4 }}>
                <div className="card" style={{ padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12.5, filter: revealed ? 'none' : 'blur(8px)', transition: 'filter 0.2s' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
                    {seed.map((w, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span className="muted" style={{ fontSize: 10.5, minWidth: 18, textAlign: 'right' }}>{i + 1}</span>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {!revealed && (
                  <button className="btn btn-primary" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    onClick={() => setRevealed(true)}>
                    {React.cloneElement(I.eye, { props: { size: 14 } })}<span>Mostrar frase</span>
                  </button>
                )}
              </div>

              {revealed && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { navigator.clipboard?.writeText(seed.join(' ')); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
                    {copied ? I.check : I.copy}<span>{copied ? 'Copiada' : 'Copiar al portapapeles'}</span>
                  </button>
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    {I.download}<span>Descargar archivo</span>
                  </button>
                </div>
              )}

              <label className="toggle" style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
                <span style={{ fontSize: 12.5 }}>Anoté la frase y la guardé en un lugar seguro</span>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 0 }}>Esto confirma que copiaste bien la frase.</p>
              {challenge.map((pos, i) => (
                <div className="fld" key={i}>
                  <label>Palabra <span className="mono" style={{ color: 'var(--text)' }}>#{pos + 1}</span></label>
                  <input
                    value={answers[i]}
                    onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? e.target.value : a))}
                    placeholder="..."
                    className="mono"
                    autoFocus={i === 0}
                  />
                </div>
              ))}
              {answers.every(a => a.length > 0) && (
                <div className="dry-run" style={{ marginTop: 4 }}>
                  {correct ? React.cloneElement(I.check, { props: { size: 14 } }) : React.cloneElement(I.warn, { props: { size: 14 } })}
                  <span style={{ color: correct ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                    {correct ? 'Las 3 palabras coinciden' : 'Una o más palabras no coinciden'}
                  </span>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  {React.cloneElement(I.check, { props: { size: 36 } })}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Wallet {asset} creada</div>
                {label && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>"{label}"</div>}
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Tu dirección</div>
                <div className="mono" style={{ fontSize: 11.5, wordBreak: 'break-all', padding: 10, background: 'var(--surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>{address}</span>
                  <button className="copy-btn" style={{ color: 'var(--accent)' }}>{I.copy}</button>
                </div>
              </div>

              <div className="dry-run" style={{ marginTop: 14 }}>
                {I.info}<span>Próximo paso:</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>Recibí tu primer depósito desde otra wallet o desde tesorería.</span>
              </div>
            </>
          )}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setStep(1)}>Generar frase semilla</button>
          </>)}
          {step === 1 && (<>
            <button className="btn" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" disabled={!revealed || !acknowledged} onClick={() => setStep(2)}>Continuar</button>
          </>)}
          {step === 2 && (<>
            <button className="btn" onClick={() => setStep(1)}>Volver a la frase</button>
            <button className="btn btn-primary" disabled={!correct} onClick={() => setStep(3)}>Crear wallet</button>
          </>)}
          {step === 3 && (<>
            <button className="btn" onClick={() => { onComplete && onComplete({ asset, label, address }); onClose(); }}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete({ asset, label, address }); onClose(); }}>{I.arrowDown}<span>Recibir mi primer depósito</span></button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Permissions Flow ────────────────────────────────────── */

function PermissionsFlow({ data, onClose, onComplete }) {
  const user = data.user;
  const [perms, setPerms] = useSo(() => new Set(data.permissions || DEFAULT_PERMS_BY_ROLE[user.role || 'OPERATOR']));
  const [reason, setReason] = useSo('');
  const [saving, setSaving] = useSo(false);
  const [done, setDone] = useSo(false);

  const toggle = (code) => setPerms(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const setGroup = (group, value) => setPerms(prev => {
    const next = new Set(prev);
    group.items.forEach(p => { if (value) next.add(p.code); else next.delete(p.code); });
    return next;
  });

  const applyPreset = (role) => setPerms(new Set(DEFAULT_PERMS_BY_ROLE[role] || []));

  const changedFromBase = (() => {
    const base = new Set(DEFAULT_PERMS_BY_ROLE[user.role || 'OPERATOR']);
    const added = [...perms].filter(p => !base.has(p));
    const removed = [...base].filter(p => !perms.has(p));
    return { added, removed };
  })();

  const save = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setDone(true); }, 700);
  };

  if (done) {
    return (
      <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
        <div className="modal" style={{ width: 460 }}>
          <div className="modal-b">
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                {React.cloneElement(I.check, { props: { size: 28 } })}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Permisos actualizados</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                {user.name} · {perms.size} permisos activos · evento registrado en auditoría
              </div>
            </div>
          </div>
          <div className="modal-f">
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete([...perms]); onClose(); }}>Listo</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 680, maxHeight: '86vh' }}>
        <div className="modal-h">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={user.name} size={36} />
              <div>
                <h2 style={{ margin: 0 }}>Permisos · {user.name}</h2>
                <p style={{ margin: 0 }}>{user.email} · rol <span className="mono" style={{ color: 'var(--text)' }}>{user.role || 'OPERATOR'}</span></p>
              </div>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 6 }}>Preset:</span>
            <button className="chip" onClick={() => applyPreset('ADMIN')}>Admin completo</button>
            <button className="chip" onClick={() => applyPreset('OPERATOR')}>Operador estándar</button>
            <button className="chip" onClick={() => applyPreset('VIEWER')}>Sin permisos</button>
            <div style={{ flex: 1 }}></div>
            <span className="bdg bdg-active">{perms.size} activos</span>
          </div>
        </div>

        <div className="modal-b" style={{ paddingTop: 8 }}>
          {PERMISSIONS.map(g => {
            const enabled = g.items.filter(p => perms.has(p.code)).length;
            const all = enabled === g.items.length;
            return (
              <div key={g.group} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {g.group} <span className="muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>· {enabled}/{g.items.length}</span>
                  </div>
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: 11 }} onClick={() => setGroup(g, !all)}>
                    {all ? 'Quitar todos' : 'Activar todos'}
                  </button>
                </div>
                <div className="card" style={{ padding: 0 }}>
                  {g.items.map((p, i) => (
                    <label key={p.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderBottom: i < g.items.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{p.code}</span>
                          <span className="bdg" style={{ background: p.risk === 'high' ? 'var(--danger-soft)' : p.risk === 'med' ? 'var(--warning-soft)' : 'var(--muted-soft)', color: p.risk === 'high' ? 'var(--danger)' : p.risk === 'med' ? 'var(--warning)' : 'var(--text-2)', border: 0, fontSize: 10 }}>
                            {p.risk === 'high' ? 'alto riesgo' : p.risk === 'med' ? 'medio' : 'bajo'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 4 }}>{p.label}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>{p.desc}</div>
                      </div>
                      <label className="toggle"><input type="checkbox" checked={perms.has(p.code)} onChange={() => toggle(p.code)} /></label>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {(changedFromBase.added.length > 0 || changedFromBase.removed.length > 0) && (
            <div className="warn-box" style={{ background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' }}>
              {React.cloneElement(I.info, { props: { size: 14 } })}
              <div>
                <b>Cambios respecto al preset del rol:</b>
                {changedFromBase.added.length > 0 && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--success)' }}>+ Agregás:</span> <span className="mono" style={{ fontSize: 11 }}>{changedFromBase.added.join(', ')}</span></div>}
                {changedFromBase.removed.length > 0 && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--danger)' }}>− Quitás:</span> <span className="mono" style={{ fontSize: 11 }}>{changedFromBase.removed.join(', ')}</span></div>}
              </div>
            </div>
          )}

          <div className="fld" style={{ marginTop: 14 }}>
            <label>Motivo del cambio (requerido)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: alta de operador, restricción por incidente…" />
          </div>
        </div>

        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || reason.length < 3} onClick={save}>
            {saving ? <><span className="spinner"></span><span>Guardando…</span></> : <>{React.cloneElement(I.shield, { props: { size: 14 } })}<span>Guardar y firmar en auditoría</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Create User Flow ────────────────────────────────────── */

function CreateUserFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSo(0);
  const [form, setForm] = useSo({
    firstName: '', lastName: '', email: '', phone: '', country: 'AR',
    role: 'VIEWER', kyc: 'L0', twoFA: true,
    invite: 'email', tempPassword: '',
  });
  const [perms, setPerms] = useSo(new Set(DEFAULT_PERMS_BY_ROLE.VIEWER));
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Auto-update permissions when role changes
  useEo(() => {
    setPerms(new Set(DEFAULT_PERMS_BY_ROLE[form.role] || []));
  }, [form.role]);

  const steps = ['Identidad', 'Rol y KYC', 'Permisos', 'Invitar'];
  const fullName = (form.firstName + ' ' + form.lastName).trim();
  const isStaff = form.role !== 'VIEWER';

  const can = step === 0 ? form.firstName && form.lastName && form.email.includes('@')
            : step === 1 ? true
            : step === 2 ? true
            : true;

  const finish = () => {
    onComplete && onComplete({ ...form, fullName, permissions: [...perms] });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && step < 4 && onClose()}>
      <div className="modal" style={{ width: 640, maxHeight: '90vh' }}>
        <div className="modal-h" style={{ paddingBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>{step === 4 ? '¡Usuario creado!' : 'Crear nuevo usuario'}</h2>
              <p>{step === 0 ? 'Datos básicos · podés completarlos vos o el usuario después.'
                : step === 1 ? 'Asigná un rol y nivel de verificación inicial.'
                : step === 2 ? 'Permisos específicos · podés ajustar el preset del rol.'
                : step === 3 ? 'Cómo invitamos al usuario a iniciar sesión.'
                : 'La cuenta ya existe en la plataforma.'}</p>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
          {step < 4 && <Stepper steps={steps} current={step} />}
        </div>

        <div className="modal-b">
          {step === 0 && (
            <>
              <div className="fld-row">
                <div className="fld"><label>Nombre</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} autoFocus /></div>
                <div className="fld"><label>Apellido</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
              </div>
              <div className="fld"><label>Email</label><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@dominio.com" /></div>
              <div className="fld-row">
                <div className="fld"><label>Teléfono</label><input className="mono" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 ..." /></div>
                <div className="fld"><label>País</label>
                  <select value={form.country} onChange={e => set('country', e.target.value)}>
                    <option value="AR">🇦🇷 Argentina</option><option value="MX">🇲🇽 México</option>
                    <option value="CO">🇨🇴 Colombia</option><option value="CL">🇨🇱 Chile</option>
                    <option value="ES">🇪🇸 España</option>
                  </select>
                </div>
              </div>
              <div className="dry-run">
                {I.info}<span>Nombre de usuario sugerido:</span>
                <span className="mono" style={{ color: 'var(--text)', fontWeight: 500 }}>
                  {(form.firstName || 'usuario').toLowerCase().replace(/[^a-z]/g, '')}.{(form.lastName || '').toLowerCase().replace(/[^a-z]/g, '') || 'apellido'}
                </span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="fld"><label>Rol</label></div>
              <div className="card" style={{ padding: 0, marginBottom: 14 }}>
                {[
                  ['ADMIN', 'Acceso total · puede crear otros admins y operar tesorería', '#7c3aed'],
                  ['OPERATOR', 'Operativa diaria · KYC, congelar, resolver disputas', '#0891b2'],
                  ['VIEWER', 'Cliente final · sus wallets, P2P y exchange', '#1f7a3a'],
                ].map(([r, d, c], i, a) => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer', background: form.role === r ? 'var(--accent-soft)' : 'transparent' }}>
                    <input type="radio" name="role" checked={form.role === r} onChange={() => set('role', r)} style={{ accentColor: 'var(--accent)' }} />
                    <span style={{ width: 8, height: 8, borderRadius: 50, background: c }}></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>{r}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{d}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="fld-row">
                <div className="fld"><label>Nivel KYC inicial</label>
                  <select value={form.kyc} onChange={e => set('kyc', e.target.value)}>
                    <option value="L0">L0 · sin verificar</option>
                    <option value="L1">L1 · DNI verificado</option>
                    <option value="L2">L2 · KYC básico</option>
                    <option value="L3">L3 · fuente de fondos</option>
                  </select>
                </div>
                <div className="fld"><label>Estado</label>
                  <select defaultValue="active">
                    <option value="active">Activo</option>
                    <option value="pending_kyc">Pendiente KYC</option>
                  </select>
                </div>
              </div>

              <div className="fld" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, marginTop: 4 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>Forzar 2FA al primer inicio de sesión</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{isStaff ? 'Obligatorio para roles ADMIN/OPERATOR' : 'Opcional para clientes finales'}</div>
                </div>
                <label className="toggle"><input type="checkbox" checked={form.twoFA || isStaff} disabled={isStaff} onChange={e => set('twoFA', e.target.checked)} /></label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {form.role === 'VIEWER' ? (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                    {React.cloneElement(I.user, { props: { size: 22 } })}
                  </div>
                  <div style={{ fontWeight: 600 }}>Sin permisos administrativos</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Los VIEWER solo operan sus propias wallets. No requieren permisos especiales.</div>
                </div>
              ) : (
                <>
                  <div className="dry-run" style={{ marginBottom: 14 }}>
                    {I.shield}<span>Preset {form.role}:</span>
                    <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{perms.size} permisos</span>
                    <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => setPerms(new Set(DEFAULT_PERMS_BY_ROLE[form.role]))}>Restablecer</button>
                  </div>
                  {PERMISSIONS.map(g => (
                    <div key={g.group} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{g.group}</div>
                      <div className="card" style={{ padding: 0 }}>
                        {g.items.map((p, i) => (
                          <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: i < g.items.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer' }}>
                            <span className="mono" style={{ fontSize: 11, fontWeight: 600, minWidth: 130 }}>{p.code}</span>
                            <span style={{ flex: 1, fontSize: 12 }}>{p.label}</span>
                            {p.risk === 'high' && <span className="bdg" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: 0, fontSize: 10 }}>alto</span>}
                            <label className="toggle"><input type="checkbox" checked={perms.has(p.code)} onChange={() => {
                              setPerms(prev => { const n = new Set(prev); if (n.has(p.code)) n.delete(p.code); else n.add(p.code); return n; });
                            }} /></label>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="fld"><label>Método de invitación</label></div>
              <div className="card" style={{ padding: 0, marginBottom: 14 }}>
                {[
                  ['email', 'Email con link mágico', 'El usuario recibe un email · expira en 24h · setea su propia clave', I.exchange],
                  ['temp', 'Clave temporal generada', 'Le pasás la clave por canal seguro · debe cambiarla al ingresar', I.lock],
                  ['none', 'No invitar ahora', 'La cuenta queda inactiva hasta que la actives manualmente', I.user],
                ].map(([k, l, d, ic], i, a) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer', background: form.invite === k ? 'var(--accent-soft)' : 'transparent' }}>
                    <input type="radio" name="invite" checked={form.invite === k} onChange={() => set('invite', k)} style={{ accentColor: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text-2)' }}>{ic}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{l}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{d}</div>
                    </div>
                  </label>
                ))}
              </div>

              {form.invite === 'temp' && (
                <div className="fld"><label>Clave temporal</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="mono" value={form.tempPassword} onChange={e => set('tempPassword', e.target.value)} placeholder="generá una clave segura" style={{ flex: 1 }} />
                    <button className="btn btn-sm" onClick={() => set('tempPassword', 'Cad' + Math.random().toString(36).slice(2, 10) + '!')}>{I.refresh}<span>Generar</span></button>
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Resumen</div>
                <div className="kvs">
                  <div>Nombre</div><div>{fullName}</div>
                  <div>Email</div><div className="mono" style={{ fontSize: 12 }}>{form.email}</div>
                  <div>Rol</div><div><span className="mono" style={{ fontWeight: 500 }}>{form.role}</span></div>
                  <div>KYC inicial</div><div><span className="bdg bdg-kyc mono">{form.kyc}</span></div>
                  <div>Permisos</div><div>{perms.size} activos</div>
                  <div>2FA</div><div>{form.twoFA || isStaff ? 'forzado' : 'opcional'}</div>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  {React.cloneElement(I.check, { props: { size: 36 } })}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{fullName} es ahora un {form.role}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {form.invite === 'email' ? 'Email enviado a ' + form.email
                  : form.invite === 'temp' ? 'Clave temporal generada · pasala por canal seguro'
                  : 'Cuenta creada en estado inactivo'}
                </div>
              </div>
              {form.invite === 'temp' && form.tempPassword && (
                <div className="warn-box">
                  {I.lock}
                  <div>
                    Clave temporal: <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{form.tempPassword}</span><br />
                    <span style={{ fontSize: 11 }}>Esta clave no se muestra de nuevo. Compartila por un canal seguro.</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!can} onClick={() => setStep(1)}>Siguiente</button>
          </>)}
          {step >= 1 && step <= 2 && (<>
            <button className="btn" onClick={() => setStep(s => s - 1)}>Atrás</button>
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>{step === 2 ? 'Configurar invitación' : 'Siguiente'}</button>
          </>)}
          {step === 3 && (<>
            <button className="btn" onClick={() => setStep(2)}>Atrás</button>
            <button className="btn btn-primary" disabled={form.invite === 'temp' && !form.tempPassword} onClick={() => setStep(4)}>
              {React.cloneElement(I.check, { props: { size: 14 } })}<span>Crear usuario</span>
            </button>
          </>)}
          {step === 4 && (
            <button className="btn btn-primary" onClick={finish} style={{ marginLeft: 'auto' }}>Listo</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 2FA Setup Flow ──────────────────────────────────────── */

function TwoFASetupFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSo(0); // 0 method, 1 scan, 2 verify, 3 backup
  const [method, setMethod] = useSo('app');
  const [code, setCode] = useSo(['','','','','','']);
  const refs = useRo([]);
  const setDigit = (i, v) => {
    if (v && !/^\d$/.test(v)) return;
    setCode(prev => prev.map((c, idx) => idx === i ? v : c));
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const filled = code.every(d => d.length === 1);
  const manualKey = 'JBSW Y3DP EHPK 3PXP A8C4 F9D1 2B3E 7F1A';
  const backupCodes = ['4f1a-9b2c','8d77-e2c0','b4a1-f9d8','c3b5-e7a8','1234-5678','9876-5432','abcd-ef01','1111-2222'];

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-h">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>{step === 3 ? '2FA activado' : 'Configurar 2FA'}</h2>
              <p>{step === 0 ? 'Elegí cómo querés autenticarte en cada inicio de sesión.'
                : step === 1 ? 'Escaneá el QR con tu app autenticadora.'
                : step === 2 ? 'Verificá ingresando el código de 6 dígitos.'
                : 'Guardá estos códigos de respaldo en un lugar seguro.'}</p>
            </div>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
          <Stepper steps={['Método', 'Configurar', 'Verificar', 'Listo']} current={step} />
        </div>

        <div className="modal-b">
          {step === 0 && (
            <div className="card" style={{ padding: 0 }}>
              {[
                ['app', 'App autenticadora', 'Google Authenticator, Authy, 1Password, etc. · más seguro', I.shield, true],
                ['sms', 'SMS', 'Código por mensaje de texto · menos seguro', I.bolt, false],
                ['email', 'Email', 'Código por correo electrónico · solo respaldo', I.info, false],
              ].map(([k, l, d, ic, rec], i, a) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer', background: method === k ? 'var(--accent-soft)' : 'transparent' }}>
                  <input type="radio" name="m2fa" checked={method === k} onChange={() => setMethod(k)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ color: 'var(--text-2)' }}>{ic}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{l} {rec && <span className="bdg bdg-active" style={{ marginLeft: 6, fontSize: 10 }}>recomendado</span>}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{d}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step === 1 && method === 'app' && (
            <>
              <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
                <div style={{ display: 'inline-block', padding: 14, background: '#fff', borderRadius: 14, border: '1px solid var(--border)' }}>
                  <FakeQR seed="otp-setup-jmartinez" size={180} />
                </div>
              </div>
              <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginBottom: 14 }}>O ingresá esta clave manualmente:</div>
              <div className="mono" style={{ fontSize: 13, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {manualKey}
                <button className="copy-btn" style={{ color: 'var(--accent)' }}>{I.copy}</button>
              </div>
            </>
          )}

          {step === 1 && method === 'sms' && (
            <div className="fld"><label>Número de teléfono</label><input className="mono" defaultValue="+54 11 5544-2210" /></div>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 12 }}>Ingresá el código de 6 dígitos de tu {method === 'app' ? 'app' : method === 'sms' ? 'mensaje' : 'email'}</div>
                <div className="otp-grid" style={{ justifyContent: 'center' }}>
                  {code.map((d, i) => (
                    <input key={i} ref={el => refs.current[i] = el} className={`otp-cell ${d ? 'filled' : ''}`}
                      style={{ textAlign: 'center', outline: 'none' }} maxLength={1} value={d}
                      onChange={e => setDigit(i, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }}
                      autoFocus={i === 0} />
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>Demo · cualquier código funciona</div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="warn-box">
                {I.warn}
                <div>Estos códigos te dejan entrar si perdés acceso a tu {method === 'app' ? 'autenticador' : method}. Cada uno se puede usar <b>una sola vez</b>.</div>
              </div>
              <div className="card" style={{ padding: 14, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 24px' }}>
                  {backupCodes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <span className="muted" style={{ minWidth: 18, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontWeight: 500 }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>{I.copy}<span>Copiar todos</span></button>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>{I.download}<span>Descargar PDF</span></button>
              </div>
            </>
          )}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => setStep(1)}>Continuar</button>
          </>)}
          {step === 1 && (<>
            <button className="btn" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Ya escaneé · verificar</button>
          </>)}
          {step === 2 && (<>
            <button className="btn" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-primary" disabled={!filled} onClick={() => setStep(3)}>Activar 2FA</button>
          </>)}
          {step === 3 && (
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { onComplete && onComplete({ method }); onClose(); }}>Listo, los guardé</button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WalletCreateFlow, PermissionsFlow, CreateUserFlow, TwoFASetupFlow, PERMISSIONS, DEFAULT_PERMS_BY_ROLE });
