export function isOwnerEmail(email: string) {
  const owners = (process.env.OWNER_EMAILS || process.env.NEXT_PUBLIC_OWNER_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.trim().toLowerCase());
}
