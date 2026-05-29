// app.jsx — Main user-management module

const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "showDeleted": false,
  "accent": "#2456e6",
  "showStats": true,
  "showRowActions": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply density and accent globally
  useEffect(() => {
    document.documentElement.dataset.density = t.density === 'compact' ? 'compact' : 'comfortable';
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.density, t.accent]);

  // Local state derived from MOCK
  const [users, setUsers] = useState(window.MOCK.USERS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { action, user }
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [sortKey, setSortKey] = useState('lastActive');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  // Filter
  const filtered = useMemo(() => {
    let out = users;
    if (!t.showDeleted) out = out.filter(u => u.status !== 'deleted');
    if (statusFilter !== 'all') out = out.filter(u => u.status === statusFilter);
    if (kycFilter !== 'all') out = out.filter(u => u.kyc === kycFilter);
    if (countryFilter !== 'all') out = out.filter(u => u.country.code === countryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(u =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.wallets.some(w => w.address.toLowerCase().includes(q))
      );
    }
    out = [...out].sort((a, b) => {
      let av, bv;
      if (sortKey === 'totalUsd') { av = a.totalUsd; bv = b.totalUsd; }
      else if (sortKey === 'walletCount') { av = a.walletCount; bv = b.walletCount; }
      else if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      else if (sortKey === 'lastActive') { av = a.lastActive; bv = b.lastActive; }
      else { av = a[sortKey]; bv = b[sortKey]; }
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [users, t.showDeleted, statusFilter, kycFilter, countryFilter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [statusFilter, kycFilter, countryFilter, search, t.showDeleted]);

  // Stats from full set (not filtered)
  const stats = useMemo(() => {
    const visible = users.filter(u => u.status !== 'deleted');
    const tvl = visible.reduce((s, u) => s + u.totalUsd, 0);
    const frozenTvl = visible.filter(u => u.status === 'frozen' || u.status === 'banned').reduce((s, u) => s + u.totalUsd, 0);
    return {
      total: visible.length,
      active: visible.filter(u => u.status === 'active').length,
      banned: visible.filter(u => u.status === 'banned').length,
      frozen: visible.filter(u => u.status === 'frozen').length,
      pending: visible.filter(u => u.status === 'pending_kyc').length,
      tvl, frozenTvl,
    };
  }, [users]);

  const counts = useMemo(() => {
    const all = users.filter(u => t.showDeleted || u.status !== 'deleted');
    return {
      all: all.length,
      active: all.filter(u => u.status === 'active').length,
      pending_kyc: all.filter(u => u.status === 'pending_kyc').length,
      frozen: all.filter(u => u.status === 'frozen').length,
      banned: all.filter(u => u.status === 'banned').length,
      deleted: users.filter(u => u.status === 'deleted').length,
    };
  }, [users, t.showDeleted]);

  // Actions ----------------------------------------------------
  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };

  const performAction = ({ action, user, reason, scope }) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== user.id) return u;
      const next = { ...u, wallets: [...u.wallets], flags: { ...u.flags } };
      const audit = (a, meta) => ({ id: 'au_' + Math.random().toString(36).slice(2, 10), action: a, actor: 'admin@dropi.co', meta, at: new Date('2026-05-07T14:00:00Z').toISOString() });

      if (action === 'ban') {
        next.status = 'banned';
        next.flags.banReason = reason;
        next.wallets = next.wallets.map(w => ({ ...w, status: 'frozen' }));
        next.audit = [audit('user.banned', `Motivo: ${reason}`), ...u.audit];
      }
      if (action === 'unban') {
        next.status = 'active';
        next.flags.banReason = null;
        next.audit = [audit('user.unbanned', 'Cuenta restaurada'), ...u.audit];
      }
      if (action === 'freeze') {
        next.status = 'frozen';
        next.flags.freezeReason = reason;
        next.wallets = next.wallets.map(w => ({ ...w, status: 'frozen' }));
        next.audit = [audit('wallets.frozen', `Motivo: ${reason} · alcance: ${scope}`), ...u.audit];
      }
      if (action === 'unfreeze') {
        next.status = 'active';
        next.flags.freezeReason = null;
        next.wallets = next.wallets.map(w => ({ ...w, status: 'active' }));
        next.audit = [audit('wallets.unfrozen', 'Operativa restaurada'), ...u.audit];
      }
      if (action === 'delete') {
        next.status = 'deleted';
        next.flags.deletedAt = new Date('2026-05-07T14:00:00Z').toISOString();
        next.wallets = next.wallets.map(w => ({ ...w, status: 'frozen' }));
        next.audit = [audit('user.softDeleted', `Motivo: ${reason} · wallets congeladas automáticamente`), ...u.audit];
      }
      if (action === 'restore') {
        next.status = 'active';
        next.flags.deletedAt = null;
        next.audit = [audit('user.restored', 'Soft-delete revertido · wallets siguen congeladas'), ...u.audit];
      }
      return next;
    }));

    if (drawerUser?.id === user.id) {
      // Update drawer view too
      setTimeout(() => {
        setDrawerUser(prev => prev && users.find(u => u.id === prev.id));
      }, 0);
    }

    const labels = { ban: 'baneado', unban: 'desbaneado', freeze: 'congelado', unfreeze: 'descongelado', delete: 'eliminado', restore: 'restaurado' };
    showToast(`${user.fullName} ${labels[action]}`, 'success');
    setConfirm(null);
  };

  const saveEdit = (form) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== editing.id) return u;
      const country = window.MOCK.COUNTRIES.find(c => c.code === form.countryCode);
      const audit = { id: 'au_' + Math.random().toString(36).slice(2, 10), action: 'user.edited', actor: 'admin@dropi.co', meta: 'Datos de usuario actualizados', at: new Date().toISOString() };
      return { ...u, ...form, country, audit: [audit, ...u.audit] };
    }));
    showToast('Cambios guardados', 'success');
    setEditing(null);
  };

  // Keep drawer user fresh
  useEffect(() => {
    if (drawerUser) {
      const fresh = users.find(u => u.id === drawerUser.id);
      if (fresh && fresh !== drawerUser) setDrawerUser(fresh);
    }
  }, [users]);

  // Selection handlers
  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map(u => u.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const openUser = (u) => { setDrawerUser(u); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setDrawerUser(null), 220); };

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <TopBar />

        <div className="page">
          <div className="page-h">
            <div>
              <h1>Usuarios</h1>
              <p>Gestión de cuentas, wallets y movimientos en la plataforma.</p>
            </div>
            <div className="page-h-actions">
              <button className="btn">{I.download}<span>Exportar</span></button>
              <button className="btn btn-primary">{I.plus}<span>Crear usuario</span></button>
            </div>
          </div>

          {t.showStats && <StatCards stats={stats} />}

          <div className="toolbar">
            <div className="tabs">
              {[
                ['all', 'Todos', counts.all],
                ['active', 'Activos', counts.active],
                ['pending_kyc', 'KYC', counts.pending_kyc],
                ['frozen', 'Congelados', counts.frozen],
                ['banned', 'Baneados', counts.banned],
              ].map(([k, l, c]) => (
                <button key={k} className={`tab ${statusFilter === k ? 'active' : ''}`} onClick={() => setStatusFilter(k)}>
                  {l}<span className="count">{c}</span>
                </button>
              ))}
            </div>

            <div className="toolbar-search">
              {I.search}
              <input
                placeholder="Buscar por nombre, email, ID o dirección…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <FilterDropdown
              label="KYC"
              value={kycFilter}
              options={[['all','Cualquiera'],['L0','L0'],['L1','L1'],['L2','L2'],['L3','L3']]}
              onChange={setKycFilter}
            />
            <FilterDropdown
              label="País"
              value={countryFilter}
              options={[['all','Cualquiera'], ...window.MOCK.COUNTRIES.map(c => [c.code, `${c.flag} ${c.name}`])]}
              onChange={setCountryFilter}
            />

            <label className="toggle">
              <input type="checkbox" checked={t.showDeleted} onChange={e => setTweak('showDeleted', e.target.checked)} />
              Mostrar eliminados
              {t.showDeleted && <span className="bdg bdg-deleted" style={{ marginLeft: 4 }}>{counts.deleted}</span>}
            </label>

            <button className="btn btn-sm">{I.columns}<span>Columnas</span></button>
          </div>

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="tbl-cb">
                    <input
                      type="checkbox"
                      className={`cbx ${selected.size > 0 && selected.size < pageRows.length ? 'indeterminate' : ''}`}
                      checked={pageRows.length > 0 && selected.size === pageRows.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>KYC</th>
                  <th>País</th>
                  <th><SortHead label="Wallets" k="walletCount" sortKey={sortKey} sortDir={sortDir} onClick={sort} /></th>
                  <th className="num"><SortHead label="Saldo total" k="totalUsd" sortKey={sortKey} sortDir={sortDir} onClick={sort} right /></th>
                  <th><SortHead label="Última actividad" k="lastActive" sortKey={sortKey} sortDir={sortDir} onClick={sort} /></th>
                  <th><SortHead label="Registro" k="createdAt" sortKey={sortKey} sortDir={sortDir} onClick={sort} /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={10}><div className="empty">Sin resultados con los filtros actuales.</div></td></tr>
                )}
                {pageRows.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    selected={selected.has(u.id)}
                    onToggle={() => toggleRow(u.id)}
                    onOpen={() => openUser(u)}
                    onAction={(a) => setConfirm({ action: a, user: u })}
                    showRowActions={t.showRowActions}
                  />
                ))}
              </tbody>
            </table>

            <div className="pager">
              <div>
                Mostrando <strong>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}</strong> de <strong>{filtered.length}</strong>
              </div>
              <div className="pager-pgs">
                <button className="btn btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>{I.chevL}</button>
                <span style={{ alignSelf: 'center', fontSize: 12, padding: '0 6px' }}>Página {page} de {totalPages}</span>
                <button className="btn btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>{I.chev}</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onClear={clearSelection}
          onAction={(a) => {
            // For bulk, pick the first selected user as a stand-in to demo the modal
            const u = users.find(x => selected.has(x.id));
            setConfirm({ action: a, user: u, bulk: selected.size });
          }}
        />
      )}

      <Drawer
        user={drawerUser}
        open={drawerOpen}
        onClose={closeDrawer}
        onAction={(a, u) => {
          if (a === 'edit') setEditing(u);
          else setConfirm({ action: a, user: u });
        }}
      />

      {confirm && (
        <ConfirmModal
          action={confirm.action}
          user={confirm.user}
          onClose={() => setConfirm(null)}
          onConfirm={performAction}
        />
      )}

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1917', color: '#faf9f6', padding: '10px 14px', borderRadius: 999,
          fontSize: 12.5, fontWeight: 500, boxShadow: 'var(--shadow-lg)', zIndex: 400,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'bulk-in 0.18s ease-out',
        }}>
          <span style={{ color: '#5cd784' }}>{I.check}</span>
          {toast.msg}
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Tabla" />
        <TweakRadio label="Densidad" value={t.density}
          options={['compact','comfortable']}
          onChange={v => setTweak('density', v)} />
        <TweakToggle label="Mostrar tarjetas resumen" value={t.showStats}
          onChange={v => setTweak('showStats', v)} />
        <TweakToggle label="Acciones rápidas en filas" value={t.showRowActions}
          onChange={v => setTweak('showRowActions', v)} />
        <TweakToggle label="Mostrar usuarios eliminados" value={t.showDeleted}
          onChange={v => setTweak('showDeleted', v)} />
        <TweakSection label="Tema" />
        <TweakColor label="Acento" value={t.accent}
          options={['#2456e6', '#1f7a3a', '#7c3aed', '#c2410c', '#0e7490']}
          onChange={v => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

/* ───────── Sub-components ───────── */

function Sidebar() {
  const items = [
    ['users', 'Usuarios', I.users, true],
    ['wallets', 'Wallets', I.wallet],
    ['movements', 'Movimientos', I.exchange],
    ['p2p', 'Mercado P2P', I.users],
    ['exchange', 'Exchange', I.chart],
    ['compliance', 'Compliance', I.shield],
    ['audit', 'Auditoría', I.log],
    ['settings', 'Ajustes', I.cog],
  ];
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-brand-mark">◆</div>
        <span>Admin</span>
      </div>
      <div className="sb-section">Operaciones</div>
      {items.slice(0, 5).map(([k, l, ic, active]) => (
        <a key={k} className={`sb-link ${active ? 'active' : ''}`} href="#">{ic}<span>{l}</span></a>
      ))}
      <div className="sb-section">Plataforma</div>
      {items.slice(5).map(([k, l, ic]) => (
        <a key={k} className="sb-link" href="#">{ic}<span>{l}</span></a>
      ))}
      <div className="sb-foot">
        <div className="sb-avatar">M</div>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 500, color: 'var(--text)' }}>Manager</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>admin@dropi.co</div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="crumbs">
        <span>Plataforma</span>
        <span className="sep">/</span>
        <strong>Usuarios</strong>
      </div>
      <span className="env-pill">Producción</span>
      <div className="topbar-search">
        {I.search}
        <input placeholder="Saltar a usuario, wallet o transacción…" />
        <span className="topbar-kbd">⌘K</span>
      </div>
    </header>
  );
}

