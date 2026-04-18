import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { uploadToYouTube } from '../services/uploaderService';
import { ProjectStatus } from '@prisma/client';

export const uploadRouter = Router();

// POST /upload/:projectId — trigger YouTube upload for a READY_TO_UPLOAD project
uploadRouter.post('/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const project = await prisma.videoProject.findUnique({ where: { id: projectId } });
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (project.status !== ProjectStatus.READY_TO_UPLOAD) {
    return res.status(409).json({
      error: `Project is not ready to upload. Current status: ${project.status}`,
    });
  }
  if (!project.videoPath) {
    return res.status(422).json({ error: 'No video file found on this project.' });
  }
  if (project.youtubeVideoId) {
    return res.status(409).json({
      error: 'Already uploaded.',
      youtubeUrl: project.youtubeUrl,
    });
  }

  try {
    console.log(`[Upload] Initiating YouTube upload for project ${projectId}`);

    const result = await uploadToYouTube(
      projectId,
      project.videoPath,
      project.niche,
      project.scriptData as Record<string, unknown>
    );

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.COMPLETED,
        youtubeVideoId: result.youtubeVideoId,
        youtubeUrl: result.youtubeUrl,
        youtubeTitle: result.title,
      },
    });

    return res.json({
      projectId,
      status: 'COMPLETED',
      youtubeVideoId: result.youtubeVideoId,
      youtubeUrl: result.youtubeUrl,
      title: result.title,
      description: result.description,
      tags: result.tags,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Upload] Failed for project ${projectId}: ${message}`);

    await prisma.videoProject.update({
      where: { id: projectId },
      data: { errorMessage: message },
    });

    return res.status(500).json({ error: message });
  }
});
