// permissions-screen.jsx — Admin · Permisos
// Lista de usuarios staff (ADMIN/OPERATOR) con sus permisos y rápido acceso a editarlos.

const { useState: useSp, useMemo: useMp } = React;

function PermissionsScreen({ role = 'admin' }) {
  const nav = useNav();
  const [search, setSearch] = useSp('');
  const [filterRole, setFilterRole] = useSp('all');

  // Demo data — staff users with their permission sets
  const staffUsers = useMp(() => ([
    { id: 'usr_00001', name: 'María Acosta',   email: 'admin@dropi.co',    role: 'ADMIN',    country: '🇦🇷', last: 'hace 4 min',  perms: DEFAULT_PERMS_BY_ROLE.ADMIN },
    { id: 'usr_00002', name: 'Sergio Romero',  email: 'sergio@dropi.co',   role: 'ADMIN',    country: '🇦🇷', last: 'hace 1 h',    perms: DEFAULT_PERMS_BY_ROLE.ADMIN },
    { id: 'usr_00003', name: 'Daniela Kim',    email: 'daniela@dropi.co',  role: 'ADMIN',    country: '🇲🇽', last: 'hace 3 h',    perms: [...DEFAULT_PERMS_BY_ROLE.ADMIN].filter(p => p !== 'TREASURY_MANAGE') },
    { id: 'usr_00010', name: 'Pablo Iturri',   email: 'pablo@dropi.co',    role: 'OPERATOR', country: '🇦🇷', last: 'hace 12 min', perms: DEFAULT_PERMS_BY_ROLE.OPERATOR },
    { id: 'usr_00011', name: 'Renata Vega',    email: 'renata@dropi.co',   role: 'OPERATOR', country: '🇨🇴', last: 'hace 28 min', perms: DEFAULT_PERMS_BY_ROLE.OPERATOR },
    { id: 'usr_00012', name: 'Camila Ortiz',   email: 'camila.o@dropi.co', role: 'OPERATOR', country: '🇨🇱', last: 'hace 2 h',    perms: [...DEFAULT_PERMS_BY_ROLE.OPERATOR, 'EXPORT_TX'] },
    { id: 'usr_00013', name: 'Luis Mendoza',   email: 'luis.m@dropi.co',   role: 'OPERATOR', country: '🇲🇽', last: 'hace 5 h',    perms: DEFAULT_PERMS_BY_ROLE.OPERATOR.filter(p => p !== 'P2P_DISPUTE') },
    { id: 'usr_00014', name: 'Antonella Vega', email: 'anto@dropi.co',     role: 'OPERATOR', country: '🇺🇾', last: 'hace 1 d',    perms: DEFAULT_PERMS_BY_ROLE.OPERATOR },
  ]), []);

  const filtered = useMp(() => staffUsers.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (search.trim() && !(u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [staffUsers, search, filterRole]);

  const stats = useMp(() => ({
    total: staffUsers.length,
    admins: staffUsers.filter(u => u.role === 'ADMIN').length,
    operators: staffUsers.filter(u => u.role === 'OPERATOR').length,
    custom: staffUsers.filter(u => {
      const base = new Set(DEFAULT_PERMS_BY_ROLE[u.role]);
      return u.perms.length !== base.size || u.perms.some(p => !base.has(p));
    }).length,
  }), [staffUsers]);

  return (
    <div className="scr">
      <Sidebar role={role} active="permissions" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Permisos']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Permisos</h1>
              <p className="scr-sub">Gestión granular de permisos para ADMIN y OPERATOR · registrado en auditoría.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.download}<span>Exportar matriz</span></button>
              <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('create-user', {})}>{I.plus}<span>Crear usuario staff</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">Usuarios staff</div><div className="vl">{stats.total}</div><div className="ds">con acceso administrativo</div></div>
            <div className="bigstat"><div className="lb">Administradores</div><div className="vl">{stats.admins}</div><div className="ds">acceso total · firmas duales</div></div>
            <div className="bigstat"><div className="lb">Operadores</div><div className="vl">{stats.operators}</div><div className="ds">cola compliance + soporte</div></div>
            <div className="bigstat"><div className="lb">Con custom</div><div className="vl" style={{ color: 'var(--warning)' }}>{stats.custom}</div><div className="ds">desviados del preset</div></div>
          </div>

          <div className="toolbar">
            <div className="tabs">
              <button className={`tab ${filterRole === 'all' ? 'active' : ''}`} onClick={() => setFilterRole('all')}>Todos <span className="count">{staffUsers.length}</span></button>
              <button className={`tab ${filterRole === 'ADMIN' ? 'active' : ''}`} onClick={() => setFilterRole('ADMIN')}>ADMIN <span className="count">{stats.admins}</span></button>
              <button className={`tab ${filterRole === 'OPERATOR' ? 'active' : ''}`} onClick={() => setFilterRole('OPERATOR')}>OPERATOR <span className="count">{stats.operators}</span></button>
            </div>
            <div className="toolbar-search">
              {I.search}<input placeholder="Buscar por nombre o email…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span className="chip">Permiso · Cualquiera {I.chevD}</span>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Permisos activos</th>
                  <th>Permisos críticos</th>
                  <th>Última actividad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const base = new Set(DEFAULT_PERMS_BY_ROLE[u.role]);
                  const isCustom = u.perms.length !== base.size || u.perms.some(p => !base.has(p));
                  const critical = u.perms.filter(p => ['MINT','BURN','APPROVE_TX','TREASURY_MANAGE','CONFIG_EDIT'].includes(p));
                  return (
                    <tr key={u.id} style={{ cursor: 'pointer' }}
                        onClick={() => nav.openFlow('permissions', { user: u, permissions: u.perms })}>
                      <td>
                        <div className="cell-user">
                          <Avatar name={u.name} size={26} />
                          <div><div className="name">{u.name} <span style={{ fontSize: 11 }}>{u.country}</span></div><div className="em">{u.email}</div></div>
                        </div>
                      </td>
                      <td><span className="bdg" style={{ background: u.role === 'ADMIN' ? '#ede9fe' : 'var(--info-soft)', color: u.role === 'ADMIN' ? '#5b21b6' : 'var(--info)', border: 0, fontFamily: 'var(--font-mono)' }}>{u.role}</span></td>
                      <td>
                        <span className="mono" style={{ fontWeight: 500 }}>{u.perms.length}</span>
                        {isCustom && <span className="bdg" style={{ marginLeft: 6, background: 'var(--warning-soft)', color: 'var(--warning)', border: 0, fontSize: 10 }}>custom</span>}
                      </td>
                      <td>
                        {critical.length === 0
                          ? <span className="muted">—</span>
                          : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {critical.slice(0, 3).map(c => <span key={c} className="bdg" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: 0, fontSize: 10, fontFamily: 'var(--font-mono)' }}>{c}</span>)}
                              {critical.length > 3 && <span className="muted" style={{ fontSize: 11 }}>+{critical.length - 3}</span>}
                            </div>
                          )
                        }
                      </td>
                      <td className="muted">{u.last}</td>
                      <td className="row-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-icon btn-ghost" onClick={() => nav.openFlow('permissions', { user: u, permissions: u.perms })}>{I.edit}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12, marginTop: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Cambios recientes</div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 12 }}>Últimas modificaciones de permisos (registradas en auditoría).</div>
              {[
                ['Camila Ortiz', '+ EXPORT_TX', 'admin@dropi.co', 'hace 8 min'],
                ['Daniela Kim',  '− TREASURY_MANAGE', 'admin@dropi.co', 'hace 2 h'],
                ['Luis Mendoza', '− P2P_DISPUTE', 'admin@dropi.co', 'ayer'],
                ['Pablo Iturri', 'rol VIEWER → OPERATOR · +10 permisos', 'admin@dropi.co', 'hace 3 d'],
              ].map((r, i, a) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0, fontSize: 12 }}>
                  <Avatar name={r[0]} size={22} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{r[0]}</div>
                    <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{r[1]} · por {r[2]}</div>
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>{r[3]}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Cobertura de permisos críticos</div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 12 }}>Cuántos staff pueden hacer cada operación crítica.</div>
              {[
                ['MINT', 3, 'mínimo recomendado: 2', 'ok'],
                ['BURN', 3, 'mínimo recomendado: 2', 'ok'],
                ['APPROVE_TX', 8, 'mínimo recomendado: 3', 'ok'],
                ['TREASURY_MANAGE', 2, 'mínimo recomendado: 2', 'warn'],
                ['CONFIG_EDIT', 3, 'mínimo recomendado: 2', 'ok'],
              ].map(([p, count, hint, st], i, a) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0 }}>
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, minWidth: 140 }}>{p}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{count} usuarios</div>
                    <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{hint}</div>
                  </div>
                  <span className="bdg" style={{ background: st === 'ok' ? 'var(--success-soft)' : 'var(--warning-soft)', color: st === 'ok' ? 'var(--success)' : 'var(--warning)', border: 0, fontSize: 10 }}>
                    {st === 'ok' ? '✓ ok' : '⚠ atención'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PermissionsScreen = PermissionsScreen;
