"""Product Inventory: multi-agent layer.

Talk to the inventory in plain language:

    python agents.py "Add a product 'Cloud Storage' with a Business Plan offering
                      and two SKUs, then tell me what is low on stock"

An orchestrator agent plans the work and delegates to two workers:

    analyst  read-only tools  (answers questions, reports)
    editor   write tools      (create, update, delete)

Every tool calls service.py, the same code the REST API uses, so agents
cannot bypass validation. Deletes need a yes from the human: at the keyboard
when run from the terminal, or a Confirm button when run from the web UI.

Two hooks let a host (the terminal or the web server) plug in:

    on_event(event)                       called for every tool call a worker makes
    confirm(entity, record_id, record)    decides a delete: True deletes, a string
                                          is reported back to the agent instead

Both are passed to orchestrate() and are per-request (context variables), so
concurrent web requests never see each other's hooks.
"""
import asyncio
import contextvars
import inspect
import json
import os
import sys

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

import service

load_dotenv()

ORCHESTRATOR_MODEL = os.getenv("ORCHESTRATOR_MODEL", "claude-sonnet-5-5")
WORKER_MODEL = os.getenv("WORKER_MODEL", "claude-haiku-5-5")
MAX_TURNS = int(os.getenv("MAX_TURNS", "15"))

client = AsyncAnthropic()

HIERARCHY = (
    "The inventory is a three-level hierarchy: products -> offerings -> skus. "
    "An offering belongs to a product (parent_id = product id). A sku belongs "
    "to an offering (parent_id = offering id). Fields: products and offerings "
    "have name, description; skus have sku_code, price, quantity."
)


# ---------- host hooks ----------

def _confirm_in_terminal(entity, record_id, record):
    answer = input(f"\n  CONFIRM: Delete {entity} #{record_id} {record} and everything under it? [y/N] ")
    return answer.strip().lower() == "y"


def _print_event(event):
    print(f"  [{event['agent']}] {event['tool']}({json.dumps(event['input'])[:120]})"
          + ("" if event["ok"] else f"  -> {event['result'][:100]}"))


CONFIRM = contextvars.ContextVar("confirm", default=_confirm_in_terminal)
ON_EVENT = contextvars.ContextVar("on_event", default=_print_event)


# ---------- tools: thin wrappers around service.py ----------

def list_records(entity, parent_id=None):
    return service.list_all(entity, parent_id)


def find_record(entity, value, parent_id=None):
    return service.find(entity, value, parent_id)


def get_tree(product_id):
    return service.tree(product_id)


def low_stock(threshold=10):
    return service.low_stock(threshold)


def create_record(entity, data, parent_id=None):
    return service.create(entity, data, parent_id)


def update_record(entity, record_id, data):
    return service.update(entity, record_id, data)


def delete_record(entity, record_id):
    record = service.get(entity, record_id)
    verdict = CONFIRM.get()(entity, record_id, record)
    if verdict is True:
        service.delete(entity, record_id)
        return "deleted"
    if isinstance(verdict, str):
        return verdict
    return "The user declined. Nothing was deleted. Do not retry."


ENTITY = {"type": "string", "enum": list(service.ENTITIES)}

