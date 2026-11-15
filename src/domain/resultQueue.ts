import { ApiError, type Progress, type StudyResult } from "../api/types";

export type ResultJob = {
  id: string; date: string; results: { id: string; result: StudyResult }[];
  optimistic: Progress; status: "pending" | "retrying" | "failed";
  attempts: number; nextAttemptAt: number; error: string;
};
export interface ResultStorage { read(): Promise<string | null>; write(value: string): Promise<void> }
const intervals = [1, 2, 4, 7, 15, 30];
export function optimisticResults(previous: Progress, results: ResultJob["results"], date: string): Progress {
  return Object.fromEntries(results.map(({ id, result }) => {
    const stage = result === "FAIL" ? Math.max(0, (previous[id]?.stage ?? 0) - 1) : Math.min(6, (previous[id]?.stage ?? 0) + 1);
    const due = new Date(date + "T00:00:00Z");
    due.setUTCDate(due.getUTCDate() + (result === "FAIL" ? 1 : intervals[stage - 1]));
    return [id, { stage, due: due.toISOString().slice(0, 10), lastResult: result, updatedAt: new Date().toISOString() }];
  }));
}

/** One FIFO per account. Persist before delivery; replay the same ID after ambiguous failures. */
export class ResultQueue {
  private jobs: ResultJob[] = [];
  private confirmed: Progress = {};
  private active = false;
  private enabled = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private persistence: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private snapshot = { items: [] as ResultJob[], persistent: true, progress: {} as Progress };
  constructor(private storage: ResultStorage, private send: (job: ResultJob) => Promise<Progress>, private delay = 1000) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  async restore(progress: Progress) {
    this.pause();
    await this.persistence;
    try {
      const raw = await this.storage.read();
      const jobs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(jobs) || jobs.some(job => !job || typeof job.id !== "string" || !Array.isArray(job.results) || !job.optimistic || !["pending", "retrying", "failed"].includes(job.status))) throw new Error("Invalid saved queue");
      this.jobs = jobs;
    } catch { this.snapshot.persistent = false; }
    this.confirmed = progress;
    this.enabled = true;
    this.publish();
    void this.pump();
  }
  enqueue(results: ResultJob["results"], date: string) {
    const job: ResultJob = {
      id: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
      date, results, optimistic: optimisticResults(this.snapshot.progress, results, date),
      status: "pending", attempts: 0, nextAttemptAt: Date.now(), error: "",
    };
    this.jobs.push(job);
    this.commit();
    void this.pump();
  }
  retry(id: string) {
    const job = this.jobs.find(job => job.id === id);
    if (job) { job.status = "pending"; job.nextAttemptAt = Date.now(); job.error = ""; this.commit(); void this.pump(); }
  }
  pause() { this.enabled = false; clearTimeout(this.timer); }
  resume() { this.enabled = true; void this.pump(); }
  private publish() {
    this.snapshot = { items: this.jobs.map(job => ({ ...job })), persistent: this.snapshot.persistent, progress: Object.assign({}, this.confirmed, ...this.jobs.map(job => job.optimistic)) };
    this.listeners.forEach(listener => listener());
  }
  private commit() {
    const raw = JSON.stringify(this.jobs);
    this.persistence = this.persistence.then(() => this.storage.write(raw)).catch(() => { this.snapshot.persistent = false; this.publish(); });
    this.publish();
  }
  private async pump() {
    clearTimeout(this.timer);
    if (!this.enabled || this.active) return;
    const job = this.jobs[0];
    if (!job || job.status === "failed") return;
    const wait = job.nextAttemptAt - Date.now();
    if (wait > 0) { this.timer = setTimeout(() => void this.pump(), wait); return; }
    this.active = true;
    try {
      await this.persistence;
      if (!this.enabled) return;
      const updated = await this.send(job);
      this.confirmed = { ...this.confirmed, ...updated };
      this.jobs = this.jobs.filter(entry => entry.id !== job.id);
    } catch (error) {
      job.attempts++;
      job.error = error instanceof Error ? error.message : String(error);
      const transient = !(error instanceof ApiError) || [401, 408, 425, 429].includes(error.status) || error.status >= 500;
      job.status = transient ? "retrying" : "failed";
      job.nextAttemptAt = Date.now() + Math.min(this.delay * 2 ** Math.min(job.attempts - 1, 16), 60000);
    } finally {
      this.active = false;
      this.commit();
      if (this.enabled) void this.pump();
    }
  }
}
