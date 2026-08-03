export function generateWorkerCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `WRK-HYD-${stamp}${rand}`.slice(0, 24);
}
