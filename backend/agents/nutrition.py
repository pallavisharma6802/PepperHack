"""
NutritionAgent - Infers nutritional information and allergens.
Uses Gemini with ADK for intelligent macro estimation.
"""

from __future__ import annotations

import asyncio
from typing import Any

import google.genai as genai
from google.genai import types
from google.adk.agents import Agent
from google.adk.tools import FunctionTool

from backend.schema import Dish, AllergenTag, MacroConfidence, Macros
from backend.config import config
from backend.logger import get_logger

logger = get_logger(__name__)

client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None


async def analyze_nutrition_tool(dishes_json: list[dict]) -> dict:
    """
    Estimate calories, macros, and allergens for dishes.
    Updates dishes with macros (Macros model) and allergens (List[AllergenTag]).
    
    Args:
        dishes_json: List of dish dictionaries with name and description
        
    Returns:
        Dictionary with updated dishes (macros and allergens added per schema.py)
    """
    if not config.GEMINI_API_KEY:
        logger.error("gemini_api_key_missing")
        return {"dishes": dishes_json, "analyzed_count": 0}
    
    if not dishes_json:
        return {"dishes": [], "analyzed_count": 0}
    
    logger.info("nutrition_analysis_started", dish_count=len(dishes_json))
    
    dishes_for_analysis = []
    for dish in dishes_json:
        dishes_for_analysis.append({
            "name": dish.get("name", ""),
            "description": dish.get("description", ""),
        })
    
    prompt = f"""Analyze nutritional information for these dishes. For each, estimate:
- calories: approximate calories per serving (int)
- protein_g: protein in grams (int)
- carbs_g: carbohydrates in grams (int)
- fat_g: fat in grams (int)
- confidence: "high", "medium", or "low" based on how typical this dish is
- allergens: array of allergens from: ["Gluten", "Dairy", "Nuts", "Eggs", "Shellfish", "Soy"]

Dishes:
{dishes_for_analysis}

Return a JSON array with:
- name: dish name
- calories: int
- protein_g: int
- carbs_g: int
- fat_g: int
- confidence: "high" | "medium" | "low"
- allergens: array of allergen strings

Be realistic with portions. Return ONLY the JSON array."""
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )
        )
        
        import json
        nutrition_data = json.loads(response.text)
        
        analyzed_count = 0
        for dish_data in dishes_json:
            dish_name = dish_data.get("name", "")
            for nut in nutrition_data:
                if nut.get("name", "").lower() == dish_name.lower():
                    # Create Macros object per schema.py
                    dish_data["macros"] = {
                        "calories": nut.get("calories", 0),
                        "protein_g": nut.get("protein_g", 0),
                        "carbs_g": nut.get("carbs_g", 0),
                        "fat_g": nut.get("fat_g", 0),
                        "confidence": nut.get("confidence", "medium"),
                    }
                    # Set allergens array per schema.py
                    dish_data["allergens"] = nut.get("allergens", [])
                    
                    confidence_str = nut.get("confidence", "medium")
                    try:
                        dish_data["macro_confidence"] = MacroConfidence[confidence_str.upper()].value
                    except:
                        dish_data["macro_confidence"] = "medium"
                    
                    allergen_strs = nut.get("allergens", [])
                    valid_allergens = []
                    for allergen in allergen_strs:
                        try:
                            valid_allergens.append(AllergenTag[allergen.upper()].value)
                        except:
                            pass
                    dish_data["potential_allergens"] = valid_allergens
                    
                    analyzed_count += 1
                    break
        
        logger.info("nutrition_analysis_complete", analyzed=analyzed_count, total=len(dishes_json))
        
        return {
            "dishes": dishes_json,
            "analyzed_count": analyzed_count,
        }
        
    except Exception as e:
        logger.error("nutrition_analysis_failed", error=str(e))
        return {"dishes": dishes_json, "analyzed_count": 0}


nutrition_agent = Agent(
    name="Nutritionist",
    description="Infers nutritional information and potential allergens for dishes",
    model="gemini-2.0-flash-exp",
    tools=[FunctionTool(analyze_nutrition_tool)],
    instruction="""You are a nutrition analysis expert.
When given dishes, use analyze_nutrition_tool to:
1. Estimate calories and macros based on typical portions
2. Identify potential allergens
3. Assign confidence levels

Be conservative with allergen warnings - include anything that might be present.""",
)
