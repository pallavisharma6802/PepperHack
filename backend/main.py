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
import uuid
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


async def stream_analyze_results_agentic(
    restaurant_id: str,
    image_path: str | None,
    restaurant_name: str,
) -> AsyncGenerator[str, None]:
    """
    Stream menu analysis results using ADK agentic workflow.
    Emits SSE events as agents complete their tasks.
    
    CRITICAL: Cleanup temp file after streaming completes.
    """
    try:
        logger.info("agentic_analysis_started",
                    restaurant_id=restaurant_id,
                    restaurant=restaurant_name,
                    has_image=image_path is not None)
        
        yield f"data: {SSEEvent(agent='system', status=AgentState.RUNNING, payload={{'message': 'Starting agentic workflow'}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        yield f"data: {SSEEvent(agent='scanner', status=AgentState.RUNNING, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        dishes: list[Dish] = await analyze_restaurant_menu_agentic(
            image_path=image_path,
            restaurant_name=restaurant_name,
            restaurant_id=restaurant_id,
        )
        
        if not dishes:
            logger.warning("no_dishes_found", restaurant_id=restaurant_id)
            yield f"data: {SSEEvent(agent='scanner', status=AgentState.ERROR, payload={{'error': 'No dishes extracted from menu'}}).model_dump_json()}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        logger.info("dishes_extracted_and_enriched", count=len(dishes))
        
        yield f"data: {SSEEvent(agent='scanner', status=AgentState.DONE, payload={{'dishes': [d.model_dump() for d in dishes]}}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        yield f"data: {SSEEvent(agent='photo', status=AgentState.DONE, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        yield f"data: {SSEEvent(agent='recommender', status=AgentState.DONE, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
        yield f"data: {SSEEvent(agent='nutritionist', status=AgentState.DONE, payload={}).model_dump_json()}\n\n"
        await asyncio.sleep(0.1)
        
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
async def analyze_menu(request: AnalyzeRequest):
    """
    Analyze a restaurant menu using ADK agentic workflow.
    Streams results via Server-Sent Events.
    
    Supports mock mode for instant cached responses during development.
    """
    logger.info("analyze_request_received",
                restaurant_id=request.restaurant_id,
                has_image=request.image_base64 is not None,
                mock=request.mock)
    
    # MOCK MODE: Return cached response instantly for development/testing
    if request.mock:
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
        restaurant = await get_restaurant_details(request.restaurant_id)
    except Exception as e:
        logger.warning("restaurant_lookup_failed", restaurant_id=request.restaurant_id, error=str(e))
    
    restaurant_name = restaurant.name if restaurant else ""
    
    # CRITICAL FIX: Store image to persistent temp file OUTSIDE streaming context
    # This prevents the file from being deleted while SSE stream is reading it
    image_path = None
    temp_file_handle = None
    
    if request.image_base64:
        try:
            image_data = base64.b64decode(request.image_base64)
            
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
        stream_analyze_results_agentic(request.restaurant_id, image_path, restaurant_name),
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
