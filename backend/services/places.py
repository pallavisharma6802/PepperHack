"""
Google Places API service with intelligent caching, retries, and fallback.
Handles restaurant searches and detail retrieval for Madison, WI area.
"""

from __future__ import annotations

import asyncio
import time
from typing import Optional
from dataclasses import dataclass

import requests
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from backend.schema import Restaurant
from backend.config import config, DEMO_RESTAURANTS
from backend.logger import get_logger

logger = get_logger(__name__)

PLACES_API_BASE = "https://places.googleapis.com/v1/places:searchNearby"
NEARBY_MAX_PER_REQUEST = 20


@dataclass
class CacheEntry:
    data: any
    timestamp: float
    ttl: int = config.PLACES_CACHE_TTL


class ThreadSafePlacesCache:
    def __init__(self):
        self._cache: dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[any]:
        async with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if time.time() - entry.timestamp > entry.ttl:
                del self._cache[key]
                return None
            
            return entry.data
    
    async def set(self, key: str, data: any, ttl: int = config.PLACES_CACHE_TTL):
        async with self._lock:
            self._cache[key] = CacheEntry(data=data, timestamp=time.time(), ttl=ttl)
    
    async def clear(self):
        async with self._lock:
            self._cache.clear()


_cache = ThreadSafePlacesCache()


def _parse_price_level(price_str: str) -> Optional[int]:
    """Convert Places API price level string to integer (0-4)."""
    price_map = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return price_map.get(price_str)


def _extract_cuisine_type(types: list[str]) -> str:
    """Extract cuisine type from place types."""
    excluded = {"restaurant", "food", "point_of_interest", "establishment"}
    for t in types:
        if t not in excluded:
            return t.replace("_", " ").title()
    return "Restaurant"


@retry(
    stop=stop_after_attempt(config.API_RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=config.API_RETRY_BACKOFF, min=1, max=10),
    retry=retry_if_exception_type((requests.HTTPError, requests.Timeout)),
    reraise=True,
)
def _call_places_api(url: str, headers: dict, payload: dict = None) -> dict:
    """Make HTTP request to Places API with retry logic."""
    if payload:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
    else:
        response = requests.get(url, headers=headers, timeout=10)
    
    response.raise_for_status()
    return response.json()


