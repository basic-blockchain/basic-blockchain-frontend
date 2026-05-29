// modals.jsx — Confirmation and edit modals

const { useState: useStateM, useEffect: useEffectM } = React;

function ConfirmModal({ action, user, onClose, onConfirm }) {
  const [reason, setReason] = useStateM('');
  const [scope, setScope] = useStateM('all');
  const [confirmText, setConfirmText] = useStateM('');

  if (!action || !user) return null;

  const config = {
    ban: {
      title: `¿Banear a ${user.fullName}?`,
      desc: 'El usuario no podrá iniciar sesión ni operar. Sus wallets se congelarán automáticamente.',
      cta: 'Banear usuario',
      danger: true,
      requireReason: true,
      reasonOpts: ['Sospecha de fraude','Múltiples cuentas','AML alert','Solicitud regulatoria','Violación de TOS','Otro'],
    },
    unban: {
      title: `¿Desbanear a ${user.fullName}?`,
      desc: 'El usuario podrá volver a operar. Las wallets quedarán activas según su estado anterior.',
      cta: 'Desbanear',
      danger: false,
    },
    freeze: {
      title: `¿Congelar wallets de ${user.fullName}?`,
      desc: 'Las wallets pasan a modo solo-lectura. El usuario no podrá retirar ni operar P2P/exchange. Los movimientos en curso quedan en pausa.',
      cta: 'Congelar wallets',
      danger: false,
      info: true,
      requireReason: true,
      reasonOpts: ['Revisión KYC','AML hold','Solicitud del usuario','Investigación interna','Otro'],
      hasScope: true,
    },
    unfreeze: {
      title: `¿Descongelar wallets?`,
      desc: 'Las wallets volverán a operar normalmente.',
      cta: 'Descongelar',
      danger: false,
    },
    delete: {
      title: `¿Eliminar a ${user.fullName}?`,
      desc: 'Soft-delete. El usuario quedará inactivo, sus wallets se congelarán automáticamente y se mantendrán los registros de auditoría. La cuenta puede restaurarse desde la pestaña "Eliminados".',
      cta: 'Eliminar usuario',
      danger: true,
      requireReason: true,
      reasonOpts: ['Solicitud del usuario (GDPR)','Cuenta duplicada','Inactividad prolongada','Solicitud regulatoria','Otro'],
      requireType: true,
    },
    restore: {
      title: `¿Restaurar a ${user.fullName}?`,
      desc: 'La cuenta volverá a estar activa. Las wallets seguirán congeladas hasta una revisión manual.',
      cta: 'Restaurar',
      danger: false,
    },
    activate: {
      title: `¿Activar cuenta?`,
      desc: 'La cuenta pasará al estado activo.',
      cta: 'Activar',
      danger: false,
    },
  }[action];

  if (!config) return null;

  const canConfirm = (!config.requireReason || reason.length >= 3) &&
                     (!config.requireType || confirmText === user.email);

  const submit = () => {
    if (!canConfirm) return;
    onConfirm({ action, user, reason, scope });
  };

  return (
    <div className="modal-scrim" onClick={(e) => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" role="dialog">
        <div className="modal-h">
          <h2>{config.title}</h2>
          <p>{config.desc}</p>
        </div>
        <div className="modal-b">
          {config.danger && (
            <div className="warn-box">
              {I.warn}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Acción de alto impacto</div>
                <div>Esta acción quedará registrada en el log de auditoría. Saldo afectado: <b>{fmtUsd(user.totalUsd)}</b> en {user.wallets.length} wallet{user.wallets.length === 1 ? '' : 's'}.</div>
              </div>
            </div>
          )}

          {config.requireReason && (
            <div className="fld">
              <label>Motivo (requerido)</label>
              <select value={reason ? (config.reasonOpts.includes(reason) ? reason : 'Otro') : ''} onChange={e => setReason(e.target.value === 'Otro' ? '_other' : e.target.value)}>
                <option value="" disabled>Seleccionar motivo…</option>
                {config.reasonOpts.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {(reason === '_other' || (reason && !config.reasonOpts.includes(reason) && reason !== '_other')) && (
                <textarea
                  placeholder="Describir el motivo…"
                  value={reason === '_other' ? '' : reason}
                  onChange={e => setReason(e.target.value)}
                  autoFocus
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          )}

          {config.hasScope && (
            <div className="fld">
              <label>Alcance</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['all','Todas las wallets'],['active','Solo wallets activas'],['select','Seleccionar manualmente']].map(([k,l]) => (
                  <button key={k} className={`chip ${scope === k ? 'active' : ''}`} onClick={() => setScope(k)}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {config.requireType && (
            <div className="fld">
              <label>Para confirmar, escribí el email del usuario: <span className="mono" style={{ color: 'var(--text)' }}>{user.email}</span></label>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={user.email} autoComplete="off" autoFocus />
            </div>
          )}

          <div className="dry-run">
            {I.info}<span>Vista previa:</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>1 usuario · {user.wallets.length} wallet{user.wallets.length === 1 ? '' : 's'} · {fmtUsd(user.totalUsd)}</span>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className={`btn ${config.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={submit}
            disabled={!canConfirm}
            style={!canConfirm ? { opacity: 0.5 } : {}}
          >
            {config.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useStateM(user ? {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    countryCode: user.country.code,
    kyc: user.kyc,
    role: user.role,
    twoFA: user.twoFA,
  } : null);

  if (!user || !form) return null;

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="modal-scrim" onClick={(e) => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div className="modal-h">
          <h2>Editar usuario</h2>
          <p>Los cambios quedan registrados en el log de auditoría.</p>
        </div>
        <div className="modal-b">
          <div className="fld-row">
            <div className="fld">
              <label>Nombre completo</label>
              <input value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
            <div className="fld">
              <label>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="fld-row">
            <div className="fld">
              <label>Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="mono" />
            </div>
            <div className="fld">
              <label>País</label>
              <select value={form.countryCode} onChange={e => set('countryCode', e.target.value)}>
                {window.MOCK.COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="fld-row">
            <div className="fld">
              <label>Nivel KYC</label>
              <select value={form.kyc} onChange={e => set('kyc', e.target.value)}>
                {['L0','L1','L2','L3'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="fld">
              <label>Rol</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="user">Usuario</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div className="fld" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Autenticación de dos factores</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Forzar 2FA al próximo inicio de sesión</div>
            </div>
            <label className="toggle"><input type="checkbox" checked={form.twoFA} onChange={e => set('twoFA', e.target.checked)} /></label>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmModal = ConfirmModal;
window.EditModal = EditModal;
