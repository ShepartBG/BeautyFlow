export type VisibleGame = {
  game_date: string;
  game_time?: string | null;
  status?: string | null;
};

export const PUBLIC_GAME_HOLD_HOURS = 4;

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getPublicGamesMinDate() {
  const date = new Date();
  date.setHours(date.getHours() - PUBLIC_GAME_HOLD_HOURS);

  return formatLocalDate(date);
}

export function getGameStartDateTime(game: VisibleGame) {
  if (!game.game_date) return null;

  const cleanTime = (game.game_time || "23:59").slice(0, 5) || "23:59";
  const date = new Date(`${game.game_date}T${cleanTime}:00`);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isGameStillPublic(game: VisibleGame) {
  if (game.status !== "active" && game.status !== "postponed") return false;

  const gameDateTime = getGameStartDateTime(game);
  if (!gameDateTime) return false;

  const visibleUntil = new Date(gameDateTime);
  visibleUntil.setHours(visibleUntil.getHours() + PUBLIC_GAME_HOLD_HOURS);

  return visibleUntil.getTime() >= Date.now();
}
