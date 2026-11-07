/** Demo-grade identifier hashing (FNV-1a variant). Production should use salted HMAC-SHA256 with managed keys. */
export function hashId(raw: string, salt = 'mre-demo'): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0xdeadbeef;
  const s = salt + '|' + raw;
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619);
    h2 ^= s.charCodeAt(i) + i; h2 = Math.imul(h2, 2246822519);
  }
  return 'h_' + (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0').slice(0, 4);
}
