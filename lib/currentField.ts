import { supabase } from "@/lib/supabase";
import { isOwnerEmail } from "@/lib/access";
import { ensureRealFieldId } from "@/lib/fieldIdentity";

export type CurrentFieldContext = {
  userEmail: string;
  isOwner: boolean;
  fieldId: string | null;
};

type FieldProfile = {
  id: string;
  field_id?: string | null;
  field_name?: string | null;
  city?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  status?: string | null;
  access_status?: string | null;
};

export async function getCurrentFieldContext(): Promise<CurrentFieldContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user?.email) {
    throw new Error(userError?.message || "Няма активна login сесия.");
  }

  const userEmail = userData.user.email.toLowerCase();
  const owner = isOwnerEmail(userEmail);

  const { data: fieldProfile, error: fieldError } = await supabase
    .from("field_requests")
    .select("id,field_id,field_name,city,phone,contact_phone,status,access_status")
    .eq("email", userEmail)
    .in("status", ["active", "payment_pending", "suspended"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<FieldProfile>();

  if (fieldError) {
    throw new Error(fieldError.message);
  }

  if (!fieldProfile?.id) {
    if (owner) return { userEmail, isOwner: true, fieldId: null };
    throw new Error("Не намерих активен профил/салон за този акаунт.");
  }

  const realFieldId = await ensureRealFieldId(supabase, fieldProfile);

  if (!realFieldId) {
    if (owner) return { userEmail, isOwner: true, fieldId: null };
    throw new Error("Не намерих реалния field_id за този собственик.");
  }

  return { userEmail, isOwner: owner, fieldId: realFieldId };
}

export function requireFieldId(context: CurrentFieldContext) {
  if (!context.fieldId && !context.isOwner) {
    throw new Error("Липсва field_id за този собственик.");
  }

  return context.fieldId;
}
