"""
FastAPI application for MadisonBites - True agentic menu analysis system.
Production-ready with proper logging, validation, and error handling.
"""

from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import os
import tempfile
import time
import uuid
from collections import defaultdict
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.schema import (
    AnalyzeRequest,
    Restaurant,
    RestaurantsResponse,
    SSEEvent,
    AgentState,
    Dish,
)
from backend.services.places import search_restaurants, get_restaurant_details
from backend.agents.root import analyze_restaurant_menu_agentic
from backend.config import config
from backend.logger import setup_logging, get_logger

setup_logging(config.LOG_LEVEL)
logger = get_logger(__name__)

app = FastAPI(
    title="MadisonBites API",
    description="AI-powered agentic menu scanner with ADK orchestration",
    version="2.0.0",
)

# CORS configuration - uses environment-specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting state (in-memory, simple sliding window)
rate_limit_state: dict[str, list[float]] = defaultdict(list)


@contextlib.contextmanager
def temp_image_file(image_data: bytes):
    """Context manager for temporary image files with guaranteed cleanup."""
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    try:
        temp.write(image_data)
        temp.close()
        logger.info("temp_file_created", path=temp.name, size=len(image_data))
        yield temp.name
    finally:
        try:
            os.unlink(temp.name)
            logger.info("temp_file_deleted", path=temp.name)
        except Exception as e:
            logger.warning("temp_file_cleanup_failed", path=temp.name, error=str(e))


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    request_id = str(uuid.uuid4())[:8]
    logger.info("request_received",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                client=request.client.host if request.client else "unknown")
    
    response = await call_next(request)
    
    logger.info("request_completed",
                request_id=request_id,
                status=response.status_code)
    
    return response


