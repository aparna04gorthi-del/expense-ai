"""
Expense AI API
--------------
POST /classify  -> runs the baseline, the LLM and the hybrid on one expense.
GET  /health    -> quick check that the server is up.

Run locally:  uvicorn main:app --reload --port 8000
"""
import os
import json
import time

import joblib
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- Settings (same values as the ML experiments) ----
LLM_MODEL = "openai/gpt-oss-20b"
HYBRID_THRESHOLD = 0.80             # chosen in ml/hybrid.py
PRICE_IN_USD = 0.075 / 1_000_000
PRICE_OUT_USD = 0.30 / 1_000_000
USD_TO_INR = 88

# ---- Load the model and taxonomy once, at startup ----
baseline = joblib.load(os.path.join(HERE, "models", "baseline.joblib"))
with open(os.path.join(HERE, "taxonomy.json")) as f:
    taxonomy = json.load(f)
SUB_TO_CAT = {s["name"]: c["name"] for c in taxonomy["categories"] for s in c["subcategories"]}

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


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
- Choose exactly one subcategory, spelled exactly as listed above.
- Use "Other" only when an entry is too vague to place anywhere else.
- Travel to the airport by cab is Cab/Auto, not Flight.
- confidence is a number from 0 to 1: how sure you are.

Return JSON only, in this shape:
{{"subcategory": "Cab/Auto", "confidence": 0.9}}"""


# ---- App ----
app = FastAPI(title="Expense AI")

allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ExpenseIn(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    amount: float | None = None


def run_baseline(description: str) -> dict:
    start = time.perf_counter()
    probs = baseline.predict_proba([description])[0]
    ms = (time.perf_counter() - start) * 1000
    top = probs.argsort()[::-1][:3]
    sub = str(baseline.classes_[top[0]])
    return {
        "subcategory": sub,
        "category": SUB_TO_CAT[sub],
        "confidence": float(probs[top[0]]),
        "alternatives": [
            {"subcategory": str(baseline.classes_[i]), "confidence": float(probs[i])} for i in top[1:]
        ],
        "latency_ms": ms,
        "cost_inr": 0.0,
    }


def run_llm(description: str, amount: float | None) -> dict:
    user_msg = f'Categorise this expense: "{description}"'
    if amount is not None:
        user_msg += f" (Rs {amount:g})"
    start = time.perf_counter()
    try:
        resp = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            reasoning_effort="low",
        )
    except Exception as e:
        return {"error": str(e)[:200], "latency_ms": (time.perf_counter() - start) * 1000}
    ms = (time.perf_counter() - start) * 1000

    try:
        data = json.loads(resp.choices[0].message.content)
    except (json.JSONDecodeError, TypeError):
        data = {}
    sub = str(data.get("subcategory", "")).strip()
    if sub not in SUB_TO_CAT:
        sub = "Other"
    try:
        conf = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        conf = 0.0
    cost_inr = (resp.usage.prompt_tokens * PRICE_IN_USD + resp.usage.completion_tokens * PRICE_OUT_USD) * USD_TO_INR
    return {
        "subcategory": sub,
        "category": SUB_TO_CAT[sub],
        "confidence": conf,
        "latency_ms": ms,
        "cost_inr": cost_inr,
    }


@app.get("/health")
def health():
    return {"ok": True, "model": LLM_MODEL, "threshold": HYBRID_THRESHOLD}


@app.post("/classify")
def classify(expense: ExpenseIn):
    base = run_baseline(expense.description)
    llm = run_llm(expense.description, expense.amount)

    # Hybrid: trust the baseline when it's confident, otherwise use the LLM
    use_llm = base["confidence"] < HYBRID_THRESHOLD and "error" not in llm
    chosen = llm if use_llm else base
    hybrid = {
        "subcategory": chosen["subcategory"],
        "category": chosen["category"],
        "confidence": chosen["confidence"],
        "source": "llm" if use_llm else "baseline",
        "threshold": HYBRID_THRESHOLD,
        "latency_ms": base["latency_ms"] + (llm["latency_ms"] if use_llm else 0),
        "cost_inr": llm.get("cost_inr", 0.0) if use_llm else 0.0,
    }
    return {"baseline": base, "llm": llm, "hybrid": hybrid}
