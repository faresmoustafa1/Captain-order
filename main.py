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
        "You are the friendly AI host for 'Captain Order', a restaurant ordering "
        f"app. Speak ONLY in {language_name}, in a warm, natural, conversational "
        "tone (never mention that you were told which language to use). Keep "
        "every reply short, 1-3 sentences, like a real waiter chatting, not a "
        "wall of text. Your goals, in order: (1) greet the guest warmly and "
        "welcome them to Captain Order, (2) ask their name, (3) ask whether "
        "they're dining in, taking away, or want delivery, (4) ask what they'd "
        "like to order, offering to suggest popular dishes if they're unsure, "
        "(5) confirm the order back to them clearly before finishing. Ask only "
        "one question at a time. If the guest goes off-topic, gently and "
        "politely bring the conversation back to their order."
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
