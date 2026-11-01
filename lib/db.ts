import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { DB } from './types';
import { seed } from './seed';

// Small JSON file store. Good for a hackathon demo and easy for judges to run.
// Swap for Postgres later without touching callers: everything goes through read() and write().

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'db.json');

type G = { __ap_db?: DB };
const g = globalThis as unknown as G;

function load(): DB {
  if (g.__ap_db) return g.__ap_db;
  try {
    g.__ap_db = JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB;
  } catch {
    g.__ap_db = seed();
    persist();
  }
  return g.__ap_db!;
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(g.__ap_db, null, 2));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (e) {
    console.warn('[db] could not write file, keeping data in memory', e);
  }
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

export function reset() {
  g.__ap_db = seed();
  persist();
}

export function log(db: DB, text: string) {
  db.events.unshift({ at: new Date().toISOString(), text });
  db.events = db.events.slice(0, 200);
}

export const id = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
export const now = () => new Date().toISOString();
export const round2 = (n: number) => Math.round(n * 100) / 100;
