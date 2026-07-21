import hashlib
import os
from typing import List, Literal, Optional
from urllib.parse import quote

from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

import os as _os
_IMAGES_DIR = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "images")
app.mount("/images", StaticFiles(directory=_IMAGES_DIR), name="images")


LANGUAGE_NAMES = {
    "ar": "Arabic",   "en": "English",  "fr": "French",   "es": "Spanish",
    "it": "Italian",  "de": "German",   "ru": "Russian",  "zh": "Mandarin Chinese",
}

# ------------------------------------------------------------------
# Menu — each item carries an AI image-generation prompt that will be
# rendered by Pollinations (https://pollinations.ai) into a real photo.
# ------------------------------------------------------------------
_MENU_RAW = {
    "currency": "$",
    "categories": [
        {"id": "starters", "name": "Starters", "items": [
            {"id": "carpaccio", "name": "Beef Carpaccio", "price": 18.00, "recommended": True, "tags": ["gf"],
             "description": "Thinly sliced tenderloin with a bright peppery lift.",
             "ingredients": ["Beef tenderloin","Arugula","Shaved parmesan","Truffle oil","Lemon","Cracked pepper"],
             "image_prompt": "Beef carpaccio, paper-thin raw beef tenderloin arranged in a rosette on a white porcelain plate, topped with baby arugula, shaved parmesan curls, drizzled with golden truffle oil, cracked black pepper, elegant michelin star fine dining plating, warm dim restaurant lighting, shallow depth of field, top-down angle, professional food photography, hyper detailed, 8k"},
            {"id": "onion_soup", "name": "French Onion Soup", "price": 14.00, "tags": ["v"],
             "description": "Slow-caramelized onions under a bubbling cheese crust.",
             "ingredients": ["Yellow onions","Beef broth","Sherry","Gruyere","Sourdough crouton","Fresh thyme"],
             "image_prompt": "French onion soup in a rustic ceramic bowl, deeply caramelized amber onions in rich broth, topped with a crusty sourdough crouton smothered in golden bubbling gruyere cheese, fresh thyme sprig, steam rising, warm candlelit fine dining atmosphere, close-up 45 degree angle, professional food photography, hyper detailed, 8k"},
            {"id": "burrata", "name": "Burrata and Heirloom Tomato", "price": 16.00, "recommended": True, "tags": ["v", "gf"],
             "description": "Cream burrata, sweet heirlooms, a splash of aged balsamic.",
             "ingredients": ["Burrata","Heirloom tomato","Basil oil","Aged balsamic","Sourdough","Sea salt"],
             "image_prompt": "Fresh burrata cheese torn open revealing creamy interior on a slate plate, arranged with vibrant heirloom tomato slices in ruby red golden yellow and deep purple, drizzled with green basil oil and dark aged balsamic reduction, torn sourdough, flaky sea salt, natural window light, close-up 45 degree angle, fine dining, professional food photography, hyper detailed, 8k"},
            {"id": "tuna_tartare", "name": "Tuna Tartare", "price": 20.00, "tags": ["gf", "spicy"],
             "description": "Silky yellowfin, avocado, a citrus-soy kick.",
             "ingredients": ["Yellowfin tuna","Avocado","Citrus soy","Sesame crisp","Chives","Chili oil"],
             "image_prompt": "Yellowfin tuna tartare, ruby-red cubed raw tuna stacked into a neat cylinder ring on a black slate plate, topped with diced green avocado, drizzled citrus soy sauce, crispy sesame crisp shard on top, chives, chili oil dots, elegant minimalist plating, moody dim restaurant lighting, close-up angle, professional food photography, hyper detailed, 8k"},
        ]},
        {"id": "mains", "name": "Main Courses", "items": [
            {"id": "filet", "name": "Filet Mignon", "price": 46.00, "recommended": True, "tags": ["gf"],
             "description": "8oz grass-fed with a glossy red-wine jus.",
             "ingredients": ["Grass-fed filet","Red-wine jus","Pommes puree","Seasonal greens","Butter","Rosemary"],
             "image_prompt": "Grilled 8oz filet mignon steak with beautiful sear marks and rosy pink medium-rare center, resting on silky pommes puree, glossy dark red wine jus reduction, sauteed seasonal greens, sprig of rosemary, elegant white porcelain plate, warm restaurant lighting, 45 degree angle, professional food photography, michelin star fine dining, hyper detailed, 8k"},
            {"id": "duck", "name": "Duck a l'Orange", "price": 38.00, "tags": ["gf"],
             "description": "Crisp-skinned duck, bright orange gastrique.",
             "ingredients": ["Duck breast","Orange gastrique","Wild rice","Cointreau","Star anise","Baby carrots"],
             "image_prompt": "Crisp-skinned duck breast fanned in slices showing rosy pink center, glazed with glossy amber orange gastrique sauce, wild rice pilaf, roasted baby carrots, star anise garnish, elegant white plate, warm dim restaurant lighting, 45 degree angle, professional food photography, fine dining, hyper detailed, 8k"},
            {"id": "sea_bass", "name": "Pan-Seared Sea Bass", "price": 42.00, "tags": ["gf"],
             "description": "Chilean sea bass on a silky saffron beurre blanc.",
             "ingredients": ["Chilean sea bass","Saffron beurre blanc","Fennel confit","Capers","Meyer lemon","Dill"],
             "image_prompt": "Pan-seared Chilean sea bass fillet with crispy golden skin on top, sitting in a pool of silky yellow saffron beurre blanc sauce, fennel confit, capers, meyer lemon wedge, fresh dill, elegant white porcelain plate, natural bright lighting, top-down angle, professional food photography, michelin star fine dining, hyper detailed, 8k"},
            {"id": "risotto", "name": "Wild Mushroom Risotto", "price": 28.00, "tags": ["v", "gf"],
             "description": "Carnaroli rice, porcini, a shave of aged parmesan.",
             "ingredients": ["Carnaroli rice","Porcini","Truffle","Aged parmesan","White wine","Shallot"],
             "image_prompt": "Creamy carnaroli wild mushroom risotto with sauteed porcini mushrooms and black truffle shavings on top, aged parmesan curls, shallots, glossy creamy texture, in a deep white bowl, elegant fine dining plating, warm restaurant lighting, top-down angle, professional food photography, michelin star, hyper detailed, 8k"},
            {"id": "lamb", "name": "Herb-Crusted Rack of Lamb", "price": 48.00, "recommended": True, "tags": ["gf"],
             "description": "New Zealand rack with a rosemary jus.",
             "ingredients": ["New Zealand lamb","Dijon-herb crust","Rosemary jus","Potato gratin","Garlic","Thyme"],
             "image_prompt": "Herb-crusted rack of lamb with rosy pink center, exposed frenched bones pointing upward, coated in golden dijon herb crust, glossy dark rosemary jus, layered potato gratin, roasted garlic cloves, elegant white plate, warm dim lighting, 45 degree angle, professional food photography, fine dining, hyper detailed, 8k"},
        ]},
        {"id": "desserts", "name": "Desserts", "items": [
            {"id": "brulee", "name": "Creme Brulee", "price": 12.00, "tags": ["v", "gf"],
             "description": "Tahitian vanilla under a snap of caramelized sugar.",
             "ingredients": ["Tahitian vanilla","Cream","Egg yolks","Caramelized sugar","Berries"],
             "image_prompt": "Creme brulee in a white ramekin with a perfectly torched golden amber caramelized sugar crust cracked slightly to reveal creamy vanilla custard, fresh raspberries and blueberries on the side, mint leaf, elegant dark wood table, moody warm dim lighting, top-down angle, professional food photography, fine dining, hyper detailed, 8k"},
            {"id": "fondant", "name": "Chocolate Fondant", "price": 14.00, "recommended": True, "tags": ["v", "nuts"],
             "description": "Warm molten centre with hazelnut praline ice cream.",
             "ingredients": ["Dark chocolate","Butter","Egg","Hazelnut praline ice cream","Cocoa nibs"],
             "image_prompt": "Warm chocolate fondant lava cake sliced open revealing molten dark chocolate flowing out onto plate, a quenelle of golden hazelnut praline ice cream, cocoa nibs, chocolate sauce drizzle, dusted cocoa powder, elegant white plate, warm dim lighting, close-up 45 degree angle, professional food photography, michelin star fine dining, hyper detailed, 8k"},
            {"id": "tiramisu", "name": "Classic Tiramisu", "price": 12.00, "tags": ["v"],
             "description": "Espresso-soaked layers, cloud-light mascarpone.",
             "ingredients": ["Ladyfingers","Espresso","Mascarpone","Cocoa","Marsala wine","Egg"],
             "image_prompt": "Classic Italian tiramisu, layered dark espresso-soaked ladyfingers with cloud-light mascarpone cream, dusted with dark cocoa powder in an elegant pattern, marsala wine glass blurred in background, elegant rectangular white plate, warm cafe lighting, 45 degree angle, professional food photography, hyper detailed, 8k"},
        ]},
        {"id": "drinks", "name": "Drinks and Wine", "items": [
            {"id": "cab_glass", "name": "Cabernet Sauvignon", "price": 16.00, "tags": ["v", "vg", "gf"],
             "description": "Napa Valley, by the glass.",
             "ingredients": ["Napa Cabernet"],
             "image_prompt": "Elegant crystal wine glass filled with deep ruby red Cabernet Sauvignon on a dark wooden table, wine bottle softly blurred in the background, vineyard sunset light streaming through, warm golden hour lighting, professional wine photography, luxury fine dining restaurant, close-up angle, hyper detailed, 8k"},
            {"id": "chard_glass", "name": "Chardonnay", "price": 14.00, "tags": ["v", "vg", "gf"],
             "description": "Sonoma Coast, by the glass.",
             "ingredients": ["Sonoma Chardonnay"],
             "image_prompt": "Elegant crystal wine glass filled with pale golden Chardonnay white wine with light condensation on the glass, vineyard soft focus background, warm afternoon sunlight, wine bottle blurred behind, elegant fine dining table setting, professional wine photography, close-up angle, hyper detailed, 8k"},
            {"id": "sparkling", "name": "Sparkling Water", "price": 8.00, "tags": ["v", "vg", "gf"],
             "description": "San Pellegrino 750ml.",
             "ingredients": ["Sparkling mineral water","Lemon wedge"],
             "image_prompt": "Elegant tall crystal glass of sparkling mineral water with visible carbonation bubbles rising, fresh lemon wedge on rim, ice cubes, dark restaurant table setting, dim warm moody lighting, close-up angle, professional beverage photography, luxurious minimalist fine dining, hyper detailed, 8k"},
            {"id": "lemonade", "name": "House Lemonade", "price": 7.00, "tags": ["v", "vg", "gf"],
             "description": "Fresh-pressed, a touch of honey, cool mint.",
             "ingredients": ["Fresh lemon","Honey","Mint","Sparkling water"],
             "image_prompt": "Refreshing fresh house lemonade in an elegant tall glass with pale yellow color, lemon slices, sprig of fresh green mint, honey drizzle, ice cubes, sparkling bubbles, bright sunny natural light, on a rustic wooden table, professional beverage photography, hyper detailed, 8k"},
            {"id": "espresso", "name": "Double Espresso", "price": 5.00, "tags": ["v", "vg", "gf"],
             "description": "Single-origin Ethiopian.",
             "ingredients": ["Ethiopian espresso"],
             "image_prompt": "Perfect double espresso in a small white porcelain demitasse cup with thick rich golden crema on top, saucer with a small spoon, single coffee bean, dark wooden coffee bar counter, warm moody atmospheric lighting, close-up 45 degree angle, professional coffee photography, luxury cafe, hyper detailed, 8k"},
        ]},
    ]
}


