"""
MenuScannerAgent - Extracts structured dish data from menu images.
Uses Gemini Vision API with proper async patterns.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

from PIL import Image
import google.genai as genai
from google.genai import types
from google.adk.agents import Agent
from google.adk.tools import FunctionTool

from backend.schema import Dish, DishCategory
from backend.config import config
from backend.logger import get_logger

logger = get_logger(__name__)

client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None


def _load_prompt() -> str:
    """Load scanner prompt from file."""
    prompt_path = Path(__file__).parent.parent / "prompts" / "scanner.txt"
    if prompt_path.exists():
        return prompt_path.read_text()
    
    return """Extract all menu items from this image. For each dish, provide:
- name: The dish name
- description: Brief description if available
- price: Price as float (null if not shown)
- category: One of: appetizer, main_course, dessert, beverage, side, other

Return as JSON array of dishes."""


def _normalize_category(category_str: str) -> DishCategory:
    """Normalize category string to enum per schema.py."""
    category_map = {
        "appetizer": DishCategory.STARTERS,
        "starter": DishCategory.STARTERS,
        "starters": DishCategory.STARTERS,
        "main": DishCategory.MAINS,
        "main_course": DishCategory.MAINS,
        "mains": DishCategory.MAINS,
        "entree": DishCategory.MAINS,
        "dessert": DishCategory.DESSERTS,
        "desserts": DishCategory.DESSERTS,
        "sweet": DishCategory.DESSERTS,
        "beverage": DishCategory.DRINKS,
        "drink": DishCategory.DRINKS,
        "drinks": DishCategory.DRINKS,
        "must_try": DishCategory.MUST_TRY,
    }
    return category_map.get(category_str.lower(), DishCategory.MAINS)


def _parse_gemini_response(response: Any, restaurant_name: str) -> list[Dish]:
    """Parse Gemini API response into Dish objects."""
    dishes = []
    
    try:
        import json
        import re
        
        text = response.text if hasattr(response, 'text') else str(response)
        
        json_match = re.search(r'```json\s*(\[.*?\])\s*```', text, re.DOTALL)
        if json_match:
            text = json_match.group(1)
        elif text.strip().startswith('['):
            pass
        else:
            array_match = re.search(r'\[.*\]', text, re.DOTALL)
            if array_match:
                text = array_match.group(0)
        
        data = json.loads(text)
        
        if not isinstance(data, list):
            logger.warning("gemini_response_not_list", type=type(data).__name())
            return []
        
        for idx, item in enumerate(data):
            if not isinstance(item, dict):
                continue
            
            try:
                # Generate unique ID per schema.py requirement
                dish_id = f"dish_{idx+1:03d}"
                
                dish = Dish(
                    id=dish_id,
                    name=item.get("name", "Unknown"),
                    description=item.get("description", ""),
                    price=item.get("price", ""),
                    category=_normalize_category(item.get("category", "mains")),
                )
                dishes.append(dish)
            except Exception as e:
                logger.warning("dish_parse_error", item=item, error=str(e))
                continue
        
        logger.info("dishes_parsed", count=len(dishes))
        
    except Exception as e:
        logger.error("gemini_response_parse_error", error=str(e))
    
    return dishes


async def scan_menu_async(image_path: str, restaurant_name: str = "") -> list[Dish]:
    """
    Asynchronously scan menu image and extract dishes using Gemini Vision.
    """
    if not config.GEMINI_API_KEY:
        logger.error("gemini_api_key_missing")
        return []
    
    if not os.path.exists(image_path):
        logger.error("image_not_found", path=image_path)
        return []
    
    try:
        logger.info("scanning_menu", image=image_path, restaurant=restaurant_name)
        
        loop = asyncio.get_event_loop()
        image = await loop.run_in_executor(None, Image.open, image_path)
        
        prompt = _load_prompt()
        
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[prompt, image],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
        )
        
        dishes = _parse_gemini_response(response, restaurant_name)
        logger.info("menu_scan_complete", dish_count=len(dishes))
        
        return dishes
        
    except Exception as e:
        logger.error("menu_scan_failed", error=str(e), path=image_path)
        return []


async def scan_menu_tool(image_path: str, restaurant_name: str = "") -> dict:
    """Extract dishes from a menu image using Gemini Vision."""
    dishes = await scan_menu_async(image_path, restaurant_name)
    return {
        "dishes": [dish.model_dump() for dish in dishes],
        "count": len(dishes),
    }


menu_scanner_agent = Agent(
    name="MenuScanner",
    description="Extracts structured dish data from restaurant menu images",
    model="gemini-2.5-flash",
    tools=[FunctionTool(scan_menu_tool)],
    instruction="You are a menu scanner that extracts dish information from images. Use the scan_menu_tool to process menu images.",
)
