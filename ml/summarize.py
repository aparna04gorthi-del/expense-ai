import json

# ---------------------------------------------------------------
# Assumptions for the hours-saved estimate (change these freely;
# the website will let visitors adjust them with sliders)
# ---------------------------------------------------------------
EXPENSES_PER_MONTH = 2000   # petty-cash entries a mid-size company files per month
MINUTES_TO_TAG = 1.0        # finance time to check and tag one expense by hand
MINUTES_TO_FIX = 3.0        # time to find and fix one wrong tag later (worse than tagging)


def hours_saved(accuracy):
    """Hours saved per month if the model tags everything and humans only fix its errors."""
    manual_hours = EXPENSES_PER_MONTH * MINUTES_TO_TAG / 60
    error_hours = EXPENSES_PER_MONTH * (1 - accuracy) * MINUTES_TO_FIX / 60
    return manual_hours - error_hours


with open("results/baseline.json") as f:
    base = json.load(f)
with open("results/llm_handmade.json") as f:
    llm = json.load(f)
with open("results/hybrid_handmade.json") as f:
    hybrid = json.load(f)
chosen = hybrid["chosen"]

approaches = [
    {
        "name": "Baseline",
        "detail": "TF-IDF + Logistic Regression",
        "category_accuracy": base["handmade_category_accuracy"],
        "subcategory_accuracy": base["handmade_subcategory_accuracy"],
        "cost_per_1000_inr": 0.0,
        "latency_ms": base["latency_ms"],
        "share_to_llm": 0.0,
    },
    {
        "name": "LLM",
        "detail": llm["model"],
        "category_accuracy": llm["category_accuracy"],
        "subcategory_accuracy": llm["subcategory_accuracy"],
        "cost_per_1000_inr": llm["cost_per_1000_inr"],
        "latency_ms": llm["latency_ms"],
        "share_to_llm": 1.0,
    },
    {
        "name": "Hybrid",
        "detail": f"Baseline first, LLM when confidence < {chosen['threshold']}",
        "category_accuracy": chosen["category_accuracy"],
        "subcategory_accuracy": chosen["subcategory_accuracy"],
        "cost_per_1000_inr": chosen["cost_per_1000_inr"],
        "latency_ms": chosen["latency_ms"],
        "share_to_llm": chosen["share_to_llm"],
    },
]

manual_hours = EXPENSES_PER_MONTH * MINUTES_TO_TAG / 60
for a in approaches:
    a["hours_saved_per_month"] = round(hours_saved(a["subcategory_accuracy"]), 1)
    a["monthly_cost_inr"] = round(a["cost_per_1000_inr"] * EXPENSES_PER_MONTH / 1000, 2)

print("=" * 78)
print(f"FINAL COMPARISON  (hand-made test, {EXPENSES_PER_MONTH} expenses/month)")
print("=" * 78)
print(f"Manual tagging today: {manual_hours:.1f} hours/month\n")
print(f"{'Approach':<10}{'Category':>10}{'Subcat':>9}{'Rs/1k':>8}{'Latency':>11}{'Rs/month':>10}{'Hrs saved':>11}")
for a in approaches:
    print(f"{a['name']:<10}{a['category_accuracy']:>10.1%}{a['subcategory_accuracy']:>9.1%}"
          f"{a['cost_per_1000_inr']:>8.2f}{a['latency_ms']:>9.1f}ms{a['monthly_cost_inr']:>10.2f}"
          f"{a['hours_saved_per_month']:>11.1f}")

summary = {
    "test_set": "hand-made (130 rows)",
    "assumptions": {
        "expenses_per_month": EXPENSES_PER_MONTH,
        "minutes_to_tag": MINUTES_TO_TAG,
        "minutes_to_fix": MINUTES_TO_FIX,
        "usd_to_inr": 88,
    },
    "manual_hours_per_month": round(manual_hours, 1),
    "approaches": approaches,
    "synthetic_test_baseline": {
        "category_accuracy": base["category_accuracy"],
        "subcategory_accuracy": base["subcategory_accuracy"],
    },
    "per_category_baseline_synthetic": base["per_category"],
    "hybrid_sweep": hybrid["sweep"],
}
with open("results/summary.json", "w") as f:
    json.dump(summary, f, indent=2)
print("\nSaved -> results/summary.json  (the website reads this file)")
