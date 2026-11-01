import { cookies } from 'next/headers';
import { Render } from '@renderinc/sdk';
import { COOKIE, readSession } from '@/lib/session';
import { handle, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Starts the weekly digest task on Render Workflows. Needs RENDER_API_KEY and WORKFLOW_SLUG.
export const POST = handle(async () => {
  if (!(await readSession((await cookies()).get(COOKIE)?.value))) return json({ error: 'Log in first' }, 401);
  const slug = process.env.WORKFLOW_SLUG;
  if (!process.env.RENDER_API_KEY || !slug) return json({ ok: false, reason: 'not_configured' });
  try {
    const render = new Render();
    const started = await render.workflows.startTask(`${slug}/buildWeeklyDigest`, []);
    return json({ ok: true, runId: (started as { id?: string }).id ?? null });
  } catch (e) {
    console.error('digest run failed', e);
    return json({ ok: false, reason: 'start_failed' });
  }
});
