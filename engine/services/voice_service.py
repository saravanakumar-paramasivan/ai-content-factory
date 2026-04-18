import os
import hashlib
import requests
from pathlib import Path

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
# Rachel — clear, professional female voice
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
AUDIO_DIR = Path(__file__).parent.parent / "temp" / "audio"


def generate_voiceover(voiceover_text: str, project_id: str) -> str:
    """Generate an MP3 from voiceover text via ElevenLabs. Returns the file path."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    output_path = AUDIO_DIR / f"{project_id}.mp3"

    # Skip re-generation if file already exists (idempotency)
    if output_path.exists():
        print(f"[VoiceService] Audio already exists, skipping: {output_path}")
        return str(output_path)

    print(f"[VoiceService] Generating voiceover ({len(voiceover_text)} chars)...")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": voiceover_text,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    }

    response = requests.post(url, json=payload, headers=headers, timeout=60)

    if response.status_code == 429:
        raise RuntimeError("[VoiceService] ElevenLabs API rate limit reached. Try again later.")
    if response.status_code != 200:
        raise RuntimeError(f"[VoiceService] ElevenLabs error {response.status_code}: {response.text}")

    output_path.write_bytes(response.content)
    print(f"[VoiceService] Audio saved: {output_path} ({len(response.content):,} bytes)")
    return str(output_path)
