// Proxy for the AG Studio AI assistant. The adapter runs in the browser and posts here.
// This adds the OpenAI key on the server and streams the reply back, so the key never reaches the browser.
const KEY = () => process.env.OPENAI_API_KEY || '';
const MODELS = () => (process.env.OPENAI_MODELS || process.env.AI_MODEL || 'gpt-5.6-luna').split(',').map((s) => s.trim()).filter(Boolean);

const err = (status: number, message: string) => Response.json({ error: { message } }, { status });

export async function POST(request: Request) {
  if (!KEY()) return err(503, 'Set OPENAI_API_KEY in .env.local to use the Studio assistant.');
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return err(400, 'Body must be JSON.'); }
  const models = MODELS();
  const model = typeof body.model === 'string' && body.model ? body.model : models[0];
  if (!models.includes(model)) return err(400, `Model ${model} is not enabled.`);
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY()}` },
    body: JSON.stringify({ ...body, model, max_output_tokens: 16000 }),
    signal: request.signal,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', 'Cache-Control': 'no-store' },
  });
}
