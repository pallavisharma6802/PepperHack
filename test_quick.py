#!/usr/bin/env python3
import asyncio
import httpx
import json

async def test():
    url = "http://localhost:2026/analyze"
    payload = {
        "restaurant_id": "ChIJHxgqqEBTBogRJLOAk9gWpBg",  # The Old Fashioned
        "restaurant_name": "The Old Fashioned",
        "image_base64": None,
        "mock": False
    }
    
    print("Testing /analyze endpoint...")
    print(f"Restaurant: {payload['restaurant_name']}\n")
    
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream('POST', url, json=payload) as resp:
                print(f"Status: {resp.status_code}\n")
                
                events = []
                async for line in resp.aiter_lines():
                    if line.startswith('data: '):
                        try:
                            event = json.loads(line[6:])
                            agent = event.get('agent', '?')
                            status = event.get('status', '?')
                            payload_data = event.get('payload', {})
                            
                            print(f"[{agent:12s}] {status}")
                            
                            if 'dishes' in payload_data:
                                print(f"               → {len(payload_data['dishes'])} dishes")
                            
                            events.append(event)
                        except:
                            pass
                
                print(f"\n✅ Received {len(events)} events")
                
                # Find final dishes
                for event in reversed(events):
                    if 'dishes' in event.get('payload', {}):
                        dishes = event['payload']['dishes']
                        print(f"✅ Final: {len(dishes)} dishes")
                        
                        must_try = sum(1 for d in dishes if d.get('must_try'))
                        with_macros = sum(1 for d in dishes if d.get('macros'))
                        
                        print(f"   Must-try: {must_try}")
                        print(f"   With macros: {with_macros}")
                        
                        if dishes:
                            print(f"\n   First dish:")
                            d = dishes[0]
                            print(f"   - {d.get('name')}")
                            print(f"   - Price: {d.get('price')}")
                            print(f"   - Must-try: {d.get('must_try')}")
                            if d.get('macros'):
                                print(f"   - Calories: {d['macros'].get('calories')}")
                        break
                
    except Exception as e:
        print(f"❌ Error: {e}")

asyncio.run(test())
