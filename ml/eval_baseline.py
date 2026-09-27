import json
import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report

# Load the trained baseline model
model = joblib.load("models/baseline.joblib")

with open("taxonomy.json") as f:
    taxonomy = json.load(f)
sub_to_cat = {
    sub["name"]: cat["name"]
    for cat in taxonomy["categories"]
    for sub in cat["subcategories"]
}


def evaluate(path, name):
    df = pd.read_csv(path)
    pred_sub = model.predict(df["description"])
    conf = model.predict_proba(df["description"]).max(axis=1)
    pred_cat = [sub_to_cat[s] for s in pred_sub]
    correct = pred_sub == df["subcategory"].values

    cat_acc = accuracy_score(df["category"], pred_cat)
    sub_acc = accuracy_score(df["subcategory"], pred_sub)
    print(f"{name:<18} rows={len(df):<5} category={cat_acc:6.1%}  subcategory={sub_acc:6.1%}")
    return df, pred_sub, pred_cat, conf, correct, cat_acc, sub_acc


print("=" * 64)
print("BASELINE: synthetic test vs hand-made test")
print("=" * 64)
evaluate("data/test_synthetic.csv", "Synthetic test")
df, pred_sub, pred_cat, conf, correct, cat_acc, sub_acc = evaluate("data/test_handmade.csv", "Hand-made test")

print("\nPer-category report (hand-made):")
print(classification_report(df["category"], pred_cat, digits=3, zero_division=0))

print("Confidence vs accuracy (hand-made):")
for t in [0.3, 0.5, 0.7, 0.9]:
    mask = conf >= t
    if mask.sum() == 0:
        continue
    print(f"  conf >= {t}: {mask.mean():5.1%} of expenses, accuracy {correct[mask].mean():.1%}")

mistakes = df[~correct].copy()
mistakes["predicted"] = pred_sub[~correct]
mistakes["confidence"] = conf[~correct].round(2)
print(f"\nAll {len(mistakes)} mistakes (hand-made):")
print(mistakes[["description", "subcategory", "predicted", "confidence"]].to_string(index=False))

# Add hand-made numbers to the saved results
with open("results/baseline.json") as f:
    results = json.load(f)
results["handmade_category_accuracy"] = cat_acc
results["handmade_subcategory_accuracy"] = sub_acc
with open("results/baseline.json", "w") as f:
    json.dump(results, f, indent=2)
print("\nUpdated results/baseline.json")
