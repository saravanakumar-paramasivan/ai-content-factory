import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/db';
import { redisConnection } from '../lib/queue';
import { ProjectStatus } from '@prisma/client';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8000';

interface VideoPipelineJob {
  projectId: string;
  niche: string;
}

async function callEngine(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Engine ${path} returned ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function processJob(job: Job<VideoPipelineJob>) {
  const { projectId, niche } = job.data;
  console.log(`[Worker] Starting pipeline for project ${projectId} (niche: "${niche}")`);

  const project = await prisma.videoProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} not found`);

  // --- Step 1: Generate script (idempotent: skip if already done) ---
  let scriptData = project.scriptData as Record<string, unknown> | null;
  let engineId = project.engineId;

  if (!scriptData) {
    console.log(`[Worker] [${projectId}] Step 1: Generating script...`);
    await prisma.videoProject.update({
      where: { id: projectId },
      data: { status: ProjectStatus.SCRIPTING },
    });

    const script = await callEngine('/generate-script', { niche });
    scriptData = script;
    await prisma.videoProject.update({
      where: { id: projectId },
      data: { scriptData: script as object },
    });
    console.log(`[Worker] [${projectId}] Script ready: "${script['title']}"`);
  } else {
    console.log(`[Worker] [${projectId}] Step 1: Script already exists, skipping.`);
  }

  // --- Step 2: Fetch assets (idempotent: skip if already done) ---
  if (!project.audioPath) {
    console.log(`[Worker] [${projectId}] Step 2: Fetching assets...`);
    await prisma.videoProject.update({
      where: { id: projectId },
      data: { status: ProjectStatus.FETCHING_ASSETS },
    });

    // Use existing engineId or generate a new one from the script call
    if (!engineId) {
      engineId = projectId; // use our own uuid as the engine project dir name
    }

    const assets = await callEngine('/generate-assets', {
      project_id: engineId,
      voiceover_text: (scriptData as Record<string, unknown>)['voiceover_text'] as string,
      stock_keywords: (scriptData as Record<string, unknown>)['stock_keywords'] as string[],
    });

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        engineId,
        audioPath: assets['audio_path'] as string,
        clipPaths: assets['clip_paths'] as string[],
      },
    });
    console.log(`[Worker] [${projectId}] Assets ready: ${assets['clips_downloaded']} clips.`);
  } else {
    console.log(`[Worker] [${projectId}] Step 2: Assets already exist, skipping.`);
  }

  // --- Step 3: Render video (idempotent: skip if already done) ---
  // Re-fetch latest project state to get audioPath/clipPaths if they were just written
  const latestProject = await prisma.videoProject.findUnique({ where: { id: projectId } });

  if (!latestProject?.videoPath) {
    console.log(`[Worker] [${projectId}] Step 3: Rendering video...`);
    await prisma.videoProject.update({
      where: { id: projectId },
      data: { status: ProjectStatus.RENDERING },
    });

    const result = await callEngine('/render', {
      project_id: engineId ?? projectId,
      audio_path: latestProject?.audioPath,
      clip_paths: latestProject?.clipPaths as string[],
      overlay_text: (scriptData as Record<string, unknown>)['overlay_text'] as object[],
      cleanup_temp: true,
    });

    await prisma.videoProject.update({
      where: { id: projectId },
      data: { videoPath: result['video_path'] as string },
    });
    console.log(`[Worker] [${projectId}] Render complete: ${result['video_path']}`);
  } else {
    console.log(`[Worker] [${projectId}] Step 3: Video already rendered, skipping.`);
  }

  // --- Step 4: Mark ready for upload ---
  await prisma.videoProject.update({
    where: { id: projectId },
    data: { status: ProjectStatus.READY_TO_UPLOAD },
  });

  console.log(`[Worker] [${projectId}] Pipeline complete — status: READY_TO_UPLOAD`);
}

export function startVideoWorker() {
  const worker = new Worker<VideoPipelineJob>(
    'video-pipeline',
    async (job) => {
      try {
        await processJob(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Worker] Job failed for project ${job.data.projectId}: ${message}`);
        await prisma.videoProject.update({
          where: { id: job.data.projectId },
          data: { status: ProjectStatus.FAILED, errorMessage: message },
        });
        throw err; // let BullMQ handle retries
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[Worker] Video pipeline worker started.');
  return worker;
}
