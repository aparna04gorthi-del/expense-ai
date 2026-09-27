import os
import sys
import json
import time
import argparse
import pandas as pd
from dotenv import load_dotenv
from groq import Groq
from sklearn.metrics import accuracy_score, classification_report

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "openai/gpt-oss-20b"
PRICE_IN_USD = 0.075 / 1_000_000    # per input token (Groq price list)
PRICE_OUT_USD = 0.30 / 1_000_000    # per output token
USD_TO_INR = 88                     # approximate exchange rate

TEST_FILES = {
    "handmade": "data/test_handmade.csv",
    "synthetic": "data/test_synthetic.csv",
}

with open("taxonomy.json") as f:
    taxonomy = json.load(f)
sub_to_cat = {
    sub["name"]: cat["name"]
    for cat in taxonomy["categories"]
    for sub in cat["subcategories"]
}


def taxonomy_text():
    lines = []
    for cat in taxonomy["categories"]:
        lines.append(f"{cat['name']}:")
        for sub in cat["subcategories"]:
            lines.append(f"  - {sub['name']}: {sub['description']}")
    return "\n".join(lines)


SYSTEM_PROMPT = f"""You categorise petty-cash expenses for a small office in India.
Entries are short and messy: typos, abbreviations, Hinglish, Indian brands and places.

Allowed subcategories (grouped by category):
{taxonomy_text()}

Rules:
- Choose exactly one subcategory per expense, spelled exactly as listed above.
- Use "Other" only when an entry is too vague to place anywhere else.
- Travel to the airport by cab is Cab/Auto, not Flight.
- confidence is a number from 0 to 1: how sure you are.

Return JSON only, in this shape:
{{"results": [{{"id": 1, "subcategory": "Cab/Auto", "confidence": 0.9}}]}}"""


class DailyLimitReached(Exception):
    pass


def classify_batch(batch):
    """batch: list of (id, description, amount). Returns (predictions dict, usage, seconds)."""
    lines = [f'{i}. "{d}" (Rs {a})' for i, d, a in batch]
    user_msg = "Categorise these expenses:\n" + "\n".join(lines)

    for attempt in range(3):
        try:
            start = time.perf_counter()
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                response_format={"type": "json_object"},
                temperature=0,
                reasoning_effort="low",
            )
            seconds = time.perf_counter() - start
            data = json.loads(resp.choices[0].message.content)
            preds = {}
            for item in data.get("results", []):
                if isinstance(item, dict) and "id" in item:
                    preds[int(item["id"])] = item
            return preds, resp.usage, seconds
        except Exception as e:
            msg = str(e)
            if "tokens per day" in msg or "(TPD)" in msg:
                raise DailyLimitReached(msg)
            print(f"    retry {attempt + 1}: {msg[:150]}")
            time.sleep(5 * (attempt + 1))
    return {}, None, 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", choices=TEST_FILES.keys(), default="handmade")
    parser.add_argument("--batch", type=int, default=20, help="expenses per API call")
    args = parser.parse_args()

    df = pd.read_csv(TEST_FILES[args.set]).reset_index(drop=True)
    df["id"] = df.index + 1

    os.makedirs("results", exist_ok=True)
    cache_path = f"results/llm_predictions_{args.set}.csv"

    # Resume: reuse predictions already saved
    if os.path.exists(cache_path):
        cache = pd.read_csv(cache_path)
        rows = cache.to_dict("records")
        done = set(cache["id"])
        print(f"Resuming: {len(done)}/{len(df)} already classified")
    else:
        rows, done = [], set()

    todo = df[~df["id"].isin(done)]
    batches = [todo.iloc[i:i + args.batch] for i in range(0, len(todo), args.batch)]

    try:
        for n, b in enumerate(batches, 1):
            print(f"Batch {n}/{len(batches)} ({len(b)} expenses)")
            items = list(zip(b["id"], b["description"], b["amount"]))
            preds, usage, seconds = classify_batch(items)
            if usage is None:
                continue
            # Share the batch's tokens and time equally across its expenses
            tok_in = usage.prompt_tokens / len(b)
            tok_out = usage.completion_tokens / len(b)
            for _, r in b.iterrows():
                p = preds.get(int(r["id"]), {})
                sub = str(p.get("subcategory", "")).strip()
                valid = sub in sub_to_cat
                rows.append({
                    "id": r["id"],
                    "description": r["description"],
                    "true_subcategory": r["subcategory"],
                    "true_category": r["category"],
                    "llm_subcategory": sub if valid else "INVALID",
                    "llm_category": sub_to_cat.get(sub, "INVALID"),
                    "llm_confidence": p.get("confidence"),
                    "tokens_in": tok_in,
                    "tokens_out": tok_out,
                    "seconds": seconds / len(b),
                })
            pd.DataFrame(rows).to_csv(cache_path, index=False)
            time.sleep(1)
    except DailyLimitReached:
        pd.DataFrame(rows).to_csv(cache_path, index=False)
        print("\nDaily token limit reached. Progress saved. Run the same command later to continue.")
        sys.exit(0)

    res = pd.DataFrame(rows)
    cat_acc = accuracy_score(res["true_category"], res["llm_category"])
    sub_acc = accuracy_score(res["true_subcategory"], res["llm_subcategory"])
    invalid = (res["llm_subcategory"] == "INVALID").sum()

    cost_inr_each = (res["tokens_in"] * PRICE_IN_USD + res["tokens_out"] * PRICE_OUT_USD) * USD_TO_INR
    cost_per_1000 = cost_inr_each.mean() * 1000
    latency_ms = res["seconds"].mean() * 1000

    print("=" * 50)
    print(f"LLM: {MODEL}  ({args.set} test)")
    print("=" * 50)
    print(f"Category accuracy:     {cat_acc:.1%}")
    print(f"Subcategory accuracy:  {sub_acc:.1%}")
    print(f"Invalid labels:        {invalid}")
    print(f"Latency per expense:   {latency_ms:.0f} ms (batched, {args.batch} per call)")
    print(f"Cost per 1,000:        Rs {cost_per_1000:.2f}")

    print("\nPer-category report:")
    print(classification_report(res["true_category"], res["llm_category"], digits=3, zero_division=0))

    wrong = res[res["true_subcategory"] != res["llm_subcategory"]]
    print(f"All {len(wrong)} mistakes:")
    print(wrong[["description", "true_subcategory", "llm_subcategory", "llm_confidence"]].to_string(index=False))

    results = {
        "approach": "llm",
        "model": MODEL,
        "test_set": args.set,
        "category_accuracy": cat_acc,
        "subcategory_accuracy": sub_acc,
        "invalid_labels": int(invalid),
        "latency_ms": latency_ms,
        "cost_per_1000_inr": cost_per_1000,
    }
    with open(f"results/llm_{args.set}.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved predictions -> {cache_path}")
    print(f"Saved results -> results/llm_{args.set}.json")


if __name__ == "__main__":
    main()
