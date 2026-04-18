import uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from services.script_agent import VideoScript, generate_script
from services.voice_service import generate_voiceover
from services.stock_service import fetch_clips
from services.renderer import render_video

app = FastAPI(title="AI Content Factory - Engine", version="1.0.0")


class GenerateScriptRequest(BaseModel):
    niche: str


class GenerateAssetsRequest(BaseModel):
    project_id: str
    voiceover_text: str
    stock_keywords: list[str]


class FullPipelineRequest(BaseModel):
    niche: str


class RenderRequest(BaseModel):
    project_id: str
    audio_path: str
    clip_paths: list[str]
    overlay_text: list[dict]
    cleanup_temp: bool = True


@app.get("/health")
def health():
    return {"status": "ok", "service": "engine"}


@app.post("/generate-script", response_model=VideoScript)
def generate_script_endpoint(body: GenerateScriptRequest):
    """Phase 1: Generate a structured video script for a given niche."""
    if not body.niche.strip():
        raise HTTPException(status_code=400, detail="niche must not be empty")
    try:
        script = generate_script(body.niche)
        return script
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-assets")
def generate_assets_endpoint(body: GenerateAssetsRequest):
    """Phase 2: Fetch voiceover audio and stock video clips for a project."""
    if not body.project_id.strip():
        raise HTTPException(status_code=400, detail="project_id must not be empty")
    try:
        audio_path = generate_voiceover(body.voiceover_text, body.project_id)
        clip_paths = fetch_clips(body.stock_keywords, body.project_id)
        return {
            "project_id": body.project_id,
            "audio_path": audio_path,
            "clip_paths": clip_paths,
            "clips_downloaded": len(clip_paths),
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-full")
def generate_full_endpoint(body: FullPipelineRequest):
    """Phase 1+2 combined: Script generation + asset fetching in one call."""
    if not body.niche.strip():
        raise HTTPException(status_code=400, detail="niche must not be empty")

    project_id = str(uuid.uuid4())
    print(f"[Engine] Starting full generation. project_id={project_id}, niche='{body.niche}'")

    try:
        script = generate_script(body.niche)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Script generation failed: {e}")

    try:
        audio_path = generate_voiceover(script.voiceover_text, project_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    clip_paths = fetch_clips(script.stock_keywords, project_id)

    print(f"[Engine] Full generation complete. project_id={project_id}")
    return {
        "project_id": project_id,
        "script": script,
        "audio_path": audio_path,
        "clip_paths": clip_paths,
        "clips_downloaded": len(clip_paths),
    }


@app.post("/render")
def render_endpoint(body: RenderRequest):
    """Phase 3: Stitch clips + audio + subtitles into a 1080x1920 MP4."""
    if not body.project_id.strip():
        raise HTTPException(status_code=400, detail="project_id must not be empty")
    if not body.audio_path or not body.clip_paths:
        raise HTTPException(status_code=400, detail="audio_path and clip_paths are required")
    try:
        video_path = render_video(
            project_id=body.project_id,
            audio_path=body.audio_path,
            clip_paths=body.clip_paths,
            overlay_text=body.overlay_text,
            cleanup_temp=body.cleanup_temp,
        )
        return {"project_id": body.project_id, "video_path": video_path}
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
