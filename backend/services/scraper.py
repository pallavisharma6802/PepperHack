from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any, Optional, List

import httpx
import google.genai as genai
from google.genai import types
from dotenv import load_dotenv

from backend.schema import Dish, DishCategory
from backend.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# Configuration
MODEL_NAME = "gemini-2.5-flash"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


async def get_menu_url_from_places(place_id: str) -> Optional[str]:
    """
    Calls Places API (New) to get the restaurant's website.
    Returns websiteUri string or None if not found.
    Never raises — return None on any error.
    """
    if not GOOGLE_API_KEY:
        logger.warning("google_api_key_missing")
        return None
    
    try:
        url = f"https://places.googleapis.com/v1/places/{place_id}"
        headers = {
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask": "websiteUri"
        }
        
        async with httpx.AsyncClient(timeout=10) as http_client:
            response = await http_client.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.warning("places_api_failed", status=response.status_code, place_id=place_id)
                return None
            
            data = response.json()
            website_uri = data.get("websiteUri")
            
            if website_uri:
                logger.info("website_found", place_id=place_id, url=website_uri)
                return website_uri
            
            return None
            
    except Exception as e:
        logger.error("get_website_failed", place_id=place_id, error=str(e))
        return None


def _clean_html(html_content: str) -> str:
    """
    Clean HTML by removing scripts, styles, and tags.
    Returns cleaned text truncated to 6000 characters.
    """
    # Remove script, style, nav, footer, header blocks
    text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<nav[^>]*>.*?</nav>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<footer[^>]*>.*?</footer>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<header[^>]*>.*?</header>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # Truncate to 6000 characters
    text = text[:6000]
    
    return text


def _parse_gemini_menu_response(response_text: str, restaurant_name: str) -> List[Dish]:
    """
    Parse Gemini JSON response into list of Dish objects.
    """
    dishes = []
    
    try:
        # Parse JSON response
        data = json.loads(response_text)
        
        if not isinstance(data, dict) or "dishes" not in data:
            logger.warning("invalid_response_format", restaurant=restaurant_name)
            return []
        
        dish_list = data.get("dishes", [])
        
        if not isinstance(dish_list, list):
            logger.warning("dishes_not_list", restaurant=restaurant_name)
            return []
        
        for item in dish_list:
            if not isinstance(item, dict):
                continue
            
            try:
                # Map category string to DishCategory enum
                category_str = item.get("category", "Mains")
                category_map = {
                    "starters": DishCategory.STARTERS,
                    "mains": DishCategory.MAINS,
                    "desserts": DishCategory.DESSERTS,
                    "drinks": DishCategory.DRINKS,
                    "must try": DishCategory.MUST_TRY,
                }
                category = category_map.get(category_str.lower(), DishCategory.MAINS)
                
                dish = Dish(
                    id=item.get("id", "dish_000"),
                    name=item.get("name", "Unknown"),
                    description=item.get("description", ""),
                    price=item.get("price", ""),
                    category=category,
                )
                dishes.append(dish)
            except Exception as e:
                logger.warning("dish_parse_error", item=item, error=str(e))
                continue
        
        logger.info("dishes_parsed_from_website", count=len(dishes), restaurant=restaurant_name)
        
    except json.JSONDecodeError as e:
        logger.error("json_parse_error", error=str(e), restaurant=restaurant_name)
    except Exception as e:
        logger.error("response_parse_error", error=str(e), restaurant=restaurant_name)
    
    return dishes


async def scrape_menu_from_website(
    website_url: str,
    restaurant_name: str
) -> List[Dish]:
    """
    Scrape menu from restaurant website using Gemini.
    Returns list of Dish objects, empty list on any failure.
    """
    if not client or not GEMINI_API_KEY:
        logger.error("gemini_client_not_initialized")
        return []
    
    try:
        # Step 1: Fetch HTML
        logger.info("fetching_website", url=website_url, restaurant=restaurant_name)
        
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as http_client:
            headers = {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            }
            
            response = await http_client.get(website_url, headers=headers)
            
            if response.status_code != 200:
                logger.warning("website_fetch_failed", status=response.status_code, url=website_url)
                return []
            
            html_content = response.text
        
        # Step 2: Clean HTML
        cleaned_text = _clean_html(html_content)
        
        if len(cleaned_text) < 100:
            logger.warning("cleaned_text_too_short", length=len(cleaned_text), url=website_url)
            return []
        
        logger.info("website_cleaned", text_length=len(cleaned_text), restaurant=restaurant_name)
        
        # Step 3: Gemini extraction
        prompt = f"""You are a menu extraction expert.
Extract ALL food and drink items from the following restaurant website text.
Restaurant: {restaurant_name} (Madison, WI)

Return ONLY valid JSON in this exact format:
{{
  "dishes": [
    {{
      "id": "dish_001",
      "name": "dish name",
      "description": "description or empty string",
      "category": "Starters|Mains|Desserts|Drinks|Must Try",
      "price": "$X.XX or empty string"
    }}
  ]
}}

If no menu items found, return {{"dishes": []}}

Website text:
{cleaned_text}
"""
        
        logger.info("calling_gemini_for_extraction", restaurant=restaurant_name)
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
        )
        
        # Step 4: Parse response
        dishes = _parse_gemini_menu_response(response.text, restaurant_name)
        
        if dishes:
            logger.info("menu_extraction_success", dish_count=len(dishes), restaurant=restaurant_name)
        else:
            logger.info("no_dishes_extracted", restaurant=restaurant_name)
        
        return dishes
        
    except Exception as e:
        logger.error("scrape_menu_failed", error=str(e), url=website_url, restaurant=restaurant_name)
        return []


