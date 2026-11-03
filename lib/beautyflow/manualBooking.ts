// Manual booking by the salon (owner or specialist for their own schedule).
// Free slots are computed by the same public availability code as for clients; manual mode only
// drops the online-client rules (minimum notice, how far ahead), never the schedule itself.
import { requireBusinessUser } from "@/lib/beautyflow/businessAuth";

/** True when the request asks for manual mode and comes from a signed-in member of this salon. */
export async function isManualRequest(req: Request, salonId: string) {
  if (new URL(req.url).searchParams.get("manual") !== "1" || !salonId) return false;
  const auth = await requireBusinessUser(req);
  return auth.ok && auth.business.id === salonId;
}

/** In manual mode any future time today counts; the notice is one minute and the range one year. */
export const MANUAL_MIN_NOTICE_MINUTES = 1;
export const MANUAL_MAX_DAYS = 365;
