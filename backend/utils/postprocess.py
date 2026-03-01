"""
backend/utils/postprocess.py
-----------------------------
Output post-processing helpers for the MadisonBites AI pipeline.

Transforms raw agent output into UI-ready display values:
  - format_macros()       → adds ~ prefix for low-confidence estimates
  - truncate_reason()     → trims must_try_reason to fit UI tooltip (120 chars)
  - clean_allergens()     → deduplicates + sorts allergen list
  - format_price()        → normalises price strings
  - build_dish_display()  → runs all helpers on a single Dish dict

Owned by: P2
P1/P3/P4 import these helpers wherever they render dish data.
"""

from __future__ import annotations

from typing import Optional

# Maximum characters for must_try_reason — fits one tooltip line in the UI
_MAX_REASON_LEN = 120

# Allergen display order (matches UI badge order)
_ALLERGEN_ORDER = ["Gluten", "Dairy", "Eggs", "Nuts", "Shellfish", "Soy"]


# ---------------------------------------------------------------------------
# Individual helpers
# ---------------------------------------------------------------------------

def format_macros(macros: dict | None) -> dict | None:
    """
    Add display-ready macro strings with ~ prefix when confidence is low.

    Input:  {"calories": 650, "protein_g": 28, ..., "confidence": "low"}
    Output: {"calories": 650, ..., "confidence": "low",
             "calories_display": "~650", "protein_display": "~28g", ...}

    Returns None if macros is None.
    """
    if macros is None:
        return None

    conf   = macros.get("confidence", "medium")
    prefix = "~" if conf == "low" else ""

    return {
        **macros,
        "calories_display": f"{prefix}{macros.get('calories', 0)}",
        "protein_display":  f"{prefix}{macros.get('protein_g', 0)}g",
        "carbs_display":    f"{prefix}{macros.get('carbs_g', 0)}g",
        "fat_display":      f"{prefix}{macros.get('fat_g', 0)}g",
        "show_disclaimer":  conf == "low",
    }


def truncate_reason(reason: str | None, max_len: int = _MAX_REASON_LEN) -> str | None:
    """
    Trim must_try_reason to max_len characters without cutting mid-word.
    Appends '…' if truncated.

    Returns None if reason is None or empty.
    """
    if not reason:
        return None

    reason = reason.strip()
    if len(reason) <= max_len:
        return reason

    # Cut at last space before limit so we don't break mid-word
    truncated = reason[:max_len].rsplit(" ", 1)[0]
    return truncated + "…"


def clean_allergens(allergens: list[str] | None) -> list[str]:
    """
    Deduplicate and sort allergens in consistent UI display order.
    Unknown allergens are appended alphabetically at the end.

    Returns empty list if allergens is None or empty.
    """
    if not allergens:
        return []

    seen    = set()
    ordered = []

    # Add known allergens in display order first
    for allergen in _ALLERGEN_ORDER:
        if allergen in allergens and allergen not in seen:
            ordered.append(allergen)
            seen.add(allergen)

    # Append any unknown allergens alphabetically
    extras = sorted(a for a in allergens if a not in seen)
    ordered.extend(extras)

    return ordered


def format_price(price: str | None) -> str:
    """
    Normalise price string for display.
    - Strips extra whitespace
    - Ensures $ prefix if numeric
    - Returns empty string if price is None/empty

    Examples:
        "12.99"  → "$12.99"
        "$12.99" → "$12.99"
        "12"     → "$12"
        ""       → ""
    """
    if not price:
        return ""

    price = price.strip()
    if not price:
        return ""

    # Add $ if it looks numeric but has no symbol
    if price[0].isdigit():
        price = "$" + price

    return price


def build_dish_display(dish: dict) -> dict:
    """
    Run all post-processing helpers on a single dish dict and return
    a new dict with display-ready fields merged in.

    Safe to call on partial dishes (e.g. before all agents complete).

    Example:
        raw  = {"id": "dish_001", "name": "Butter Burger", "macros": {...}, ...}
        out  = build_dish_display(raw)
        # out["macros"]["calories_display"] == "650"
        # out["must_try_reason"] truncated to 120 chars
        # out["allergens"] deduplicated + sorted
    """
    result = dict(dish)

    # Macros — add display strings
    result["macros"] = format_macros(dish.get("macros"))

    # Must-try reason — truncate for tooltip
    result["must_try_reason"] = truncate_reason(dish.get("must_try_reason"))

    # Allergens — clean + sort
    result["allergens"] = clean_allergens(dish.get("allergens"))

    # Price — normalise
    result["price"] = format_price(dish.get("price"))

    return result


# ---------------------------------------------------------------------------
# Batch helper
# ---------------------------------------------------------------------------

def build_dishes_display(dishes: list[dict]) -> list[dict]:
    """Run build_dish_display on every dish in a list."""
    return [build_dish_display(d) for d in dishes]


# ---------------------------------------------------------------------------
# Quick smoke test  (python -m backend.utils.postprocess)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_dishes = [
        {
            "id":            "dish_001",
            "name":          "Butter Burger",
            "price":         "12.99",
            "must_try":      True,
            "must_try_reason": (
                "'Best burger in Madison, hands down — the butter-soaked bun is absolutely "
                "incredible and the beef patty is perfectly seasoned every single time.' (Reddit r/madisonwi)"
            ),
            "macros": {
                "calories":  880,
                "protein_g": 48,
                "carbs_g":   57,
                "fat_g":     53,
                "confidence": "high",
            },
            "allergens": ["Dairy", "Gluten", "Dairy"],  # duplicate Dairy
        },
        {
            "id":            "dish_002",
            "name":          "Chef's Mystery Special",
            "price":         "",
            "must_try":      False,
            "must_try_reason": None,
            "macros": {
                "calories":  750,
                "protein_g": 40,
                "carbs_g":   60,
                "fat_g":     40,
                "confidence": "low",
            },
            "allergens": ["Soy", "Gluten", "Shellfish"],
        },
    ]

    print("Post-processing smoke test\n")
    results = build_dishes_display(test_dishes)

    for d in results:
        m = d.get("macros") or {}
        print(f"{'─'*60}")
        print(f"  {d['name']}  |  price: '{d['price']}'")
        print(f"  calories: {m.get('calories_display')}  protein: {m.get('protein_display')}  "
              f"carbs: {m.get('carbs_display')}  fat: {m.get('fat_display')}")
        print(f"  disclaimer: {m.get('show_disclaimer')}  confidence: {m.get('confidence')}")
        print(f"  allergens: {d['allergens']}")
        print(f"  reason: {d['must_try_reason']!r}")
    print(f"{'─'*60}")
