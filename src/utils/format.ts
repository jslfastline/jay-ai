/** Small, dependency-free formatting helpers. */

export function createId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function truncate(text: string, max = 80): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function titleFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, ' ');
  if (!clean) return 'Untitled creation';
  const firstLine = clean.split(/[.\n]/)[0] ?? clean;
  return truncate(firstLine, 48);
}

export function formatDuration(seconds: number): string {
  return `${seconds}s`;
}