async def find_menu_url_via_serper(restaurant_name: str) -> List[str]:
    """
    Use Serper.dev to find menu URLs for a restaurant.
    Prioritizes Yelp pages, then falls back to other results.
    Returns list of candidate URLs to try (up to 5).
    Never raises — returns [] on any error.
    """
    if not SERPER_API_KEY:
        logger.warning("serper_api_key_missing")
        return []

    try:
        query = f"{restaurant_name} Madison WI menu"
        payload = {"q": query, "num": 5}
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
        }

        logger.info("serper_search_starting", query=query)

        async with httpx.AsyncClient(timeout=10) as http_client:
            response = await http_client.post(
                "https://google.serper.dev/search",
                headers=headers,
                json=payload,
            )

            if response.status_code != 200:
                logger.warning("serper_api_failed", status=response.status_code)
                return []

            data = response.json()
            organic = data.get("organic", [])

        yelp_urls: List[str] = []
        other_urls: List[str] = []

        for result in organic:
            link = result.get("link", "")
            if not link:
                continue
            if "yelp.com" in link:
                yelp_urls.append(link)
            else:
                other_urls.append(link)

        candidates = yelp_urls + other_urls
        logger.info("serper_search_complete",
                    total=len(candidates),
                    yelp=len(yelp_urls),
                    other=len(other_urls),
                    restaurant=restaurant_name)
        return candidates

    except Exception as e:
        logger.error("serper_search_failed", error=str(e), restaurant=restaurant_name)
        return []


async def get_menu_for_restaurant(
    place_id: str,
    restaurant_name: str
) -> List[Dish]:
    """
    Main entry point. Cascades through multiple sources:
    1. Restaurant's own website via Places API websiteUri
    2. Serper.dev web search → Yelp or other menu pages (scrapes top 3)
    Returns [] if nothing works — never raises.
    """
    try:
        logger.info("get_menu_starting", place_id=place_id, restaurant=restaurant_name)

        # --- Source 1: Places API websiteUri ---
        website_url = await get_menu_url_from_places(place_id)
        if website_url:
            dishes = await scrape_menu_from_website(website_url, restaurant_name)
            if dishes:
                logger.info("menu_from_website", count=len(dishes), restaurant=restaurant_name)
                return dishes
            logger.info("website_yielded_no_dishes", url=website_url, restaurant=restaurant_name)

        # --- Source 2: Serper.dev search ---
        logger.info("trying_serper_search", restaurant=restaurant_name)
        candidate_urls = await find_menu_url_via_serper(restaurant_name)

        for url in candidate_urls[:3]:  # try top 3 to save quota
            dishes = await scrape_menu_from_website(url, restaurant_name)
            if dishes:
                logger.info("menu_from_serper", count=len(dishes), url=url, restaurant=restaurant_name)
                return dishes

        logger.info("no_menu_found_anywhere", restaurant=restaurant_name)
        return []

    except Exception as e:
        logger.error("get_menu_for_restaurant_failed", error=str(e), place_id=place_id, restaurant=restaurant_name)
        return []


if __name__ == "__main__":
    """
    Test with a real Madison restaurant.
    """
    async def test():
        # Test with The Old Fashioned (Madison, WI)
        place_id = "ChIJHxgqqEBTBogRJLOAk9gWpBg"
        restaurant_name = "The Old Fashioned"
        
        print(f"\n🔍 Testing menu scraper for: {restaurant_name}")
        print(f"   Place ID: {place_id}\n")
        
        dishes = await get_menu_for_restaurant(place_id, restaurant_name)
        
        if dishes:
            print(f"✅ Found {len(dishes)} dishes:\n")
            for dish in dishes[:5]:  # Show first 5
                print(f"   • {dish.name}")
                if dish.description:
                    print(f"     {dish.description[:80]}...")
                if dish.price:
                    print(f"     Price: {dish.price}")
                print(f"     Category: {dish.category}")
                print()
        else:
            print("❌ No dishes found")
    
    asyncio.run(test())
