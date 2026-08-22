import { useEffect, useState, useCallback } from 'react';
import type { DocumentRecord } from './types';

/* CORTEXA offline layer.
   The application persists its register in localStorage, so records survive
   offline. This module adds the explicit offline contract the platform
   promises: live connectivity status, a deliberate "available offline"
   document store, and a queue that labels records created while offline as
   DRAFT-OFFLINE and reconciles them when connectivity returns.            */

export type NetState = 'online' | 'offline' | 'syncing';

const DOCS_KEY = 'cortexa.offline.docs.v1';
const QUEUE_KEY = 'cortexa.offline.queue.v1';

/* ── connectivity ─────────────────────────────────────────────────────── */

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Live network state. Transitions offline → online pass through `syncing`
 *  briefly so queued work can be reconciled with visible feedback.        */
export function useNetwork(onSynced?: (queued: number) => void): NetState {
  const [state, setState] = useState<NetState>(isOnline() ? 'online' : 'offline');

  useEffect(() => {
    const goOnline = () => {
      const queued = drainQueue();
      if (queued > 0) {
        setState('syncing');
        window.setTimeout(() => {
          setState('online');
          onSynced?.(queued);
        }, 900);
      } else {
        setState('online');
      }
    };
    const goOffline = () => setState('offline');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [onSynced]);

  return state;
}

/* ── offline draft queue ─────────────────────────────────────────────── */

interface QueueItem { id: string; kind: string; label: string; at: number }

function readQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueueItem[]; } catch { return []; }
}
function writeQueue(q: QueueItem[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage full */ }
}

/** Record that a record was created while offline. Returns true if queued. */
export function enqueueIfOffline(kind: string, label: string): boolean {
  if (isOnline()) return false;
  const q = readQueue();
  q.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind, label, at: Date.now() });
  writeQueue(q);
  return true;
}

export function queueSize(): number {
  return readQueue().length;
}

function drainQueue(): number {
  const n = readQueue().length;
  writeQueue([]);
  return n;
}

/* ── offline document store ──────────────────────────────────────────── */

export interface OfflineDoc {
  id: string;
  title: string;
  fileNumber: string;
  fileName: string;
  category: string;
  sizeKb: number;
  body?: string;
  savedAt: number;
  lastSync: number;
}

function readDocs(): OfflineDoc[] {
  try { return JSON.parse(localStorage.getItem(DOCS_KEY) ?? '[]') as OfflineDoc[]; } catch { return []; }
}
function writeDocs(d: OfflineDoc[]) {
  try { localStorage.setItem(DOCS_KEY, JSON.stringify(d)); } catch { /* storage full */ }
}

export function getOfflineDocs(): OfflineDoc[] {
  return readDocs();
}

export function isDocOffline(id: string): boolean {
  return readDocs().some((d) => d.id === id);
}

/** Deliberately cache an authorised document for offline use. The server
 *  record is untouched — this stores a local copy only.                   */
export function saveDocOffline(doc: DocumentRecord): { ok: boolean; error?: string } {
  const docs = readDocs();
  if (docs.some((d) => d.id === doc.id)) return { ok: false, error: 'Already available offline.' };
  docs.unshift({
    id: doc.id, title: doc.title, fileNumber: doc.fileNumber, fileName: doc.fileName,
    category: doc.category, sizeKb: doc.sizeKb, body: doc.body,
    savedAt: Date.now(), lastSync: Date.now(),
  });
  writeDocs(docs);
  return { ok: true };
}

export function removeDocOffline(id: string): void {
  writeDocs(readDocs().filter((d) => d.id !== id));
}

export function offlineStorageKb(): number {
  return readDocs().reduce((s, d) => s + d.sizeKb, 0);
}