TOOLS = {
    "list_records": (list_records, {
        "name": "list_records",
        "description": "List records of one kind. Pass parent_id to list only "
                       "the offerings of a product or the skus of an offering.",
        "input_schema": {"type": "object", "required": ["entity"], "properties": {
            "entity": ENTITY, "parent_id": {"type": "integer"}}},
    }),
    "find_record": (find_record, {
        "name": "find_record",
        "description": "Find one record by its product name, offering name, or "
                       "sku code (case-insensitive). Errors if nothing matches "
                       "or if several records match; then pass parent_id to "
                       "narrow it down, or use list_records. Always use this to "
                       "get an id before updating or deleting by name.",
        "input_schema": {"type": "object", "required": ["entity", "value"], "properties": {
            "entity": ENTITY, "value": {"type": "string"}, "parent_id": {"type": "integer"}}},
    }),
    "get_tree": (get_tree, {
        "name": "get_tree",
        "description": "Get one product with all its offerings and their skus.",
        "input_schema": {"type": "object", "required": ["product_id"], "properties": {
            "product_id": {"type": "integer"}}},
    }),
    "low_stock": (low_stock, {
        "name": "low_stock",
        "description": "List skus whose quantity is at or below a threshold.",
        "input_schema": {"type": "object", "properties": {
            "threshold": {"type": "integer", "description": "Default 10."}}},
    }),
    "create_record": (create_record, {
        "name": "create_record",
        "description": "Create a product, offering, or sku. Offerings and skus "
                       "need parent_id. Returns the new record with its id.",
        "input_schema": {"type": "object", "required": ["entity", "data"], "properties": {
            "entity": ENTITY, "parent_id": {"type": "integer"},
            "data": {"type": "object", "description": "Field values for the record."}}},
    }),
    "update_record": (update_record, {
        "name": "update_record",
        "description": "Change fields on an existing record. Send only the fields to change.",
        "input_schema": {"type": "object", "required": ["entity", "record_id", "data"], "properties": {
            "entity": ENTITY, "record_id": {"type": "integer"}, "data": {"type": "object"}}},
    }),
    "delete_record": (delete_record, {
        "name": "delete_record",
        "description": "Delete a record and its children. The human is asked to confirm.",
        "input_schema": {"type": "object", "required": ["entity", "record_id"], "properties": {
            "entity": ENTITY, "record_id": {"type": "integer"}}},
    }),
}

READ_TOOLS = ["list_records", "find_record", "get_tree", "low_stock"]
WRITE_TOOLS = ["create_record", "update_record", "delete_record"]


# ---------- workers ----------

WORKERS = {
    "analyst": {
        "system": "You are the inventory analyst. You answer questions and "
                  "produce reports from the live data. You cannot change "
                  "anything. Always look data up; never guess. " + HIERARCHY,
        "tools": READ_TOOLS,
    },
    "editor": {
        "system": "You are the inventory editor. You create, update, and "
                  "delete records exactly as instructed. Look up ids with "
                  "find_record or list_records before using them; never guess "
                  "an id. Create parents before children. Names and sku codes "
                  "must be unique (ignoring case): if a tool reports a "
                  "duplicate, do not create or rename to it; report the "
                  "conflict instead. If find_record reports several matches, "
                  "ask for a parent_id or report the ambiguity; never pick one. "
                  "A delete may come back as awaiting the user's confirmation: "
                  "that is final for this task, do not retry it. If a tool "
                  "returns an error, fix the cause or report it; never claim "
                  "a change that did not succeed. Finish by listing each "
                  "record you changed with its id. " + HIERARCHY,
        "tools": READ_TOOLS + WRITE_TOOLS,
    },
    "reviewer": {
        "system": "You are the inventory reviewer. You are given a requested "
                  "change, or a change that was just made, and you check it "
                  "against the live data. Look for: names that duplicate an "
                  "existing record except for case or spacing; sku codes that "
                  "break the pattern PRODUCT-PLAN-SIZE-TERM in upper case (for "
                  "example CS-BIZ-1TB-ANNUAL); parents that do not exist; "
                  "(product and offering names are capitalized word by word "
                  "automatically on save, so do not raise their case as an issue) "
                  "prices of 0; prices inconsistent with sibling skus (a bigger "
                  "size cheaper than a smaller one); and, after a change, "
                  "anything requested that is missing or landed under the wrong "
                  "parent. Fix mechanical problems yourself: trim or upper-case a "
                  "code, use the existing record instead of a near-duplicate, "
                  "move or create a record so the result matches what was asked. "
                  "Never change a price or quantity the user gave, and never "
                  "delete; raise those as questions. Reply with two lists: "
                  "'Fixed' (what you changed, with ids) and 'Needs your decision' "
                  "(each issue with the data behind it). Say 'No issues' if "
                  "there are none. " + HIERARCHY,
        "tools": READ_TOOLS + ["create_record", "update_record"],
    },
}


# ---------- the generic agent loop ----------

async def run_tool(agent, handlers, call):
    try:
        result = handlers[call.name](**call.input)
        if inspect.isawaitable(result):
            result = await result
        content = result if isinstance(result, str) else json.dumps(result)
        reply = {"type": "tool_result", "tool_use_id": call.id, "content": content}
    except Exception as exc:
        content = f"Error: {exc}"
        reply = {"type": "tool_result", "tool_use_id": call.id, "content": content, "is_error": True}
    if call.name != "delegate_task":  # the orchestrator's delegations are not shown; the worker's tool calls are
        ON_EVENT.get()({"agent": agent, "tool": call.name, "input": call.input,
                        "ok": "is_error" not in reply, "result": content})
    return reply


