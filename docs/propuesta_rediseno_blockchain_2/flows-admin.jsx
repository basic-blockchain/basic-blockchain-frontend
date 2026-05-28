// flows-admin.jsx — Admin interactivity: wallet drawer, audit detail,
// send detail, currency create/edit. Wired to the screens via NavCtx.openFlow.

const { useState: useSa, useEffect: useEa } = React;

/* ─── Wallet Detail Drawer (side panel) ────────────────────── */

function WalletDetailDrawer({ data, onClose, onAction }) {
  const w = data.wallet;
  const [tab, setTab] = useSa('overview');
  useEa(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!w) return null;
  const isFrozen = w.status === 'frozen';
  return (
    <>
      <div className="scrim open" onClick={onClose}></div>
      <aside className="drawer open" style={{ width: 640 }} role="dialog">
        <header className="drawer-head">
          <div className="drawer-top">
            <span className="drawer-id mono">{w.id || 'w_' + Math.random().toString(36).slice(2,10)}</span>
            <button className="copy-btn" title="Copiar ID">{I.copy}</button>
            <button className="btn btn-ghost btn-icon drawer-x" onClick={onClose}>{I.close}</button>
          </div>
          <div className="drawer-user">
            <div className="wallet-asset" style={{ width: 44, height: 44, fontSize: 12 }}>{w.asset}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{w.bal} {w.asset}</div>
              <div className="meta">
                <span className="mono" style={{ fontSize: 12 }}>≈ {w.usd}</span>
                <span className="dot"></span>
                <span>{w.net}</span>
                <span className="dot"></span>
                <span className={`bdg bdg-${isFrozen ? 'frozen' : 'active'}`}>{isFrozen ? 'Congelada' : 'Activa'}</span>
              </div>
            </div>
            <div className="drawer-actions">
              {!isFrozen
                ? <button className="btn btn-sm" onClick={() => onAction('freeze', w)}>{I.freeze}<span>Congelar</span></button>
                : <button className="btn btn-sm" onClick={() => onAction('unfreeze', w)}>{I.unlock}<span>Descongelar</span></button>}
              <button className="btn btn-sm">{I.ext}<span>Explorer</span></button>
            </div>
          </div>
        </header>
        <nav className="drawer-tabs">
          {[['overview','Resumen'],['movements','Movimientos',8],['keys','Llaves'],['audit','Auditoría',5]].map(([k, l, c]) => (
            <button key={k} className={`drawer-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <span>{l}</span>{c && <span className="count">{c}</span>}
            </button>
          ))}
        </nav>
        <div className="drawer-body">
          {isFrozen && (
            <div className="drawer-banner info">{I.freeze}<div><b>Wallet congelada.</b> Operaciones bloqueadas · solo lectura.</div></div>
          )}
          {tab === 'overview' && (
            <>
              <div className="section-h">Propietario</div>
              <div className="card" style={{ padding: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={w.user} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{w.user}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{w.email}</div>
                  </div>
                  <button className="btn btn-sm">Ver perfil</button>
                </div>
              </div>
              <div className="section-h">Datos</div>
              <div className="card" style={{ padding: '4px 14px' }}>
                <div className="kvs">
                  <div>Dirección</div><div className="mono" style={{ fontSize: 11 }}>{w.addr}<button className="copy-btn">{I.copy}</button></div>
                  <div>Red</div><div>{w.net}</div>
                  <div>Activo</div><div>{w.asset}</div>
                  <div>Balance</div><div className="mono">{w.bal} {w.asset}</div>
                  <div>Valor USD</div><div className="mono">{w.usd}</div>
                  <div>Creada</div><div>hace 142 días</div>
                  <div>Última actividad</div><div>hace 8 min</div>
                </div>
              </div>
            </>
          )}
          {tab === 'movements' && (
            <>
              <div className="section-h">Últimos movimientos</div>
              <div className="card" style={{ padding: 0 }}>
                {[
                  ['Recibido', '+500.00', 'mv-buy', I.arrowDown, 'hace 8 min'],
                  ['Envío P2P', '-120.00', 'mv-sell', I.arrowUp, 'hace 2 h'],
                  ['Compra exchange', '+0.0240', 'mv-buy', I.arrowDown, 'hace 4 h'],
                  ['Retiro on-chain', '-1,200.00', 'mv-wd', I.arrowUp, 'ayer'],
                ].map((r, i, a) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0 }}>
                    <span className={`mv-ic ${r[2]}`} style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}>{r[3]}</span>
                    <div style={{ flex: 1, fontSize: 12.5 }}>{r[0]}</div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{r[1]} {w.asset}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{r[4]}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'keys' && (
            <>
              <div className="drawer-banner warn">{I.warn}<div>Las claves privadas no se exponen vía API. Sólo se pueden rotar.</div></div>
              <div className="card" style={{ padding: 14 }}>
                <div className="kvs">
                  <div>Public key</div><div className="mono" style={{ fontSize: 11 }}>{w.addr.slice(0,40)}…<button className="copy-btn">{I.copy}</button></div>
                  <div>Algoritmo</div><div>secp256k1</div>
                  <div>Fingerprint</div><div className="mono">a8:c4:f9:d1:2b:3e:7f:1a</div>
                </div>
                <button className="btn" style={{ marginTop: 14 }}>{I.refresh}<span>Rotar par de llaves</span></button>
              </div>
            </>
          )}
          {tab === 'audit' && (
            <div className="card" style={{ padding: '4px 14px' }}>
              {[
                ['wallet.created', 'Wallet inicial creada al onboarding del usuario', 'hace 142 d'],
                ['wallet.deposit', 'Primer depósito desde tesorería', 'hace 142 d'],
                ['wallet.frozen', 'Congelada por revisión KYC (ops@dropi.co)', 'hace 14 d'],
                ['wallet.unfrozen', 'Descongelada · KYC L2 aprobado', 'hace 12 d'],
                ['wallet.rotated', 'Rotación de par de llaves', 'hace 3 d'],
              ].map((e, i, a) => (
                <div key={i} className="audit-item">
                  <div className="audit-dot"></div>
                  <div className="audit-meta">
                    <div className="audit-action">{e[0]}</div>
                    <div className="audit-detail">{e[1]}</div>
                  </div>
                  <div className="audit-when">{e[2]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ─── Audit Event Detail ──────────────────────────────────── */

function AuditEventFlow({ data, onClose }) {
  const e = data.event;
  return (
    <div className="modal-scrim" onClick={ev => ev.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 580 }}>
        <div className="modal-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h2 className="mono" style={{ fontSize: 15 }}>{e.action}</h2>
            <p>{e.at} · por <span className="mono">{e.actor}</span></p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>{I.close}</button>
        </div>
        <div className="modal-b">
          <div className="dry-run" style={{ marginBottom: 14 }}>
            {I.shield}<span>Firmado HMAC:</span>
            <span className="mono" style={{ color: 'var(--text)', fontSize: 11 }}>a8c4…11e9</span>
            <span className="bdg bdg-active" style={{ marginLeft: 'auto' }}>válido</span>
          </div>
          <div className="card" style={{ padding: '4px 14px', marginBottom: 14 }}>
            <div className="kvs">
              <div>Actor</div><div className="mono">{e.actor}</div>
              <div>Categoría</div><div>{e.cat}</div>
              <div>IP origen</div><div className="mono">{e.ip}</div>
              <div>User agent</div><div className="mono" style={{ fontSize: 11 }}>Mozilla/5.0 · Chrome 142</div>
              <div>Timestamp</div><div className="mono">{e.at}</div>
              <div>Detalle</div><div>{e.detail}</div>
            </div>
          </div>
          <div className="section-h">Cambios</div>
          <div className="card" style={{ padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
            <div style={{ color: 'var(--danger)' }}>- status: "active"</div>
            <div style={{ color: 'var(--success)' }}>+ status: "{e.cat === 'user' ? 'banned' : 'frozen'}"</div>
            <div style={{ color: 'var(--success)' }}>+ reason: "{e.detail.split('·')[0]}"</div>
            <div style={{ color: 'var(--success)' }}>+ ts: "{e.at}"</div>
          </div>
          <div className="section-h">Eventos relacionados</div>
          <div className="card" style={{ padding: '4px 14px' }}>
            {[['wallets.frozen', 'antes', '3 wallets congeladas en cascada'], ['notification.sent', 'después', 'usuario notificado por email']].map((r, i) => (
              <div key={i} className="audit-item">
                <div className="audit-dot"></div>
                <div className="audit-meta">
                  <div className="audit-action">{r[0]}</div>
                  <div className="audit-detail">{r[2]}</div>
                </div>
                <div className="audit-when">{r[1]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary">{I.download}<span>Exportar firmado</span></button>
        </div>
      </div>
    </div>
  );
}

/* ─── Send Detail (clickable row in Sends/movements) ──────── */

function SendDetailFlow({ data, onClose }) {
  const r = data.row;
  return (
    <div className="modal-scrim" onClick={ev => ev.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-h">
          <h2>Envío {r.type.toLowerCase()}</h2>
          <p>{r.ref} · {r.when}</p>
        </div>
        <div className="modal-b">
          <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 14 }}>
            <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monto</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{r.amount} {r.asset}</div>
            <div className="muted" style={{ fontSize: 12 }}>≈ ${r.amount} USD</div>
          </div>
          <div className="card" style={{ padding: '4px 14px' }}>
            <div className="kvs">
              <div>Tipo</div><div><span className="bdg" style={{ background: r.type === 'On-chain' ? '#ecf6fa' : r.type === 'Tesorería' ? '#ede9fe' : 'var(--surface-2)', color: r.type === 'On-chain' ? 'var(--info)' : r.type === 'Tesorería' ? '#5b21b6' : 'var(--text-2)', border: '1px solid var(--border)' }}>{r.type}</span></div>
              <div>De</div><div className="mono" style={{ fontSize: 12 }}>{r.from}</div>
              <div>Para</div><div className="mono" style={{ fontSize: 11.5 }}>{r.to}</div>
              <div>Activo</div><div>{r.asset}</div>
              <div>Hash / Ref</div><div className="mono" style={{ fontSize: 11 }}>{r.ref}<button className="copy-btn">{I.copy}</button></div>
              <div>Estado</div><div><span className={`bdg bdg-${r.status === 'completed' ? 'active' : r.status === 'pending' ? 'pending_kyc' : 'banned'}`}>{r.status === 'completed' ? 'Completado' : r.status === 'pending' ? 'Pendiente' : 'Fallido'}</span></div>
              {r.conf && (<><div>Confirmaciones</div><div className="mono">{r.conf}</div></>)}
            </div>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cerrar</button>
          {r.status === 'failed' && <button className="btn btn-primary">{I.refresh}<span>Reintentar</span></button>}
          {r.status !== 'failed' && <button className="btn btn-primary">{I.ext}<span>Ver en explorer</span></button>}
        </div>
      </div>
    </div>
  );
}

/* ─── Currency Create / Edit ──────────────────────────────── */

function CurrencyFormFlow({ data, onClose, onComplete }) {
  const isEdit = !!data.code;
  const [form, setForm] = useSa({
    code: data.code || '',
    name: data.name || '',
    decimals: data.decimals || 8,
    type: data.type || 'native',
    active: data.active !== false,
  });
  return (
    <div className="modal-scrim" onClick={e => e.target.classList.contains('modal-scrim') && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-h">
          <h2>{isEdit ? 'Editar moneda' : 'Nueva moneda'}</h2>
          <p>{isEdit ? form.code + ' · cambios quedan en auditoría' : 'Quedará disponible para wallets y rates.'}</p>
        </div>
        <div className="modal-b">
          <div className="fld-row">
            <div className="fld"><label>Code</label><input className="mono" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} disabled={isEdit} /></div>
            <div className="fld"><label>Nombre</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          </div>
          <div className="fld-row">
            <div className="fld"><label>Decimales</label><input className="mono" type="number" value={form.decimals} onChange={e => setForm({...form, decimals: +e.target.value})} /></div>
            <div className="fld"><label>Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="native">native</option>
                <option value="stablecoin">stablecoin</option>
                <option value="platform">platform</option>
              </select>
            </div>
          </div>
          <div className="fld" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Activa</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Si está inactiva, no aparece en formularios de wallet ni rate.</div>
            </div>
            <label className="toggle"><input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} /></label>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!form.code || !form.name} onClick={() => { onComplete && onComplete(form); onClose(); }}>{isEdit ? 'Guardar' : 'Crear moneda'}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WalletDetailDrawer, AuditEventFlow, SendDetailFlow, CurrencyFormFlow });
