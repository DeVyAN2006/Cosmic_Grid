import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

STORM_LABELS = ["No Storm", "Minor (G1)", "Moderate (G2)", "Strong (G3)", "Extreme (G4/G5)"]

def generate_action_plan(region_name: str, country: str,
                          storm_category: int, symh_predicted: float) -> str:
    storm_label = STORM_LABELS[storm_category]

    prompt = f"""You are an expert power grid resilience advisor for {region_name}, {country}.

A geomagnetic storm forecast has been issued:
- Storm category: {storm_label}
- Predicted Sym-H index: {symh_predicted:.1f} nT
- Estimated arrival window: 12-24 hours

Generate a structured, operator-ready action plan with exactly 6 steps.
Each step must be specific, actionable, and directly relevant to this region and storm severity.
Cover: transformer protection, load shedding sequence, backup routing, 
alert messaging to downstream utilities, monitoring escalation, and recovery preparation.
Format as numbered steps. Be concise and operational."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a power grid emergency response expert. Provide concise, actionable plans only. No disclaimers."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=800,
        temperature=0.3,
    )

    return response.choices[0].message.content
