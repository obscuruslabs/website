// Read at request time, not at module load, so a Fly secret flip takes
// effect without redeploying. Case-insensitive equality only — no glob
// or regex matching, the list is explicit.

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string): boolean {
  const needle = email.trim().toLowerCase();
  if (!needle) return false;
  return adminEmails().includes(needle);
}
