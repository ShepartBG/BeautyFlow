export type FieldRequestLike = {
  id?: string | null;
  field_id?: string | null;
  field_name?: string | null;
  city?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

async function updateRequestFieldId(
  supabaseClient: SupabaseLike,
  requestId?: string | null,
  fieldId?: string | null,
) {
  if (!requestId || !fieldId) return;
  await supabaseClient
    .from("field_requests")
    .update({ field_id: fieldId })
    .eq("id", requestId);
}

async function findFieldByRequest(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike,
): Promise<string | null> {
  if (fieldRequest.field_id) return fieldRequest.field_id;

  const fieldName = clean(fieldRequest.field_name);
  const city = clean(fieldRequest.city);
  const phone = clean(fieldRequest.contact_phone || fieldRequest.phone);

  if (fieldName && city && phone) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id")
      .eq("field_name", fieldName)
      .eq("city", city)
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  if (fieldName && city) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id")
      .eq("field_name", fieldName)
      .eq("city", city)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  if (fieldName) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id")
      .eq("field_name", fieldName)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  return null;
}

export async function resolveRealFieldId(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike | null | undefined,
): Promise<string | null> {
  if (!fieldRequest) return null;

  const realId = await findFieldByRequest(supabaseClient, fieldRequest);
  if (realId && !fieldRequest.field_id) {
    await updateRequestFieldId(supabaseClient, fieldRequest.id, realId);
  }
  return realId;
}

export async function ensureRealFieldId(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike | null | undefined,
): Promise<string | null> {
  if (!fieldRequest) return null;

  const existingId = await resolveRealFieldId(supabaseClient, fieldRequest);
  if (existingId) return existingId;

  const fieldName = clean(fieldRequest.field_name);
  const city = clean(fieldRequest.city);
  const phone = clean(fieldRequest.contact_phone || fieldRequest.phone);

  if (!fieldName) return null;

  const { data, error } = await supabaseClient
    .from("fields")
    .insert({
      field_name: fieldName,
      city: city || null,
      phone: phone || null,
      rental_kits: 0,
      rental_price: 0,
      own_gear_price: 0,
    })
    .select("id")
    .single();

  if (error || !data?.id) return null;

  await updateRequestFieldId(supabaseClient, fieldRequest.id, data.id);
  return data.id;
}