function StatCards({ stats }) {
  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-lbl">Usuarios totales</div>
        <div className="stat-val">{stats.total.toLocaleString('es-AR')}</div>
        <div className="stat-sub">
          <span className="stat-delta up">↑ 12%</span> vs. mes anterior
        </div>
      </div>
      <div className="stat">
        <div className="stat-lbl">Activos</div>
        <div className="stat-val">{stats.active.toLocaleString('es-AR')}</div>
        <div className="stat-sub">
          {Math.round(stats.active / stats.total * 100)}% del total · {stats.pending} pendientes KYC
        </div>
      </div>
      <div className="stat">
        <div className="stat-lbl">Restringidos</div>
        <div className="stat-val">{(stats.banned + stats.frozen).toLocaleString('es-AR')}</div>
        <div className="stat-sub">
          <span style={{ color: 'var(--danger)' }}>{stats.banned} baneados</span> · <span style={{ color: 'var(--info)' }}>{stats.frozen} congelados</span>
        </div>
      </div>
      <div className="stat">
        <div className="stat-lbl">Saldo bajo gestión</div>
        <div className="stat-val">{fmtUsd(stats.tvl)}</div>
        <div className="stat-sub">{fmtUsd(stats.frozenTvl)} congelado</div>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = options.find(([v]) => v === value);
  const isActive = value !== 'all';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`chip ${isActive ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        <span>{label}</span>
        {isActive && <><span style={{ opacity: 0.4 }}>·</span><span style={{ fontWeight: 500 }}>{current ? current[1] : ''}</span></>}
        {I.chevD}
      </button>
      {open && (
        <div className="menu" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 180 }}>
          {options.map(([v, l]) => (
            <div key={v} className="menu-item" onClick={() => { onChange(v); setOpen(false); }}>
              <span>{l}</span>
              {v === value && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>{I.check}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortHead({ label, k, sortKey, sortDir, onClick, right }) {
  const active = sortKey === k;
  return (
    <span className="col-sort" onClick={() => onClick(k)} style={{ float: right ? 'right' : 'none', color: active ? 'var(--text)' : undefined }}>
      {label}
      <span style={{ opacity: active ? 0.8 : 0.3, display: 'inline-flex' }}>
        {active ? (sortDir === 'asc' ? I.chevU : I.chevD) : I.chevD}
      </span>
    </span>
  );
}

function UserRow({ user, selected, onToggle, onOpen, onAction, showRowActions }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const isDeleted = user.status === 'deleted';
  const isBanned = user.status === 'banned';
  const allFrozen = user.wallets.every(w => w.status === 'frozen');

  const openMenu = (e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: r.right - 200, y: r.bottom + 4 });
    setMenuOpen(true);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = () => setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  return (
    <>
      <tr
        className={`${selected ? 'selected' : ''} ${isDeleted ? 'deleted' : ''}`}
        onClick={onOpen}
      >
        <td className="tbl-cb" onClick={e => e.stopPropagation()}>
          <input type="checkbox" className="cbx" checked={selected} onChange={onToggle} />
        </td>
        <td>
          <div className="cell-user">
            <Avatar name={user.fullName} />
            <div style={{ minWidth: 0 }}>
              <div className="name">
                {user.fullName}
                {user.role === 'staff' && <span className="bdg bdg-staff" style={{ marginLeft: 6 }}>Staff</span>}
              </div>
              <div className="em">{user.email}</div>
            </div>
          </div>
        </td>
        <td><StatusBadge status={user.status} /></td>
        <td><span className="bdg bdg-kyc mono">{user.kyc}</span></td>
        <td>
          <span title={user.country.name}>{user.country.flag} <span className="muted" style={{ fontSize: 11.5 }}>{user.country.code}</span></span>
        </td>
        <td>
          {user.walletCount} <span className="muted" style={{ fontSize: 11.5 }}>wallet{user.walletCount === 1 ? '' : 's'}</span>
          {allFrozen && <span style={{ marginLeft: 6, color: 'var(--info)', fontSize: 11.5 }} title="Todas congeladas">{I.freeze}</span>}
        </td>
        <td className="num mono">{fmtUsd(user.totalUsd)}</td>
        <td className="muted">{timeAgo(user.lastActive)}</td>
        <td className="muted">{fmtDate(user.createdAt)}</td>
        <td className="row-actions" onClick={e => e.stopPropagation()}>
          {showRowActions && (
            <button className="btn btn-sm btn-icon btn-ghost" onClick={openMenu}>{I.more}</button>
          )}
        </td>
      </tr>
      {menuOpen && (
        <RowMenu
          user={user}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          onAction={(a) => { setMenuOpen(false); onAction(a); }}
        />
      )}
    </>
  );
}

function RowMenu({ user, x, y, onClose, onAction }) {
  const isDeleted = user.status === 'deleted';
  const isBanned = user.status === 'banned';
  const allFrozen = user.wallets.every(w => w.status === 'frozen');

  return (
    <div className="menu" style={{ top: y, left: x }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <div className="menu-item" onClick={() => onAction('edit')}>{I.edit}<span>Editar datos</span></div>
      <div className="menu-item" onClick={() => onAction('view')}>{I.eye}<span>Ver detalle</span></div>
      <div className="menu-sep"></div>
      {!isBanned && !isDeleted && <div className="menu-item" onClick={() => onAction('ban')}>{I.ban}<span>Banear</span></div>}
      {isBanned && <div className="menu-item" onClick={() => onAction('unban')}>{I.unban}<span>Desbanear</span></div>}
      {!allFrozen && !isDeleted && <div className="menu-item" onClick={() => onAction('freeze')}>{I.freeze}<span>Congelar wallets</span></div>}
      {allFrozen && !isDeleted && <div className="menu-item" onClick={() => onAction('unfreeze')}>{I.unlock}<span>Descongelar</span></div>}
      <div className="menu-sep"></div>
      {!isDeleted ? (
        <div className="menu-item danger" onClick={() => onAction('delete')}>{I.trash}<span>Eliminar (soft)</span></div>
      ) : (
        <div className="menu-item" onClick={() => onAction('restore')}>{I.restore}<span>Restaurar</span></div>
      )}
    </div>
  );
}

function BulkBar({ count, onClear, onAction }) {
  return (
    <div className="bulk-bar">
      <span className="bcount">{count}</span>
      <span>seleccionado{count === 1 ? '' : 's'}</span>
      <span className="bsep"></span>
      <button className="bbtn" onClick={() => onAction('freeze')}>{I.freeze}<span>Congelar</span></button>
      <button className="bbtn" onClick={() => onAction('ban')}>{I.ban}<span>Banear</span></button>
      <button className="bbtn bbtn-d" onClick={() => onAction('delete')}>{I.trash}<span>Eliminar</span></button>
      <span className="bsep"></span>
      <button className="bbtn" onClick={onClear}>{I.close}<span>Limpiar</span></button>
    </div>
  );
}

// Edit-only handler stub (Tab key from drawer to edit)
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
