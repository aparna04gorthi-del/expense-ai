import os
from dotenv import load_dotenv
from groq import Groq

# Load GROQ_API_KEY from the .env file
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "user", "content": "Categorise this office expense in 3 words or less: 'chai for team, 120 rupees'"}
    ],
)

print("Groq says:", response.choices[0].message.content)
