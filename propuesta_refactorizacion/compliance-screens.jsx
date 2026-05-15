// compliance-screens.jsx — Compliance, Auditoría, Settings, Operator dashboard

function ComplianceScreen({ role = 'admin' }) {
  const nav = useNav();
  const queue = [
    { p: 'high', kind: 'KYC L2', user: 'Lucía González', country: '🇦🇷', detail: 'Selfie + comprobante de domicilio', risk: 'Bajo', age: '12 min', status: 'new' },
    { p: 'high', kind: 'AML alert', user: 'Mateo Fernández', country: '🇲🇽', detail: 'Patrón sospechoso · 12 retiros < umbral', risk: 'Alto', age: '38 min', status: 'review' },
    { p: 'high', kind: 'Sanciones OFAC', user: 'Diego López', country: '🇧🇷', detail: 'Coincidencia 87% en lista', risk: 'Crítico', age: '1 h', status: 'review' },
    { p: 'med', kind: 'KYC L3', user: 'Sofía Pérez', country: '🇨🇴', detail: 'Fuente de fondos · empleado en relación de dependencia', risk: 'Bajo', age: '2 h', status: 'new' },
    { p: 'med', kind: 'P2P disputa', user: 'Valentina Sosa', country: '🇨🇱', detail: 'Operación #4821 · USD 1,820', risk: 'Medio', age: '3 h', status: 'review' },
    { p: 'med', kind: 'KYC L2', user: 'Tomás Acosta', country: '🇵🇪', detail: 'Documento ilegible · solicitar reenvío', risk: 'Bajo', age: '4 h', status: 'new' },
    { p: 'low', kind: 'Re-KYC anual', user: 'Camila Romero', country: '🇺🇾', detail: 'Vencimiento de verificación', risk: 'Bajo', age: '8 h', status: 'new' },
    { p: 'low', kind: 'KYC L1', user: 'Joaquín Silva', country: '🇪🇸', detail: 'DNI · primer onboarding', risk: 'Bajo', age: '11 h', status: 'new' },
  ];
  return (
    <div className="scr">
      <Sidebar role={role} active="compliance" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Compliance']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Compliance · cola de trabajo</h1>
              <p className="scr-sub">KYC, AML, sanciones y disputas P2P pendientes de revisión.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.download}<span>Reporte regulatorio</span></button>
              <button className="btn btn-sm">{I.cog}<span>Reglas AML</span></button>
            </div>
          </div>

          <div className="bigstat-row">
            <div className="bigstat"><div className="lb">En cola</div><div className="vl">23</div><div className="ds"><span style={{ color: 'var(--danger)' }}>4 prioritarias</span></div></div>
            <div className="bigstat"><div className="lb">SLA cumplido (7d)</div><div className="vl" style={{ color: 'var(--success)' }}>96.4%</div><div className="ds">Objetivo: 95%</div></div>
            <div className="bigstat"><div className="lb">Tiempo medio resolución</div><div className="vl">2.4h</div><div className="ds">↓ 18 min vs. mes anterior</div></div>
            <div className="bigstat"><div className="lb">Alertas AML 24h</div><div className="vl" style={{ color: 'var(--warning)' }}>14</div><div className="ds">3 escaladas</div></div>
          </div>

          <div className="tabstrip">
            <a className="active">Todas <span className="count" style={{ background: 'var(--muted-soft)', fontSize: 10, padding: '1px 5px', borderRadius: 999, marginLeft: 4 }}>23</span></a>
            <a>KYC <span className="count" style={{ background: 'var(--muted-soft)', fontSize: 10, padding: '1px 5px', borderRadius: 999, marginLeft: 4 }}>14</span></a>
            <a style={{ color: 'var(--danger)' }}>AML <span className="count" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 10, padding: '1px 5px', borderRadius: 999, marginLeft: 4 }}>3</span></a>
            <a>Sanciones <span className="count" style={{ background: 'var(--muted-soft)', fontSize: 10, padding: '1px 5px', borderRadius: 999, marginLeft: 4 }}>2</span></a>
            <a>Disputas P2P <span className="count" style={{ background: 'var(--muted-soft)', fontSize: 10, padding: '1px 5px', borderRadius: 999, marginLeft: 4 }}>3</span></a>
            <a>Resueltas hoy <span className="count" style={{ background: 'var(--success-soft)', color: 'var(--success)', fontSize: 10, padding: '1px 5px', borderRadius: 999, marginLeft: 4 }}>42</span></a>
          </div>

          <div className="card">
            {queue.map((q, i) => (
              <div key={i} className="queue-item">
                <div className="ttl">
                  <div className={`queue-priority qp-${q.p}`}></div>
                  <Avatar name={q.user} size={32} />
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{q.user}</span>
                      <span style={{ fontSize: 11.5 }}>{q.country}</span>
                      <span className="bdg" style={{ background: q.kind.startsWith('AML') ? 'var(--danger-soft)' : q.kind.includes('Sanciones') ? 'var(--danger-soft)' : 'var(--accent-soft)', color: q.kind.startsWith('AML') || q.kind.includes('Sanciones') ? 'var(--danger)' : 'var(--accent-text)', border: 0, fontSize: 10.5 }}>{q.kind}</span>
                    </div>
                    <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>{q.detail}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Riesgo</div>
                  <div style={{ fontWeight: 600, color: q.risk === 'Crítico' ? 'var(--danger)' : q.risk === 'Alto' ? 'var(--warning)' : q.risk === 'Medio' ? 'var(--info)' : 'var(--success)' }}>{q.risk}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>hace {q.age}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => nav.openFlow('kyc-review', q)}>Revisar</button>
                  <button className="btn btn-sm btn-icon btn-ghost">{I.more}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditScreen({ role = 'admin' }) {
  const events = [
    { actor: 'admin@dropi.co',  cat: 'user',     action: 'user.banned',       detail: 'Diego López · motivo: AML alert · wallets congeladas (3)', at: '2026-05-12 09:38:11', ip: '200.45.183.112' },
    { actor: 'ops@dropi.co',    cat: 'wallet',   action: 'wallets.frozen',    detail: 'Sofía Pérez · 3 wallets · motivo: revisión KYC', at: '2026-05-12 09:24:02', ip: '200.45.183.114' },
    { actor: 'admin@dropi.co',  cat: 'treasury', action: 'treasury.mint',     detail: 'cUSD 50,000.00 → Reserva fría (mint authority)', at: '2026-05-12 09:01:47', ip: '200.45.183.112' },
    { actor: 'sistema',         cat: 'security', action: 'login.suspicious',  detail: 'Intento de acceso desde geolocalización inusual · jmartinez@gmail.com · TOR', at: '2026-05-12 08:54:21', ip: '198.96.155.3' },
    { actor: 'ops@dropi.co',    cat: 'p2p',      action: 'p2p.dispute.resolved', detail: 'Operación #4821 · fallo a favor del comprador · USD 1,820 liberados', at: '2026-05-12 08:42:09', ip: '200.45.183.114' },
    { actor: 'admin@dropi.co',  cat: 'config',   action: 'config.changed',    detail: 'Comisión P2P actualizada: 0.5% → 0.4%', at: '2026-05-12 08:30:55', ip: '200.45.183.112' },
    { actor: 'admin@dropi.co',  cat: 'user',     action: 'user.softDeleted',  detail: 'Lote masivo · 41 cuentas inactivas >180d · wallets congeladas', at: '2026-05-12 07:12:33', ip: '200.45.183.112' },
    { actor: 'sistema',         cat: 'treasury', action: 'treasury.lowFund',  detail: 'Hot USDT al 18% del piso · alerta enviada a admins', at: '2026-05-12 06:48:01', ip: '—' },
    { actor: 'ops@dropi.co',    cat: 'kyc',      action: 'kyc.approved',      detail: 'Camila Romero · L2 aprobado · revisado en 4m 12s', at: '2026-05-12 06:22:18', ip: '200.45.183.114' },
  ];
  const catColor = { user: 'var(--accent)', wallet: 'var(--info)', treasury: '#5b21b6', security: 'var(--danger)', p2p: 'var(--warning)', config: 'var(--text-2)', kyc: 'var(--success)' };
  return (
    <div className="scr">
      <Sidebar role={role} active="audit" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Auditoría']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Log de auditoría</h1>
              <p className="scr-sub">Trazabilidad inmutable de toda acción administrativa, de seguridad y de tesorería.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm">{I.cal}<span>Últimos 30 días</span></button>
              <button className="btn btn-sm">{I.download}<span>Exportar firmado</span></button>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-search">{I.search}<input placeholder="Buscar por actor, acción o detalle…" /></div>
            <span className="chip">Actor · Cualquiera {I.chevD}</span>
            <span className="chip">Categoría · Cualquiera {I.chevD}</span>
            <span className="chip">Periodo · Hoy {I.chevD}</span>
            <span className="chip">IP · Todas {I.chevD}</span>
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <div className="audit-row head">
              <span>Cuando</span><span>Actor</span><span>Evento</span><span>IP / Origen</span>
            </div>
            {events.map((e, i) => (
              <div key={i} className="audit-row">
                <div className="mono muted" style={{ fontSize: 11.5 }}>{e.at}</div>
                <div>
                  <div className="mono" style={{ fontSize: 11.5 }}>{e.actor}</div>
                  <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 50, background: catColor[e.cat] }}></span>
                    {e.cat}
                  </div>
                </div>
                <div>
                  <div className="act" style={{ color: 'var(--text)' }}>{e.action}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 1 }}>{e.detail}</div>
                </div>
                <div className="mono muted" style={{ fontSize: 11 }}>{e.ip}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ role = 'admin' }) {
  return (
    <div className="scr">
      <Sidebar role={role} active="settings" />
      <div className="main">
        <TopBar crumbs={['Plataforma', 'Ajustes']} />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Ajustes</h1>
              <p className="scr-sub">Configuración global de la plataforma.</p>
            </div>
          </div>

          <div className="settings-grid">
            <nav className="settings-nav">
              <a className="active">General</a>
              <a>Comisiones</a>
              <a>Activos y redes</a>
              <a>Límites operativos</a>
              <a>Roles y permisos</a>
              <a>Seguridad</a>
              <a>Notificaciones</a>
              <a>Integraciones · API</a>
              <a>Marca y dominio</a>
              <a>Datos · Backup</a>
            </nav>

            <div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Información general</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-2)' }}>Nombre, dominios y entorno operativo.</p>
                  </div>
                  <button className="btn btn-sm btn-primary">Guardar cambios</button>
                </div>

                <div className="fld"><label>Nombre comercial</label><input defaultValue="Cadena" /></div>
                <div className="fld-row">
                  <div className="fld"><label>Razón social</label><input defaultValue="Cadena S.A." /></div>
                  <div className="fld"><label>CUIT / Tax ID</label><input defaultValue="30-71849256-3" className="mono" /></div>
                </div>
                <div className="fld-row">
                  <div className="fld"><label>Email de soporte</label><input defaultValue="soporte@cadena.app" /></div>
                  <div className="fld"><label>Dominio</label><input defaultValue="app.cadena.app" /></div>
                </div>
                <div className="fld"><label>Zona horaria</label><select defaultValue="ART"><option>America/Argentina/Buenos_Aires (ART, UTC-3)</option></select></div>
              </div>

              <div className="card" style={{ padding: 20, marginTop: 14 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Modo de operación</h3>
                {[
                  ['Aceptar nuevos registros', true, 'Cierra el formulario público de signup si se desactiva.'],
                  ['Operaciones P2P', true, 'Permite ofertas y matches entre usuarios.'],
                  ['Exchange', true, 'Habilita órdenes de mercado y límite.'],
                  ['Retiros on-chain', true, 'Si se desactiva, sólo movimientos internos.'],
                  ['Modo mantenimiento', false, 'Sólo administradores pueden operar.'],
                ].map(([l, v, d], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 0 }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{l}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{d}</div>
                    </div>
                    <label className="toggle"><input type="checkbox" defaultChecked={v} /></label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OperatorDashboard() {
  const nav = useNav();
  return (
    <div className="scr">
      <Sidebar role="operator" active="dashboard" />
      <div className="main">
        <TopBar crumbs={['Operativa', 'Resumen']} env="Producción" />
        <div className="page">
          <div className="scr-h">
            <div>
              <h1 className="scr-title">Operativa · tu turno</h1>
              <p className="scr-sub">Cola asignada y SLA pendientes.</p>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => nav.openFlow('kyc-review', { user: 'Mateo Fernández', country: '🇲🇽', kind: 'AML alert', risk: 'Alto', age: '6 min' })}>{I.bolt}<span>Tomar siguiente caso</span></button>
          </div>

          <div className="bigstat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="bigstat"><div className="lb">Casos asignados</div><div className="vl">14</div><div className="ds">7 nuevos · 7 en revisión</div></div>
            <div className="bigstat"><div className="lb">Cerrados hoy</div><div className="vl" style={{ color: 'var(--success)' }}>23</div><div className="ds">Promedio resolución: 18m</div></div>
            <div className="bigstat"><div className="lb">SLA vencidos</div><div className="vl" style={{ color: 'var(--danger)' }}>1</div><div className="ds">Disputa P2P #4821</div></div>
            <div className="bigstat"><div className="lb">Próximo vence en</div><div className="vl" style={{ color: 'var(--warning)' }}>27m</div><div className="ds">AML alert · Mateo F.</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div className="card">
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Tu cola priorizada</div>
                <div className="tabs">
                  <button className="tab active">Hoy</button>
                  <button className="tab">Semana</button>
                </div>
              </div>
              {[
                { p: 'high', kind: 'AML alert', user: 'Mateo Fernández', sla: '27m restantes', risk: 'Alto' },
                { p: 'high', kind: 'Disputa P2P #4821', user: 'Valentina Sosa', sla: 'Vencido 4m', risk: 'Medio' },
                { p: 'med', kind: 'KYC L2', user: 'Lucía González', sla: '3h 12m', risk: 'Bajo' },
                { p: 'med', kind: 'KYC L2', user: 'Tomás Acosta', sla: '4h 02m', risk: 'Bajo' },
                { p: 'low', kind: 'Re-KYC anual', user: 'Camila Romero', sla: '1d 4h', risk: 'Bajo' },
              ].map((q, i) => (
                <div key={i} className="queue-item">
                  <div className="ttl">
                    <div className={`queue-priority qp-${q.p}`}></div>
                    <Avatar name={q.user} size={28} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{q.kind} · {q.user}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>SLA: <span style={{ color: q.sla.startsWith('Vencido') ? 'var(--danger)' : q.sla.includes('h') && parseInt(q.sla) < 1 ? 'var(--warning)' : 'inherit' }}>{q.sla}</span> · Riesgo {q.risk}</div>
                    </div>
                  </div>
                  <div></div>
                  <button className="btn btn-sm"
                    onClick={() => q.kind.includes('Disputa')
                      ? nav.openFlow('dispute', { buyer: q.user, seller: 'GauchoCripto', amount: '1,820.00', asset: 'USDT', opId: '4821' })
                      : nav.openFlow('kyc-review', { user: q.user, country: '🇦🇷', kind: q.kind, risk: q.risk, age: q.sla })
                    }>Tomar</button>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mi rendimiento</div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>Comparado con el equipo · últimos 7 días</div>
              {[
                ['Casos resueltos', '142', '128', 'up'],
                ['Tiempo medio', '18m', '24m', 'up'],
                ['SLA cumplido', '98.2%', '95.1%', 'up'],
                ['Re-aperturas', '3', '4', 'up'],
              ].map(([l, v, p, dir], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 0 }}>
                  <div style={{ fontSize: 12.5 }}>{l}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                    <span className="muted" style={{ fontSize: 11 }}>vs {p}</span>
                    <span className={`pill pill-${dir}`}>{dir === 'up' ? '↑' : '↓'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ComplianceScreen, AuditScreen, SettingsScreen, OperatorDashboard });
