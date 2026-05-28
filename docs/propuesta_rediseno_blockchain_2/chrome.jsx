// chrome.jsx — role-aware sidebar/topbar, shared bits, fake QR, sparkline

const { useState: useStateCh, useEffect: useEffectCh } = React;

// ── Navigation context (used by interactive prototype) ───────────────
// Static contexts fall through to no-op handlers so screens render
// safely inside the design canvas too.
const NavCtx = React.createContext({
  navigate: () => {},
  openFlow: () => {},
  toast: () => {},
  role: 'admin',
});

const useNav = () => React.useContext(NavCtx);

// ── Role config ─────────────────────────────────────────────────────
const ROLE = {
  admin:    { label: 'Administrador', color: '#7c3aed', short: 'AD' },
  operator: { label: 'Operador',      color: '#0891b2', short: 'OP' },
  user:     { label: 'Viewer',        color: '#1f7a3a', short: 'VW' },
};

const NAV = {
  admin: [
    { group: 'Operaciones', items: [
      ['dashboard', 'Resumen',         I.chart],
      ['users',     'Usuarios',        I.users],
      ['wallets',   'Wallets',         I.wallet],
      ['treasury',  'Tesorería',       I.shield],
      ['movements', 'Movimientos',     I.exchange],
      ['sends',     'Envíos',          I.arrowUp],
    ]},
    { group: 'Blockchain', items: [
      ['chain',     'Cadena',          I.hash],
      ['mempool',   'Mempool',         I.log],
      ['nodes',     'Nodos',           I.globe],
      ['validation','Validación',      I.check],
      ['health',    'Health',          I.bolt],
    ]},
    { group: 'Mercado', items: [
      ['p2p',       'Mercado P2P',     I.users],
      ['exchange',  'Exchange',        I.exchange],
      ['currencies','Monedas',         I.globe],
      ['rates',     'Tasas de cambio', I.exchange],
    ]},
    { group: 'Plataforma', items: [
      ['compliance','Compliance',      I.shield],
      ['permissions','Permisos',       I.lock],
      ['audit',     'Auditoría',       I.log],
      ['settings',  'Ajustes',         I.cog],
    ]},
  ],
  operator: [
    { group: 'Operaciones', items: [
      ['dashboard', 'Resumen',         I.chart],
      ['users',     'Usuarios',        I.users],
      ['wallets',   'Wallets',         I.wallet],
      ['movements', 'Movimientos',     I.exchange],
    ]},
    { group: 'Blockchain', items: [
      ['chain',     'Cadena',          I.hash],
      ['mempool',   'Mempool',         I.log],
      ['nodes',     'Nodos',           I.globe],
    ]},
    { group: 'Cola de trabajo', items: [
      ['compliance','Compliance',      I.shield],
      ['p2p',       'Mercado P2P',     I.users],
    ]},
    { group: 'Plataforma', items: [
      ['audit',     'Auditoría',       I.log],
      ['settings',  'Ajustes',         I.cog],
    ]},
  ],
  user: [
    { group: 'Cuenta', items: [
      ['portfolio', 'Mi portafolio',   I.chart],
      ['wallets',   'Mis wallets',     I.wallet],
      ['send',      'Enviar / Recibir',I.exchange],
      ['history',   'Historial',       I.log],
    ]},
    { group: 'Operar', items: [
      ['p2p',       'Mercado P2P',     I.users],
      ['exchange',  'Exchange',        I.exchange],
    ]},
    { group: 'Cuenta', items: [
      ['kyc',       'Verificación',    I.shield],
      ['settings',  'Ajustes',         I.cog],
    ]},
  ],
};

function Sidebar({ role = 'admin', active }) {
  const r = ROLE[role];
  const nav = useNav();
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-brand-mark">◆</div>
        <span>Cadena</span>
      </div>
      {NAV[role].map((sec, i) => (
        <React.Fragment key={i}>
          <div className="sb-section">{sec.group}</div>
          {sec.items.map(([k, l, ic]) => (
            <a key={k} className={`sb-link ${active === k ? 'active' : ''}`}
               href="#"
               onClick={(e) => { e.preventDefault(); nav.navigate(k); }}>
              {ic}<span>{l}</span>
            </a>
          ))}
        </React.Fragment>
      ))}
      <div className="sb-foot">
        <div className="sb-avatar" style={{ background: `linear-gradient(135deg, ${r.color}, #555)` }}>{r.short}</div>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 500, color: 'var(--text)' }}>{r.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {role === 'admin' ? 'admin@dropi.co' : role === 'operator' ? 'ops@dropi.co' : 'jmartinez@gmail.com'}
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ crumbs = [], env = 'Producción', search = 'Saltar a usuario, wallet o transacción…', right }) {
  const nav = useNav();
  const [notifOpen, setNotifOpen] = useStateCh(false);
  const hasNotifs = window.NotificationsPanel != null;
  useEffectCh(() => {
    if (!notifOpen) return;
    const onDoc = () => setNotifOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.slice(0, -1).map((c, i) => (
          <React.Fragment key={i}>
            <span>{c}</span>
            <span className="sep">/</span>
          </React.Fragment>
        ))}
        <strong>{crumbs[crumbs.length - 1]}</strong>
      </div>
      {env && <span className="env-pill">{env}</span>}
      <div className="topbar-search">
        {I.search}
        <input placeholder={search} />
        <span className="topbar-kbd">⌘K</span>
      </div>
      {hasNotifs && (
        <div style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setNotifOpen(o => !o)}
            style={{ position: 'relative' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 50, background: 'var(--danger)' }}></span>
          </button>
          {notifOpen && <window.NotificationsPanel role={nav.role} onClose={() => setNotifOpen(false)} />}
        </div>
      )}
      {right}
    </header>
  );
}

