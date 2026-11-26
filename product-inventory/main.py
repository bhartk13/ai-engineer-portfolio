"""Product Inventory: REST API.

    uvicorn main:app --reload
    open http://127.0.0.1:8000        (web UI)
    open http://127.0.0.1:8000/docs   (interactive API reference)
"""
import asyncio
import json
import os
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import service

try:  # .env is optional; it holds the agent settings and may point INVENTORY_DB elsewhere
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

service.init_db()
app = FastAPI(title="Product Inventory", version="1.0")

STATIC_DIR = Path(__file__).parent / "static"


# ---------- web UI ----------

@app.get("/", include_in_schema=False)
def ui():
    """The single-page UI for browsing and creating products, offerings and SKUs."""
    return FileResponse(STATIC_DIR / "index.html")


# ---------- errors: service exceptions -> HTTP status codes ----------

def _handler(status):
    async def handle(request: Request, exc: Exception):
        return JSONResponse(status_code=status, content={"detail": str(exc)})
    return handle


app.add_exception_handler(service.NotFound, _handler(404))
app.add_exception_handler(service.Conflict, _handler(409))
app.add_exception_handler(service.Invalid, _handler(422))


# ---------- request bodies ----------

class ProductIn(BaseModel):
    name: str = Field(min_length=1, examples=["Cloud Storage"])
    description: str = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None


class OfferingIn(BaseModel):
    name: str = Field(min_length=1, examples=["Business Plan"])
    description: str = ""


class OfferingUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None


class SkuIn(BaseModel):
    sku_code: str = Field(min_length=1, examples=["CS-BIZ-1TB-ANNUAL"])
    price: float = Field(default=0, ge=0)
    quantity: int = Field(default=0, ge=0)


class SkuUpdate(BaseModel):
    sku_code: Optional[str] = Field(default=None, min_length=1)
    price: Optional[float] = Field(default=None, ge=0)
    quantity: Optional[int] = Field(default=None, ge=0)


def _changes(body: BaseModel):
    """Only the fields the caller actually sent."""
    return body.model_dump(exclude_unset=True, exclude_none=True)


# ---------- products ----------

@app.post("/products", status_code=201, tags=["products"])
def create_product(body: ProductIn):
    return service.create("products", body.model_dump())


@app.get("/products", tags=["products"])
def list_products():
    return service.list_all("products")


@app.get("/products/{product_id}", tags=["products"])
def get_product(product_id: int):
    return service.get("products", product_id)


@app.get("/products/{product_id}/tree", tags=["products"])
def get_product_tree(product_id: int):
    """The product with all its offerings and their SKUs."""
    return service.tree(product_id)


@app.patch("/products/{product_id}", tags=["products"])
def update_product(product_id: int, body: ProductUpdate):
    return service.update("products", product_id, _changes(body))


@app.delete("/products/{product_id}", status_code=204, tags=["products"])
def delete_product(product_id: int):
    """Also deletes the product's offerings and SKUs."""
    service.delete("products", product_id)


# ---------- offerings (children of a product) ----------

@app.post("/products/{product_id}/offerings", status_code=201, tags=["offerings"])
def create_offering(product_id: int, body: OfferingIn):
    return service.create("offerings", body.model_dump(), parent_id=product_id)


@app.get("/products/{product_id}/offerings", tags=["offerings"])
def list_offerings(product_id: int):
    service.get("products", product_id)
    return service.list_all("offerings", product_id)


@app.get("/offerings/{offering_id}", tags=["offerings"])
def get_offering(offering_id: int):
    return service.get("offerings", offering_id)


@app.patch("/offerings/{offering_id}", tags=["offerings"])
def update_offering(offering_id: int, body: OfferingUpdate):
    return service.update("offerings", offering_id, _changes(body))


@app.delete("/offerings/{offering_id}", status_code=204, tags=["offerings"])
def delete_offering(offering_id: int):
    """Also deletes the offering's SKUs."""
    service.delete("offerings", offering_id)


