"""
NutritionAgent - Infers nutritional information and allergens.
Uses Gemini with ADK for intelligent macro estimation.

Owned by: P2 (prompt + inference logic)
P1 wires nutrition_agent into the root orchestrator.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import google.genai as genai
from google.genai import types
from google.adk import Agent

from backend.schema import Dish, AllergenTag, MacroConfidence, Macros
from backend.config import config
from backend.logger import get_logger

logger = get_logger(__name__)

client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None

# Load versioned system prompt
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "nutrition.txt"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")

# Chunk large menus so Gemini stays accurate per dish
_CHUNK_SIZE = 20

# Valid allergen values from schema (for safe mapping)
_VALID_ALLERGENS = {a.value for a in AllergenTag}


async def analyze_nutrition_tool(dishes_json: list[dict]) -> dict:
    """
    Estimate calories, macros, and allergens for dishes using Gemini.
    Updates dishes with macros and allergens fields per schema.py.

    Args:
        dishes_json: List of dish dicts (must have 'id', 'name', 'description')

    Returns:
        Dict with updated dishes and analyzed_count.
    """
    if not config.GEMINI_API_KEY:
        logger.error("gemini_api_key_missing")
        return {"dishes": dishes_json, "analyzed_count": 0}

    if not dishes_json:
        return {"dishes": [], "analyzed_count": 0}

    logger.info("nutrition_analysis_started", dish_count=len(dishes_json))

    # Process in chunks for accuracy on large menus
    loop = asyncio.get_event_loop()
    for i in range(0, len(dishes_json), _CHUNK_SIZE):
        chunk = dishes_json[i : i + _CHUNK_SIZE]
        await loop.run_in_executor(None, _process_chunk, chunk)
    
    analyzed_count = sum(1 for d in dishes_json if d.get("macros") is not None)
    logger.info("nutrition_analysis_complete", analyzed=analyzed_count, total=len(dishes_json))

    return {"dishes": dishes_json, "analyzed_count": analyzed_count}


def _process_chunk(chunk: list[dict]) -> None:
    """Send one chunk to Gemini and apply macro results in-place."""
    dish_lines = "\n".join(
        f"- id: {d.get('id', '')}, name: {d.get('name', '')}"
        + (f", description: {d['description']}" if d.get("description") else "")
        for d in chunk
    )

    prompt = f"Dishes to analyze:\n{dish_lines}"

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[_SYSTEM_PROMPT, prompt],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
        )
        _apply_to_chunk(chunk, response.text.strip())

    except Exception as e:
        logger.error("nutrition_chunk_failed", error=str(e))


def _apply_to_chunk(chunk: list[dict], raw: str) -> None:
    """Parse JSON response and apply macros + allergens in-place."""
    try:
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            logger.warning("nutrition_no_json_found")
            return

        data = json.loads(raw[start:end])
        results: dict[str, dict] = {
            item["id"]: item for item in data.get("dishes", [])
        }

        for dish_data in chunk:
            res = results.get(dish_data.get("id", ""))
            if not res:
                continue

            # Map confidence safely
            conf_raw = res.get("confidence", "medium").lower()
            try:
                confidence = MacroConfidence(conf_raw)
            except ValueError:
                confidence = MacroConfidence.MEDIUM

            # Build macros dict matching schema
            dish_data["macros"] = {
                "calories":   max(0, int(res.get("calories",  0))),
                "protein_g":  max(0, int(res.get("protein_g", 0))),
                "carbs_g":    max(0, int(res.get("carbs_g",   0))),
                "fat_g":      max(0, int(res.get("fat_g",     0))),
                "confidence": confidence.value,
            }

            # Only keep allergens that exist in schema
            dish_data["allergens"] = [
                a for a in res.get("allergens", [])
                if a in _VALID_ALLERGENS
            ]

    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        logger.error("nutrition_parse_failed", error=str(e))


nutrition_agent = Agent(
    name="Nutritionist",
    description="Infers nutritional macros and allergens for dishes using Gemini reasoning",
    model="gemini-2.5-flash",
    tools=[analyze_nutrition_tool],
    instruction="""You are a nutrition analysis expert for MadisonBites.
When given dishes, use analyze_nutrition_tool to:
1. Reason through likely ingredients and portion sizes
2. Estimate calories, protein, carbs, and fat as realistic integers
3. Identify allergens present or likely present
4. Assign confidence: high (well-known dish), medium (reasonable guess), low (vague/unclear)

Use typical restaurant portions. Mark low confidence for any dish with an unclear name.""",
)


# ---------------------------------------------------------------------------
# Quick smoke test  (python -m backend.agents.nutrition)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio

    sample_dishes = [
        {"id": "dish_001", "name": "Caesar Salad",              "description": "Romaine, parmesan, croutons"},
        {"id": "dish_002", "name": "Butter Burger",             "description": "Beef patty, butter, American cheese"},
        {"id": "dish_003", "name": "Pad Thai",                  "description": "Rice noodles, shrimp, peanuts, egg"},
        {"id": "dish_004", "name": "Chef's Mystery Special",    "description": ""},
        {"id": "dish_005", "name": "Mango Sticky Rice",         "description": "Sweet rice, mango, coconut milk"},
    ]

    async def main():
        print("Running NutritionAgent on 5 dishes…\n")
        result = await analyze_nutrition_tool(sample_dishes)
        dishes = result["dishes"]

        print(f"\n{'─'*70}")
        for d in dishes:
            m = d.get("macros", {})
            conf = m.get("confidence", "?")
            prefix = "~" if conf == "low" else " "
            print(f"{d['name']}")
            print(f"  {prefix}{m.get('calories', '?')} kcal  |  P:{m.get('protein_g','?')}g  C:{m.get('carbs_g','?')}g  F:{m.get('fat_g','?')}g  [{conf}]")
            print(f"  Allergens: {', '.join(d.get('allergens', [])) or 'none'}")
            print()
        print(f"{'─'*70}")

    asyncio.run(main())
