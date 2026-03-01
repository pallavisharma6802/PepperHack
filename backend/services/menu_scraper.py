"""
Menu scraper service - Extracts menu data from Google Maps, restaurant websites, etc.
Falls back to cached/mock data if scraping unavailable.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Optional

import httpx
from backend.config import config
from backend.logger import get_logger

logger = get_logger(__name__)

# Cache for scraped menus
_menu_cache: dict[str, dict] = {}


async def scrape_google_maps_menu(place_id: str, restaurant_name: str) -> Optional[list[dict]]:
    """
    Attempt to scrape menu items from Google Maps API.
    Google Places API doesn't directly provide menu items, but we can try:
    1. Check if place has a menu URL
    2. Use Google Search to find "{restaurant_name} menu"
    
    Returns list of dish dicts or None if unavailable.
    """
    if not config.GOOGLE_API_KEY:
        return None
    
    try:
        # Get place details including website
        async with httpx.AsyncClient(timeout=10) as client:
            url = f"https://places.googleapis.com/v1/places/{place_id}"
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": config.GOOGLE_API_KEY,
                "X-Goog-FieldMask": "websiteUri,displayName"
            }
            
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning("places_api_menu_failed", status=resp.status_code)
                return None
            
            data = resp.json()
            website = data.get("websiteUri")
            
            if website:
                logger.info("found_restaurant_website", place_id=place_id, website=website)
                # In production, we could scrape the website here
                # For now, just log it
            
            return None  # No direct menu API available
            
    except Exception as e:
        logger.error("menu_scrape_failed", place_id=place_id, error=str(e))
        return None


async def get_cached_menu(place_id: str, restaurant_name: str) -> Optional[dict]:
    """
    Get menu from cache or pre-scraped data.
    Returns dict with dishes array or None.
    """
    # Check memory cache first
    if place_id in _menu_cache:
        logger.info("menu_cache_hit", place_id=place_id)
        return _menu_cache[place_id]
    
    # Check for pre-scraped menu files
    menu_file = Path(__file__).parent.parent / "mock" / f"menu_{place_id}.json"
    if menu_file.exists():
        try:
            with open(menu_file) as f:
                data = json.load(f)
                _menu_cache[place_id] = data
                logger.info("loaded_cached_menu", place_id=place_id, dishes=len(data.get("dishes", [])))
                return data
        except Exception as e:
            logger.warning("cached_menu_load_failed", place_id=place_id, error=str(e))
    
    # Fall back to default mock menu for demo
    mock_path = Path(__file__).parent.parent / "mock" / "menu_response.json"
    if mock_path.exists():
        try:
            with open(mock_path) as f:
                data = json.load(f)
                logger.info("loaded_fallback_menu", source="demo")
                return data
        except Exception as e:
            logger.warning("fallback_menu_load_failed", error=str(e))
    
    return None


async def get_restaurant_menu(place_id: str, restaurant_name: str) -> dict:
    """
    Get menu for a restaurant. Tries multiple strategies:
    1. Memory cache
    2. Pre-scraped menu files
    3. Google Maps scraping (if available)
    4. Fallback to demo data
    
    Returns dict with:
        - restaurant_id: str
        - restaurant_name: str
        - dishes: list[dict]
        - source: str (cached|scraped|demo|none)
        - message: str (optional)
    """
    logger.info("menu_request", place_id=place_id, restaurant=restaurant_name)
    
    # Try cached/pre-scraped first
    cached = await get_cached_menu(place_id, restaurant_name)
    if cached:
        return {
            "restaurant_id": place_id,
            "restaurant_name": restaurant_name,
            "dishes": cached.get("dishes", []),
            "source": "cached"
        }
    
    # Try scraping from Google Maps
    scraped = await scrape_google_maps_menu(place_id, restaurant_name)
    if scraped:
        menu_data = {
            "restaurant_id": place_id,
            "restaurant_name": restaurant_name,
            "dishes": scraped,
            "source": "scraped"
        }
        # Cache the scraped result
        _menu_cache[place_id] = {"dishes": scraped}
        return menu_data
    
    # No menu data available
    logger.info("no_menu_available", place_id=place_id)
    return {
        "restaurant_id": place_id,
        "restaurant_name": restaurant_name,
        "dishes": [],
        "source": "none",
        "message": "No menu data available. Please use 'Scan Menu' to extract dishes from a photo."
    }


def clear_menu_cache():
    """Clear the in-memory menu cache."""
    global _menu_cache
    _menu_cache.clear()
    logger.info("menu_cache_cleared")