# ---------- skus (children of an offering) ----------

@app.post("/offerings/{offering_id}/skus", status_code=201, tags=["skus"])
def create_sku(offering_id: int, body: SkuIn):
    return service.create("skus", body.model_dump(), parent_id=offering_id)


@app.get("/offerings/{offering_id}/skus", tags=["skus"])
def list_skus(offering_id: int):
    service.get("offerings", offering_id)
    return service.list_all("skus", offering_id)


@app.get("/skus/{sku_id}", tags=["skus"])
def get_sku(sku_id: int):
    return service.get("skus", sku_id)


@app.patch("/skus/{sku_id}", tags=["skus"])
def update_sku(sku_id: int, body: SkuUpdate):
    return service.update("skus", sku_id, _changes(body))


@app.delete("/skus/{sku_id}", status_code=204, tags=["skus"])
def delete_sku(sku_id: int):
    service.delete("skus", sku_id)


# ---------- assistant: plain-language instructions through the agents ----------

class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000, examples=["Add an offering 'Personal Plan' to Cloud Storage"])
    history: list[Turn] = Field(
        default_factory=list, max_length=40,
        description="Earlier turns of this conversation, oldest first, so a short follow-up "
                    "('yes, rename it') is understood. The server keeps no chat state.")


@app.post("/chat", tags=["assistant"])
async def chat(body: ChatIn):
    """Send an instruction to the orchestrator agent and stream what happens.

    The caller sends the earlier turns in `history`; nothing is remembered
    between requests on the server. The response is newline-delimited JSON,
    one object per line:
      {"type": "tool", "agent", "tool", "input", "ok", "result"}  each tool call, as it happens
      {"type": "done", "reply", "pending_deletes": [...]}         the agent's final answer
      {"type": "error", "detail"}                                  the run failed

    Deletes are never executed here. Each one the agent asks for is listed in
    pending_deletes and the caller runs it through DELETE /{entity}/{id} once
    the user confirms.
    """
    try:
        import agents
    except ImportError as exc:
        raise HTTPException(503, f"The assistant needs the agent dependencies: pip install -r requirements.txt ({exc})")
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(503, "The assistant is not configured: set ANTHROPIC_API_KEY in .env and restart the server.")

    queue: asyncio.Queue = asyncio.Queue()
    pending = []

    def on_event(event):
        queue.put_nowait({"type": "tool", **event})

    def confirm(entity, record_id, record):
        label = record.get("name") or record.get("sku_code") or ""
        pending.append({"entity": entity, "id": record_id, "label": label, "record": record})
        return (f"Deleting {entity} #{record_id} ('{label}') needs the user's confirmation. "
                "It has been queued for them to approve in the UI; nothing was deleted yet. "
                "Do not retry. Tell the user it is awaiting their confirmation.")

    async def run():
        try:
            history = [t.model_dump() for t in body.history]
            while history and history[0]["role"] != "user":  # a conversation must start with the user
                history.pop(0)
            reply = await agents.orchestrate(body.message, on_event=on_event, confirm=confirm, history=history)
            queue.put_nowait({"type": "done", "reply": reply, "pending_deletes": pending})
        except Exception as exc:  # the model, network, or a bug: tell the UI rather than hang
            queue.put_nowait({"type": "error", "detail": f"{type(exc).__name__}: {exc}"})
        finally:
            queue.put_nowait(None)

    async def stream():
        task = asyncio.create_task(run())
        while True:
            item = await queue.get()
            if item is None:
                break
            yield json.dumps(item, default=str) + "\n"
        await task

    return StreamingResponse(stream(), media_type="application/x-ndjson")


# ---------- reports ----------

@app.get("/reports/low-stock", tags=["reports"])
def low_stock(threshold: int = 10):
    """SKUs with quantity at or below the threshold."""
    return service.low_stock(threshold)
