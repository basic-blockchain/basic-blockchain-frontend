// Mock data for the user management module.
// Realistic-ish blockchain platform users with wallets, balances and movements.

const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
];

const FIRST = ['Lucía','Mateo','Sofía','Diego','Valentina','Tomás','Camila','Joaquín','Martina','Benjamín','Isabella','Nicolás','Renata','Emiliano','Antonella','Bruno','Catalina','Facundo','Florencia','Gabriel','Helena','Iván','Julieta','Kevin','Laura','Manuel','Natalia','Octavio','Paula','Ramiro'];
const LAST  = ['González','Rodríguez','Fernández','López','Martínez','Pérez','García','Sánchez','Romero','Sosa','Álvarez','Torres','Ruiz','Ramírez','Flores','Acosta','Benítez','Medina','Herrera','Silva','Castro','Ortiz','Núñez','Vega','Molina','Cabrera','Ibarra','Suárez','Reyes','Aguirre'];

const STATUSES = ['active','active','active','active','active','pending_kyc','frozen','banned','deleted'];
const KYC_LEVELS = ['L0','L1','L1','L2','L2','L3'];

// Deterministic pseudo-random using string seed
function seedRand(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n, d = 2) { return String(n).padStart(d, '0'); }
function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }
function hex(r, n) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(r() * 16)];
  return out;
}

function genWallets(r, status) {
  const count = 1 + Math.floor(r() * 3); // 1-3 wallets
  const wallets = [];
  const assets = ['BTC','ETH','USDT','USDC','SOL','MATIC'];
  for (let i = 0; i < count; i++) {
    const asset = assets[Math.floor(r() * assets.length)];
    const isEvm = ['ETH','USDT','USDC','MATIC'].includes(asset);
    const addr = isEvm ? '0x' + hex(r, 40) : (asset === 'BTC' ? 'bc1q' + hex(r, 38) : hex(r, 44));
    let walletStatus = 'active';
    if (status === 'frozen' || status === 'banned' || status === 'deleted') walletStatus = 'frozen';
    if (status === 'active' && r() < 0.08) walletStatus = 'frozen';
    wallets.push({
      id: 'w_' + hex(r, 8),
      asset,
      address: addr,
      network: isEvm ? 'Ethereum' : (asset === 'BTC' ? 'Bitcoin' : asset === 'SOL' ? 'Solana' : 'Mainnet'),
      balance: r() * (asset === 'BTC' ? 2 : asset === 'ETH' ? 30 : 50000),
      balanceUsd: 0, // filled below
      status: walletStatus,
      createdAt: daysAgo(r, 30 + Math.floor(r()*400)),
    });
  }
  // Approx USD valuations
  const px = { BTC: 67500, ETH: 3450, USDT: 1, USDC: 1, SOL: 165, MATIC: 0.72 };
  let total = 0;
  for (const w of wallets) {
    w.balanceUsd = w.balance * px[w.asset];
    total += w.balanceUsd;
  }
  return { wallets, totalUsd: total };
}

function daysAgo(r, d) {
  const now = new Date('2026-05-07T14:00:00Z').getTime();
  return new Date(now - d * 86400000 - Math.floor(r() * 86400000)).toISOString();
}

function genMovements(r, userId, count) {
  const types = ['p2p_buy','p2p_sell','exchange_buy','exchange_sell','deposit','withdraw'];
  const assets = ['BTC','ETH','USDT','USDC','SOL'];
  const movs = [];
  for (let i = 0; i < count; i++) {
    const type = pick(types, r);
    const asset = pick(assets, r);
    const isP2P = type.startsWith('p2p');
    const counterparty = isP2P ? ('user_' + pad(Math.floor(r()*999), 4)) : null;
    movs.push({
      id: 'mv_' + hex(r, 10),
      type,
      asset,
      amount: (r() * (asset === 'BTC' ? 0.5 : asset === 'ETH' ? 5 : 1000)).toFixed(asset === 'BTC' ? 6 : 4),
      amountUsd: r() * 8000 + 50,
      counterparty,
      txHash: r() < 0.7 ? '0x' + hex(r, 64) : null,
      status: r() < 0.85 ? 'completed' : (r() < 0.5 ? 'pending' : 'failed'),
      createdAt: daysAgo(r, Math.floor(r() * 90)),
    });
  }
  return movs.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

function genAudit(r, userId) {
  const actions = [
    { action: 'user.created', actor: 'sistema', meta: 'Registro vía email' },
    { action: 'kyc.submitted', actor: 'usuario', meta: 'L1 → L2 solicitado' },
    { action: 'kyc.approved', actor: 'admin@dropi.co', meta: 'L2 aprobado' },
    { action: 'wallet.created', actor: 'sistema', meta: 'Wallet ETH creada' },
    { action: 'login.success', actor: 'usuario', meta: 'IP 200.x.x.x · Buenos Aires' },
    { action: 'p2p.completed', actor: 'sistema', meta: 'Operación P2P #4821' },
    { action: 'user.edited', actor: 'admin@dropi.co', meta: 'Email actualizado' },
  ];
  const out = [];
  const n = 3 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = pick(actions, r);
    out.push({
      id: 'au_' + hex(r, 8),
      ...a,
      at: daysAgo(r, Math.floor(r() * 60)),
    });
  }
  return out.sort((a,b) => b.at.localeCompare(a.at));
}

function makeUser(i) {
  const r = seedRand('u' + i + '_v3');
  const first = pick(FIRST, r);
  const last = pick(LAST, r);
  const country = pick(COUNTRIES, r);
  const status = pick(STATUSES, r);
  const kyc = status === 'pending_kyc' ? 'L0' : pick(KYC_LEVELS, r);
  const { wallets, totalUsd } = genWallets(r, status);
  const id = 'usr_' + pad(i, 5);
  const handle = (first.toLowerCase().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c])) + '.' + last.toLowerCase().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c])));
  return {
    id,
    fullName: first + ' ' + last,
    email: handle + (Math.floor(r()*99)) + '@' + pick(['gmail.com','protonmail.com','outlook.com','dropi.co'], r),
    phone: '+' + pick(['54','52','57','56','51','598','55','34'], r) + ' ' + pad(Math.floor(r()*999),3) + ' ' + pad(Math.floor(r()*9999),4),
    country,
    kyc,
    status,
    role: r() < 0.05 ? 'staff' : 'user',
    wallets,
    totalUsd,
    walletCount: wallets.length,
    createdAt: daysAgo(r, 30 + Math.floor(r()*700)),
    lastActive: status === 'deleted' ? daysAgo(r, 90 + Math.floor(r()*200)) : daysAgo(r, Math.floor(r()*30)),
    twoFA: r() < 0.7,
    flags: {
      banReason: status === 'banned' ? pick(['Sospecha de fraude','Múltiples cuentas','AML alert','Solicitud regulatoria'], r) : null,
      freezeReason: status === 'frozen' ? pick(['Revisión KYC','AML hold','Solicitud del usuario'], r) : null,
      deletedAt: status === 'deleted' ? daysAgo(r, Math.floor(r()*60)) : null,
    },
    movements: genMovements(r, id, 8 + Math.floor(r()*15)),
    audit: genAudit(r, id),
  };
}

const USERS = Array.from({ length: 32 }, (_, i) => makeUser(i + 1));

window.MOCK = { USERS, COUNTRIES };
