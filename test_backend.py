#!/usr/bin/env python3
"""
Test script for backend endpoints.
Run this to verify the backend is working without starting the full server.
"""

import asyncio
from backend.services.menu_scraper import get_restaurant_menu

async def test_menu_scraper():
    """Test the menu scraper directly."""
    print("Testing menu scraper...")
    
    # Test with a demo place_id
    result = await get_restaurant_menu(
        place_id="demo_graze",
        restaurant_name="Graze"
    )
    
    print(f"\nResult:")
    print(f"  Restaurant: {result['restaurant_name']}")
    print(f"  Place ID: {result['restaurant_id']}")
    print(f"  Source: {result['source']}")
    print(f"  Dishes: {len(result.get('dishes', []))}")
    
    if result.get('dishes'):
        print(f"\nFirst dish:")
        dish = result['dishes'][0]
        print(f"  Name: {dish.get('name')}")
        print(f"  Price: {dish.get('price')}")
        print(f"  Category: {dish.get('category')}")
    
    print("\n✅ Menu scraper working!")

if __name__ == "__main__":
    asyncio.run(test_menu_scraper())
