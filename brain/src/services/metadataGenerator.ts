import Anthropic from '@anthropic-ai/sdk';

interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
}

interface ScriptData {
  title: string;
  voiceover_text: string;
  stock_keywords: string[];
}

export async function generateVideoMetadata(
  niche: string,
  script: ScriptData
): Promise<VideoMetadata> {
  console.log(`[MetadataGenerator] Generating YouTube metadata for niche: "${niche}"`);

  const prompt = `You are a YouTube SEO expert specializing in viral Shorts. Generate high-CTR metadata for this video.

Niche: ${niche}
Script title: ${script.title}
Voiceover: ${script.voiceover_text}

Return a JSON object with exactly these fields:
{
  "title": "string — under 60 chars, high-CTR, use numbers/power words/curiosity gap",
  "description": "string — 150-200 chars, includes niche keywords, ends with call-to-action",
  "tags": ["tag1", "tag2", ...] — exactly 15 relevant tags, mix of broad and niche-specific
}

Return ONLY the JSON. No markdown, no explanation.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (response.content[0] as { text: string }).text
    .trim()
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '');

  const data = JSON.parse(raw) as VideoMetadata;
  console.log(`[MetadataGenerator] Title: "${data.title}"`);
  console.log(`[MetadataGenerator] Tags: ${data.tags.slice(0, 5).join(', ')}...`);
  return data;
}
