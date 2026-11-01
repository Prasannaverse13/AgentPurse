// Latest weekly digest, written by the Render Workflows task.
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'digest.json');

export type StoredDigest = {
  at: string;
  recap: string;
  balance: number;
  paidTotal: number;
  paidCount: number;
  blockedCount: number;
  waitingCount: number;
  topAgent: { name: string; spent: number } | null;
  byAgent: { name: string; spent: number }[];
  frozen: string[];
};

export function readDigest(): StoredDigest | null {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) as StoredDigest; } catch { return null; }
}

export function writeDigest(d: StoredDigest) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
}

// Keep only the fields we expect, so a bad caller cannot store junk.
export function cleanDigest(x: unknown): StoredDigest | null {
  const d = x as Partial<StoredDigest>;
  if (!d || typeof d.recap !== 'string' || typeof d.paidTotal !== 'number') return null;
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    at: typeof d.at === 'string' ? d.at : new Date().toISOString(),
    recap: d.recap.slice(0, 1500),
    balance: Number(d.balance) || 0,
    paidTotal: d.paidTotal,
    paidCount: Number(d.paidCount) || 0,
    blockedCount: Number(d.blockedCount) || 0,
    waitingCount: Number(d.waitingCount) || 0,
    topAgent: d.topAgent && typeof d.topAgent.name === 'string' ? { name: d.topAgent.name.slice(0, 80), spent: Number(d.topAgent.spent) || 0 } : null,
    byAgent: list(d.byAgent).slice(0, 20).map((a: { name?: string; spent?: number }) => ({ name: String(a.name ?? '').slice(0, 80), spent: Number(a.spent) || 0 })),
    frozen: list(d.frozen).slice(0, 20).map((s) => String(s).slice(0, 80)),
  };
}
