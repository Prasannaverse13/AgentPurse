'use client';

import { useMemo, useState } from 'react';
import { AgStudioAiModule, type AgStudioMode } from 'ag-studio';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import type { Agent, Txn } from '@/lib/types';
import { buildStudioData } from './studio/data';
import { purseReport } from './studio/report';
import { purseTheme } from './studio/theme';
import { buildAi } from './studio/ai';

type Props = { agents: Agent[]; txns: Txn[]; licenseKey: string; models: string[] };

export default function PurseStudio({ agents, txns, licenseKey, models }: Props) {
  const [mode, setMode] = useState<AgStudioMode>('view');
  // Studio reads data once, so the page remounts it from the parent when the user hits Refresh.
  const data = useMemo(() => buildStudioData(agents, txns), [agents, txns]);
  const ai = useMemo(() => (models.length ? buildAi(models) : undefined), [models]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className={mode === 'view' ? 'btn btn-dark' : 'btn btn-ghost'} onClick={() => setMode('view')}>View</button>
        <button className={mode === 'edit' ? 'btn btn-dark' : 'btn btn-ghost'} onClick={() => setMode('edit')}>Build your own</button>
        <span className="small">{ai ? 'The AI assistant is on. Ask it to add charts.' : 'Add OPENAI_API_KEY to turn on the AI assistant.'}</span>
      </div>
      <div style={{ height: 'calc(100vh - 230px)', minHeight: 560, borderRadius: 24, overflow: 'hidden' }}>
        <AgStudioProvider licenseKey={licenseKey} modules={ai ? [AgStudioAiModule] : undefined}>
          <AgStudio
            style={{ height: '100%', width: '100%' }}
            theme={purseTheme}
            data={data}
            mode={mode}
            initialState={purseReport}
            ai={ai}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}
