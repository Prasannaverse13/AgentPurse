import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { DB } from './types';
import { seed } from './seed';

// Small JSON file store. Good for a hackathon demo and easy for judges to run.
// Swap for Postgres later without touching callers: everything goes through read() and write().

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'db.json');
const MAX_PURSES = 300;

// One purse per PayPal login. The shared demo account uses the owner id 'demo'.
type Store = { purses: Record<string, DB> };
type G = { __ap_store?: Store; __ap_als?: AsyncLocalStorage<string> };
const g = globalThis as unknown as G;
const als = (g.__ap_als ??= new AsyncLocalStorage<string>());

export const DEMO_OWNER = 'demo';
export const currentOwner = () => als.getStore() ?? DEMO_OWNER;
// Everything inside fn reads and writes this owner's purse.
export const runAs = <T>(owner: string, fn: () => T): T => als.run(owner, fn);

function store(): Store {
  if (g.__ap_store) return g.__ap_store;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    // Old single purse files move into the demo purse.
    g.__ap_store = raw && raw.purses ? (raw as Store) : { purses: { [DEMO_OWNER]: raw as DB } };
  } catch {
    g.__ap_store = { purses: {} };
  }
  return g.__ap_store;
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(g.__ap_store, null, 2));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (e) {
    console.warn('[db] could not write file, keeping data in memory', e);
  }
}

function load(): DB {
  const s = store();
  const owner = currentOwner();
  if (!s.purses[owner]) {
    const keys = Object.keys(s.purses).filter((k) => k !== DEMO_OWNER);
    if (keys.length >= MAX_PURSES) delete s.purses[keys[0]]; // drop the oldest private purse
    s.purses[owner] = seed(owner);
    persist();
  }
  return s.purses[owner];
}

export function read(): DB {
  return load();
}

// All writes go through here so we persist once per change.
export function write<T>(fn: (db: DB) => T): T {
  const db = load();
  const out = fn(db);
  persist();
  return out;
}

// Resets the current owner's purse only.
export function reset() {
  store().purses[currentOwner()] = seed(currentOwner());
  persist();
}

// Agent keys are unique to one purse, so a key tells us whose purse to open.
export function ownerForAgentKey(key: string | null | undefined): string | null {
  if (!key) return null;
  for (const [owner, db] of Object.entries(store().purses)) if (db.agents.some((a) => a.key === key)) return owner;
  return null;
}

export function ownerForPayoutItem(itemId: string): string | null {
  for (const [owner, db] of Object.entries(store().purses)) if (db.txns.some((t) => t.paypal?.itemId === itemId)) return owner;
  return null;
}

export function log(db: DB, text: string) {
  db.events.unshift({ at: new Date().toISOString(), text });
  db.events = db.events.slice(0, 200);
}

export const id = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
export const now = () => new Date().toISOString();
export const round2 = (n: number) => Math.round(n * 100) / 100;
