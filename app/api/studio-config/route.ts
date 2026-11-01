import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Gives the browser the AG Studio licence key and the AI model list. The AG Studio key is a trial
// key that sits in the page anyway. The OpenAI key is never sent.
export const GET = handle(async () =>
  json({
    licenseKey: process.env.AG_STUDIO_LICENSE || '',
    models: process.env.OPENAI_API_KEY
      ? (process.env.OPENAI_MODELS || process.env.AI_MODEL || 'gpt-5.6-luna').split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }),
);
