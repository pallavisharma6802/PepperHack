"""
backend/services/photos.py
---------------------------
Fetches the best food photo for a dish using 3 sources in priority order:
  1. Google Places Photos → Gemini Vision picks the best match
  2. Spoonacular recipe image search
  3. Unsplash photo search

Every result is cached to disk so the same dish is never fetched twice.
Never raises — always returns a safe fallback.

Owned by: P2 (source quality + Gemini pick logic)
P1 calls get_dish_photo() from the SSE streaming endpoint.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import httpx
from google import genai
from google.genai import types
from backend.config import config as _cfg

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GOOGLE_API_KEY   = _cfg.GOOGLE_API_KEY
GEMINI_API_KEY   = _cfg.GEMINI_API_KEY
SERPER_API_KEY   = _cfg.SERPER_API_KEY
SPOONACULAR_KEY  = os.environ.get("SPOONACULAR_KEY", "")
UNSPLASH_KEY     = os.environ.get("UNSPLASH_KEY", "")

PLACES_DETAILS_URL  = "https://maps.googleapis.com/maps/api/place/details/json"
PLACES_PHOTO_URL    = "https://maps.googleapis.com/maps/api/place/photo"
SPOONACULAR_URL     = "https://api.spoonacular.com/recipes/complexSearch"
UNSPLASH_URL        = "https://api.unsplash.com/search/photos"
SERPER_IMAGES_URL   = "https://google.serper.dev/images"

# A real hosted image so the UI always shows something, even in the worst case
PLACEHOLDER = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"
CACHE_PATH  = Path(__file__).parent.parent / "mock" / "photo_cache.json"

# Module-level cache dict
PHOTO_CACHE: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def load_cache() -> None:
    """Load cache from disk into PHOTO_CACHE. Called at module import."""
    global PHOTO_CACHE
    try:
        if CACHE_PATH.exists():
            PHOTO_CACHE = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[photos] Could not load cache: {e}")
        PHOTO_CACHE = {}


def save_cache() -> None:
    """Persist PHOTO_CACHE to disk."""
    try:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(
            json.dumps(PHOTO_CACHE, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"[photos] Could not save cache: {e}")


# Load cache immediately on import
load_cache()


# ---------------------------------------------------------------------------
# SOURCE 1a — Google Places: get photo references for a restaurant
# ---------------------------------------------------------------------------

async def fetch_place_photos(place_id: str, max_photos: int = 8) -> list[str]:
    """
    Fetch up to max_photos photo URLs for a restaurant from Google Places API.

    Returns list of direct photo URLs (already resolved via the photo endpoint).
    Returns empty list on any failure.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                PLACES_DETAILS_URL,
                params={
                    "place_id": place_id,
                    "fields":   "photos",
                    "key":      GOOGLE_API_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        photos = data.get("result", {}).get("photos", [])[:max_photos]
        urls = [
            f"{PLACES_PHOTO_URL}?maxwidth=800&photo_reference={p['photo_reference']}&key={GOOGLE_API_KEY}"
            for p in photos
            if "photo_reference" in p
        ]
        return urls

    except Exception as e:
        print(f"[photos] fetch_place_photos failed for {place_id}: {e}")
        return []


# ---------------------------------------------------------------------------
# SOURCE 1b — Gemini Vision: pick the best matching photo
# ---------------------------------------------------------------------------

async def gemini_pick_best_photo(dish_name: str, photo_urls: list[str]) -> str | None:
    """
    Show Gemini all restaurant photo URLs and ask it to pick the one
    that best matches the given dish.

    Returns the URL of the best match, or None if no match found.
    """
    if not photo_urls:
        return None

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)

        prompt = (
            f"I have {len(photo_urls)} photos from a restaurant. "
            f"I am looking for: {dish_name}. "
            "Return ONLY the index (0-based) of the photo that best matches this dish. "
            "If none match, return -1. Return only the number."
        )

        # Build content list: prompt text + each image URL
        contents: list = [prompt]
        async with httpx.AsyncClient(timeout=15) as http:
            for url in photo_urls:
                try:
                    r = await http.get(url)
                    r.raise_for_status()
                    contents.append(
                        types.Part.from_bytes(
                            data=r.content,
                            mime_type=r.headers.get("content-type", "image/jpeg"),
                        )
                    )
                except Exception:
                    contents.append(f"[image {photo_urls.index(url)} unavailable]")

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=16,
            ),
        )

        idx = int(response.text.strip())
        if 0 <= idx < len(photo_urls):
            return photo_urls[idx]
        return None

    except Exception as e:
        print(f"[photos] gemini_pick_best_photo failed for '{dish_name}': {e}")
        return None


# ---------------------------------------------------------------------------
# SOURCE 2 — Spoonacular
# ---------------------------------------------------------------------------

