"""
Configuration management for MadisonBites backend.
Centralizes all environment variables and constants.
"""

import os
from dotenv import load_dotenv

from backend.schema import Restaurant

load_dotenv()


class Config:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_CSE_CX: str = os.getenv("GOOGLE_CSE_CX", "")
    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")
    
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() == "true"
    
    MADISON_LAT: float = 43.0731
    MADISON_LNG: float = -89.4012
    DEFAULT_SEARCH_RADIUS: int = 8000
    
    PLACES_CACHE_TTL: int = 3600
    PHOTO_CACHE_TTL: int = 86400
    
    MAX_IMAGE_SIZE: int = 10_000_000
    MAX_RESTAURANTS: int = 100
    MAX_PHOTOS_PER_DAY: int = 100
    
    API_RETRY_ATTEMPTS: int = 3
    API_RETRY_BACKOFF: float = 1.5
    
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # CORS configuration - comma-separated list of allowed origins
    ALLOWED_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    ]
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "10"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds


DEMO_RESTAURANTS = [
    Restaurant(
        id="demo_graze",
        name="Graze",
        cuisine="American",
        address="1 S Pinckney St, Madison, WI 53703",
        lat=43.0747,
        lng=-89.3845,
        rating=4.5,
        photo_url="https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
        is_open=True,
        price_level=3,
    ),
    Restaurant(
        id="demo_merchant",
        name="The Merchant",
        cuisine="American",
        address="121 S Pinckney St, Madison, WI 53703",
        lat=43.0733,
        lng=-89.3842,
        rating=4.6,
        photo_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
        is_open=True,
        price_level=3,
    ),
    Restaurant(
        id="demo_old_fashioned",
        name="The Old Fashioned",
        cuisine="Bar And Grill",
        address="23 N Pinckney St, Madison, WI 53703",
        lat=43.0755,
        lng=-89.3849,
        rating=4.5,
        photo_url="https://images.unsplash.com/photo-1544025162-d76694265947",
        is_open=True,
        price_level=2,
    ),
    Restaurant(
        id="demo_coopers",
        name="Cooper's Tavern",
        cuisine="American",
        address="20 W Mifflin St, Madison, WI 53703",
        lat=43.0744,
        lng=-89.3864,
        rating=4.3,
        photo_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
        is_open=True,
        price_level=2,
    ),
    Restaurant(
        id="demo_essen_haus",
        name="Essen Haus",
        cuisine="German",
        address="514 E Wilson St, Madison, WI 53703",
        lat=43.0779,
        lng=-89.3748,
        rating=4.4,
        photo_url="https://images.unsplash.com/photo-1559329007-40df8a9345d8",
        is_open=True,
        price_level=2,
    ),
    Restaurant(
        id="demo_taqueria",
        name="Taqueria Guanajuato",
        cuisine="Mexican",
        address="803 S Park St, Madison, WI 53715",
        lat=43.0689,
        lng=-89.3988,
        rating=4.4,
        photo_url="https://images.unsplash.com/photo-1565299585323-38d6b0865b47",
        is_open=True,
        price_level=1,
    ),
    Restaurant(
        id="demo_ha_long",
        name="Ha Long Bay",
        cuisine="Asian",
        address="1353 Williamson St, Madison, WI 53703",
        lat=43.0821,
        lng=-89.3634,
        rating=4.6,
        photo_url="https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        is_open=True,
        price_level=2,
    ),
    Restaurant(
        id="demo_mickeys",
        name="Mickey's Tavern",
        cuisine="Bar",
        address="1524 Williamson St, Madison, WI 53703",
        lat=43.0834,
        lng=-89.3612,
        rating=4.3,
        photo_url="https://images.unsplash.com/photo-1514933651103-005eec06c04b",
        is_open=True,
        price_level=2,
    ),
    Restaurant(
        id="demo_marigold",
        name="Marigold Kitchen",
        cuisine="American",
        address="118 S Pinckney St, Madison, WI 53703",
        lat=43.0742,
        lng=-89.3848,
        rating=4.5,
        photo_url="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c",
        is_open=True,
        price_level=3,
    ),
]


config = Config()
