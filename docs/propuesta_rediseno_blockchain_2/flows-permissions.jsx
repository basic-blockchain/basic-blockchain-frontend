// flows-permissions.jsx — Permission management + Create user flow
//   - PermissionsScreen:    Admin view to grant/revoke permissions per user
//   - PermissionAssignFlow: Drawer to toggle individual permissions by category
//   - CreateUserFlow:       4-step admin flow to create a new user

const { useState: useSp, useEffect: useEp, useMemo: useMp } = React;

/* ─── Permission catalog (matches backend keys) ───────────── */

const PERM_CATEGORIES = [
  {
    id: 'mint',
    label: 'Acuñación · Mint',
    desc: 'Crear y destruir tokens nativos.',
    color: '#7c3aed',
    perms: [
      ['mint.tokens',     'Mint',                    'Crear tokens nativos en una wallet'],
      ['mint.burn',       'Burn',                    'Destruir tokens existentes'],
      ['mint.cusd',       'Mint stablecoin (cUSD)',  'Acuñar la moneda estable nativa'],
    ],
  },
  {
    id: 'tx',
    label: 'Transacciones',
    desc: 'Aprobar, rechazar o cancelar operaciones en curso.',
    color: '#0891b2',
    perms: [
      ['tx.approve',      'Aprobar transacciones',   'Liberar TX retenidas por reglas AML'],
      ['tx.reject',       'Rechazar transacciones',  'Bloquear TX antes de incluirse en bloque'],
      ['tx.cancel',       'Cancelar pendientes',     'Sacar TX del mempool antes de minar'],
    ],
  },
  {
    id: 'wallet',
    label: 'Wallets',
    desc: 'Acciones sobre wallets de usuarios.',
    color: '#1f7a3a',
    perms: [
      ['wallet.freeze',   'Congelar wallets',        'Pausar operativa de cualquier wallet'],
      ['wallet.unfreeze', 'Descongelar wallets',     'Reactivar wallets congeladas'],
      ['wallet.create_for_user', 'Crear wallet para usuario', 'Generar par de llaves a nombre de otro'],
    ],
  },
  {
    id: 'user',
    label: 'Usuarios',
    desc: 'Gestión de cuentas de usuarios finales.',
    color: '#c2410c',
    perms: [
      ['user.create',     'Crear usuarios',          'Onboarding manual desde admin'],
      ['user.edit',       'Editar datos',            'Cambiar email, nombre, KYC'],
      ['user.delete',     'Soft-delete',             'Inactivar cuenta + congelar wallets'],
      ['user.ban',        'Banear / desbanear',      'Bloquear acceso a la plataforma'],
      ['user.assign_perm','Asignar permisos',        'Modificar permisos de otros usuarios'],
    ],
  },
  {
    id: 'treasury',
    label: 'Tesorería',
    desc: 'Movimiento de fondos corporativos.',
    color: '#ad2820',
    perms: [
      ['treasury.move',   'Mover entre wallets',     'Cold ↔ Hot ↔ Fee'],
      ['treasury.distribute', 'Emitir a usuarios',   'Crear distribución masiva'],
      ['treasury.approve_dual', 'Firmar 2ª aprobación', 'Segunda firma en aprobación dual'],
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    desc: 'Revisión KYC, AML y disputas.',
    color: '#0e7490',
    perms: [
      ['compliance.review',   'Revisar casos',        'Aprobar/rechazar KYC y AML'],
      ['compliance.dispute',  'Resolver disputas P2P','Decidir en disputas escaladas'],
      ['compliance.export',   'Exportar reportes',    'Generar SAR/STR firmados'],
    ],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    desc: 'Configuración global y auditoría.',
    color: '#5b21b6',
    perms: [
      ['platform.settings',   'Editar ajustes',       'Cambios de configuración global'],
      ['platform.audit_view', 'Ver auditoría',        'Acceder al log de auditoría'],
      ['platform.audit_export','Exportar firmado',    'Descargar log con firma HMAC'],
      ['platform.mine',       'Minar bloques',        'Disparar PoW manualmente'],
    ],
  },
];

const ROLE_PRESETS = {
  ADMIN:    ['mint.tokens','mint.burn','mint.cusd','tx.approve','tx.reject','tx.cancel','wallet.freeze','wallet.unfreeze','wallet.create_for_user','user.create','user.edit','user.delete','user.ban','user.assign_perm','treasury.move','treasury.distribute','treasury.approve_dual','compliance.review','compliance.dispute','compliance.export','platform.settings','platform.audit_view','platform.audit_export','platform.mine'],
  OPERATOR: ['tx.approve','tx.reject','wallet.freeze','wallet.unfreeze','user.edit','user.ban','compliance.review','compliance.dispute','platform.audit_view'],
  VIEWER:   [],
};

const USERS_WITH_PERMS = [
  { id: 'usr_admin_01',  name: 'María Acosta',     email: 'admin@dropi.co',    role: 'ADMIN',    perms: ROLE_PRESETS.ADMIN,    custom: false, last: 'hace 2 d' },
  { id: 'usr_admin_02',  name: 'Sergio Romero',    email: 'sergio@dropi.co',   role: 'ADMIN',    perms: ROLE_PRESETS.ADMIN,    custom: false, last: 'hace 1 sem' },
  { id: 'usr_admin_03',  name: 'Daniela Kim',      email: 'daniela@dropi.co',  role: 'ADMIN',    perms: ROLE_PRESETS.ADMIN.filter(p => p !== 'user.delete'),    custom: true,  last: 'hace 3 d' },
  { id: 'usr_op_01',     name: 'Pablo Iturri',     email: 'pablo@dropi.co',    role: 'OPERATOR', perms: ROLE_PRESETS.OPERATOR, custom: false, last: 'hace 4 h' },
  { id: 'usr_op_02',     name: 'Renata Vega',      email: 'renata@dropi.co',   role: 'OPERATOR', perms: [...ROLE_PRESETS.OPERATOR, 'compliance.export'], custom: true, last: 'hace 1 d' },
  { id: 'usr_op_03',     name: 'Tomás Acosta',     email: 'tomas@dropi.co',    role: 'OPERATOR', perms: ROLE_PRESETS.OPERATOR, custom: false, last: 'hace 12 h' },
  { id: 'usr_view_01',   name: 'Lucía González',   email: 'lucia@gmail.com',   role: 'VIEWER',   perms: [],                    custom: false, last: '—' },
];

/* ─── PermissionsScreen ───────────────────────────────────── */

function PermissionsScreen({ role = 'admin' }) {
  const nav = useNav();
  const [filter, setFilter] = useSp('all');
  const [search, setSearch] = useSp('');

  const filtered = USERS_WITH_PERMS.filter(u => {
    if (filter !== 'all' && u.role !== filter.toUpperCase()) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: USERS_WITH_PERMS.length,
    admin: USERS_WITH_PERMS.filter(u => u.role === 'ADMIN').length,
    operator: USERS_WITH_PERMS.filter(u => u.role === 'OPERATOR').length,
    viewer: USERS_WITH_PERMS.filter(u => u.role === 'VIEWER').length,
    custom: USERS_WITH_PERMS.filter(u => u.custom).length,
  };

  return (
    <div className="scr">
      <Sidebar role={role} active="permissions" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Permisos']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Permisos</h1>
              <p className="scr-sub">Quién puede hacer qué en la plataforma · {PERM_CATEGORIES.reduce((s, c) => s + c.perms.length, 0)} permisos en {PERM_CATEGORIES.length} categorías.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => nav.toast('Reporte exportado a CSV', 'success')}>{I.download}<span>Exportar</span></button>
              <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('create-user', {})}>{I.plus}<span>Crear usuario admin</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Usuarios con permisos</div><div className="vl">{counts.all}</div><div className="ds">{counts.custom} con set personalizado</div></div>
            <div className="bigstat"><div className="lb">Admins</div><div className="vl" style={{ color: '#7c3aed' }}>{counts.admin}</div><div className="ds">acceso total</div></div>
            <div className="bigstat"><div className="lb">Operators</div><div className="vl" style={{ color: '#0891b2' }}>{counts.operator}</div><div className="ds">operativa diaria</div></div>
            <div className="bigstat"><div className="lb">Cambios 7d</div><div className="vl">12</div><div className="ds">todos auditados</div></div>
          </div>

          <div className="toolbar">
            <div className="tabs">
              {[['all','Todos',counts.all],['admin','Admins',counts.admin],['operator','Operators',counts.operator],['viewer','Viewers',counts.viewer]].map(([k, l, c]) => (
                <button key={k} className={`tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}<span className="count">{c}</span></button>
              ))}
            </div>
            <div className="toolbar-search">{I.search}<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email…" /></div>
            <span className="chip">Con personalización · {counts.custom} {I.chevD}</span>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Permisos activos</th>
                  <th>Set</th>
                  <th>Último cambio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => nav.openFlow('assign-permissions', { user: u })}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={u.name} size={26} />
                        <div><div className="name">{u.name}</div><div className="em">{u.email}</div></div>
                      </div>
                    </td>
                    <td>
                      <span className="bdg" style={{ background: u.role === 'ADMIN' ? '#ede9fe' : u.role === 'OPERATOR' ? '#cffafe' : 'var(--surface-2)', color: u.role === 'ADMIN' ? '#5b21b6' : u.role === 'OPERATOR' ? '#155e75' : 'var(--text-2)', border: 0, fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600 }}>{u.role}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span className="bdg bdg-active mono" style={{ fontSize: 10.5 }}>{u.perms.length} permisos</span>
                        {u.perms.slice(0, 3).map(p => (
                          <span key={p} className="bdg" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{p}</span>
                        ))}
                        {u.perms.length > 3 && <span className="muted" style={{ fontSize: 11 }}>+{u.perms.length - 3}</span>}
                      </div>
                    </td>
                    <td>
                      {u.custom
                        ? <span className="bdg bdg-pending_kyc">Personalizado</span>
                        : <span className="bdg" style={{ background: 'var(--muted-soft)', color: 'var(--text-2)', border: 0 }}>Preset {u.role}</span>}
                    </td>
                    <td className="muted">{u.last}</td>
                    <td className="row-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-icon btn-ghost" onClick={() => nav.openFlow('assign-permissions', { user: u })}>{I.edit}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dry-run" style={{ marginTop: 14 }}>
            {I.info}<span>Hoy los permisos se modifican vía <span className="mono" style={{ color: 'var(--text)' }}>POST /admin/users/:id/permissions</span>. Esta vista reemplaza ese flujo.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PermissionAssignFlow (drawer) ───────────────────────── */

function PermissionAssignFlow({ data, onClose, onComplete }) {
  const nav = useNav();
  const u = data.user;
  const [perms, setPerms] = useSp(new Set(u.perms));
  const [reason, setReason] = useSp('');

  const has = (k) => perms.has(k);
  const toggle = (k) => {
    const next = new Set(perms);
    if (next.has(k)) next.delete(k); else next.add(k);
    setPerms(next);
  };

  const diff = useMp(() => {
    const before = new Set(u.perms);
    const granted = [...perms].filter(p => !before.has(p));
    const revoked = [...before].filter(p => !perms.has(p));
    return { granted, revoked };
  }, [perms]);

  const hasChanges = diff.granted.length || diff.revoked.length;
  const willBeCustom = !ROLE_PRESETS[u.role] || perms.size !== ROLE_PRESETS[u.role].length || ROLE_PRESETS[u.role].some(p => !perms.has(p));

  const useEffect = React.useEffect;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const applyPreset = (role) => {
    setPerms(new Set(ROLE_PRESETS[role] || []));
  };

  const submit = () => {
    onComplete && onComplete({ user: u, granted: diff.granted, revoked: diff.revoked, reason });
    onClose();
  };

  return (
    <>
      <div className="scrim open" onClick={onClose}></div>
      <aside className="drawer open" style={{ width: 720 }} role="dialog">
        <header className="drawer-head">
          <div className="drawer-top">
            <span className="drawer-id mono">{u.id}</span>
            <span className="bdg" style={{ background: u.role === 'ADMIN' ? '#ede9fe' : u.role === 'OPERATOR' ? '#cffafe' : 'var(--surface-2)', color: u.role === 'ADMIN' ? '#5b21b6' : u.role === 'OPERATOR' ? '#155e75' : 'var(--text-2)', border: 0, fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600 }}>{u.role}</span>
            <button className="btn btn-ghost btn-icon drawer-x" onClick={onClose}>{I.close}</button>
          </div>
          <div className="drawer-user">
            <Avatar name={u.name} size={44} />
            <div style={{ flex: 1 }}>
              <div className="name">{u.name}</div>
              <div className="meta">
                <span>{u.email}</span><span className="dot"></span>
                <span>{perms.size} permisos activos</span>
                {hasChanges && (<><span className="dot"></span><span style={{ color: 'var(--warning)' }}>+{diff.granted.length} / −{diff.revoked.length} sin guardar</span></>)}
              </div>
            </div>
          </div>
        </header>

        <div className="drawer-body">
          <div className="section-h">
            <span>Presets rápidos</span>
            <div className="right">
              <button className="btn btn-sm" onClick={() => applyPreset('ADMIN')}>Aplicar ADMIN completo</button>
              <button className="btn btn-sm" onClick={() => applyPreset('OPERATOR')}>Aplicar OPERATOR</button>
              <button className="btn btn-sm" onClick={() => setPerms(new Set())}>Limpiar todos</button>
            </div>
          </div>

          {PERM_CATEGORIES.map(cat => {
            const enabled = cat.perms.filter(([k]) => has(k)).length;
            const all = cat.perms.length;
            return (
              <div key={cat.id} style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 50, background: cat.color }}></span>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{cat.label}</div>
                  <div className="muted" style={{ fontSize: 11.5, flex: 1 }}>· {cat.desc}</div>
                  <span className="bdg" style={{ background: enabled === all ? 'var(--success-soft)' : enabled > 0 ? 'var(--warning-soft)' : 'var(--surface-2)', color: enabled === all ? 'var(--success)' : enabled > 0 ? 'var(--warning)' : 'var(--text-3)', border: 0, fontSize: 10.5 }}>{enabled}/{all}</span>
                </div>
                <div className="card">
                  {cat.perms.map(([k, label, desc], i) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < cat.perms.length - 1 ? '1px solid var(--border)' : 0 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{k}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{desc}</div>
                      </div>
                      <label className="toggle"><input type="checkbox" checked={has(k)} onChange={() => toggle(k)} /></label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {hasChanges && (
            <>
              <div className="section-h" style={{ marginTop: 18 }}>Cambios a aplicar</div>
              <div className="card" style={{ padding: 12 }}>
                {diff.granted.map(p => <div key={p} className="mono" style={{ fontSize: 11.5, color: 'var(--success)', padding: '3px 0' }}>+ {p}</div>)}
                {diff.revoked.map(p => <div key={p} className="mono" style={{ fontSize: 11.5, color: 'var(--danger)', padding: '3px 0' }}>− {p}</div>)}
              </div>

              <div className="fld" style={{ marginTop: 14 }}>
                <label>Motivo del cambio (requerido)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Queda registrado en el log de auditoría…" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', minHeight: 56, resize: 'vertical' }} />
              </div>

              {willBeCustom && (
                <div className="warn-box" style={{ background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' }}>
                  {React.cloneElement(I.info, { props: { size: 14 } })}
                  <div>Este usuario va a quedar con un set <b>personalizado</b> distinto del preset de su rol.</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="drawer-head" style={{ borderTop: '1px solid var(--border)', borderBottom: 0, padding: '12px 24px' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!hasChanges || !reason} onClick={submit}>
              Guardar cambios {hasChanges && `(${diff.granted.length + diff.revoked.length})`}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── CreateUserFlow ──────────────────────────────────────── */

function CreateUserFlow({ data, onClose, onComplete }) {
  const [step, setStep] = useSp(0);
  const [form, setForm] = useSp({
    name: '', email: '', phone: '', country: 'AR', role: 'OPERATOR',
    perms: new Set(ROLE_PRESETS.OPERATOR),
    notify: 'email-link', // email-link | temp-password
    force2fa: true,
  });

  const steps = ['Identidad', 'Permisos', 'Acceso', 'Listo'];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const changeRole = (r) => setForm(f => ({ ...f, role: r, perms: new Set(ROLE_PRESETS[r]) }));
  const togglePerm = (k) => {
    setForm(f => {
      const next = new Set(f.perms);
      if (next.has(k)) next.delete(k); else next.add(k);
      return { ...f, perms: next };
    });
  };

  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 640, maxHeight: '88vh' }}>
        <div className="modal-h" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Crear usuario administrativo</h2>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
          </div>
          <Stepper steps={steps} current={step} />
        </div>

        <div className="modal-b">
          {step === 0 && (<>
            <div className="fld-row">
              <div className="fld"><label>Nombre completo</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sergio Romero" autoFocus /></div>
              <div className="fld"><label>Email</label><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="sergio@dropi.co" /></div>
            </div>
            <div className="fld-row">
              <div className="fld"><label>Teléfono</label><input className="mono" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 5544-2210" /></div>
              <div className="fld"><label>País</label>
                <select value={form.country} onChange={e => set('country', e.target.value)}>
                  <option value="AR">🇦🇷 Argentina</option><option value="MX">🇲🇽 México</option>
                  <option value="CO">🇨🇴 Colombia</option><option value="CL">🇨🇱 Chile</option>
                </select>
              </div>
            </div>
            <div className="fld">
              <label>Rol</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['ADMIN','OPERATOR','VIEWER'].map(r => (
                  <button key={r} type="button" className={`chip ${form.role === r ? 'active' : ''}`} onClick={() => changeRole(r)} style={{ flex: 1, justifyContent: 'center', height: 36, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r}</button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                {form.role === 'ADMIN' && 'Acceso total · puede crear otros admins, mover tesorería, eliminar usuarios'}
                {form.role === 'OPERATOR' && 'Operativa diaria · KYC, banear, congelar wallets, resolver disputas'}
                {form.role === 'VIEWER' && 'Cliente final · sólo sus propias wallets, P2P y exchange'}
              </div>
            </div>
          </>)}

          {step === 1 && (<>
            <div style={{ marginBottom: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 6, fontSize: 12, color: 'var(--text-2)' }}>
              {form.role} viene con <b style={{ color: 'var(--text)' }}>{ROLE_PRESETS[form.role].length} permisos preset</b>. Podés ajustarlos.
            </div>
            {PERM_CATEGORIES.map(cat => {
              const enabled = cat.perms.filter(([k]) => form.perms.has(k)).length;
              return (
                <div key={cat.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 50, background: cat.color }}></span>
                    <div style={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>{cat.label}</div>
                    <span className="bdg" style={{ background: enabled > 0 ? 'var(--success-soft)' : 'var(--surface-2)', color: enabled > 0 ? 'var(--success)' : 'var(--text-3)', border: 0, fontSize: 10 }}>{enabled}/{cat.perms.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {cat.perms.map(([k, label]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: form.perms.has(k) ? 'var(--success-soft)' : 'var(--surface-2)', cursor: 'pointer', fontSize: 11.5 }}>
                        <input type="checkbox" className="cbx" checked={form.perms.has(k)} onChange={() => togglePerm(k)} />
                        <span style={{ flex: 1 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </>)}

          {step === 2 && (<>
            <div className="fld">
              <label>Cómo recibe acceso</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['email-link', 'Email con link de "establecer contraseña"', 'Más seguro · expira en 24h'],
                  ['temp-password', 'Contraseña temporal generada', 'Se debe cambiar al primer login'],
                ].map(([k, l, d]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: form.notify === k ? 'var(--accent-soft)' : 'var(--surface)' }}>
                    <input type="radio" checked={form.notify === k} onChange={() => set('notify', k)} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{l}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{d}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fld" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>Forzar 2FA al primer login</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>El usuario va a tener que enrolar autenticación de dos factores antes de operar.</div>
              </div>
              <label className="toggle"><input type="checkbox" checked={form.force2fa} onChange={e => set('force2fa', e.target.checked)} /></label>
            </div>

            <div className="card" style={{ padding: 12, background: 'var(--surface-2)', fontSize: 12, marginTop: 14 }}>
              <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Resumen</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span className="muted">Usuario</span><span style={{ fontWeight: 500 }}>{form.name || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span className="muted">Email</span><span className="mono">{form.email || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span className="muted">Rol</span><span className="mono" style={{ fontWeight: 600 }}>{form.role}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span className="muted">Permisos</span><span>{form.perms.size}</span></div>
            </div>
          </>)}

          {step === 3 && (<>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: 50, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                {React.cloneElement(I.check, { props: { size: 36 } })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>Usuario creado</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{form.name} recibió un email a {form.email}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              {[
                ['ID', 'usr_' + Math.random().toString(36).slice(2, 9)],
                ['Email enviado', form.notify === 'email-link' ? 'Link de set-password (expira en 24h)' : 'Contraseña temporal'],
                ['2FA obligatoria', form.force2fa ? 'Sí · al primer login' : 'No'],
                ['Permisos asignados', form.perms.size + ' permisos'],
              ].map(([l, v], i, a) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                  <span className="muted">{l}</span><span className="mono" style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </>)}
        </div>

        <div className="modal-f">
          {step === 0 && (<>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!form.name || !form.email} onClick={() => setStep(1)}>Continuar</button>
          </>)}
          {step === 1 && (<>
            <button className="btn" onClick={() => setStep(0)}>Atrás</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Continuar</button>
          </>)}
          {step === 2 && (<>
            <button className="btn" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Crear usuario</button>
          </>)}
          {step === 3 && (<>
            <button className="btn" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => { onComplete && onComplete(form); onClose(); }}>Crear otro usuario</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PermissionsScreen, PermissionAssignFlow, CreateUserFlow, PERM_CATEGORIES, ROLE_PRESETS });
