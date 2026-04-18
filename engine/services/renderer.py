import os
import shutil
import textwrap
from pathlib import Path

import numpy as np

# MoviePy 1.0.3 uses PIL.Image.ANTIALIAS removed in Pillow 10+
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont
if not hasattr(PIL.Image, "ANTIALIAS"):
    PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

from moviepy.editor import (
    AudioFileClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)

OUTPUT_DIR = Path(__file__).parent.parent / "output"
TEMP_DIR = Path(__file__).parent.parent / "temp"

TARGET_W, TARGET_H = 1080, 1920
SUBTITLE_FONTSIZE = 62
SUBTITLE_MAX_CHARS = 32  # wrap at this many chars per line
SUBTITLE_Y_RATIO = 0.72  # vertical position (lower third)


def _find_font(size: int) -> PIL.ImageFont.FreeTypeFont | PIL.ImageFont.ImageFont:
    """Try common bold fonts, fall back to PIL default."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return PIL.ImageFont.truetype(path, size)
            except Exception:
                continue
    return PIL.ImageFont.load_default()


def _build_subtitle_image(text: str) -> np.ndarray:
    """
    Render a subtitle as an RGBA numpy array using Pillow.
    Returns a (H, W, 4) uint8 array — transparent background, white text with black outline.
    """
    font = _find_font(SUBTITLE_FONTSIZE)
    wrapped = "\n".join(textwrap.wrap(text, width=SUBTITLE_MAX_CHARS))

    # Measure text size
    dummy = PIL.Image.new("RGBA", (1, 1))
    draw = PIL.ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), wrapped, font=font)
    text_w = bbox[2] - bbox[0] + 20
    text_h = bbox[3] - bbox[1] + 20

    # Draw with stroke (outline) — draw the text 8 times offset for stroke effect
    img = PIL.Image.new("RGBA", (text_w, text_h), (0, 0, 0, 0))
    draw = PIL.ImageDraw.Draw(img)
    stroke = 3
    for dx in range(-stroke, stroke + 1):
        for dy in range(-stroke, stroke + 1):
            if dx != 0 or dy != 0:
                draw.text((10 + dx, 10 + dy), wrapped, font=font, fill=(0, 0, 0, 230))
    draw.text((10, 10), wrapped, font=font, fill=(255, 255, 255, 255))

    return np.array(img)


def _build_subtitle_clip(text: str, start: float, duration: float) -> ImageClip:
    """Create a Pillow-rendered subtitle ImageClip, no ImageMagick needed."""
    img_array = _build_subtitle_image(text)
    clip = ImageClip(img_array, ismask=False)
    clip = clip.set_start(start).set_duration(duration)

    # Center horizontally, place in lower third vertically
    x_pos = (TARGET_W - clip.w) // 2
    y_pos = int(TARGET_H * SUBTITLE_Y_RATIO)
    clip = clip.set_position((x_pos, y_pos))
    return clip


def _fit_clip_to_frame(clip: VideoFileClip) -> VideoFileClip:
    """Crop/scale a clip to fill 1080x1920 without letterboxing."""
    clip_ratio = clip.w / clip.h
    target_ratio = TARGET_W / TARGET_H

    if clip_ratio > target_ratio:
        scaled = clip.resize(height=TARGET_H)
        cropped = scaled.crop(x_center=scaled.w / 2, width=TARGET_W)
    else:
        scaled = clip.resize(width=TARGET_W)
        cropped = scaled.crop(y_center=scaled.h / 2, height=TARGET_H)

    return cropped


def render_video(
    project_id: str,
    audio_path: str,
    clip_paths: list[str],
    overlay_text: list[dict],
    cleanup_temp: bool = True,
) -> str:
    """
    Stitch clips to audio length, burn in subtitles, export 1080x1920 MP4.
    Returns the path to the finished video file.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{project_id}.mp4"

    if output_path.exists():
        print(f"[Renderer] Output already exists, skipping render: {output_path}")
        return str(output_path)

    print(f"[Renderer] Starting render for project {project_id}")

    # --- 1. Load audio ---
    audio = AudioFileClip(audio_path)
    total_duration = audio.duration
    print(f"[Renderer] Audio duration: {total_duration:.2f}s")

    # --- 2. Load and crop video clips ---
    valid_paths = [p for p in clip_paths if Path(p).exists()]
    if not valid_paths:
        raise RuntimeError("[Renderer] No valid clip files found.")

    raw_clips = []
    for p in valid_paths:
        try:
            c = VideoFileClip(p, audio=False)
            raw_clips.append(_fit_clip_to_frame(c))
        except Exception as e:
            print(f"[Renderer] Skipping clip {p}: {e}")

    if not raw_clips:
        raise RuntimeError("[Renderer] All clips failed to load.")

    # --- 3. Loop/trim clips to match audio duration ---
    tiled: list[VideoFileClip] = []
    accumulated = 0.0
    idx = 0
    while accumulated < total_duration:
        clip = raw_clips[idx % len(raw_clips)]
        remaining = total_duration - accumulated
        segment = clip.subclip(0, min(clip.duration, remaining))
        tiled.append(segment)
        accumulated += segment.duration
        idx += 1

    video_track = concatenate_videoclips(tiled, method="compose")
    video_track = video_track.set_audio(audio)

    # --- 4. Build Pillow-rendered subtitle overlays ---
    subtitle_clips = []
    for item in overlay_text:
        ts = float(item.get("timestamp", 0))
        dur = float(item.get("duration", 2.5))
        text = str(item.get("text", "")).strip()
        if not text or ts >= total_duration:
            continue
        dur = min(dur, total_duration - ts)
        subtitle_clips.append(_build_subtitle_clip(text, ts, dur))

    # --- 5. Composite and export ---
    layers = [video_track] + subtitle_clips
    final = CompositeVideoClip(layers, size=(TARGET_W, TARGET_H))
    final = final.set_duration(total_duration)

    print(f"[Renderer] Exporting {TARGET_W}x{TARGET_H} MP4 → {output_path}")
    final.write_videofile(
        str(output_path),
        fps=30,
        codec="libx264",
        audio_codec="aac",
        preset="fast",
        threads=4,
        logger=None,
    )

    # --- 6. Cleanup temp files ---
    if cleanup_temp:
        _cleanup(project_id)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"[Renderer] Done. Output: {output_path} ({file_size_mb:.1f} MB)")
    return str(output_path)


def _cleanup(project_id: str) -> None:
    audio_file = TEMP_DIR / "audio" / f"{project_id}.mp3"
    clips_dir = TEMP_DIR / "clips" / project_id

    if audio_file.exists():
        audio_file.unlink()
        print(f"[Renderer] Cleaned up audio: {audio_file.name}")

    if clips_dir.exists():
        shutil.rmtree(clips_dir)
        print(f"[Renderer] Cleaned up clips dir: {clips_dir.name}")
