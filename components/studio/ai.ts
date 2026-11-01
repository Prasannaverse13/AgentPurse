// AG Studio assistant. Calls our own proxy at /api/ai/responses, which holds the OpenAI key.
import { createAiHarness, type AgAiHarnessSetup, type AgAiPromptStarter } from 'ag-studio';
import { openaiAdapter } from './openai-adapter';

const STARTERS: AgAiPromptStarter[] = [
  { label: 'Which agent spends most?', prompt: 'Which agent has the most paid spend and which has the most blocked spend?' },
  { label: 'What got blocked', prompt: 'Add a grid of every blocked request with the reason it was flagged.' },
  { label: 'Spend by day', prompt: 'Add a chart of paid spend by day for each agent.' },
];

export function buildAi(models: string[]): AgAiHarnessSetup {
  const adapter = openaiAdapter({ endpoint: '/api/ai', model: models[0] });
  return ({ api }) =>
    createAiHarness(api, {
      adapter,
      promptStarters: STARTERS,
      models: models.length > 1 ? models.map((id) => ({ id, label: id })) : undefined,
    });
}
