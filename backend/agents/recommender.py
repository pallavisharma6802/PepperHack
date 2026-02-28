"""
RecommendationAgent - Identifies must-try dishes using Gemini + web search.
Uses ADK with proper tool integration and reasoning.
"""

from __future__ import annotations

import asyncio
from typing import Any

import google.genai as genai
from google.genai import types
from google.adk.agents import Agent
from google.adk.tools import FunctionTool

from backend.schema import Dish
from backend.config import config
from backend.logger import get_logger

logger = get_logger(__name__)

client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None


async def recommend_dishes_tool(dishes_json: list[dict], restaurant_name: str) -> dict:
    """
    Analyze dishes and mark must-try items based on reviews and popularity.
    Updates dishes with is_recommended and recommendation_reason fields.
    
    Args:
        dishes_json: List of dish dictionaries
        restaurant_name: Restaurant name for review search
        
    Returns:
        Dictionary with updated dishes (is_recommended flag added)
    """
    if not config.GEMINI_API_KEY:
        logger.error("gemini_api_key_missing")
        return {"dishes": dishes_json, "recommended_count": 0}
    
    if not dishes_json:
        return {"dishes": [], "recommended_count": 0}
    
    logger.info("recommendation_started", dish_count=len(dishes_json), restaurant=restaurant_name)
    
    dish_names = [d.get("name", "") for d in dishes_json]
    
    prompt = f"""Analyze these dishes from {restaurant_name} and identify which are "must-try" based on:
- Online reviews and ratings
- Popularity and mentions
- Unique or signature items
- Customer recommendations

Dishes: {', '.join(dish_names)}

Search the web for reviews and return a JSON array with:
- name: dish name
- is_recommended: boolean
- reason: brief explanation why (or why not)

Return ONLY the JSON array, no other text."""
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json",
                ),
            )
        )
        
        import json
        recommendations = json.loads(response.text)
        
        recommended_count = 0
        for dish_data in dishes_json:
            dish_name = dish_data.get("name", "")
            for rec in recommendations:
                if rec.get("name", "").lower() == dish_name.lower():
                    # Use must_try and must_try_reason per schema.py
                    dish_data["must_try"] = rec.get("is_recommended", False)
                    dish_data["must_try_reason"] = rec.get("reason", None)
                    if rec.get("is_recommended"):
                        recommended_count += 1
                    break
        
        logger.info("recommendation_complete", recommended=recommended_count, total=len(dishes_json))
        
        return {
            "dishes": dishes_json,
            "recommended_count": recommended_count,
        }
        
    except Exception as e:
        logger.error("recommendation_failed", error=str(e))
        return {"dishes": dishes_json, "recommended_count": 0}


recommendation_agent = Agent(
    name="DishRecommender",
    description="Identifies must-try dishes by analyzing online reviews and popularity",
    model="gemini-2.0-flash-exp",
    tools=[FunctionTool(recommend_dishes_tool)],
    instruction="""You are a dish recommendation expert that analyzes restaurant reviews.
When given dishes from a restaurant, use recommend_dishes_tool to:
1. Search for online reviews and mentions
2. Identify signature and popular items
3. Mark must-try dishes with reasons

Be selective - only mark truly standout dishes as recommended.""",
)
