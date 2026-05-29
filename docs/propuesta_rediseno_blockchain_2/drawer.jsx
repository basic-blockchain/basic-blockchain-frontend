// drawer.jsx — User detail drawer

const { useState, useEffect, useMemo } = React;

function Drawer({ user, open, onClose, onAction }) {
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (open) setTab('overview');
  }, [user?.id, open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!user) return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`drawer ${open ? 'open' : ''}`}></div>
    </>
  );

  const isDeleted = user.status === 'deleted';
  const isBanned = user.status === 'banned';
  const isFrozen = user.status === 'frozen';
  const allFrozen = user.wallets.every(w => w.status === 'frozen');

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-label="Detalle del usuario">
        <header className="drawer-head">
          <div className="drawer-top">
            <span className="drawer-id mono">{user.id}</span>
            <button className="copy-btn" title="Copiar ID">{I.copy}</button>
            {user.role === 'staff' && <span className="bdg bdg-staff">Staff</span>}
            <button className="btn btn-ghost btn-icon drawer-x" onClick={onClose} title="Cerrar (Esc)">{I.close}</button>
          </div>

          <div className="drawer-user">
            <Avatar name={user.fullName} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{user.fullName}</div>
              <div className="meta">
                <span>{user.email}</span>
                <span className="dot"></span>
                <span>{user.country.flag} {user.country.name}</span>
                <span className="dot"></span>
                <span>KYC <span className="bdg bdg-kyc">{user.kyc}</span></span>
                <span className="dot"></span>
                <StatusBadge status={user.status} />
              </div>
            </div>
            <div className="drawer-actions">
              <button className="btn btn-sm" onClick={() => onAction('edit', user)}>{I.edit}<span>Editar</span></button>
              {!isBanned && !isDeleted && <button className="btn btn-sm" onClick={() => onAction('ban', user)}>{I.ban}<span>Banear</span></button>}
              {isBanned && <button className="btn btn-sm" onClick={() => onAction('unban', user)}>{I.unban}<span>Desbanear</span></button>}
              {!allFrozen && !isDeleted && <button className="btn btn-sm" onClick={() => onAction('freeze', user)}>{I.freeze}<span>Congelar</span></button>}
              {allFrozen && !isDeleted && <button className="btn btn-sm" onClick={() => onAction('unfreeze', user)}>{I.unlock}<span>Descongelar</span></button>}
              {!isDeleted && <button className="btn btn-sm btn-danger" onClick={() => onAction('delete', user)}>{I.trash}<span>Eliminar</span></button>}
              {isDeleted && <button className="btn btn-sm" onClick={() => onAction('restore', user)}>{I.restore}<span>Restaurar</span></button>}
            </div>
          </div>
        </header>

        <nav className="drawer-tabs">
          {[
            ['overview','Resumen'],
            ['wallets','Wallets', user.wallets.length],
            ['movements','Movimientos', user.movements.length],
            ['kyc','KYC'],
            ['audit','Auditoría', user.audit.length],
          ].map(([k, label, count]) => (
            <button key={k} className={`drawer-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <span>{label}</span>
              {count != null && <span className="count">{count}</span>}
            </button>
          ))}
        </nav>

        <div className="drawer-body">
          {isDeleted && (
            <div className="drawer-banner muted">{I.trash}<div><b>Usuario eliminado.</b> Soft-delete aplicado el {fmtDate(user.flags.deletedAt)}. Cuenta inactivada y todas las wallets congeladas automáticamente.</div></div>
          )}
          {isBanned && (
            <div className="drawer-banner danger">{I.ban}<div><b>Cuenta baneada.</b> Motivo: {user.flags.banReason}. No puede operar ni iniciar sesión.</div></div>
          )}
          {isFrozen && !isBanned && !isDeleted && (
            <div className="drawer-banner info">{I.freeze}<div><b>Cuenta congelada.</b> Motivo: {user.flags.freezeReason}. Lectura permitida, operaciones bloqueadas.</div></div>
          )}
          {user.status === 'pending_kyc' && (
            <div className="drawer-banner warn">{I.warn}<div><b>KYC pendiente.</b> El usuario aún no completó verificación de identidad.</div></div>
          )}

          {tab === 'overview' && <OverviewTab user={user} />}
          {tab === 'wallets' && <WalletsTab user={user} onAction={onAction} />}
          {tab === 'movements' && <MovementsTab user={user} />}
          {tab === 'kyc' && <KycTab user={user} />}
          {tab === 'audit' && <AuditTab user={user} />}
        </div>
      </aside>
    </>
  );
}

function OverviewTab({ user }) {
  const totalP2P = user.movements.filter(m => m.type.startsWith('p2p')).length;
  const totalEx = user.movements.filter(m => m.type.startsWith('exchange')).length;
  const volume = user.movements.reduce((s, m) => s + m.amountUsd, 0);

  return (
    <>
      <div className="section-h">Identidad</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        <div className="kvs">
          <div>ID</div><div className="mono">{user.id}</div>
          <div>Nombre completo</div><div>{user.fullName}</div>
          <div>Email</div><div>{user.email}</div>
          <div>Teléfono</div><div className="mono">{user.phone}</div>
          <div>País</div><div>{user.country.flag} {user.country.name} ({user.country.code})</div>
          <div>Rol</div><div>{user.role === 'staff' ? <span className="bdg bdg-staff">Staff</span> : 'Usuario'}</div>
          <div>2FA</div><div>{user.twoFA ? <span style={{ color: 'var(--success)' }}>Activado</span> : <span className="muted">Desactivado</span>}</div>
          <div>Registro</div><div>{fmtDateTime(user.createdAt)} <span className="muted">· {timeAgo(user.createdAt)}</span></div>
          <div>Última actividad</div><div>{fmtDateTime(user.lastActive)} <span className="muted">· {timeAgo(user.lastActive)}</span></div>
        </div>
      </div>

      <div className="section-h">Resumen on-chain</div>
      <div className="stats" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat">
          <div className="stat-lbl">Saldo total</div>
          <div className="stat-val">{fmtUsd(user.totalUsd)}</div>
          <div className="stat-sub">{user.wallets.length} wallet{user.wallets.length === 1 ? '' : 's'} · {user.wallets.filter(w => w.status === 'frozen').length} congelada{user.wallets.filter(w => w.status === 'frozen').length === 1 ? '' : 's'}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Operaciones P2P</div>
          <div className="stat-val tnum">{totalP2P}</div>
          <div className="stat-sub">últimos 90 días</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Volumen total</div>
          <div className="stat-val">{fmtUsd(volume)}</div>
          <div className="stat-sub">P2P + Exchange</div>
        </div>
      </div>
    </>
  );
}

function WalletsTab({ user, onAction }) {
  return (
    <>
      <div className="section-h">
        <span>Wallets ({user.wallets.length})</span>
        <div className="right">
          <button className="btn btn-sm">{I.plus}<span>Crear wallet</span></button>
        </div>
      </div>
      <div className="card">
        {user.wallets.map(w => (
          <div key={w.id} className="card-row">
            <div className="wallet-asset">{w.asset}</div>
            <div className="wallet-meta">
              <div className="top">
                <span>{w.network}</span>
                <span className={`bdg bdg-${w.status === 'frozen' ? 'frozen' : 'active'}`}>{w.status === 'frozen' ? 'Congelada' : 'Activa'}</span>
                <span className="muted" style={{ fontSize: 11.5, fontWeight: 400 }}>· creada {fmtDate(w.createdAt)}</span>
              </div>
              <div className="addr">{trunc(w.address, 14, 8)} <button className="copy-btn">{I.copy}</button></div>
            </div>
            <div className="wallet-bal">
              <div className="b mono">{fmtAsset(w.balance, w.asset)} {w.asset}</div>
              <div className="u">≈ {fmtUsd(w.balanceUsd)}</div>
            </div>
            <button className="btn btn-sm btn-icon" title="Acciones">{I.more}</button>
          </div>
        ))}
      </div>
    </>
  );
}

function MovementsTab({ user }) {
  const [filter, setFilter] = useState('all');
  const filtered = user.movements.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'p2p') return m.type.startsWith('p2p');
    if (filter === 'exchange') return m.type.startsWith('exchange');
    if (filter === 'onchain') return m.type === 'deposit' || m.type === 'withdraw';
    return true;
  });

  return (
    <>
      <div className="section-h">
        <span>Movimientos ({filtered.length})</span>
        <div className="right">
          <div className="tabs" style={{ marginRight: 6 }}>
            {[['all','Todos'],['p2p','P2P'],['exchange','Exchange'],['onchain','On-chain']].map(([k,l]) => (
              <button key={k} className={`tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-sm">{I.download}<span>Exportar</span></button>
        </div>
      </div>
      <div className="card">
        <table className="tbl" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Activo</th>
              <th className="num">Monto</th>
              <th>Estado</th>
              <th>Cuando</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const isBuy = m.type.endsWith('buy') || m.type === 'deposit';
              const isP2P = m.type.startsWith('p2p');
              const isOnchain = m.type === 'deposit' || m.type === 'withdraw';
              const cls = isOnchain ? (isBuy ? 'mv-dep' : 'mv-wd') : (isBuy ? 'mv-buy' : 'mv-sell');
              const ic = isBuy ? I.arrowDown : I.arrowUp;
              return (
                <tr key={m.id}>
                  <td><div className="mv-type"><span className={`mv-ic ${cls}`}>{ic}</span>{MV_LABEL[m.type]}</div></td>
                  <td className="mono" style={{ fontWeight: 500 }}>{m.asset}</td>
                  <td className="num mono">{m.amount}<div style={{ fontSize: 11, color: 'var(--text-3)' }}>≈ {fmtUsd(m.amountUsd)}</div></td>
                  <td><span className={`bdg bdg-${m.status === 'completed' ? 'active' : m.status === 'pending' ? 'pending_kyc' : 'banned'}`}>{m.status === 'completed' ? 'Completado' : m.status === 'pending' ? 'Pendiente' : 'Fallido'}</span></td>
                  <td className="muted">{timeAgo(m.createdAt)}</td>
                  <td>{m.txHash && <button className="btn btn-sm btn-icon btn-ghost" title={m.txHash}>{I.ext}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KycTab({ user }) {
  return (
    <>
      <div className="section-h">Verificación KYC</div>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {user.kyc}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Nivel {user.kyc} {user.kyc === 'L0' ? '· sin verificar' : user.kyc === 'L3' ? '· verificación completa' : '· básica'}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 2 }}>
              {user.kyc === 'L0' && 'Solo email verificado. Límites de operación restringidos.'}
              {user.kyc === 'L1' && 'DNI/Pasaporte verificado. Límite USD 1.000 mensuales.'}
              {user.kyc === 'L2' && 'Selfie + comprobante de domicilio. Límite USD 50.000 mensuales.'}
              {user.kyc === 'L3' && 'Verificación completa con fuente de fondos. Sin límites.'}
            </div>
          </div>
        </div>
      </div>

      <div className="section-h">Documentos</div>
      <div className="card">
        {[
          ['DNI / Pasaporte', user.kyc !== 'L0' ? 'verified' : 'missing'],
          ['Selfie con documento', ['L2','L3'].includes(user.kyc) ? 'verified' : (user.kyc === 'L1' ? 'pending' : 'missing')],
          ['Comprobante de domicilio', ['L2','L3'].includes(user.kyc) ? 'verified' : 'missing'],
          ['Fuente de fondos', user.kyc === 'L3' ? 'verified' : 'missing'],
        ].map(([label, st]) => (
          <div key={label} className="card-row" style={{ padding: '10px 14px' }}>
            <div style={{ flex: 1 }}>{label}</div>
            <span className={`bdg bdg-${st === 'verified' ? 'active' : st === 'pending' ? 'pending_kyc' : 'deleted'}`}>
              {st === 'verified' ? 'Verificado' : st === 'pending' ? 'En revisión' : 'Sin enviar'}
            </span>
            {st === 'verified' && <button className="btn btn-sm btn-ghost btn-icon">{I.eye}</button>}
          </div>
        ))}
      </div>
    </>
  );
}

function AuditTab({ user }) {
  return (
    <>
      <div className="section-h">
        <span>Auditoría ({user.audit.length} eventos)</span>
        <div className="right">
          <button className="btn btn-sm">{I.download}<span>Exportar log</span></button>
        </div>
      </div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {user.audit.map(ev => (
          <div key={ev.id} className="audit-item">
            <div className="audit-dot"></div>
            <div className="audit-meta">
              <div className="audit-action">{ev.action}</div>
              <div className="audit-detail">{ev.meta} · por <span className="mono" style={{ color: 'var(--text-2)' }}>{ev.actor}</span></div>
            </div>
            <div className="audit-when">{fmtDateTime(ev.at)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

window.Drawer = Drawer;