// ── Fake QR (deterministic from seed) ────────────────────────────────
function FakeQR({ seed = 'abc', size = 160, dark = '#1a1917', light = '#fff' }) {
  // 25x25 module grid
  const N = 25;
  // Hash from seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // Build grid: 3 finder squares + scattered modules
  const cells = [];
  const isFinder = (x, y) => (
    (x < 7 && y < 7) || (x >= N-7 && y < 7) || (x < 7 && y >= N-7)
  );
  const inFinder = (x, y) => {
    // Draw the standard finder pattern
    const corners = [[0,0],[N-7,0],[0,N-7]];
    for (const [cx, cy] of corners) {
      const rx = x - cx, ry = y - cy;
      if (rx >= 0 && rx < 7 && ry >= 0 && ry < 7) {
        if (rx === 0 || rx === 6 || ry === 0 || ry === 6) return true;
        if (rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4) return true;
        return false;
      }
    }
    return null;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const f = inFinder(x, y);
      if (f !== null) { if (f) cells.push([x, y]); continue; }
      if (rand() < 0.48) cells.push([x, y]);
    }
  }
  const cs = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill={light} />
      {cells.map(([x, y], i) => (
        <rect key={i} x={x * cs} y={y * cs} width={cs} height={cs} fill={dark} rx={cs * 0.1} />
      ))}
    </svg>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color = '#1a1917', fill = false, height = 36 }) {
  const w = 120; const h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && <path d={area} fill={color} opacity={0.12} />}
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Asset pill ───────────────────────────────────────────────────────
function AssetPill({ asset }) {
  const cls = 'asset-' + asset.toLowerCase();
  return (
    <span className={`asset-pill ${cls}`}>
      <span className="dot">{asset[0]}</span>
      <span>{asset}</span>
    </span>
  );
}

// ── Address chip (copyable) ──────────────────────────────────────────
function AddrChip({ addr, head = 6, tail = 4, dark }) {
  return (
    <span className={`addr-chip ${dark ? 'dark' : ''}`}>
      <span>{addr.slice(0, head)}…{addr.slice(-tail)}</span>
      <button className="copy-btn" title="Copiar dirección">{I.copy}</button>
    </span>
  );
}

// ── Mobile status bar / tab bar ──────────────────────────────────────
function MobStatus() {
  return (
    <div className="mob-status">
      <span>09:41</span>
      <div className="right">
        <svg width="16" height="10" viewBox="0 0 16 10"><path d="M0 9h2v1H0V9Zm4-2h2v3H4V7Zm4-3h2v6H8V4Zm4-3h2v9h-2V1Z" fill="currentColor"/></svg>
        <svg width="14" height="10" viewBox="0 0 14 10"><path d="M7 .5C4.6.5 2.4 1.4.7 3l1.4 1.4C3.4 3 5.1 2.3 7 2.3c1.9 0 3.6.7 4.9 2L13.3 3C11.6 1.4 9.4.5 7 .5Zm0 3.5c-1.4 0-2.7.5-3.7 1.4l1.4 1.4C5.5 6.3 6.2 6 7 6c.8 0 1.5.3 2.3 1l1.4-1.4C9.7 4.5 8.4 4 7 4Zm0 3.6c-.5 0-1 .2-1.4.5L7 9.5l1.4-1.4c-.4-.3-.9-.5-1.4-.5Z" fill="currentColor"/></svg>
        <svg width="22" height="10" viewBox="0 0 22 10"><rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor" fill="none"/><rect x="19.5" y="3.5" width="1.5" height="3" rx=".5" fill="currentColor"/><rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor"/></svg>
      </div>
    </div>
  );
}

function MobTabBar({ active }) {
  const items = [
    ['home', 'Inicio', I.chart],
    ['wallet', 'Wallets', I.wallet],
    ['send', 'Enviar', I.exchange],
    ['p2p', 'P2P', I.users],
    ['profile', 'Cuenta', I.user],
  ];
  return (
    <div className="mob-tabbar">
      {items.map(([k, l, ic]) => (
        <div key={k} className={`mob-tab ${active === k ? 'active' : ''}`}>
          {React.cloneElement(ic, { props: { size: 18 } })}
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar, FakeQR, Sparkline, AssetPill, AddrChip, MobStatus, MobTabBar, ROLE, NAV, NavCtx, useNav });
