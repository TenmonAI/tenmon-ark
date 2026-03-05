export function danshariStyle(
  r: string,
  f: string,
  s: string
): string {
  let out = r;
  if (f) out += "\n\n" + f;
  if (s) out += "\n\n" + s;
  return out.trim();
}