def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit."""
    now = time.time()
    window_start = now - config.RATE_LIMIT_WINDOW
    
    # Clean old entries
    rate_limit_state[client_ip] = [
        timestamp for timestamp in rate_limit_state[client_ip]
        if timestamp > window_start
    ]
    
    # Check limit
    if len(rate_limit_state[client_ip]) >= config.RATE_LIMIT_REQUESTS:
        return False
    
    # Add current request
    rate_limit_state[client_ip].append(now)
    return True


@app.get("/")
async def health_check():
    """Health check endpoint with system status."""
    return {
        "service": "MadisonBites API",
        "status": "healthy",
        "version": "2.0.0",
        "agentic": True,
        "demo_mode": config.DEMO_MODE,
    }


@app.get("/restaurants", response_model=RestaurantsResponse)
async def get_restaurants(
    lat: float = config.MADISON_LAT,
    lng: float = config.MADISON_LNG,
    radius: int = config.DEFAULT_SEARCH_RADIUS,
    cuisine: str | None = None,
    open_now: bool = False,
):
    """
    Search for restaurants near coordinates.
    Falls back to demo data if API fails.
    """
    try:
        logger.info("restaurant_search_requested",
                    lat=lat, lng=lng, radius=radius,
                    cuisine=cuisine, open_now=open_now)
        
        restaurants = await search_restaurants(lat, lng, radius, cuisine, open_now)
        
        logger.info("restaurant_search_complete", count=len(restaurants))
        
        return RestaurantsResponse(
            restaurants=restaurants,
            total=len(restaurants),
        )
    except Exception as e:
        logger.error("restaurant_search_failed", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Restaurant search failed: {str(e)}")


@app.get("/restaurants/{place_id}", response_model=Restaurant)
async def get_restaurant(place_id: str):
    """Get detailed information about a specific restaurant."""
    try:
        logger.info("restaurant_details_requested", place_id=place_id)
        
        restaurant = await get_restaurant_details(place_id)
        
        if not restaurant:
            logger.warning("restaurant_not_found", place_id=place_id)
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        logger.info("restaurant_details_retrieved", place_id=place_id, name=restaurant.name)
        return restaurant
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("restaurant_details_failed", place_id=place_id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/restaurants/{place_id}/menu")
async def get_restaurant_menu_endpoint(place_id: str):
    """
    Get pre-scraped menu for a restaurant from Google Maps/web scraping.
    Falls back to cached/mock data if no menu available.
    Returns dishes in same format as /analyze endpoint.
    """
    try:
        from backend.services.menu_scraper import get_restaurant_menu
        
        # Get restaurant name for context
        restaurant = await get_restaurant_details(place_id)
        restaurant_name = restaurant.name if restaurant else ""
        
        # Use the menu scraper service
        menu_data = await get_restaurant_menu(place_id, restaurant_name)
        
        logger.info("menu_fetch_complete", 
                   place_id=place_id,
                   dish_count=len(menu_data.get("dishes", [])),
                   source=menu_data.get("source"))
        
        return menu_data
        
    except Exception as e:
        logger.error("menu_fetch_failed", place_id=place_id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def stream_analyze_results_agentic(
    restaurant_id: str,
    image_path: str | None,
    restaurant_name: str,
    request: Request,
) -> AsyncGenerator[str, None]:
    """
    Stream menu analysis results using ADK agentic workflow.
    TRUE AGENT-BY-AGENT STREAMING: Each agent streams its results as it completes,
    not all at once. This is the key requirement from the plan.
    
    CRITICAL: Cleanup temp file after streaming completes.
    Includes client disconnect detection for graceful cleanup.
    """
    try:
        logger.info("agentic_analysis_started",
                    restaurant_id=restaurant_id,
                    restaurant=restaurant_name,
                    has_image=image_path is not None)
        
        # Check if client is still connected
        if await request.is_disconnected():
            logger.info("client_disconnected_early", restaurant_id=restaurant_id)
            return
        
        yield f"data: {SSEEvent(agent='system', status=AgentState.RUNNING, payload={{'message': 'Starting agentic workflow'}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        # AGENT 1: Scanner - Extract dishes from menu
        yield f"data: {SSEEvent(agent='scanner', status=AgentState.RUNNING, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        # Check disconnect before expensive operation
        if await request.is_disconnected():
            logger.info("client_disconnected_before_scanner", restaurant_id=restaurant_id)
            return
        
        # Import scanner here to avoid circular imports
        from backend.agents.scanner import scan_menu_async
        
        dishes: list[Dish] = await scan_menu_async(image_path, restaurant_name)
        
        if not dishes:
            logger.warning("no_dishes_found", restaurant_id=restaurant_id)
            yield f"data: {SSEEvent(agent='scanner', status=AgentState.ERROR, payload={{'error': 'No dishes extracted from menu'}}).model_dump_json()}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        logger.info("scanner_complete", count=len(dishes))
        
        # Stream scanner results immediately
        yield f"data: {SSEEvent(agent='scanner', status=AgentState.DONE, payload={{'dishes': [d.model_dump() for d in dishes]}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        # Check disconnect
        if await request.is_disconnected():
            logger.info("client_disconnected_after_scanner", restaurant_id=restaurant_id)
            return
        
        # AGENT 2: PhotoFinder - Find photos for each dish
        yield f"data: {SSEEvent(agent='photo', status=AgentState.RUNNING, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        from backend.agents.photos import find_photos_tool
        
        dishes_json = [d.model_dump() for d in dishes]
        photo_result = await find_photos_tool(dishes_json, restaurant_name, restaurant_id)
        
        # Update dishes with photo URLs
        for i, dish_data in enumerate(photo_result.get("dishes", [])):
            if i < len(dishes) and "photo_url" in dish_data:
                dishes[i].photo_url = dish_data["photo_url"]
        
        logger.info("photo_finder_complete", found=photo_result.get("photos_found", 0))
        
        # Stream photo results immediately
        yield f"data: {SSEEvent(agent='photo', status=AgentState.DONE, payload={{'dishes': [d.model_dump() for d in dishes]}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        # Check disconnect
        if await request.is_disconnected():
            logger.info("client_disconnected_after_photos", restaurant_id=restaurant_id)
            return
        
        # AGENT 3: Recommender - Identify must-try dishes
        yield f"data: {SSEEvent(agent='recommender', status=AgentState.RUNNING, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        from backend.agents.recommender import recommend_dishes_tool
        
        dishes_json = [d.model_dump() for d in dishes]
        rec_result = await recommend_dishes_tool(dishes_json, restaurant_name)
        
        # Update dishes with recommendations
        for i, dish_data in enumerate(rec_result.get("dishes", [])):
            if i < len(dishes):
                dishes[i].must_try = dish_data.get("must_try", False)
                dishes[i].must_try_reason = dish_data.get("must_try_reason")
        
        logger.info("recommender_complete", recommended=rec_result.get("recommended_count", 0))
        
        # Stream recommender results immediately
        yield f"data: {SSEEvent(agent='recommender', status=AgentState.DONE, payload={{'dishes': [d.model_dump() for d in dishes]}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        # Check disconnect
        if await request.is_disconnected():
            logger.info("client_disconnected_after_recommender", restaurant_id=restaurant_id)
            return
        
        # AGENT 4: Nutritionist - Estimate macros and allergens
        yield f"data: {SSEEvent(agent='nutritionist', status=AgentState.RUNNING, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        from backend.agents.nutrition import analyze_nutrition_tool
        
        dishes_json = [d.model_dump() for d in dishes]
        nutrition_result = await analyze_nutrition_tool(dishes_json)
        
        # Update dishes with nutrition data
        for i, dish_data in enumerate(nutrition_result.get("dishes", [])):
            if i < len(dishes):
                if "macros" in dish_data and dish_data["macros"]:
                    dishes[i].macros = dish_data["macros"]
                if "allergens" in dish_data:
                    dishes[i].allergens = dish_data["allergens"]
        
        logger.info("nutritionist_complete", analyzed=nutrition_result.get("analyzed_count", 0))
        
        # Stream nutritionist results immediately
        yield f"data: {SSEEvent(agent='nutritionist', status=AgentState.DONE, payload={{'dishes': [d.model_dump() for d in dishes]}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        # Final complete event with all enriched dishes
        final_dishes = [d.model_dump() for d in dishes]
        yield f"data: {SSEEvent(agent='complete', status=AgentState.DONE, payload={{'dishes': final_dishes}}).model_dump_json()}\n\n"
        
        logger.info("agentic_analysis_complete", dish_count=len(dishes))
        
    except Exception as e:
        logger.error("agentic_analysis_failed", error=str(e), exc_info=True)
        yield f"data: {SSEEvent(agent='error', status=AgentState.ERROR, payload={{'error': str(e)}}).model_dump_json()}\n\n"
    
    finally:
        # CRITICAL FIX: Clean up temp file after streaming completes
        if image_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
                logger.info("temp_image_cleaned", path=image_path)
            except Exception as e:
                logger.warning("temp_image_cleanup_failed", path=image_path, error=str(e))
    
    yield "data: [DONE]\n\n"


@app.post("/analyze")
async def analyze_menu(req_body: AnalyzeRequest, request: Request):
    """
    Analyze a restaurant menu using ADK agentic workflow.
    Streams results via Server-Sent Events.
    
    Supports mock mode for instant cached responses during development.
    Includes rate limiting protection.
    """
    # Rate limiting check
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        logger.warning("rate_limit_exceeded", client_ip=client_ip)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {config.RATE_LIMIT_REQUESTS} requests per {config.RATE_LIMIT_WINDOW} seconds."
        )
    
    logger.info("analyze_request_received",
                restaurant_id=req_body.restaurant_id,
                has_image=req_body.image_base64 is not None,
                mock=req_body.mock,
                client_ip=client_ip)
    
    # MOCK MODE: Return cached response instantly for development/testing
    if req_body.mock:
        logger.info("mock_mode_enabled", returning="cached_menu_response")
        
        async def stream_mock_results():
            """Stream mock results from cached JSON."""
            try:
                mock_path = Path(__file__).parent / "mock" / "menu_response.json"
                
                if not mock_path.exists():
                    logger.error("mock_file_not_found", path=str(mock_path))
                    error_event = SSEEvent(agent='error', status=AgentState.ERROR, payload={'error': 'Mock data not found'})
                    yield f"data: {error_event.model_dump_json()}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                
                with open(mock_path) as f:
                    mock_data = json.load(f)
                
                dishes = mock_data.get("dishes", [])
                
                # Simulate agent progress
                system_event = SSEEvent(agent='system', status=AgentState.RUNNING, payload={'message': 'Mock mode - using cached data'})
                yield f"data: {system_event.model_dump_json()}\n\n"
                await asyncio.sleep(0.1)
                
                scanner_event = SSEEvent(agent='scanner', status=AgentState.DONE, payload={'dishes': dishes})
                yield f"data: {scanner_event.model_dump_json()}\n\n"
                await asyncio.sleep(0.1)
                
                photo_event = SSEEvent(agent='photo', status=AgentState.DONE, payload={})
                yield f"data: {photo_event.model_dump_json()}\n\n"
                await asyncio.sleep(0.1)
                
                recommender_event = SSEEvent(agent='recommender', status=AgentState.DONE, payload={})
                yield f"data: {recommender_event.model_dump_json()}\n\n"
                await asyncio.sleep(0.1)
                
                nutritionist_event = SSEEvent(agent='nutritionist', status=AgentState.DONE, payload={})
                yield f"data: {nutritionist_event.model_dump_json()}\n\n"
                await asyncio.sleep(0.1)
                
                complete_event = SSEEvent(agent='complete', status=AgentState.DONE, payload={'dishes': dishes})
                yield f"data: {complete_event.model_dump_json()}\n\n"
                
                logger.info("mock_response_complete", dish_count=len(dishes))
                
            except Exception as e:
                logger.error("mock_mode_failed", error=str(e))
                error_event = SSEEvent(agent='error', status=AgentState.ERROR, payload={'error': str(e)})
                yield f"data: {error_event.model_dump_json()}\n\n"
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            stream_mock_results(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    
    # PRODUCTION MODE: Full agentic workflow
    restaurant = None
    try:
        restaurant = await get_restaurant_details(req_body.restaurant_id)
    except Exception as e:
        logger.warning("restaurant_lookup_failed", restaurant_id=req_body.restaurant_id, error=str(e))
    
    restaurant_name = restaurant.name if restaurant else ""
    
    # CRITICAL FIX: Store image to persistent temp file OUTSIDE streaming context
    # This prevents the file from being deleted while SSE stream is reading it
    image_path = None
    temp_file_handle = None
    
    if req_body.image_base64:
        try:
            image_data = base64.b64decode(req_body.image_base64)
            
            # Create temp file that persists through streaming
            temp_file_handle = tempfile.NamedTemporaryFile(
                mode='wb',
                suffix='.jpg',
                delete=False,  # Don't auto-delete - we'll clean up manually
            )
            temp_file_handle.write(image_data)
            temp_file_handle.flush()
            temp_file_handle.close()
            image_path = temp_file_handle.name
            
            logger.info("temp_image_created", path=image_path)
            
        except Exception as e:
            logger.error("image_processing_failed", error=str(e))
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
    
    return StreamingResponse(
        stream_analyze_results_agentic(req_body.restaurant_id, image_path, restaurant_name, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
