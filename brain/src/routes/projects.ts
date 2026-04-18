import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { videoQueue } from '../lib/queue';

export const projectsRouter = Router();

// POST /projects — create a new video project and enqueue the pipeline
projectsRouter.post('/', async (req: Request, res: Response) => {
  const { niche } = req.body;

  if (!niche || typeof niche !== 'string' || !niche.trim()) {
    return res.status(400).json({ error: 'niche is required and must be a non-empty string' });
  }

  const project = await prisma.videoProject.create({
    data: { niche: niche.trim() },
  });

  await videoQueue.add(
    'generate-video',
    { projectId: project.id, niche: project.niche },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      jobId: project.id, // one job per project — prevents duplicates
    }
  );

  console.log(`[Projects] Created project ${project.id} for niche "${project.niche}" — pipeline enqueued.`);

  return res.status(201).json({
    id: project.id,
    niche: project.niche,
    status: project.status,
    message: 'Pipeline started. Poll GET /projects/:id for status updates.',
  });
});

// GET /projects/:id — poll for pipeline status
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  const project = await prisma.videoProject.findUnique({
    where: { id: req.params.id },
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.json(project);
});

// GET /projects — list all projects
projectsRouter.get('/', async (_req: Request, res: Response) => {
  const projects = await prisma.videoProject.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json(projects);
});
