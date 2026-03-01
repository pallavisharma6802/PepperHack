"""
RecommendationAgent - Identifies must-try dishes using Gemini + Google Search grounding.
Uses ADK with proper tool integration and reasoning.

Owned by: P2 (prompt + Gemini search logic)
P1 wires recommendation_agent into the root orchestrator.
"""

from __future__ import annotations

import asyncio
import json
import random
from pathlib import Path
from typing import Any

import google.genai as genai
from google.genai import types
from google.adk import Agent

from backend.schema import Dish
from backend.config import config
from backend.logger import get_logger

logger = get_logger(__name__)

client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None

# Load versioned system prompt
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "recommender.txt"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")

# Google Search grounding — only needs GEMINI_API_KEY, no extra keys
_SEARCH_TOOL = types.Tool(google_search=types.GoogleSearch())

# Gemini search quality degrades past ~25 dishes; chunk large menus
_CHUNK_SIZE = 25

# Funny fallbacks for must-try dishes where no real quote was found
_FUNNY_FALLBACKS = [
    "Our sources are tight-lipped, but their eyes said everything. 👀",
    "Witnesses report leaving with zero regrets and an empty plate.",
    "No reviews found. Either it's a hidden gem or everyone's too busy eating to write.",
    "Our undercover foodie gave this a thumbs up before going off the grid.",
    "The internet is strangely silent on this one. That's usually a good sign.",
    "Local food critic refused to comment. Suspicious. Order it.",
    "Trust the algorithm. The algorithm has never steered anyone wrong. Mostly.",
    "Rated 'criminally underrated' by someone who definitely exists.",
]


async def recommend_dishes_tool(dishes_json: list[dict], restaurant_name: str) -> dict:
    """
    Research dishes via Gemini + Google Search grounding and mark must-try items
    with real evidence quotes from Reddit, Google Maps, and food blogs.

    Args:
        dishes_json:     List of dish dicts (must have 'id' and 'name' fields)
        restaurant_name: Restaurant name used as search context

    Returns:
        Dict with updated dishes (must_try + must_try_reason set) and recommended_count
    """
    if not config.GEMINI_API_KEY:
        logger.error("gemini_api_key_missing")
        return {"dishes": dishes_json, "recommended_count": 0}

    if not dishes_json:
        return {"dishes": [], "recommended_count": 0}

    logger.info("recommendation_started", dish_count=len(dishes_json), restaurant=restaurant_name)

    # Process in chunks so large menus (80+ dishes) still get full coverage
    loop = asyncio.get_event_loop()
    for i in range(0, len(dishes_json), _CHUNK_SIZE):
        chunk = dishes_json[i : i + _CHUNK_SIZE]
        await loop.run_in_executor(None, _process_chunk, chunk, restaurant_name)

    recommended_count = sum(1 for d in dishes_json if d.get("must_try", False))
    logger.info("recommendation_complete", recommended=recommended_count, total=len(dishes_json))
    
    return {"dishes": dishes_json, "recommended_count": recommended_count}


def _process_chunk(chunk: list[dict], restaurant_name: str) -> None:
    """Send one chunk to Gemini with Google Search grounding and apply results in-place."""
    dish_lines = "\n".join(
        f"- id: {d.get('id', '')}, name: {d.get('name', '')}"
        + (f", description: {d['description']}" if d.get("description") else "")
        for d in chunk
    )

    prompt = (
        f"Restaurant: {restaurant_name} (Madison, WI)\n\n"
        f"Dishes to research:\n{dish_lines}\n\n"
        "Use Google Search to research this restaurant and its dishes. "
        "Return the JSON as specified."
    )

    try:
        logger.info("recommender_calling_gemini", chunk_size=len(chunk), restaurant=restaurant_name)
        
        # Try with Google Search first
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[_SYSTEM_PROMPT, prompt],
                config=types.GenerateContentConfig(
                    tools=[_SEARCH_TOOL],
                    temperature=0.1,
                    max_output_tokens=8192,
                ),
            )
            logger.info("recommender_gemini_response_received", response_length=len(response.text) if response.text else 0, with_search=True)
        except Exception as search_error:
            # Fallback: try without Google Search if it fails
            logger.warning("recommender_search_failed_fallback", error=str(search_error))
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[_SYSTEM_PROMPT, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=8192,
                    response_mime_type="application/json",
                ),
            )
            logger.info("recommender_gemini_response_received", response_length=len(response.text) if response.text else 0, with_search=False)
        
        _apply_to_chunk(chunk, response.text.strip())

    except Exception as e:
        logger.error("recommendation_chunk_failed", error=str(e), exc_info=True)


