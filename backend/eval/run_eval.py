"""
backend/eval/run_eval.py
------------------------
Regression eval loop for P2's AI agents.

Runs nutrition + recommender agents against fixed test cases and
checks outputs against expected ranges / rules in expected_outputs/.

Usage:
    python -m backend.eval.run_eval              # run all evals
    python -m backend.eval.run_eval --nutrition  # nutrition only
    python -m backend.eval.run_eval --recommender # recommender only

Exit code 0 = all passed, 1 = one or more failed.
Used in Phase 8 (prompt hardening) to catch regressions before demo.

Owned by: P2
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

EVAL_DIR      = Path(__file__).parent
EXPECTED_DIR  = EVAL_DIR / "expected_outputs"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PASS = "✅ PASS"
_FAIL = "❌ FAIL"
_SKIP = "⏭  SKIP"


def _result(ok: bool) -> str:
    return _PASS if ok else _FAIL


class EvalReport:
    def __init__(self):
        self.results: list[tuple[str, bool, str]] = []  # (test_name, passed, detail)

    def add(self, name: str, passed: bool, detail: str = "") -> None:
        self.results.append((name, passed, detail))
        icon = _PASS if passed else _FAIL
        print(f"  {icon}  {name}" + (f" — {detail}" if detail else ""))

    @property
    def passed(self) -> int:
        return sum(1 for _, ok, _ in self.results if ok)

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def all_passed(self) -> bool:
        return self.passed == self.total


# ---------------------------------------------------------------------------
# Nutrition eval
# ---------------------------------------------------------------------------

async def eval_nutrition(report: EvalReport) -> None:
    print("\n── Nutrition Agent ─────────────────────────────────────────")

    from backend.agents.nutrition import analyze_nutrition_tool

    spec = json.loads((EXPECTED_DIR / "nutrition_expected.json").read_text())
    dishes_input = [
        {"id": d["id"], "name": d["name"], "description": d.get("description", "")}
        for d in spec["dishes"]
    ]

    result   = await analyze_nutrition_tool(dishes_input)
    dishes   = {d["id"]: d for d in result["dishes"]}
    expected = {d["id"]: d["expected"] for d in spec["dishes"]}

    for dish_id, exp in expected.items():
        dish = dishes.get(dish_id, {})
        name = next(d["name"] for d in spec["dishes"] if d["id"] == dish_id)
        macros = dish.get("macros") or {}

        # ── calories in range ───────────────────────────────────────
        cal = macros.get("calories", -1)
        lo, hi = exp["calories_range"]
        report.add(
            f"{name} — calories in [{lo}, {hi}]",
            lo <= cal <= hi,
            f"got {cal}",
        )

        # ── confidence matches expected ─────────────────────────────
        conf = macros.get("confidence", "")
        report.add(
            f"{name} — confidence == '{exp['confidence']}'",
            conf == exp["confidence"],
            f"got '{conf}'",
        )

        # ── required allergens present ──────────────────────────────
        allergens = set(dish.get("allergens", []))
        for req in exp["required_allergens"]:
            report.add(
                f"{name} — allergen '{req}' present",
                req in allergens,
                f"got {sorted(allergens)}",
            )

        # ── forbidden allergens absent ──────────────────────────────
        for forb in exp["forbidden_allergens"]:
            report.add(
                f"{name} — allergen '{forb}' absent",
                forb not in allergens,
                f"got {sorted(allergens)}",
            )

        # ── macros are non-negative ints ────────────────────────────
        for key in ("protein_g", "carbs_g", "fat_g"):
            val = macros.get(key, -1)
            report.add(
                f"{name} — {key} >= 0",
                isinstance(val, int) and val >= 0,
                f"got {val}",
            )


# ---------------------------------------------------------------------------
# Recommender eval
# ---------------------------------------------------------------------------

async def eval_recommender(report: EvalReport) -> None:
    print("\n── Recommender Agent ───────────────────────────────────────")

    from backend.agents.recommender import recommend_dishes_tool

    spec       = json.loads((EXPECTED_DIR / "recommender_expected.json").read_text())
    restaurant = spec["restaurant"]
    rules      = spec["rules"]

    result  = await recommend_dishes_tool(spec["dishes"], restaurant)
    dishes  = result["dishes"]

    must_try_dishes = [d for d in dishes if d.get("must_try")]
    ratio           = len(must_try_dishes) / len(dishes) if dishes else 0

    # ── at least N must-try dishes found ────────────────────────────
    report.add(
        f"At least {rules['min_must_try_count']} dish(es) flagged must-try",
        len(must_try_dishes) >= rules["min_must_try_count"],
        f"got {len(must_try_dishes)}",
    )

    # ── not flagging everything (Gemini not hallucinating) ──────────
    report.add(
        f"Must-try ratio <= {rules['max_must_try_ratio']*100:.0f}%",
        ratio <= rules["max_must_try_ratio"],
        f"got {ratio*100:.0f}%",
    )

    # ── every must-try dish has a reason ────────────────────────────
    for d in must_try_dishes:
        reason = d.get("must_try_reason") or ""
        report.add(
            f"'{d['name']}' — must_try_reason non-empty",
            bool(reason.strip()),
            f"got: {reason[:60]!r}",
        )

    # ── at least one known must-try was caught ───────────────────────
    known     = set(rules["known_must_try_names"])
    found     = {d["name"] for d in must_try_dishes}
    overlap   = known & found
    report.add(
        "At least 1 known must-try dish caught",
        len(overlap) >= 1,
        f"caught: {sorted(overlap) or 'none'}",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(run_nutrition: bool = True, run_recommender: bool = True) -> bool:
    print("=" * 60)
    print("MadisonBites — Agent Eval Loop")
    print("=" * 60)

    report = EvalReport()

    if run_nutrition:
        await eval_nutrition(report)

    if run_recommender:
        await eval_recommender(report)

    # Summary
    print(f"\n{'=' * 60}")
    icon = "✅" if report.all_passed else "❌"
    print(f"{icon}  {report.passed} / {report.total} tests passed")
    print("=" * 60)

    return report.all_passed


if __name__ == "__main__":
    args = sys.argv[1:]
    run_nutrition    = "--nutrition"    in args or not args
    run_recommender  = "--recommender"  in args or not args

    passed = asyncio.run(main(run_nutrition, run_recommender))
    sys.exit(0 if passed else 1)
