export type JobHandler = () => Promise<unknown>;

/** Background job port. The in-process adapter below can be replaced by BullMQ/Redis. */
export interface JobQueue {
  every(name: string, intervalMs: number, handler: JobHandler): void;
  start(): void;
  stop(): void;
}

export type JobFailureReporter = (name: string, error: unknown) => void;

export class InProcessJobQueue implements JobQueue {
  private readonly jobs: { name: string; intervalMs: number; handler: JobHandler }[] = [];
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly onFailure: JobFailureReporter) {}

  every(name: string, intervalMs: number, handler: JobHandler): void {
    this.jobs.push({ name, intervalMs, handler });
  }

  start(): void {
    for (const job of this.jobs) {
      const timer = setInterval(() => {
        job.handler().catch((error: unknown) => this.onFailure(job.name, error));
      }, job.intervalMs);
      timer.unref();
      this.timers.push(timer);
    }
  }

  stop(): void {
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
  }
}
