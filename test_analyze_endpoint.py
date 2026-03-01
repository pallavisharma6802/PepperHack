#!/usr/bin/env python3
"""
Test the full /analyze endpoint to see if agents are running properly.
"""
import asyncio
import httpx
import json

async def test_analyze():
    # Use a real restaurant ID
    restaurant_id = "ChIJQ2BfH89TBogRlmTRnuqSnJ8"  # Raising Cane's
    restaurant_name = "Raising Cane's Chicken Fingers"
    
    print(f"Testing /analyze endpoint for {restaurant_name}")
    print("="*70)
    
    async with httpx.AsyncClient(timeout=120) as client:
        # Call analyze endpoint
        url = "http://localhost:2026/analyze"
        payload = {
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_name,
            "image_base64": None,
            "mock": False  # Use real scraping
        }
        
        print(f"\nSending POST to {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}\n")
        
        async with client.stream('POST', url, json=payload) as response:
            print(f"Response status: {response.status_code}\n")
            
            if response.status_code != 200:
                print(f"Error: {await response.aread()}")
                return
            
            print("Streaming events:")
            print("-"*70)
            
            dish_count = 0
            must_try_count = 0
            
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    data_str = line[6:]  # Remove 'data: ' prefix
                    try:
                        event = json.loads(data_str)
                        agent = event.get('agent', 'unknown')
                        status = event.get('status', 'unknown')
                        payload = event.get('payload', {})
                        
                        print(f"[{agent:12s}] {status}")
                        
                        if status == 'done' and 'dishes' in payload:
                            dishes = payload['dishes']
                            dish_count = len(dishes)
                            must_try_count = sum(1 for d in dishes if d.get('must_try'))
                            
                            if dish_count > 0:
                                print(f"               → {dish_count} dishes")
                                if must_try_count > 0:
                                    print(f"               → {must_try_count} must-try")
                                
                    except json.JSONDecodeError:
                        pass
            
            print("-"*70)
            print(f"\n✅ Final: {dish_count} dishes, {must_try_count} must-try\n")
            
            if dish_count == 5:
                print("⚠️  WARNING: Only 5 dishes means fallback data!")
                print("   The scraper may not be finding a menu online.\n")
            elif dish_count > 5:
                print("✅ Success! Real menu scraped.\n")

if __name__ == "__main__":
    asyncio.run(test_analyze())
