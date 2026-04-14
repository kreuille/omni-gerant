// BUSINESS RULE [CDC-2.1]: Job CRON relances automatiques
// Execute quotidiennement pour detecter les factures a relancer

export interface SchedulerConfig {
  cron: string; // e.g., '0 8 * * *' (daily at 8am)
  enabled: boolean;
}

export const DEFAULT_REMINDER_SCHEDULER_CONFIG: SchedulerConfig = {
  cron: '0 8 * * 1-5', // Weekdays at 8am
  enabled: true,
};

// In production, this would use BullMQ or node-cron
// For now, it's a simple interface that the app wires up
export interface ReminderScheduler {
  start(): void;
  stop(): void;
  runNow(): Promise<void>;
}

export function createReminderScheduler(
  processReminders: () => Promise<void>,
  config: SchedulerConfig = DEFAULT_REMINDER_SCHEDULER_CONFIG,
): ReminderScheduler {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (!config.enabled) return;
      // Placeholder: in production, use node-cron or BullMQ
      // For now, we just expose the interface
      console.log(`[SCHEDULER] Reminder scheduler started with cron: ${config.cron}`);
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log('[SCHEDULER] Reminder scheduler stopped');
    },

    async runNow() {
      await processReminders();
    },
  };
}
