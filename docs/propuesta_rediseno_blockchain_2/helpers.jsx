// helpers.jsx — small UI utilities and formatters

const fmtUsd = (n) => {
  if (n == null) return '—';
  if (n >= 1000000) return '$' + (n/1000000).toFixed(2) + 'M';
  if (n >= 10000) return '$' + (n/1000).toFixed(1) + 'k';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtAsset = (n, asset) => {
  const decimals = asset === 'BTC' ? 6 : (asset === 'ETH' || asset === 'SOL') ? 4 : 2;
  return Number(n).toFixed(decimals);
};

const trunc = (s, head = 6, tail = 4) => {
  if (!s) return '';
  if (s.length <= head + tail + 3) return s;
  return s.slice(0, head) + '…' + s.slice(-tail);
};

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  const now = new Date('2026-05-07T14:00:00Z').getTime();
  const d = (now - t) / 1000;
  if (d < 60) return 'hace un instante';
  if (d < 3600) return 'hace ' + Math.floor(d/60) + ' min';
  if (d < 86400) return 'hace ' + Math.floor(d/3600) + ' h';
  if (d < 86400 * 30) return 'hace ' + Math.floor(d/86400) + ' d';
  if (d < 86400 * 365) return 'hace ' + Math.floor(d/86400/30) + ' meses';
  return 'hace ' + Math.floor(d/86400/365) + ' años';
};
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Deterministic avatar color from string
const AV_COLORS = [
  ['#7c3aed','#5b21b6'], ['#0891b2','#155e75'], ['#059669','#065f46'],
  ['#dc2626','#991b1b'], ['#d97706','#92400e'], ['#2563eb','#1e40af'],
  ['#db2777','#9d174d'], ['#65a30d','#3f6212'], ['#9333ea','#6b21a8'],
];
const avColor = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
};
const initials = (name) => name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

const Avatar = ({ name, size = 26 }) => {
  const [a, b] = avColor(name);
  return (
    <span className="avt" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {initials(name)}
    </span>
  );
};

const STATUS_LABEL = {
  active: 'Activo',
  pending_kyc: 'Pendiente KYC',
  frozen: 'Congelado',
  banned: 'Baneado',
  deleted: 'Eliminado',
};
const StatusBadge = ({ status }) => (
  <span className={`bdg bdg-${status}`}>{STATUS_LABEL[status] || status}</span>
);

const MV_LABEL = {
  p2p_buy: 'P2P · Compra',
  p2p_sell: 'P2P · Venta',
  exchange_buy: 'Exchange · Compra',
  exchange_sell: 'Exchange · Venta',
  deposit: 'Depósito on-chain',
  withdraw: 'Retiro on-chain',
};

Object.assign(window, {
  fmtUsd, fmtNum, fmtAsset, trunc, timeAgo, fmtDate, fmtDateTime,
  avColor, initials, Avatar, StatusBadge, STATUS_LABEL, MV_LABEL,
});