async def search_restaurants(
    lat: float = config.MADISON_LAT,
    lng: float = config.MADISON_LNG,
    radius: int = config.DEFAULT_SEARCH_RADIUS,
    cuisine: Optional[str] = None,
    open_now: bool = False,
) -> list[Restaurant]:
    """
    Search for restaurants using Google Places API (New).
    Results are cached. Falls back to demo data on failure.
    """
    if config.DEMO_MODE:
        logger.info("demo_mode_active", action="returning_demo_restaurants")
        return DEMO_RESTAURANTS
    
    if not config.GOOGLE_API_KEY:
        logger.warning("api_key_missing", fallback="demo_restaurants")
        return DEMO_RESTAURANTS
    
    cache_key = f"search:{lat}:{lng}:{radius}:{cuisine}:{open_now}"
    cached = await _cache.get(cache_key)
    if cached:
        logger.info("cache_hit", key=cache_key, count=len(cached))
        return cached
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.currentOpeningHours,places.photos"
    }
    
    # Grid search: Places API caps at 20 per request, so we query 5 centers to get ~100
    offset = radius * 0.35
    centers = [
        (lat, lng),
        (lat + offset / 111000, lng),
        (lat - offset / 111000, lng),
        (lat, lng + offset / (111000 * 0.7)),
        (lat, lng - offset / (111000 * 0.7)),
    ]
    sub_radius = int(radius * 0.6)
    
    async def _fetch_batch(center_lat: float, center_lng: float) -> list:
        payload = {
            "includedTypes": ["restaurant"],
            "maxResultCount": NEARBY_MAX_PER_REQUEST,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": center_lat, "longitude": center_lng},
                    "radius": sub_radius
                }
            }
        }
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(
            None,
            _call_places_api,
            PLACES_API_BASE,
            headers,
            payload,
        )
        return data.get("places", [])
    
    try:
        logger.info("calling_places_api_grid", centers=len(centers), radius=radius)
        results = await asyncio.gather(*[_fetch_batch(clat, clng) for clat, clng in centers])
        all_places = []
        seen_ids = set()
        for places in results:
            for p in places:
                pid = p.get("id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    all_places.append(p)
        logger.info("places_api_success", count=len(all_places))
        
    except Exception as e:
        logger.error("places_api_failed", error=str(e), fallback="demo_restaurants")
        return DEMO_RESTAURANTS
    
    restaurants = []
    for place in all_places[:config.MAX_RESTAURANTS]:
        try:
            photo_url = None
            if place.get("photos"):
                photo_name = place["photos"][0].get("name")
                if photo_name:
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&key={config.GOOGLE_API_KEY}"
            
            restaurant = Restaurant(
                id=place["id"],
                name=place.get("displayName", {}).get("text", "Unknown"),
                cuisine=_extract_cuisine_type(place.get("types", [])),
                address=place.get("formattedAddress", ""),
                lat=place.get("location", {}).get("latitude", lat),
                lng=place.get("location", {}).get("longitude", lng),
                rating=place.get("rating"),
                photo_url=photo_url,
                is_open=place.get("currentOpeningHours", {}).get("openNow"),
                price_level=_parse_price_level(place.get("priceLevel", "")),
            )
            restaurants.append(restaurant)
        except Exception as e:
            logger.warning("place_parsing_error", place_id=place.get("id"), error=str(e))
            continue
    
    await _cache.set(cache_key, restaurants)
    return restaurants


async def get_restaurant_details(place_id: str) -> Optional[Restaurant]:
    """
    Get detailed information about a specific restaurant.
    Results are cached. Returns None on failure.
    """
    if config.DEMO_MODE or not config.GOOGLE_API_KEY:
        for restaurant in DEMO_RESTAURANTS:
            if restaurant.id == place_id:
                return restaurant
        return None
    
    cache_key = f"detail:{place_id}"
    cached = await _cache.get(cache_key)
    if cached:
        logger.info("cache_hit", key=cache_key)
        return cached
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.GOOGLE_API_KEY,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,priceLevel,types,currentOpeningHours,photos"
    }
    
    try:
        logger.info("fetching_restaurant_details", place_id=place_id)
        
        url = f"https://places.googleapis.com/v1/places/{place_id}"
        loop = asyncio.get_event_loop()
        place = await loop.run_in_executor(
            None,
            _call_places_api,
            url,
            headers,
            None,
        )
        
        photo_url = None
        if place.get("photos"):
            photo_name = place["photos"][0].get("name")
            if photo_name:
                photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&key={config.GOOGLE_API_KEY}"
        
        restaurant = Restaurant(
            id=place["id"],
            name=place.get("displayName", {}).get("text", "Unknown"),
            cuisine=_extract_cuisine_type(place.get("types", [])),
            address=place.get("formattedAddress", ""),
            lat=place.get("location", {}).get("latitude", 0),
            lng=place.get("location", {}).get("longitude", 0),
            rating=place.get("rating"),
            photo_url=photo_url,
            is_open=place.get("currentOpeningHours", {}).get("openNow"),
            price_level=_parse_price_level(place.get("priceLevel", "")),
        )
        
        await _cache.set(cache_key, restaurant)
        return restaurant
        
    except Exception as e:
        logger.error("restaurant_details_failed", place_id=place_id, error=str(e))
        return None


async def clear_cache():
    """Clear the Places API cache."""
    await _cache.clear()
    logger.info("cache_cleared")


async def get_cache_stats() -> dict:
    """Get current cache statistics."""
    async with _cache._lock:
        return {
            "cached_entries": len(_cache._cache),
            "ttl_seconds": config.PLACES_CACHE_TTL,
        }
