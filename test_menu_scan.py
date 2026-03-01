#!/usr/bin/env python3
"""
Test script to verify menu scanning works with a real menu image.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.agents.scanner import scan_menu_async


async def test_scan():
    """Test menu scanning on the provided image."""
    
    # Check if image file exists
    test_image = Path(__file__).parent / "test_menu.jpg"
    
    if not test_image.exists():
        print(f"❌ Test image not found at: {test_image}")
        print("Please save the menu image as 'test_menu.jpg' in the PepperHack directory")
        return
    
    print(f"📸 Testing menu scan on: {test_image.name}")
    print(f"Image size: {test_image.stat().st_size / 1024:.1f} KB")
    print("\n🔍 Running Gemini Vision OCR...")
    print("-" * 60)
    
    # Run the scanner
    dishes = await scan_menu_async(str(test_image), "La Brioche Bistro")
    
    print(f"\n✅ Scan complete! Found {len(dishes)} dishes\n")
    print("=" * 60)
    
    if dishes:
        for i, dish in enumerate(dishes, 1):
            print(f"\n{i}. {dish.name} - ${dish.price}")
            print(f"   Category: {dish.category}")
            if dish.description:
                print(f"   Description: {dish.description}")
    else:
        print("❌ No dishes found - OCR may have failed or image quality issue")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(test_scan())
