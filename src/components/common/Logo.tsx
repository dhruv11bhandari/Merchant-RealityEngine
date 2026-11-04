export function Logo({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" width={small ? 24 : 28} height={small ? 24 : 28} />
      <span className="text-[15px] font-semibold tracking-tight">Merchant Reality Engine</span>
    </span>
  );
}
