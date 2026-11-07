const NODES = [
  { l: 'Payments', a: -90, s: 0 }, { l: 'Customers', a: -45, s: 0 }, { l: 'Geography', a: 0, s: 1 }, { l: 'Timing', a: 45, s: 1 },
  { l: 'Refunds', a: 90, s: 1 }, { l: 'Settlement', a: 135, s: 0 }, { l: 'Checkout page', a: 180, s: 1 }, { l: 'Orders', a: -135, s: 2 },
];
export function HeroGraphic() {
  const cx = 280, cy = 220, R = 160;
  return (
    <svg viewBox="50 30 460 380" className="h-full w-full" role="img" aria-label="Animated map: a merchant connected to payment, geography, timing, refund, settlement, website and order evidence">
      <defs><radialGradient id="g1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".28" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient></defs>
      <circle cx={cx} cy={cy} r={200} fill="url(#g1)" />
      {[70, 115, 160].map(r => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#1a2538" strokeDasharray="2 6" />)}
      {NODES.map((n, i) => {
        const x = cx + R * Math.cos((n.a * Math.PI) / 180), y = cy + R * Math.sin((n.a * Math.PI) / 180) * 0.92, col = n.s === 1 ? '#f59e0b' : n.s === 2 ? '#475569' : '#38bdf8', id = `p${i}`;
        return (
          <g key={n.l}>
            <path id={id} d={`M${cx},${cy} L${x},${y}`} stroke={col} strokeOpacity={0.55} strokeWidth="1.2" className={n.s === 2 ? '' : 'anim-dash'} fill="none" strokeDasharray={n.s === 2 ? '2 5' : undefined} />
            {n.s !== 2 && <circle r="2.6" fill={col}><animateMotion dur={`${2.6 + (i % 4) * 0.5}s`} repeatCount="indefinite" begin="0s"><mpath href={`#${id}`} /></animateMotion></circle>}
            <circle cx={x} cy={y} r="22" fill="#0a101b" stroke={col} strokeOpacity={0.7} />
            {n.s === 1 && <circle cx={x} cy={y} r="6" fill="none" stroke="#f59e0b" className="anim-pulse" />}
            <text x={x} y={y + 4} textAnchor="middle" fontSize="9.5" fill="#cbd5e1">{n.l.length > 9 ? n.l.split(' ')[0] : n.l}</text>
            <text x={x} y={y + (y > cy ? 38 : -30)} textAnchor="middle" fontSize="10" fill="#8a99b3">{n.s === 1 ? 'contradicts profile' : n.s === 2 ? 'unknown' : 'consistent'}</text>
          </g>);
      })}
      <circle cx={cx} cy={cy} r="34" fill="#06101c" stroke="#22d3ee" strokeWidth="1.5" /><circle cx={cx} cy={cy} r="34" fill="none" stroke="#22d3ee" className="anim-pulse" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="#e6edf7">Merchant</text><text x={cx} y={cy + 12} textAnchor="middle" fontSize="9.5" fill="#8a99b3">declared: bakery</text>
    </svg>
  );
}