async def run_agent(name, system, task, schemas, handlers, model, parallel=True, history=None):
    messages = list(history or []) + [{"role": "user", "content": task}]
    for _ in range(MAX_TURNS):
        response = await client.messages.create(
            model=model, max_tokens=4096, system=system, tools=schemas, messages=messages)
        messages.append({"role": "assistant", "content": response.content})
        calls = [b for b in response.content if b.type == "tool_use"]
        if not calls:
            return "".join(b.text for b in response.content if b.type == "text")
        if parallel:
            results = await asyncio.gather(*(run_tool(name, handlers, c) for c in calls))
        else:  # writes run one at a time, in the order the model asked
            results = [await run_tool(name, handlers, c) for c in calls]
        messages.append({"role": "user", "content": list(results)})
    return f"({name} stopped after {MAX_TURNS} turns without finishing)"


# ---------- the orchestrator ----------

DELEGATE_TOOL = {
    "name": "delegate_task",
    "description": "Give a self-contained task to a worker and get its report. "
                   "Workers do not see the user's request or each other's work.",
    "input_schema": {"type": "object", "required": ["worker", "task"], "properties": {
        "worker": {"type": "string", "enum": list(WORKERS)},
        "task": {"type": "string"}}},
}

ORCHESTRATOR_SYSTEM = (
    "You run the Product Inventory assistant. You have no direct access to "
    "the data; you delegate. Use the analyst for questions and reports and "
    "the editor for any change. Give each worker complete instructions, "
    "including ids or results from earlier steps. Send changes that depend "
    "on each other to the editor as one task. For every change: first send "
    "the full request to the reviewer, then give the editor the request as "
    "corrected by the reviewer, then send the reviewer what was asked and "
    "what the editor reports so it can verify and fix the result. Skip the "
    "reviewer for pure questions. End with a short answer for the user with "
    "three parts: what was changed, what the reviewer fixed, and what needs "
    "the user's decision (omit empty parts). Earlier turns of the same "
    "conversation may precede the request: a short reply such as 'yes', "
    "'rename it' or 'the first one' answers the decision you last asked for, "
    "so act on it using the names and ids from those turns instead of asking "
    "again. " + HIERARCHY
)


async def delegate_task(worker, task):
    spec = WORKERS[worker]
    return await run_agent(
        name=worker, system=spec["system"], task=task,
        schemas=[TOOLS[t][1] for t in spec["tools"]],
        handlers={t: TOOLS[t][0] for t in spec["tools"]},
        model=WORKER_MODEL, parallel=False)


async def orchestrate(request, on_event=None, confirm=None, history=None):
    """Run one request through the orchestrator and return its final answer.

    history is the earlier turns of the conversation, oldest first, as
    {"role": "user" | "assistant", "content": str}; the orchestrator sees them
    so a follow-up like "yes, rename it" refers to its last answer.

    on_event and confirm override the terminal defaults for this call only
    (see the module docstring)."""
    tokens = []
    if on_event is not None:
        tokens.append((ON_EVENT, ON_EVENT.set(on_event)))
    if confirm is not None:
        tokens.append((CONFIRM, CONFIRM.set(confirm)))
    try:
        return await run_agent(
            name="orchestrator", system=ORCHESTRATOR_SYSTEM, task=request,
            schemas=[DELEGATE_TOOL], handlers={"delegate_task": delegate_task},
            model=ORCHESTRATOR_MODEL, parallel=False, history=history)
    finally:
        for var, token in reversed(tokens):
            var.reset(token)


def main():
    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.")
    service.init_db()
    if len(sys.argv) > 1:  # one request from the command line
        print()
        print("\n" + asyncio.run(orchestrate(" ".join(sys.argv[1:]))))
        return
    history = []  # interactive: keep the conversation so follow-ups make sense
    while True:
        try:
            request = input("\nWhat should I do with the inventory? (empty to quit) ").strip()
        except EOFError:
            break
        if not request:
            break
        print()
        reply = asyncio.run(orchestrate(request, history=history))
        print("\n" + reply)
        history += [{"role": "user", "content": request}, {"role": "assistant", "content": reply}]


if __name__ == "__main__":
    main()
