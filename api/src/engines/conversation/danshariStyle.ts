export function danshariStyle(
  reception: string,
  focus: string,
  step: string
): string {

  let out = reception;

  if (focus) {
    out += "\n\n" + focus;
  }

  if (step) {
    out += "\n\n" + step;
  }

  return out;
}
