#!/usr/bin/env python3
"""
Test the recommender agent's "must try" feature.
This agent uses Gemini + Google Search grounding to find real reviews
and mark dishes as must-try with actual quotes from Reddit, Google Maps, etc.
"""
import asyncio
from backend.agents.recommender import recommend_dishes_tool

# Test with well-known Madison restaurants
TESTS = [
    ("Ian's Pizza", [
        {"id": "d1", "name": "Mac and Cheese Pizza", "description": "Creamy mac and cheese on pizza"},
        {"id": "d2", "name": "Pepperoni Pizza", "description": "Classic pepperoni"},
        {"id": "d3", "name": "BBQ Chicken Pizza", "description": "BBQ sauce and chicken"},
    ]),
    ("Culver's", [
        {"id": "d1", "name": "Butter Burger", "description": "Wisconsin butter burger"},
        {"id": "d2", "name": "Cheese Curds", "description": "Fried Wisconsin cheese curds"},
        {"id": "d3", "name": "Concrete Mixer", "description": "Frozen custard dessert"},
    ]),
    ("The Old Fashioned", [
        {"id": "d1", "name": "Fried Cheese Curds", "description": "Beer-battered cheese curds"},
        {"id": "d2", "name": "Brandy Old Fashioned", "description": "Wisconsin-style cocktail"},
        {"id": "d3", "name": "Fish Fry", "description": "Friday fish fry special"},
    ]),
]

async def test_must_try():
    print("="*70)
    print("🔥 TESTING MUST-TRY RECOMMENDER AGENT")
    print("="*70)
    print("\nThis agent uses Gemini + Google Search to find real reviews from:")
    print("  • Reddit r/madisonwi")
    print("  • Google Maps reviews")
    print("  • Yelp and food blogs")
    print("\nIt marks dishes as 'must try' only when it finds REAL quotes.\n")
    
    for restaurant, dishes in TESTS:
        print(f"\n{'─'*70}")
        print(f"🍽️  {restaurant}")
        print(f"{'─'*70}\n")
        
        result = await recommend_dishes_tool(dishes, restaurant)
        
        must_try_count = result['recommended_count']
        total_count = len(result['dishes'])
        
        print(f"Must-Try: {must_try_count}/{total_count} dishes\n")
        
        for dish in result['dishes']:
            if dish.get('must_try'):
                print(f"✅ {dish['name']}")
                if dish.get('must_try_reason'):
                    # Wrap long reasons
                    reason = dish['must_try_reason']
                    if len(reason) > 65:
                        words = reason.split()
                        lines = []
                        current = ""
                        for word in words:
                            if len(current) + len(word) + 1 <= 65:
                                current += (" " if current else "") + word
                            else:
                                lines.append(current)
                                current = word
                        if current:
                            lines.append(current)
                        print(f"   💬 {lines[0]}")
                        for line in lines[1:]:
                            print(f"      {line}")
                    else:
                        print(f"   💬 {reason}")
            else:
                print(f"⚪ {dish['name']}")
            print()
    
    print("="*70)
    print("✨ FEATURE EXPLANATION")
    print("="*70)
    print("""
How it works:
1. Agent receives dishes from scanner
2. Searches Google for "{restaurant} Madison WI best dishes"
3. Searches Reddit: "site:reddit.com/r/madisonwi {restaurant}"
4. Parses reviews and extracts quotes praising specific dishes
5. Marks dishes as must-try ONLY if real evidence exists
6. Includes the quote + source (e.g., "Reddit r/madisonwi")

Why it's useful:
• Helps users skip generic items and order what locals love
• All recommendations backed by real reviews (no hallucination)
• Shows the actual quote so users can trust the recommendation

This is Person 2's core contribution to the MadisonBites AI pipeline!
""")

if __name__ == "__main__":
    asyncio.run(test_must_try())
