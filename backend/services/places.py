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

PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
NEARBY_MAX_PER_REQUEST = 20
TEXT_SEARCH_PAGE_SIZE = 20


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


def _place_id(place: dict) -> str:
    """Get place ID from Place object (handles both id and name fields)."""
    pid = place.get("id")
    if pid:
        return pid
    name = place.get("name", "")
    if name and name.startswith("places/"):
        return name.replace("places/", "")
    return name or ""


@retry(
    stop=stop_after_attempt(config.API_RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=config.API_RETRY_BACKOFF, min=1, max=10),
    retry=retry_if_exception_type((requests.HTTPError, requests.Timeout)),
    reraise=True,
)
def _call_places_api(url: str, headers: dict, payload: dict = None) -> dict:
    """Make HTTP request to Places API with retry logic."""
    if payload:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
    else:
        response = requests.get(url, headers=headers, timeout=15)
    
    if not response.ok:
        logger.error("places_api_error", status=response.status_code, body=response.text[:500])
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
    
    cache_key = f"search:v5:{lat}:{lng}:{radius}:{cuisine}:{open_now}"
    cached = await _cache.get(cache_key)
    if cached:
        logger.info("cache_hit", key=cache_key, count=len(cached))
        return cached

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.currentOpeningHours,places.photos"
    }
    
    all_places = []
    seen_ids = set()

    def _add_place(p: dict):
        pid = _place_id(p)
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            all_places.append(p)

    async def _nearby_batch(center_lat: float, center_lng: float) -> list:
        payload = {
            "includedTypes": ["restaurant"],
            "maxResultCount": NEARBY_MAX_PER_REQUEST,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": center_lat, "longitude": center_lng},
                    "radius": int(radius * 0.55)
                }
            }
        }
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(
            None,
            _call_places_api,
            PLACES_NEARBY_URL,
            headers,
            payload,
        )
        return data.get("places", [])

    try:
        deg_per_km = 1 / 111.0
        d = (radius / 1000) * 0.35 * deg_per_km
        centers = [
            (lat, lng),
            (lat + d, lng), (lat - d, lng), (lat, lng + d), (lat, lng - d),
            (lat + d, lng + d), (lat + d, lng - d), (lat - d, lng + d), (lat - d, lng - d),
        ]
        results = await asyncio.gather(*[_nearby_batch(clat, clng) for clat, clng in centers])
        for places in results:
            for p in places:
                _add_place(p)
        logger.info("places_api_success", count=len(all_places))
    except Exception as e:
        logger.error("places_api_failed", error=str(e), exc_info=True)
        if config.DEMO_MODE:
            return DEMO_RESTAURANTS
        raise
    
    restaurants = []
    for place in all_places[:config.MAX_RESTAURANTS]:
        try:
            pid = _place_id(place)
            if not pid:
                continue
            photo_url = None
            if place.get("photos"):
                photo_name = place["photos"][0].get("name")
                if photo_name:
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&key={config.GOOGLE_API_KEY}"
            
            restaurant = Restaurant(
                id=pid,
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
            logger.warning("place_parsing_error", place_id=_place_id(place), error=str(e))
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
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,priceLevel,types,currentOpeningHours,photos,websiteUri"
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
