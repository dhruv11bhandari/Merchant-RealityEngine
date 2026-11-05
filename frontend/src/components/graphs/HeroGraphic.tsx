const NODES = [
  { l: 'Payments', a: -90, s: 0 }, { l: 'Customers', a: -45, s: 0 }, { l: 'Geography', a: 0, s: 1 }, { l: 'Timing', a: 45, s: 1 },
  { l: 'Refunds', a: 90, s: 1 }, { l: 'Settlement', a: 135, s: 0 }, { l: 'Checkout page', a: 180, s: 1 }, { l: 'Orders', a: -135, s: 2 },
];
export function HeroGraphic() {
  const cx = 280, cy = 220, R = 160;
  return (
    <svg viewBox="50 30 460 380" className="h-full w-full" role="img" aria-label="Animated map: a merchant connected to payment, geography, timing, refund, settlement, website and order evidence">
      <defs><radialGradient id="g1"><stop offset="0" stopColor="#afafaf" stopOpacity=".28" /><stop offset="1" stopColor="#afafaf" stopOpacity="0" /></radialGradient></defs>
      <circle cx={cx} cy={cy} r={200} fill="url(#g1)" />
      {[70, 115, 160].map(r => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#242424" strokeDasharray="2 6" />)}
      {NODES.map((n, i) => {
        const x = cx + R * Math.cos((n.a * Math.PI) / 180), y = cy + R * Math.sin((n.a * Math.PI) / 180) * 0.92, col = n.s === 1 ? '#a6a6a6' : n.s === 2 ? '#535353' : '#a5a5a5', id = `p${i}`;
        return (
          <g key={n.l}>
            <path id={id} d={`M${cx},${cy} L${x},${y}`} stroke={col} strokeOpacity={0.55} strokeWidth="1.2" className={n.s === 2 ? '' : 'anim-dash'} fill="none" strokeDasharray={n.s === 2 ? '2 5' : undefined} />
            {n.s !== 2 && <circle r="2.6" fill={col}><animateMotion dur={`${2.6 + (i % 4) * 0.5}s`} repeatCount="indefinite" begin="0s"><mpath href={`#${id}`} /></animateMotion></circle>}
            <circle cx={x} cy={y} r="22" fill="#101010" stroke={col} strokeOpacity={0.7} />
            {n.s === 1 && <circle cx={x} cy={y} r="6" fill="none" stroke="#a6a6a6" className="anim-pulse" />}
            <text x={x} y={y + 4} textAnchor="middle" fontSize="9.5" fill="#d4d4d4">{n.l.length > 9 ? n.l.split(' ')[0] : n.l}</text>
            <text x={x} y={y + (y > cy ? 38 : -30)} textAnchor="middle" fontSize="10" fill="#989898">{n.s === 1 ? 'contradicts profile' : n.s === 2 ? 'unknown' : 'consistent'}</text>
          </g>);
      })}
      <circle cx={cx} cy={cy} r="34" fill="#0f0f0f" stroke="#afafaf" strokeWidth="1.5" /><circle cx={cx} cy={cy} r="34" fill="none" stroke="#afafaf" className="anim-pulse" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="#ececec">Merchant</text><text x={cx} y={cy + 12} textAnchor="middle" fontSize="9.5" fill="#989898">declared: bakery</text>
    </svg>
  );
}
