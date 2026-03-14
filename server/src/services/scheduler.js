import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import db from '../config/database.js';
import { runReport } from './reportEngine.js';

let connection;
let reportQueue;
let reportWorker;

export function initScheduler() {
  connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  reportQueue = new Queue('report-runs', { connection });

  reportWorker = new Worker(
    'report-runs',
    async (job) => {
      const { templateId, clientId, outputTypes, recipients } = job.data;
      console.log(`Running report: template=${templateId}, client=${clientId}`);

      try {
        const result = await runReport({ templateId, clientId, outputTypes, recipients });
        console.log(`Report completed: run=${result.runId}`);
        return result;
      } catch (err) {
        console.error(`Report failed: ${err.message}`);
        throw err;
      }
    },
    {
      connection,
      concurrency: 3,
    }
  );

  reportWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  reportWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log('Report scheduler initialized');
}

/**
 * Load all active schedules and register as repeatable BullMQ jobs.
 */
export async function loadSchedules() {
  const result = await db.query(
    `SELECT s.*, t.name as template_name
     FROM report_schedules s
     JOIN report_templates t ON t.id = s.template_id
     WHERE s.is_active = true`
  );

  // Remove existing repeatable jobs
  const existing = await reportQueue.getRepeatableJobs();
  for (const job of existing) {
    await reportQueue.removeRepeatableByKey(job.key);
  }

  // Register new ones
  for (const schedule of result.rows) {
    for (const clientId of schedule.client_ids || []) {
      await reportQueue.add(
        `schedule-${schedule.id}-${clientId}`,
        {
          templateId: schedule.template_id,
          clientId,
          outputTypes: schedule.output_types || ['pdf'],
          recipients: schedule.recipients || [],
          scheduleId: schedule.id,
        },
        {
          repeat: { pattern: schedule.cron_expr },
          jobId: `sched-${schedule.id}-${clientId}`,
        }
      );
    }
    console.log(`Loaded schedule: ${schedule.template_name} (${schedule.cron_expr})`);
  }

  console.log(`${result.rows.length} schedules loaded`);
}

/**
 * Queue an on-demand report run (priority execution).
 */
export async function queueOnDemandRun({ templateId, clientId, outputTypes, recipients }) {
  const job = await reportQueue.add(
    `on-demand-${templateId}-${clientId}`,
    { templateId, clientId, outputTypes, recipients },
    { priority: 1 }
  );
  return job.id;
}

export function getQueue() {
  return reportQueue;
}
