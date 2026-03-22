import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;
export const isConfigured = !!(url && key);

/**
 * Load a JSON value from the app_data table.
 * Returns `fallback` if Supabase is not configured or the key doesn't exist yet.
 */
export async function dbLoad(dataKey, fallback) {
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', dataKey)
      .maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Upsert a JSON value into the app_data table.
 * Silently no-ops if Supabase is not configured.
 */
export async function dbSave(dataKey, value) {
  if (!supabase) return;
  try {
    await supabase.from('app_data').upsert(
      { key: dataKey, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (e) {
    console.error('Supabase save error:', e);
  }
}
