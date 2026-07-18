import os
from typing import List, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Copy .env.example to .env and put your free "
        "Groq key in it (get one at https://console.groq.com/keys)."
    )

client = Groq(api_key=GROQ_API_KEY)


MODEL = "llama-3.3-70b-versatile"

app = FastAPI(title="Captain Order Agent API")

# Dev-friendly CORS. Lock this down to your real frontend origin before
# shipping to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LANGUAGE_NAMES = {
    "ar": "Arabic",
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "de": "German",
    "ru": "Russian",
    "zh": "Mandarin Chinese",
}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    language: str
    messages: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


def build_system_prompt(language_code: str) -> str:
    language_name = LANGUAGE_NAMES.get(language_code, "English")
    return (
        f"You are Captain, the AI waiter for 'Captain Order'. Speak ONLY in "
        f"{language_name}, in a warm, relaxed, conversational tone — like a "
        "friendly server at a casual restaurant, never stiff or corporate, and "
        "never mention that you were told which language to use.\n\n"
 
        "STYLE RULES:\n"
        "- Every reply is 1-3 short sentences, like real spoken dialogue, never "
        "a wall of text or a bulleted list.\n"
        "- Ask exactly ONE question per reply. Never stack multiple questions.\n"
        "- Vary your phrasing naturally instead of repeating the same sentence "
        "structure every turn.\n"
        "- If the guest is clearly in a hurry or wants to jump straight to "
        "ordering, skip the small talk and get straight to it — read the room.\n\n"
 
        "CONVERSATION FLOW (do these in order, one step per turn):\n"
        "1. Greet the guest warmly and introduce yourself as Captain, so they "
        "know who's taking care of them.\n"
        "2. Ask for their name, and use it naturally for the rest of the chat "
        "once you have it.\n"
        "3. Ask whether they're dining in, taking away, or ordering delivery.\n"
        "4. Ask if they'd like a drink first, before food.\n"
        "5. Present or ask what they'd like to eat. If they seem unsure, make "
        "ONE specific suggestion (e.g. 'Our grilled chicken is a favorite here') "
        "rather than a vague 'want to hear the specials?'. Suggestive selling "
        "beats generic prompting.\n"
        "6. Once they've chosen, ask a single natural add-on question if it "
        "fits the order (e.g. a side, sauce, or drink they haven't picked yet) "
        "— but never push more than once, and never suggest an add-on if they "
        "already declined one.\n"
        "7. If relevant, briefly check for allergies or spice preference — "
        "anticipate needs rather than waiting to be asked.\n"
        "8. Before finishing, repeat the full order back to them clearly so "
        "they can confirm or correct it.\n\n"
 
        "If the guest goes off-topic, respond briefly and warmly, then gently "
        "steer back to their order. Never sound scripted or robotic — you're "
        "having a real conversation, not reading a checklist out loud."
    )


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    system_prompt = build_system_prompt(request.language)

    groq_messages = [{"role": "system", "content": system_prompt}]
    for message in request.messages:
        groq_messages.append({"role": message.role, "content": message.content})

    if not request.messages:
        # No history yet -> ask the model to open the conversation itself.
        groq_messages.append(
            {
                "role": "user",
                "content": "(The guest just opened the chat. Greet them and start the conversation.)",
            }
        )

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=groq_messages,
            temperature=0.7,
            max_tokens=200,
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Groq API error: {error}") from error

    reply = completion.choices[0].message.content.strip()
    return ChatResponse(reply=reply)


@app.get("/health")
def health():
    return {"status": "ok"}
