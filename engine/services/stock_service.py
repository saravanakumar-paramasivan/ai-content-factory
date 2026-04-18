import os
import requests
from pathlib import Path

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
CLIPS_DIR = Path(__file__).parent.parent / "temp" / "clips"

# Prefer portrait/vertical orientation for Shorts (9:16)
PEXELS_VIDEO_URL = "https://api.pexels.com/videos/search"


def _find_best_vertical_file(video: dict) -> dict | None:
    """Return the highest-quality video file that is portrait or at least square."""
    files = video.get("video_files", [])
    # Filter for portrait files (height >= width)
    portrait = [f for f in files if f.get("height", 0) >= f.get("width", 1)]
    if not portrait:
        portrait = files  # Fall back to any available file
    # Sort by resolution descending
    portrait.sort(key=lambda f: f.get("height", 0) * f.get("width", 0), reverse=True)
    return portrait[0] if portrait else None


def fetch_clips(stock_keywords: list[str], project_id: str, clips_per_keyword: int = 1) -> list[str]:
    """Download vertical video clips from Pexels. Returns list of local file paths."""
    project_clips_dir = CLIPS_DIR / project_id
    project_clips_dir.mkdir(parents=True, exist_ok=True)

    downloaded: list[str] = []

    for keyword in stock_keywords:
        clip_path = project_clips_dir / f"{keyword.replace(' ', '_')}_0.mp4"

        # Idempotency: skip if already downloaded
        if clip_path.exists():
            print(f"[StockService] Clip already exists, skipping: {clip_path.name}")
            downloaded.append(str(clip_path))
            continue

        print(f"[StockService] Searching Pexels for: '{keyword}'")

        try:
            response = requests.get(
                PEXELS_VIDEO_URL,
                headers={"Authorization": PEXELS_API_KEY},
                params={"query": keyword, "orientation": "portrait", "per_page": 5, "size": "medium"},
                timeout=30,
            )

            if response.status_code == 429:
                print(f"[StockService] Rate limit reached. Skipping keyword: '{keyword}'")
                continue
            response.raise_for_status()

            videos = response.json().get("videos", [])
            if not videos:
                print(f"[StockService] No results for '{keyword}', skipping.")
                continue

            video = videos[0]
            video_file = _find_best_vertical_file(video)
            if not video_file:
                print(f"[StockService] No suitable file for '{keyword}', skipping.")
                continue

            video_url = video_file["link"]
            print(f"[StockService] Downloading clip ({video_file.get('width')}x{video_file.get('height')}): {clip_path.name}")

            with requests.get(video_url, stream=True, timeout=120) as r:
                r.raise_for_status()
                with open(clip_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1024 * 256):
                        f.write(chunk)

            print(f"[StockService] Saved: {clip_path} ({clip_path.stat().st_size:,} bytes)")
            downloaded.append(str(clip_path))

        except Exception as e:
            print(f"[StockService] Error fetching '{keyword}': {e}")
            continue

    print(f"[StockService] Downloaded {len(downloaded)}/{len(stock_keywords)} clips.")
    return downloaded
