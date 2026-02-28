"""
backend/agents/scanner.py
--------------------------
MenuScannerAgent — reads a menu image via Gemini Vision and returns
structured dish JSON matching the shared schema.

Owned by: P2 (prompt engineering) + P1 (wiring into ADK root agent)
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types
from dotenv import load_dotenv
from PIL import Image

from backend.schema import Dish, DishCategory

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

load_dotenv(Path(__file__).parent.parent / ".env")
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "scanner.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

MODEL_NAME = "gemini-2.5-flash"


# ---------------------------------------------------------------------------
# Core scanner function
# ---------------------------------------------------------------------------

def scan_menu(image_path: str, restaurant_name: str = "") -> list[Dish]:
    """
    Given a path to a menu image, call Gemini Vision and return a list of Dish objects.

    Args:
        image_path:       Absolute or relative path to the menu photo.
        restaurant_name:  Optional — appended to the prompt for context.

    Returns:
        List of Dish objects (photo_url, must_try, macros, allergens all null/default —
        those are filled by downstream agents).
    """
    image = Image.open(image_path)

    context = ""
    if restaurant_name:
        context = f"\n\nThis menu is from the restaurant: {restaurant_name} (Madison, WI)."

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[SYSTEM_PROMPT + context, image],
        config=types.GenerateContentConfig(
            temperature=0.1,            # low temp = more faithful extraction, less creativity
            max_output_tokens=16384,    # large menus (60+ dishes) need this headroom
            response_mime_type="application/json",  # forces valid JSON, no stray newlines
        ),
    )

    raw = response.text.strip()
    dishes = _parse_response(raw)
    return dishes


# ---------------------------------------------------------------------------
# Response parser + validator
# ---------------------------------------------------------------------------

def _parse_response(raw: str) -> list[Dish]:
    """
    Parse Gemini's raw text output into a list of validated Dish objects.
    Handles common issues: markdown fences, extra text before/after JSON.
    """
    # Strip markdown code fences if Gemini wraps output in ```json ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE).strip()

    # Find the outermost JSON object by locating first { and last }
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in Gemini response:\n{raw}")

    try:
        data = json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON parse error: {e}\nRaw output:\n{cleaned[start:end+1]}") from e
    raw_dishes = data.get("dishes", [])

    dishes: list[Dish] = []
    for i, item in enumerate(raw_dishes):
        # Normalise category — fallback to MAINS if unknown
        category_str = item.get("category", "Mains")
        category = _normalise_category(category_str)

        dish = Dish(
            id=item.get("id", f"dish_{i+1:03d}"),
            name=item.get("name", "").strip(),
            description=item.get("description", "").strip(),
            category=category,
            price=item.get("price", "").strip(),
        )
        # Skip empty-name dishes (can happen with blurry menus)
        if dish.name:
            dishes.append(dish)

    return dishes


def _normalise_category(raw: str) -> DishCategory:
    """Map any category string Gemini returns to a valid DishCategory."""
    mapping = {
        "must try":  DishCategory.MUST_TRY,
        "must-try":  DishCategory.MUST_TRY,
        "starter":   DishCategory.STARTERS,
        "starters":  DishCategory.STARTERS,
        "appetizer": DishCategory.STARTERS,
        "appetizers":DishCategory.STARTERS,
        "main":      DishCategory.MAINS,
        "mains":     DishCategory.MAINS,
        "entree":    DishCategory.MAINS,
        "entrees":   DishCategory.MAINS,
        "dessert":   DishCategory.DESSERTS,
        "desserts":  DishCategory.DESSERTS,
        "drink":     DishCategory.DRINKS,
        "drinks":    DishCategory.DRINKS,
        "beverage":  DishCategory.DRINKS,
        "beverages": DishCategory.DRINKS,
    }
    return mapping.get(raw.strip().lower(), DishCategory.MAINS)


# ---------------------------------------------------------------------------
# Quick local test  (run: python -m backend.agents.scanner <image_path>)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m backend.agents.scanner <path_to_menu_image>")
        sys.exit(1)

    img = sys.argv[1]
    restaurant = sys.argv[2] if len(sys.argv) > 2 else ""
    print(f"Scanning: {img}  (restaurant: '{restaurant}')\n")

    results = scan_menu(img, restaurant)
    print(f"Extracted {len(results)} dishes:\n")
    for d in results:
        print(f"  [{d.category.value:10s}]  {d.name:40s}  {d.price}")