def _menu_with_images() -> dict:
    """Point each item at its locally-served photo (served from /images)."""
    out = {"currency": _MENU_RAW["currency"], "categories": []}
    for cat in _MENU_RAW["categories"]:
        new_items = []
        for item in cat["items"]:
            copy = dict(item)
            copy["image_url"] = f"http://localhost:8000/images/{item['id']}.png"
            new_items.append(copy)
        out["categories"].append({"id": cat["id"], "name": cat["name"], "items": new_items})
    return out


MENU = _menu_with_images()


class OrderLine(BaseModel):
    id: str
    name: str
    quantity: int
    price: float
    removed: Optional[List[str]] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    language: str
    messages: List[ChatMessage] = []
    order: Optional[List[OrderLine]] = None


class ChatResponse(BaseModel):
    reply: str


def build_system_prompt(language_code: str, order: Optional[List[OrderLine]]) -> str:
    language_name = LANGUAGE_NAMES.get(language_code, "English")
    base = (
        "You are the friendly AI host for 'Captain Order', a fine-dining "
        f"restaurant ordering app. Speak ONLY in {language_name}, in a warm, "
        "natural, conversational tone (never mention that you were told which "
        "language to use). Keep every reply short, 1-3 sentences, like a real "
        "waiter chatting, not a wall of text. Your goals, in order: "
        "(1) greet the guest warmly and welcome them to Captain Order, "
        "(2) ask their name, "
        "(3) ask whether they're dining in, taking away, or want delivery, "
        "(4) confirm the items they've selected on the menu, honouring any "
        "ingredient removals, and offer to suggest additions or pairings if "
        "useful, "
        "(5) read back the final order clearly before finishing. Ask only "
        "one question at a time. If the guest goes off-topic, gently and "
        "politely bring the conversation back to their order."
    )
    if order:
        lines = []
        for line in order:
            suffix = f" — no {', '.join(line.removed)}" if line.removed else ""
            lines.append(f"- {line.quantity}x {line.name} (${line.price:.2f} each){suffix}")
        total = sum(line.quantity * line.price for line in order)
        base += (
            "\n\nThe guest has ALREADY selected these items from the menu, "
            "so treat them as the current order and skip re-asking what "
            f"they want. Order so far:\n" + "\n".join(lines) +
            f"\nSubtotal: ${total:.2f}."
        )
    return base


@app.get("/menu")
def get_menu():
    return MENU


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    system_prompt = build_system_prompt(request.language, request.order)

    groq_messages = [{"role": "system", "content": system_prompt}]
    for message in request.messages:
        groq_messages.append({"role": message.role, "content": message.content})

    if not request.messages:
        groq_messages.append({
            "role": "user",
            "content": "(The guest just opened the chat. Greet them and start the conversation.)",
        })

    try:
        completion = client.chat.completions.create(
            model=MODEL, messages=groq_messages, temperature=0.7, max_tokens=250,
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Groq API error: {error}") from error

    reply = completion.choices[0].message.content.strip()
    return ChatResponse(reply=reply)


@app.get("/health")
def health():
    return {"status": "ok"}
