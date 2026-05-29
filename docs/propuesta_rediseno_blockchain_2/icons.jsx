// icons.jsx — small SVG icon set used across the app

const Icon = ({ d, size = 14, stroke = 1.6, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const I = {
  search:   <Icon d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3" />,
  close:    <Icon d="M6 6 18 18M6 18 18 6" />,
  chev:     <Icon d="m9 18 6-6-6-6" />,
  chevD:    <Icon d="m6 9 6 6 6-6" />,
  chevU:    <Icon d="m6 15 6-6 6 6" />,
  chevL:    <Icon d="m15 18-6-6 6-6" />,
  more:     <Icon d="M5 12h.01M12 12h.01M19 12h.01" />,
  filter:   <Icon d="M3 5h18M6 12h12M10 19h4" />,
  download: <Icon d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  plus:     <Icon d="M12 5v14M5 12h14" />,
  edit:     <Icon d="M14 4 20 10 8 22H2v-6L14 4Z" />,
  ban:      <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM5 5l14 14" />,
  unban:    <Icon d="M9 12l2 2 4-4M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />,
  freeze:   <Icon d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" />,
  trash:    <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />,
  restore:  <Icon d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />,
  copy:     <Icon d="M9 9h11v11H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />,
  ext:      <Icon d="M14 3h7v7M10 14 21 3M19 14v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />,
  warn:     <Icon d="M12 2 2 22h20L12 2ZM12 9v6M12 18h.01" />,
  info:     <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 8h.01M11 12h1v5h1" />,
  user:     <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 11h-6M19 8v6" />,
  users:    <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  wallet:   <Icon d="M3 7h18a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M16 13h2" />,
  exchange: <Icon d="M17 3v14m0 0-4-4m4 4 4-4M7 21V7m0 0L3 11m4-4 4 4" />,
  chart:    <Icon d="M3 3v18h18M7 14l4-4 4 4 5-7" />,
  shield:   <Icon d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />,
  cog:      <Icon d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.4 2.5a7 7 0 0 0-2.1 1.2L5.1 5.8l-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.9a7 7 0 0 0 2.1 1.2L10 21h4l.4-2.5a7 7 0 0 0 2.1-1.2l2.4.9 2-3.5-2-1.5c0-.4.1-.8.1-1.2Z" />,
  refresh:  <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8m0-5v5h-5M21 12a9 9 0 0 1-15 6.7L3 16m0 5v-5h5" />,
  log:      <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M9 13h6M9 17h6M9 9h2" />,
  arrowDown: <Icon d="M12 5v14M5 12l7 7 7-7" />,
  arrowUp:   <Icon d="M12 19V5M5 12l7-7 7 7" />,
  check:    <Icon d="m5 12 5 5L20 7" />,
  x:        <Icon d="M6 6 18 18M6 18 18 6" />,
  hash:     <Icon d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />,
  globe:    <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10Z" />,
  cal:      <Icon d="M3 6h18v15H3zM3 10h18M8 3v4M16 3v4" />,
  bolt:     <Icon d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  lock:     <Icon d="M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4" />,
  unlock:   <Icon d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 7-2.5" />,
  eye:      <Icon d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  columns:  <Icon d="M3 5h18v14H3zM9 5v14M15 5v14" />,
  thunder:  <Icon d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
};

window.I = I;
window.Icon = Icon;
