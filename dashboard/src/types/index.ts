export type ProjectStatus =
  | 'DRAFT'
  | 'SCRIPTING'
  | 'FETCHING_ASSETS'
  | 'RENDERING'
  | 'READY_TO_UPLOAD'
  | 'COMPLETED'
  | 'FAILED';

export const ACTIVE_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'SCRIPTING',
  'FETCHING_ASSETS',
  'RENDERING',
];

export const TERMINAL_STATUSES: ProjectStatus[] = ['COMPLETED', 'FAILED'];

export interface OverlayText {
  timestamp: number;
  text: string;
  duration: number;
}

export interface ScriptData {
  title: string;
  voiceover_text: string;
  stock_keywords: string[];
  overlay_text: OverlayText[];
}

export interface VideoProject {
  id: string;
  niche: string;
  status: ProjectStatus;
  engineId: string | null;
  scriptData: ScriptData | null;
  audioPath: string | null;
  clipPaths: string[] | null;
  videoPath: string | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  youtubeTitle: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubeStatus {
  connected: boolean;
  expired?: boolean;
  scope?: string;
  expiryDate?: number;
}

export interface UploadResult {
  projectId: string;
  status: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  description: string;
  tags: string[];
}