def _apply_to_chunk(chunk: list[dict], raw: str) -> None:
    """Parse JSON response and apply must_try / must_try_reason in-place."""
    try:
        logger.info("recommender_parsing_response", raw_preview=raw[:200] if raw else "empty")
        
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            logger.warning("recommender_no_json_found", raw_preview=raw[:200])
            return

        json_str = raw[start:end]
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            # Gemini sometimes emits unescaped smart-quotes or apostrophes inside
            # JSON strings (e.g. "Ian's Pizza"). Replace curly/smart quotes with
            # straight equivalents and retry once.
            json_str = (
                json_str
                .replace("\u2018", "'").replace("\u2019", "'")   # ' '
                .replace("\u201c", '"').replace("\u201d", '"')   # " "
            )
            data = json.loads(json_str)
        
        logger.info("recommender_parsed_json", dish_count=len(data.get("dishes", [])))
        
        recs: dict[str, dict] = {
            item["id"]: item for item in data.get("dishes", [])
        }

        for dish_data in chunk:
            rec = recs.get(dish_data.get("id", ""))
            if rec:
                must_try = bool(rec.get("must_try", False))
                reason   = rec.get("must_try_reason") or None
                logger.info("recommender_applying", dish_id=dish_data.get("id"), dish_name=dish_data.get("name"), must_try=must_try, has_reason=reason is not None)
                # If flagged must-try but no real quote found, use a funny fallback
                if must_try and reason is None:
                    reason = random.choice(_FUNNY_FALLBACKS)
                dish_data["must_try"]        = must_try
                dish_data["must_try_reason"] = reason

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.error("recommender_parse_failed", error=str(e), exc_info=True)


recommendation_agent = Agent(
    name="DishRecommender",
    description="Identifies must-try dishes by researching online reviews via Google Search",
    model="gemini-2.5-flash",
    tools=[recommend_dishes_tool],
    instruction="""You are a dish recommendation expert for MadisonBites.
When given dishes from a Madison, WI restaurant, use recommend_dishes_tool to:
1. Search Reddit r/madisonwi, Google Maps reviews, and food blogs
2. Identify dishes with real evidence quotes from reviewers
3. Mark must-try dishes with direct quotes as reasons

Be selective — only mark dishes with genuine review evidence as must-try.""",
)


# ---------------------------------------------------------------------------
# Quick smoke test  (python -m backend.agents.recommender)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio
    from backend.schema import DishCategory

    sample_dishes = [
        {"id": "dish_001", "name": "Mystery Soup of the Day",      "description": ""},
        {"id": "dish_002", "name": "Chef's Secret Noodle Bowl",    "description": ""},
        {"id": "dish_003", "name": "Unnamed House Special",        "description": ""},
        {"id": "dish_004", "name": "Grandma's Rice Cake",          "description": ""},
        {"id": "dish_005", "name": "That One Drink Everyone Gets", "description": ""},
    ]

    async def main():
        print("Running RecommenderAgent on obscure dishes (fallback test)…\n")
        result = await recommend_dishes_tool(sample_dishes, "Taiwan Little Eats")
        dishes = result["dishes"]

        print(f"\n{'─'*60}")
        print(f"Must-try dishes: {result['recommended_count']} / {len(dishes)}\n")
        for d in dishes:
            flag = "✅ MUST TRY" if d.get("must_try") else "   —"
            print(f"{flag}  {d['name']}")
            if d.get("must_try_reason"):
                print(f"         {d['must_try_reason']}")
        print(f"{'─'*60}")

        # Direct fallback test
        print("\n\nDirect fallback test (must_try=true, reason=null)…\n")
        mock_chunk = [{"id": "dish_001", "name": "Mystery Soup of the Day", "description": ""}]
        _apply_to_chunk(mock_chunk, '{"dishes": [{"id": "dish_001", "must_try": true, "must_try_reason": null}]}')
        d = mock_chunk[0]
        print(f"✅ MUST TRY  {d['name']}")
        print(f"         {d['must_try_reason']}")
        print(f"{'─'*60}")

    asyncio.run(main())