async def fetch_spoonacular_image(concept: str) -> str | None:
    """
    Search Spoonacular for a recipe matching concept and return its image.
    Returns None on failure or no results.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                SPOONACULAR_URL,
                params={
                    "query":  concept,
                    "number": 1,
                    "apiKey": SPOONACULAR_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        if results and results[0].get("image"):
            return results[0]["image"]
        return None

    except Exception as e:
        print(f"[photos] fetch_spoonacular_image failed for '{concept}': {e}")
        return None


# ---------------------------------------------------------------------------
# SOURCE 3 — Unsplash
# ---------------------------------------------------------------------------

async def fetch_unsplash_image(concept: str) -> str | None:
    """
    Search Unsplash for a food photo matching concept.
    Returns None on failure or no results.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                UNSPLASH_URL,
                params={
                    "query":       f"{concept} food",
                    "per_page":    1,
                    "orientation": "landscape",
                },
                headers={"Authorization": f"Client-ID {UNSPLASH_KEY}"},
            )
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        if results:
            return results[0].get("urls", {}).get("regular")
        return None

    except Exception as e:
        print(f"[photos] fetch_unsplash_image failed for '{concept}': {e}")
        return None


# ---------------------------------------------------------------------------
# SOURCE 0 — Serper Image Search (dish-specific, uses working API key)
# ---------------------------------------------------------------------------

async def fetch_serper_image(dish_name: str) -> str | None:
    """
    Search Google Images via Serper for a dish-specific food photo.
    Returns the first image URL found, or None on failure.
    """
    if not SERPER_API_KEY:
        print(f"[photos] Serper skipped for '{dish_name}': SERPER_API_KEY MISSING")
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                SERPER_IMAGES_URL,
                headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
                json={"q": f"{dish_name} food", "num": 3},
            )
            resp.raise_for_status()
            data = resp.json()
        images = data.get("images", [])
        # Pick first image that looks like a real photo URL
        for img in images:
            url = img.get("imageUrl") or img.get("link") or ""
            if url.startswith("http") and any(ext in url.lower() for ext in (".jpg", ".jpeg", ".png", ".webp")):
                return url
        # Fall back to first result even without known extension
        if images:
            return images[0].get("imageUrl") or images[0].get("link")
        return None
    except Exception as e:
        print(f"[photos] fetch_serper_image failed for '{dish_name}': {e}")
        return None


# ---------------------------------------------------------------------------
# MAIN — get_dish_photo
# ---------------------------------------------------------------------------

async def get_dish_photo(
    dish_name: str,
    concept: str,
    restaurant: dict,
) -> str:
    """
    Get the best food photo for a dish using 3 sources in priority order.

    Args:
        dish_name:  Full dish name (e.g. "Butter Burger 奶油漢堡")
        concept:    English concept for image search (e.g. "Butter Burger")
                    Extracted by Gemini before this call.
        restaurant: Dict with keys: place_id, name, cuisine

    Returns:
        A photo URL string. Never raises.
    """
    place_id   = restaurant.get("place_id", "")
    cache_key  = f"{place_id}:{dish_name.lower()}"

    # --- Cache hit ---
    if cache_key in PHOTO_CACHE:
        return PHOTO_CACHE[cache_key]

    source_used = "placeholder"
    result_url  = PLACEHOLDER

    # --- Source 0: Serper Image Search (dish-specific, best quality) ---
    try:
        url = await fetch_serper_image(concept)
        if url:
            result_url  = url
            source_used = "serper"
    except Exception as e:
        print(f"[photos] Source 0 error for '{dish_name}': {e}")

    # --- Source 1: Spoonacular ---
    if result_url == PLACEHOLDER:
        try:
            url = await fetch_spoonacular_image(concept)
            if url:
                result_url  = url
                source_used = "spoonacular"
        except Exception as e:
            print(f"[photos] Source 1 error for '{dish_name}': {e}")

    # --- Source 2: Unsplash ---
    if result_url == PLACEHOLDER:
        try:
            url = await fetch_unsplash_image(concept)
            if url:
                result_url  = url
                source_used = "unsplash"
        except Exception as e:
            print(f"[photos] Source 2 error for '{dish_name}': {e}")

    print(f'[photos] "{dish_name}" → "{concept}" → {source_used}')

    # --- Cache and return ---
    PHOTO_CACHE[cache_key] = result_url
    save_cache()
    return result_url


# ---------------------------------------------------------------------------
# Quick local test  (run: python -m backend.services.photos)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio

    TEST_RESTAURANT = {
        "place_id": "",          # leave blank to skip Places source
        "name":     "Taiwan Little Eats",
        "cuisine":  "Taiwanese",
    }

    TEST_DISHES = [
        ("Giant Fried Chicken Cutlet 大雞排", "fried chicken cutlet"),
        ("Xiao Long Bao",                    "xiao long bao soup dumplings"),
        ("Butter Burger",                    "butter burger"),
        ("Cheese Curds",                     "cheese curds"),
        ("Shacha Fried Noodles 沙茶炒麵",     "shacha fried noodles"),
    ]

    async def main():
        print(f"Testing get_dish_photo for {len(TEST_DISHES)} dishes...\n")
        for dish_name, concept in TEST_DISHES:
            url = await get_dish_photo(dish_name, concept, TEST_RESTAURANT)
            status = "✅" if url != PLACEHOLDER else "⚠️  PLACEHOLDER"
            print(f"  {status}  {url[:80]}\n")

    asyncio.run(main())
