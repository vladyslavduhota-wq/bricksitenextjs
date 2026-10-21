/** Same rule as place_bid() in SQL: nickname, else "Taras S.", or null when anonymous. */
export function publicName(p: { full_name: string; display_name: string | null; show_anonymously: boolean }) {
  if (p.show_anonymously) return null;
  const nick = p.display_name?.trim();
  if (nick) return nick;
  const [first = "", last = ""] = p.full_name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
}
