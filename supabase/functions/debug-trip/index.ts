import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('trips')
    .select('id, origin, destination, pickup_latitude, pickup_longitude, drop_latitude, drop_longitude, last_latitude, last_longitude, route_distance_meters, route_progress_percent')
    .eq('is_active', true);

  return new Response(JSON.stringify({ data, error }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
});
