#!/usr/bin/env python3
"""
Test script for backend endpoints.
Run this to verify the backend is working without starting the full server.
"""

import asyncio
from backend.services.scraper import get_menu_for_restaurant

async def test_menu_scraper():
    """Test the menu scraper directly."""
    print("Testing menu scraper...")

    # Test with The Old Fashioned (real Madison, WI restaurant)
    place_id = "ChIJHxgqqEBTBogRJLOAk9gWpBg"
    restaurant_name = "The Old Fashioned"

    dishes = await get_menu_for_restaurant(
        place_id=place_id,
        restaurant_name=restaurant_name,
    )

    print(f"\nResult:")
    print(f"  Restaurant: {restaurant_name}")
    print(f"  Place ID: {place_id}")
    print(f"  Dishes found: {len(dishes)}")

    if dishes:
        print(f"\nFirst dish:")
        dish = dishes[0]
        print(f"  Name: {dish.name}")
        print(f"  Price: {dish.price}")
        print(f"  Category: {dish.category}")
        print("\n✅ Menu scraper working!")
    else:
        print("\n⚠️  No dishes found (website may be JS-rendered)")

if __name__ == "__main__":
    asyncio.run(test_menu_scraper())
