"""
backend/schema.py
-----------------
Single source of truth for all agent I/O shapes.
Defined by P2 (locked at H3) — consumed by P1 (SSE), P3 (stream listener), P4 (dish card).

DO NOT change field names or types without notifying all team members.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class DishCategory(str, Enum):
    MUST_TRY  = "Must Try"
    STARTERS  = "Starters"
    MAINS     = "Mains"
    DESSERTS  = "Desserts"
    DRINKS    = "Drinks"


class AgentState(str, Enum):
    PENDING  = "pending"
    RUNNING  = "running"
    DONE     = "done"
    ERROR    = "error"


class MacroConfidence(str, Enum):
    HIGH   = "high"
    MEDIUM = "medium"
    LOW    = "low"


class AllergenTag(str, Enum):
    GLUTEN    = "Gluten"
    DAIRY     = "Dairy"
    NUTS      = "Nuts"
    EGGS      = "Eggs"
    SHELLFISH = "Shellfish"
    SOY       = "Soy"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Macros(BaseModel):
    """Nutritional estimates for a single dish. Produced by NutritionAgent."""
    calories:   int            = Field(..., ge=0, description="Total calories (kcal)")
    protein_g:  int            = Field(..., ge=0, description="Protein in grams")
    carbs_g:    int            = Field(..., ge=0, description="Carbohydrates in grams")
    fat_g:      int            = Field(..., ge=0, description="Fat in grams")
    confidence: MacroConfidence = Field(
        ...,
        description=(
            "Reliability of the estimate. "
            "'low' → prefix values with ~ in the UI and show a disclaimer."
        ),
    )


class AgentStatus(BaseModel):
    """Live status of each agent for a single /analyze request."""
    scanner:      AgentState = AgentState.PENDING
    photo:        AgentState = AgentState.PENDING
    recommender:  AgentState = AgentState.PENDING
    nutritionist: AgentState = AgentState.PENDING


# ---------------------------------------------------------------------------
# Core dish model
# ---------------------------------------------------------------------------

class Dish(BaseModel):
    """
    A single dish extracted from a menu.
    Fields are populated progressively as each agent completes:
      - scanner      → id, name, description, category, price
      - photo        → photo_url
      - recommender  → must_try, must_try_reason
      - nutritionist → macros, allergens
    """
    id:              str                   = Field(..., description="Unique dish ID, e.g. 'dish_001'")
    name:            str                   = Field(..., description="Dish name as it appears on the menu")
    description:     str                   = Field(default="", description="Short description or empty string")
    category:        DishCategory          = Field(..., description="Menu category")
    price:           str                   = Field(default="", description="Price string, e.g. '$12.99' or '' if unknown")

    # PhotoFinder fills this
    photo_url:       Optional[str]         = Field(default=None, description="URL of the best food photo found, or null")

    # Recommender fills these
    must_try:        bool                  = Field(default=False, description="True if flagged as a must-try dish")
    must_try_reason: Optional[str]         = Field(default=None, description="Direct quote from review/Reddit that justifies must-try")

    # Nutritionist fills these
    macros:          Optional[Macros]      = Field(default=None, description="Macro estimates; null until NutritionAgent completes")
    allergens:       List[AllergenTag]     = Field(default_factory=list, description="List of allergens present in the dish")
    ingredients:     List[str]             = Field(default_factory=list, description="Key ingredients inferred by NutritionAgent")


# ---------------------------------------------------------------------------
# Top-level response shape (what /analyze streams + what SSE emits)
# ---------------------------------------------------------------------------

class AnalyzeResponse(BaseModel):
    """
    Full response shape for a single restaurant analysis.
    P1 streams this incrementally via SSE — each agent updates its slice.
    P3 merges incoming SSE events into this shape in Zustand.
    P4 reads dishes + agent_status to render UI.
    """
    restaurant_id: str              = Field(..., description="Google Places restaurant ID")
    dishes:        List[Dish]       = Field(default_factory=list)
    agent_status:  AgentStatus      = Field(default_factory=AgentStatus)


# ---------------------------------------------------------------------------
# SSE event wrapper  (P1 wraps each agent result in this before streaming)
# ---------------------------------------------------------------------------

class SSEEvent(BaseModel):
    """
    Envelope for a single SSE message.
    P1 serialises this as JSON and yields it as  data: <json>\\n\\n
    P3 parses it in useAnalyzeStream.js and merges into Zustand.
    """
    agent:   str       = Field(..., description="Which agent just completed: scanner | photo | recommender | nutritionist")
    status:  AgentState
    payload: dict      = Field(default_factory=dict, description="The agent's output slice — merged into AnalyzeResponse by the frontend")


# ---------------------------------------------------------------------------
# /restaurants endpoint  (P1 serves this, P3 consumes it)
# ---------------------------------------------------------------------------

class Restaurant(BaseModel):
    """A single restaurant entry returned by GET /restaurants."""
    id:        str            = Field(..., description="Google Places place_id")
    name:      str
    cuisine:   str            = Field(default="", description="Cuisine type, e.g. 'American', 'Mexican'")
    address:   str            = Field(default="")
    lat:       float
    lng:       float
    rating:    Optional[float] = Field(default=None, ge=0, le=5)
    photo_url: Optional[str]  = Field(default=None)
    is_open:   Optional[bool] = Field(default=None)
    price_level: Optional[int] = Field(default=None, ge=1, le=4, description="1=$  2=$$  3=$$$  4=$$$$")


class RestaurantsResponse(BaseModel):
    """Response shape for GET /restaurants."""
    restaurants: List[Restaurant]
    total:       int


# ---------------------------------------------------------------------------
# /analyze request body
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """Request body for POST /analyze."""
    restaurant_id: str  = Field(..., min_length=1, max_length=256, description="Google Places place_id")
    image_base64:  Optional[str] = Field(
        default=None,
        max_length=10_000_000,
        description="Base64-encoded menu photo from the camera. Null → use restaurant name for text-only scan.",
    )
    mock: bool = Field(
        default=False,
        description="If true, return cached demo JSON instantly (demo fallback).",
    )
    
    @classmethod
    def validate_image(cls, v: Optional[str]) -> Optional[str]:
        """Validate base64 image data."""
        if v is None:
            return v
        
        import base64
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError("Invalid base64 image data")
        
        return v
