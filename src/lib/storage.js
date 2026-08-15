import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const ROW_ID = "main";

// Reads the whole season blob ({ rotation, weeks }) or null if nothing's
// been saved yet.
export async function getSeason() {
  const { data, error } = await supabase.from("season").select("data").eq("id", ROW_ID).maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

// Overwrites the whole season blob. Everyone shares this one row.
export async function setSeason(payload) {
  const { error } = await supabase
    .from("season")
    .upsert({ id: ROW_ID, data: payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Live updates: fires callback(newData) whenever anyone else saves.
// Returns an unsubscribe function.
export function subscribeToSeason(callback) {
  const channel = supabase
    .channel("season-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "season", filter: `id=eq.${ROW_ID}` },
      (payload) => {
        if (payload.new && payload.new.data) callback(payload.new.data);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
