import json
import time
import os
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

# 1. Load data
train = pd.read_csv("data/train.csv")
test = pd.read_csv("data/test_synthetic.csv")

# Map each subcategory to its parent category (from the taxonomy)
with open("taxonomy.json") as f:
    taxonomy = json.load(f)
sub_to_cat = {
    sub["name"]: cat["name"]
    for cat in taxonomy["categories"]
    for sub in cat["subcategories"]
}

# 2. Build the model
#    - word n-grams catch words like "auto", "xerox", "team lunch"
#    - char n-grams catch typos like "xerx", "petrl", "ofc"
features = FeatureUnion([
    ("words", TfidfVectorizer(analyzer="word", ngram_range=(1, 2), lowercase=True, min_df=1)),
    ("chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), lowercase=True, min_df=2)),
])

model = Pipeline([
    ("features", features),
    ("clf", LogisticRegression(max_iter=2000, C=5.0)),
])

# 3. Train (we predict the subcategory; the category follows from it)
start = time.perf_counter()
model.fit(train["description"], train["subcategory"])
train_seconds = time.perf_counter() - start

# 4. Predict on the held-out test set
start = time.perf_counter()
pred_sub = model.predict(test["description"])
probs = model.predict_proba(test["description"])
latency_ms = (time.perf_counter() - start) / len(test) * 1000

pred_cat = [sub_to_cat[s] for s in pred_sub]
confidence = probs.max(axis=1)

sub_acc = accuracy_score(test["subcategory"], pred_sub)
cat_acc = accuracy_score(test["category"], pred_cat)

# 5. Print results
print("=" * 50)
print("BASELINE: TF-IDF + Logistic Regression")
print("=" * 50)
print(f"Category accuracy:     {cat_acc:.1%}")
print(f"Subcategory accuracy:  {sub_acc:.1%}")
print(f"Training time:         {train_seconds:.1f}s")
print(f"Latency per expense:   {latency_ms:.3f} ms")
print(f"Cost per 1,000:        Rs 0")

print("\nPer-category report:")
print(classification_report(test["category"], pred_cat, digits=3))

# How accuracy changes with confidence (this drives the hybrid later)
print("Confidence vs accuracy:")
correct = (pred_sub == test["subcategory"].values)
for t in [0.5, 0.6, 0.7, 0.8, 0.9]:
    mask = confidence >= t
    if mask.sum() == 0:
        continue
    print(f"  conf >= {t}: {mask.mean():5.1%} of expenses, accuracy {correct[mask].mean():.1%}")

# A few mistakes to learn from
mistakes = test[~correct].copy()
mistakes["predicted"] = pred_sub[~correct]
print("\nSample mistakes:")
print(mistakes[["description", "subcategory", "predicted"]].head(10).to_string(index=False))

# 6. Save the model and results (the website will read these later)
os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)
joblib.dump(model, "models/baseline.joblib")

report = classification_report(test["category"], pred_cat, output_dict=True)
results = {
    "approach": "baseline",
    "category_accuracy": cat_acc,
    "subcategory_accuracy": sub_acc,
    "latency_ms": latency_ms,
    "cost_per_1000_inr": 0,
    "per_category": {
        k: {"precision": v["precision"], "recall": v["recall"], "f1": v["f1-score"], "support": v["support"]}
        for k, v in report.items() if k in set(sub_to_cat.values())
    },
}
with open("results/baseline.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nSaved model -> models/baseline.joblib")
print("Saved results -> results/baseline.json")
