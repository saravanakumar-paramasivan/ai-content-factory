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

export interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
}

export interface YouTubeVideo {
  projectId: string;
  youtubeVideoId: string;
  title: string | null;
  url: string | null;
  stats: VideoStats | null;
}

export interface ElevenLabsUsage {
  available: boolean;
  tier?: string;
  characters_used?: number;
  characters_limit?: number;
  percent_used?: number;
  reset_date?: string | null;
  status?: 'healthy' | 'warning' | 'critical';
}

export interface AnthropicUsage {
  model: string;
  scripting_attempts: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost_usd: number;
  billing_type: string;
  billing_url: string;
  renewal: string;
  impact: string;
}

export interface PexelsUsage {
  available: boolean;
  clips_downloaded: number;
  requests_estimated: number;
  plan_limit_monthly: number;
  renewal: string;
  impact: string;
  billing_url: string;
}

export interface MonthCount {
  month: string;
  label: string;
  count: number;
}

export interface AnalyticsData {
  period: { month: string; label: string };
  projects: {
    total: number;
    by_status: Record<string, number>;
    by_month: MonthCount[];
  };
  apis: {
    anthropic: AnthropicUsage;
    elevenlabs: ElevenLabsUsage;
    pexels: PexelsUsage;
  };
  youtube: {
    connected: boolean;
    videos_uploaded: number;
    videos: YouTubeVideo[];
    totals: { views: number; likes: number; comments: number };
  };
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
