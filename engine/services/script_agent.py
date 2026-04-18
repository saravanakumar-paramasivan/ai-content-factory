import os
import json
import re
from pydantic import BaseModel, Field, field_validator
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an expert YouTube Shorts scriptwriter specializing in high-retention, viral short-form video content.

Your scripts follow a proven structure:
1. HOOK (0-3s): An attention-grabbing opening line that creates immediate curiosity or shock.
2. BODY (3-45s): Rapid-fire value delivery with pattern interrupts to maintain attention.
3. CALL-TO-ACTION (45-60s): A compelling reason to follow, like, or comment.

Rules:
- Voiceover must be paced for exactly 45-60 seconds when read aloud (roughly 120-150 words).
- Use conversational, direct language — no filler words.
- Stock keywords must describe visually dynamic, cinematic B-roll footage.
- Overlay text timestamps must align with the voiceover pacing.
- Return ONLY valid JSON — no markdown, no explanation."""


class OverlayText(BaseModel):
    timestamp: float = Field(description="Start time in seconds")
    text: str = Field(description="Caption text to display on screen")
    duration: float = Field(description="How long to show the caption in seconds", default=2.5)


class VideoScript(BaseModel):
    title: str = Field(description="Attention-grabbing YouTube Shorts title under 60 chars")
    voiceover_text: str = Field(description="Full voiceover script, 120-150 words, hook+body+cta")
    stock_keywords: list[str] = Field(description="5-8 search terms for finding relevant B-roll clips", min_length=5)
    overlay_text: list[OverlayText] = Field(description="On-screen captions with timestamps")

    @field_validator("stock_keywords")
    @classmethod
    def cap_keywords(cls, v: list[str]) -> list[str]:
        return v[:8]


def generate_script(niche: str) -> VideoScript:
    print(f"[ScriptAgent] Generating script for niche: '{niche}'")

    user_message = f"""Create a high-retention YouTube Shorts script for the niche: "{niche}"

Return a JSON object with exactly these fields:
{{
  "title": "string",
  "voiceover_text": "string (120-150 words with hook, body, cta)",
  "stock_keywords": ["keyword1", "keyword2", ...],
  "overlay_text": [
    {{"timestamp": 0.0, "text": "hook caption", "duration": 2.5}},
    ...
  ]
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    script = VideoScript(**data)

    print(f"[ScriptAgent] Script generated: '{script.title}'")
    print(f"[ScriptAgent] Stock keywords: {script.stock_keywords}")
    return script
