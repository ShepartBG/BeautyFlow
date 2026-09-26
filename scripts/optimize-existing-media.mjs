// One-time migration for existing public salon images. Old files remain untouched.
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local');
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const fields = [
  { table: 'salons', id: 'id', column: 'cover_url', width: 1800 },
  { table: 'salons', id: 'id', column: 'logo_url', width: 720 },
  { table: 'salon_gallery', id: 'id', column: 'image_url', width: 1920 },
  { table: 'services', id: 'id', column: 'image_url', width: 1300 },
  { table: 'staff', id: 'id', column: 'avatar_url', width: 900 },
];
const publicPrefix = `${url.replace(/\/$/, '')}/storage/v1/object/public/salon-media/`;
let processed = 0, skipped = 0, failed = 0;
for (const { table, id, column, width } of fields) {
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select(`${id},${column}`).not(column, 'is', null).order(id).range(offset, offset + 499);
    if (error) throw new Error(`${table}.${column}: ${error.message}`);
    for (const row of data || []) {
      const oldUrl = row[column];
      if (!oldUrl?.startsWith(publicPrefix) || oldUrl.includes('-optimized-')) { skipped++; continue; }
      const path = decodeURIComponent(new URL(oldUrl).pathname.split('/storage/v1/object/public/salon-media/')[1] || '');
      if (!path) { skipped++; continue; }
      if (!apply) { processed++; continue; }
      try {
        const { data: downloaded, error: downloadError } = await db.storage.from('salon-media').download(path);
        if (downloadError || !downloaded) throw downloadError || new Error('Download failed');
        const source = Buffer.from(await downloaded.arrayBuffer());
        const image = await sharp(source, { limitInputPixels: 50_000_000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 83, effort: 4 }).toBuffer();
        if (image.length >= source.length * 0.92) { skipped++; continue; }
        const newPath = `${path.replace(/\.[^/.]+$/, '')}-optimized-${crypto.randomUUID().slice(0, 8)}.webp`;
        const { error: uploadError } = await db.storage.from('salon-media').upload(newPath, image, { contentType: 'image/webp', upsert: false, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        const newUrl = db.storage.from('salon-media').getPublicUrl(newPath).data.publicUrl;
        const { error: updateError } = await db.from(table).update({ [column]: newUrl }).eq(id, row[id]).eq(column, oldUrl);
        if (updateError) throw updateError;
        processed++;
        console.log(`${table}.${column}: ${source.length} -> ${image.length} bytes`);
      } catch (error) { failed++; console.error(`${table}.${column} (${row[id]}): ${error.message}`); }
    }
    if (!data || data.length < 500) break;
  }
}
console.log(`${apply ? 'Optimized' : 'Would inspect'}: ${processed}; skipped: ${skipped}; failed: ${failed}`);
if (failed) process.exitCode = 1;
