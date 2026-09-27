import pandas as pd
from sklearn.model_selection import train_test_split

# Load the synthetic dataset
df = pd.read_csv("data/synthetic.csv")
df = df.dropna(subset=["description", "subcategory"])

# 80% train, 20% test, keeping the same mix of subcategories in both
train, test = train_test_split(
    df,
    test_size=0.2,
    random_state=42,          # same split every time you run it
    stratify=df["subcategory"],
)

train.to_csv("data/train.csv", index=False)
test.to_csv("data/test_synthetic.csv", index=False)

print(f"Train: {len(train)} rows -> data/train.csv")
print(f"Test:  {len(test)} rows -> data/test_synthetic.csv")
print(f"\nSubcategories in train: {train['subcategory'].nunique()}")
print(f"Subcategories in test:  {test['subcategory'].nunique()}")
