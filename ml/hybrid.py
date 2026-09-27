import json
import joblib
import numpy as np
import pandas as pd

PRICE_IN_USD = 0.075 / 1_000_000
PRICE_OUT_USD = 0.30 / 1_000_000
USD_TO_INR = 88

# 1. Load the test set, the baseline model, and the saved LLM predictions
df = pd.read_csv("data/test_handmade.csv").reset_index(drop=True)
df["id"] = df.index + 1

model = joblib.load("models/baseline.joblib")
with open("taxonomy.json") as f:
    taxonomy = json.load(f)
sub_to_cat = {s["name"]: c["name"] for c in taxonomy["categories"] for s in c["subcategories"]}

llm = pd.read_csv("results/llm_predictions_handmade.csv")
df = df.merge(llm[["id", "llm_subcategory", "llm_category", "tokens_in", "tokens_out", "seconds"]], on="id")

# 2. Baseline predictions + confidence for every expense
probs = model.predict_proba(df["description"])
df["base_subcategory"] = model.classes_[probs.argmax(axis=1)]
df["base_category"] = df["base_subcategory"].map(sub_to_cat)
df["base_confidence"] = probs.max(axis=1)

df["llm_cost_inr"] = (df["tokens_in"] * PRICE_IN_USD + df["tokens_out"] * PRICE_OUT_USD) * USD_TO_INR
base_ms = 0.1  # baseline latency per expense (from baseline.py)


# 3. Hybrid rule: trust the baseline if confident, otherwise ask the LLM
def run_hybrid(threshold):
    to_llm = df["base_confidence"] < threshold
    sub = np.where(to_llm, df["llm_subcategory"], df["base_subcategory"])
    cat = np.where(to_llm, df["llm_category"], df["base_category"])
    return {
        "threshold": round(threshold, 2),
        "share_to_llm": float(to_llm.mean()),
        "category_accuracy": float((cat == df["category"]).mean()),
        "subcategory_accuracy": float((sub == df["subcategory"]).mean()),
        "cost_per_1000_inr": float(df["llm_cost_inr"].where(to_llm, 0).mean() * 1000),
        "latency_ms": float(base_ms + (df["seconds"] * 1000).where(to_llm, 0).mean()),
    }


sweep = [run_hybrid(t) for t in np.arange(0, 1.01, 0.05)]
table = pd.DataFrame(sweep)

base = table.iloc[0]      # threshold 0  -> nothing goes to the LLM
full = table.iloc[-1]     # threshold 1  -> everything goes to the LLM

# 4. Pick the threshold: highest subcategory accuracy, then the least LLM use
best = table.sort_values(["subcategory_accuracy", "share_to_llm"], ascending=[False, True]).iloc[0]

print("=" * 72)
print("HYBRID: baseline first, LLM when baseline confidence < threshold")
print("=" * 72)
show = table.copy()
for c in ["share_to_llm", "category_accuracy", "subcategory_accuracy"]:
    show[c] = (show[c] * 100).round(1).astype(str) + "%"
show["cost_per_1000_inr"] = show["cost_per_1000_inr"].round(2)
show["latency_ms"] = show["latency_ms"].round(1)
print(show.to_string(index=False))

print("\nSummary (hand-made test):")
print(f"  Baseline only:  category {base['category_accuracy']:.1%}  sub {base['subcategory_accuracy']:.1%}  Rs {base['cost_per_1000_inr']:.2f}/1k")
print(f"  LLM only:       category {full['category_accuracy']:.1%}  sub {full['subcategory_accuracy']:.1%}  Rs {full['cost_per_1000_inr']:.2f}/1k")
print(f"  Hybrid @ {best['threshold']:.2f}:  category {best['category_accuracy']:.1%}  sub {best['subcategory_accuracy']:.1%}  "
      f"Rs {best['cost_per_1000_inr']:.2f}/1k  ({best['share_to_llm']:.0%} sent to LLM)")

# 5. Which rows did the chosen hybrid still get wrong?
to_llm = df["base_confidence"] < best["threshold"]
final = np.where(to_llm, df["llm_subcategory"], df["base_subcategory"])
wrong = df[final != df["subcategory"]].copy()
wrong["used"] = np.where(to_llm[wrong.index], "LLM", "baseline")
wrong["predicted"] = final[wrong.index]
print(f"\nHybrid mistakes ({len(wrong)}):")
print(wrong[["description", "subcategory", "predicted", "used", "base_confidence"]].round(2).to_string(index=False))

with open("results/hybrid_handmade.json", "w") as f:
    json.dump({"approach": "hybrid", "chosen": best.to_dict(), "sweep": sweep}, f, indent=2)
print("\nSaved results -> results/hybrid_handmade.json")
