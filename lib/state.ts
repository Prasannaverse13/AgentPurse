import type { Agent, Rule, Txn } from './types';

export type AgentView = Agent & { spentToday: number };

export type State = {
  mode: { paypal: 'sandbox' | 'live' | 'mock'; ai: 'openai' | 'heuristic'; channel3: 'live' | 'mock' };
  balance: number;
  agents: AgentView[];
  rules: Rule[];
  pending: Txn[];
  recent: Txn[];
  blockedWeek: number;
  events: { at: string; text: string }[];
};
