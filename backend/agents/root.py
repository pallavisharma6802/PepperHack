"""
Root orchestrator using ADK v1.26.0.
Scanner extracts dishes, then uses direct agent calls for enrichment.
"""

from __future__ import annotations

import json
from typing import Optional

from backend.agents.scanner import scan_menu_async
from backend.agents.photos import photo_finder_agent, find_photos_tool
from backend.agents.recommender import recommendation_agent, recommend_dishes_tool  
from backend.agents.nutrition import nutrition_agent, analyze_nutrition_tool
from backend.schema import Dish
from backend.logger import get_logger

logger = get_logger(__name__)


async def analyze_restaurant_menu_agentic(
    image_path: Optional[str] = None,
    restaurant_name: str = "",
    restaurant_id: str = "",
) -> list[Dish]:
    """
    Orchestrates menu analysis: Scanner → Photos → Recommender → Nutrition.
    Each enrichment agent runs its tool function directly.
    
    Args:
        image_path: Path to menu image
        restaurant_name: Restaurant name for context
        restaurant_id: Restaurant ID for tracking
        
    Returns:
        List of enriched Dish objects
    """
    if not image_path:
        logger.warning("no_image_provided")
        return []
    
    logger.info("workflow_started", 
                image=image_path, 
                restaurant=restaurant_name,
                restaurant_id=restaurant_id)
    
    try:
        # STEP 1: Scan menu image
        logger.info("scanning_menu_image")
        
        dishes = await scan_menu_async(image_path, restaurant_name)
        
        if not dishes:
            logger.warning("no_dishes_extracted")
            return []
        
        logger.info("dishes_extracted", count=len(dishes))
        
        # STEP 2: Enrich dishes sequentially
        dishes_json = [d.model_dump() for d in dishes]
        
        logger.info("starting_enrichment")
        
        # Photo enrichment
        photo_result = await find_photos_tool(
            dishes_json=dishes_json,
            restaurant_name=restaurant_name,
            restaurant_id=restaurant_id
        )
        dishes_json = photo_result["dishes"]
        logger.info("photos_enriched", found=photo_result["photos_found"])
        
        # Recommendation enrichment
        rec_result = await recommend_dishes_tool(
            dishes_json=dishes_json,
            restaurant_name=restaurant_name
        )
        dishes_json = rec_result["dishes"]
        logger.info("recommendations_enriched", count=rec_result["recommended_count"])
        
        # Nutrition enrichment
        nutr_result = await analyze_nutrition_tool(dishes_json=dishes_json)
        dishes_json = nutr_result["dishes"]
        logger.info("nutrition_enriched", count=nutr_result["analyzed_count"])
        
        # Convert back to Dish objects
        enriched_dishes = [Dish(**d) for d in dishes_json]
        
        logger.info("workflow_complete", dishes=len(enriched_dishes))
        
        return enriched_dishes
        
    except Exception as e:
        logger.error("workflow_failed", error=str(e), exc_info=True)
        return []

