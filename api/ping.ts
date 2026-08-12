import { createClient } from '@supabase/supabase-js';

type PingRequest = { method?: string };
type PingResponse = { status: (code: number) => PingResponse; json: (body: unknown) => void };

export default async function handler(req: PingRequest, res: PingResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.from('trucks').select('id').limit(1);
    if (error) throw error;
    res.status(200).json({ ok: true, checkedAt: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, error: 'Database ping failed' });
  }
}
