import os
import sys
import json
import time
import argparse
import pandas as pd
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "openai/gpt-oss-20b"

# Different ways real employees type expenses
STYLES = {
    "quick": "short, lowercase notes typed quickly on a phone",
    "hinglish": "Hinglish, mixing Hindi and English words (e.g. 'chai', 'khana', 'auto wala')",
    "typos": "with spelling mistakes and abbreviations (e.g. 'xerx', 'tkt', 'ofc')",
    "vague": "vague and minimal, only 1 to 3 words",
    "formal": "proper full sentences like a careful accountant",
}


class DailyLimitReached(Exception):
    pass


def build_prompt(cat, sub, style_text, n):
    return f"""You are generating realistic petty-cash expense entries typed by employees at a small office in India.

Category: {cat['name']}
Subcategory: {sub['name']} - {sub['description']}
Example entries: {', '.join(sub['examples'])}

Write {n} NEW, varied expense descriptions for this subcategory.
Writing style: {style_text}

Rules:
- Each description is what an employee would type into an expense app (max 12 words).
- Use Indian context: rupees, local places, Indian brands and apps.
- Do not copy the examples. Do not mention the category or subcategory name.
- Give a realistic amount in rupees for each.

Return JSON only, in exactly this shape:
{{"items": [{{"description": "...", "amount": 120}}]}}"""


def normalize_item(item):
    """Turn whatever the model returned into (description, amount), or None to skip."""
    if isinstance(item, dict):
        desc = str(item.get("description", "")).strip()
        amount = item.get("amount")
    elif isinstance(item, str):
        desc = item.strip()
        amount = None
    else:
        return None
    if not desc:
        return None
    return desc, amount


def generate_batch(cat, sub, style_text, n, retries=3):
    for attempt in range(retries):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": build_prompt(cat, sub, style_text, n)}],
                response_format={"type": "json_object"},
                temperature=1.0,
                reasoning_effort="low",
            )
            data = json.loads(resp.choices[0].message.content)
            items = data.get("items", []) if isinstance(data, dict) else data
            return items if isinstance(items, list) else []
        except Exception as e:
            msg = str(e)
            if "tokens per day" in msg or "(TPD)" in msg:
                raise DailyLimitReached(msg)
            print(f"    retry {attempt + 1}: {msg[:150]}")
            time.sleep(3 * (attempt + 1))
    return []


def save(rows, out_path):
    df = pd.DataFrame(rows)
    if df.empty:
        return df, 0
    before = len(df)
    df["key"] = df["description"].str.lower().str.strip()
    df = df.drop_duplicates("key").drop(columns="key")
    df.to_csv(out_path, index=False)
    return df, before - len(df)


def styles_saved_for(rows, sub_name):
    """Which styles already have rows for this subcategory."""
    found = set()
    for r in rows:
        if r["subcategory"] == sub_name:
            found.add(r["style"])
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true", help="small run to check everything works")
    args = parser.parse_args()

    with open("taxonomy.json") as f:
        taxonomy = json.load(f)

    pairs = [(cat, sub) for cat in taxonomy["categories"] for sub in cat["subcategories"]]

    if args.test:
        pairs = pairs[:2]
        styles = dict(list(STYLES.items())[:2])
        n_per_batch = 5
        out_path = "data/sample.csv"
        rows = []
        done = set()
    else:
        styles = STYLES
        n_per_batch = 25
        out_path = "data/synthetic.csv"
        rows = []
        done = set()
        # Resume: keep saved rows; a subcategory counts as done only if all styles finished
        if os.path.exists(out_path):
            existing = pd.read_csv(out_path)
            rows = existing.to_dict("records")
            style_counts = existing.groupby("subcategory")["style"].nunique()
            done = set(style_counts[style_counts >= len(STYLES)].index)
            print(f"Resuming: {len(rows)} rows saved, {len(done)}/{len(pairs)} subcategories complete\n")

    try:
        for i, (cat, sub) in enumerate(pairs, 1):
            if sub["name"] in done:
                print(f"[{i}/{len(pairs)}] {cat['name']} -> {sub['name']}  (done, skipping)")
                continue

            saved_styles = styles_saved_for(rows, sub["name"])

            print(f"[{i}/{len(pairs)}] {cat['name']} -> {sub['name']}")
            for style_key, style_text in styles.items():
                if style_key in saved_styles:
                    continue
                items = generate_batch(cat, sub, style_text, n_per_batch)
                for item in items:
                    result = normalize_item(item)
                    if result is None:
                        continue
                    desc, amount = result
                    rows.append({
                        "description": desc,
                        "amount": amount,
                        "category": cat["name"],
                        "subcategory": sub["name"],
                        "style": style_key,
                    })
                time.sleep(0.5)

            # Save after every subcategory so a crash never loses work
            save(rows, out_path)

    except DailyLimitReached:
        df, _ = save(rows, out_path)
        print("\nDaily token limit reached. Progress saved.")
        print(f"{len(df)} rows in {out_path}. Run the same command later to continue.")
        sys.exit(0)

    df, removed = save(rows, out_path)
    print(f"\nSaved {len(df)} rows to {out_path} (removed {removed} duplicates)")
    print("\nRandom sample:")
    print(df.sample(min(10, len(df))).to_string(index=False))


if __name__ == "__main__":
    main()
