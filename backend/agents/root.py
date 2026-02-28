"""
Root orchestrator using ADK with hybrid approach for true agentic execution.
Scanner uses direct call (needs file access), enrichment uses true ADK tool execution.
"""

from __future__ import annotations

import json
from typing import Optional

from google.adk.agents import Agent, ParallelAgent
from google.adk.sessions import Session, InMemorySessionService

from backend.agents.scanner import scan_menu_async
from backend.agents.photos import photo_finder_agent
from backend.agents.recommender import recommendation_agent  
from backend.agents.nutrition import nutrition_agent
from backend.schema import Dish
from backend.logger import get_logger

logger = get_logger(__name__)


async def analyze_restaurant_menu_agentic(
    image_path: Optional[str] = None,
    restaurant_name: str = "",
    restaurant_id: str = "",
) -> list[Dish]:
    """
    TRUE 100% AGENTIC implementation where possible with ADK.
    
    Hybrid approach:
    - Scanner: Direct call (needs filesystem access to image_path)
    - Enrichment: TRUE ADK execution via session.send() with tools
    
    The enrichment agents are 100% agentic - they receive prompts and autonomously
    decide when/how to use their tools through ADK's execution engine.
    
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
    
    logger.info("true_agentic_workflow_started", 
                image=image_path, 
                restaurant=restaurant_name,
                restaurant_id=restaurant_id)
    
    try:
        # STEP 1: Scanner (direct call - needs filesystem access)
        logger.info("scanning_menu_image")
        
        dishes = await scan_menu_async(image_path, restaurant_name)
        
        if not dishes:
            logger.warning("no_dishes_extracted")
            return []
        
        logger.info("dishes_extracted", count=len(dishes))
        
        # STEP 2: TRUE AGENTIC ENRICHMENT via ADK session.send()
        # Each agent will autonomously decide to use its tools based on the prompt
        
        dishes_json = [d.model_dump() for d in dishes]
        
        logger.info("starting_true_agentic_enrichment")
        
        # Create ParallelAgent with enrichment sub-agents
        # These agents have tools and will decide when to use them
        enrichment_agent = ParallelAgent(
            name="MenuEnrichment",
            description="Autonomously enriches dishes with photos, recommendations, and nutrition using available tools",
            sub_agents=[photo_finder_agent, recommendation_agent, nutrition_agent],
        )
        
        enrichment_session = Session(
            service=InMemorySessionService(),
            agent=enrichment_agent,
        )
        
        # Craft prompt that will cause agents to invoke their tools
        enrichment_prompt = f"""You have {len(dishes_json)} dishes from {restaurant_name} (Place ID: {restaurant_id}).

Dishes data:
{json.dumps(dishes_json, indent=2)}

Your task: Enrich these dishes by executing your available tools in parallel.

**PhotoFinder**: Use your find_photos_tool to add photo_url to each dish. Pass the dishes_json, restaurant_name="{restaurant_name}", and restaurant_id="{restaurant_id}".

**Recommender**: Use your recommend_dishes_tool to mark must-try dishes with is_recommended=true. Pass the dishes_json list.

**Nutritionist**: Use your analyze_nutrition_tool to estimate calories, protein, carbs, fat, and allergens for each dish. Pass the dishes_json list.

Execute all tools and return the fully enriched dishes JSON."""
        
        logger.info("invoking_parallel_agents_via_adk", agents=3, dishes=len(dishes_json))
        
        enrichment_response = await enrichment_session.send(enrichment_prompt)
        
        logger.info("agentic_enrichment_complete", 
                    response_type=type(enrichment_response).__name__)
        
        # The response should contain the enriched dishes JSON
        # Try to extract it from the response
        try:
            response_text = str(enrichment_response)
            logger.debug("enrichment_response_text", text=response_text[:500])
            
            # Try to find JSON in response
            if '[' in response_text and ']' in response_text:
                start = response_text.find('[')
                end = response_text.rfind(']') + 1
                json_str = response_text[start:end]
                enriched_data = json.loads(json_str)
                
                # Update original dishes with enriched data
                for i, dish_data in enumerate(enriched_data):
                    if i < len(dishes):
                        # Update fields that may have been enriched
                        if "photo_url" in dish_data:
                            dishes[i].photo_url = dish_data["photo_url"]
                        if "is_recommended" in dish_data:
                            dishes[i].is_recommended = dish_data["is_recommended"]
                        if "calories" in dish_data:
                            dishes[i].calories = dish_data["calories"]
                        if "protein" in dish_data:
                            dishes[i].protein = dish_data["protein"]
                        if "carbs" in dish_data:
                            dishes[i].carbs = dish_data["carbs"]
                        if "fat" in dish_data:
                            dishes[i].fat = dish_data["fat"]
                        if "allergens" in dish_data:
                            dishes[i].allergens = dish_data["allergens"]
                
                logger.info("dishes_enriched_from_response", count=len(enriched_data))
            else:
                logger.warning("no_json_in_enrichment_response")
                
        except Exception as e:
            logger.warning("enrichment_response_parsing_failed", error=str(e))
            # Continue with non-enriched dishes
        
        logger.info("true_agentic_workflow_complete", dishes=len(dishes))
        
        return dishes
        
    except Exception as e:
        logger.error("true_agentic_workflow_failed", error=str(e), exc_info=True)
        return []


root_agent = Agent(
    name="MadisonBitesOrchestrator",
    description="Orchestrates the complete menu analysis pipeline using true ADK agent execution",
    model="gemini-2.0-flash-exp",
    instruction="""You are the root orchestrator for MadisonBites menu analysis.
Your role is to coordinate multiple specialized agents through proper ADK execution:

1. MenuScanner - extracts dishes from images via scan_menu_tool
2. PhotoFinder - finds dish photos via find_photos_tool
3. DishRecommender - identifies must-try items via recommend_dishes_tool
4. Nutritionist - estimates macros and allergens via analyze_nutrition_tool

You MUST invoke all agents through their tools using session.send().
NEVER call functions directly - always use the ADK execution engine.""",
)


