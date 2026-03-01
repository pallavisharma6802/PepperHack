#!/usr/bin/env python3
"""
Quick test: Show that scraping works end-to-end
"""
import asyncio
from backend.services.scraper import get_menu_for_restaurant

async def main():
    print("\n" + "="*70)
    print("TESTING WEB SCRAPING FOR MADISON RESTAURANTS")
    print("="*70 + "\n")
    
    # Test with known Madison restaurants
    tests = [
        ("ChIJHxgqqEBTBogRJLOAk9gWpBg", "The Old Fashioned"),
        ("ChIJQ2BfH89TBogRlmTRnuqSnJ8", "Raising Cane's"),
    ]
    
    for place_id, name in tests:
        print(f"\n📍 {name}")
        print("─"*70)
        
        dishes = await get_menu_for_restaurant(place_id, name)
        
        if dishes:
            print(f"✅ Found {len(dishes)} dishes\n")
            for i, dish in enumerate(dishes[:5], 1):
                print(f"   {i}. {dish.name}")
                if dish.price:
                    print(f"      ${dish.price}")
                print(f"      Category: {dish.category.value}")
                print()
        else:
            print(f"❌ No dishes found - falling back to demo menu\n")
    
    print("="*70)
    print("\n💡 EXPLANATION:")
    print("When you click 'Scan Menu' with mock=false, the system:")
    print("1. Calls /analyze endpoint")
    print("2. Scanner sees no image, calls web scraper")
    print("3. Scraper tries restaurant website, then Serper/Yelp")
    print("4. Gemini extracts dishes from the HTML")
    print("5. All 4 agents enrich the dishes")
    print("\nIf you're seeing only 5 dishes, there's likely a bug in the")
    print("/analyze endpoint (check backend logs for errors).\n")

if __name__ == "__main__":
    asyncio.run(main())
