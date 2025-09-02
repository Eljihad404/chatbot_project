export const getInitials = (username = "") => {
  const parts = username
    .replace(/[_.-]+/g, " ")
    .trim()
    .split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const p = parts[0] || "";
  return (p[0] || "").toUpperCase() + (p[1] || "").toUpperCase();
};
