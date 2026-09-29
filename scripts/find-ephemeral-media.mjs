import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Липсват NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local.");
  process.exitCode = 1;
} else {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const tables = ["platform_design_settings", "salons", "salon_gallery", "services", "staff"];
  let found = 0;

  function inspect(value, table, id, path = "") {
    if (typeof value === "string") {
      if (/blob:https?:\/\//i.test(value)) {
        found++;
        console.log(`${table} | id=${id} | поле=${path} | временен адрес=${value.match(/blob:https?:\/\/[^\s"')]+/i)?.[0] || "blob:"}`);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, table, id, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([name, item]) => inspect(item, table, id, path ? `${path}.${name}` : name));
    }
  }

  for (const table of tables) {
    for (let start = 0; ; start += 500) {
      const { data, error } = await db.from(table).select("*").range(start, start + 499);
      if (error) {
        console.error(`${table}: ${error.message}`);
        process.exitCode = 1;
        break;
      }
      for (const row of data || []) inspect(row, table, row.id ?? "няма id");
      if (!data || data.length < 500) break;
    }
  }
  console.log(`Открити временни адреси: ${found}. Данните не са променяни.`);
}
