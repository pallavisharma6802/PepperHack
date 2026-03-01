"""
PhotoFinderAgent - Finds dish photos using P2's multi-source photo service.
Uses ADK FunctionTool to orchestrate photo finding for multiple dishes.
"""

from __future__ import annotations

import asyncio
from typing import Any

from google.adk import Agent

from backend.schema import Dish
from backend.services.photos import get_dish_photo
from backend.logger import get_logger

logger = get_logger(__name__)


async def find_photos_tool(dishes_json: list[dict], restaurant_name: str = "", restaurant_id: str = "") -> dict:
    """
    Search for photos of dishes using P2's multi-source photo service.
    Returns updated dishes with photo_url field.
    
    Args:
        dishes_json: List of dish dictionaries with at least 'name' field
        restaurant_name: Restaurant name for context
        restaurant_id: Restaurant place_id for Google Places photos
        
    Returns:
        Dictionary with updated dishes and photo count
    """
    logger.info("photo_finder_started", dish_count=len(dishes_json), restaurant=restaurant_name)
    
    restaurant_dict = {
        "place_id": restaurant_id,
        "name": restaurant_name,
        "cuisine": "",
    }
    
    tasks = []
    for dish_data in dishes_json:
        dish_name = dish_data.get("name", "")
        concept = dish_data.get("name", "")
        
        if dish_name:
            tasks.append(get_dish_photo(dish_name, concept, restaurant_dict))
    
    photo_urls = await asyncio.gather(*tasks, return_exceptions=True)
    
    photos_found = 0
    for dish_data, photo_url in zip(dishes_json, photo_urls):
        if isinstance(photo_url, Exception):
            logger.warning("photo_search_error", dish=dish_data.get("name"), error=str(photo_url))
            dish_data["photo_url"] = None
        else:
            dish_data["photo_url"] = photo_url
            if photo_url:
                photos_found += 1
    
    logger.info("photo_finder_complete", found=photos_found, total=len(dishes_json))
    
    return {
        "dishes": dishes_json,
        "photos_found": photos_found,
    }


photo_finder_agent = Agent(
    name="PhotoFinder",
    description="Finds high-quality photos for dishes using multi-source search (Places+Gemini, Spoonacular, Unsplash)",
    model="gemini-2.0-flash-exp",
    tools=[find_photos_tool],
    instruction="""You are a photo finder agent that enriches dish data with high-quality images.
When given a list of dishes, use find_photos_tool to search for photos using multiple sources.
The tool tries Places API + Gemini Vision first, then falls back to Spoonacular and Unsplash.""",
)
