# Product Inventory

A CRUD app for a three-level hierarchy, plus an optional multi-agent
layer that lets you manage the same data in plain language.

```
product      "Cloud Storage"
  offering     "Business Plan"
    sku          "CS-BIZ-1TB-ANNUAL"   price 4999.0   quantity 25
    sku          "CS-BIZ-5TB-ANNUAL"   price 19999.0  quantity 4
  offering     "Personal Plan"
    sku          ...
```

Deleting a product deletes its offerings and SKUs; deleting an offering
deletes its SKUs.

## Files

| File | What it holds |
|---|---|
| `service.py` | Database schema, validation, and all CRUD logic (SQLite) |
| `main.py` | REST API (FastAPI) that calls `service.py`; also serves the web UI at `/` |
| `static/index.html` | Web UI: browse the hierarchy, create records, and chat with the agents |
| `agents.py` | Orchestrator + analyst + editor agents that call `service.py` |
| `requirements.txt` | Dependencies |
| `.env.example` | Settings template (only needed for the agents) |

## Part 1: Run the CRUD app

**Step 1. Install** (Python 3.10+). In the project folder:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Step 2. Start the server**

```bash
uvicorn main:app --reload
```

**Step 3. Open http://127.0.0.1:8000** . This is the web UI: three
columns for products, offerings and SKUs. Click a product to see its
offerings, click an offering to see its SKUs, and use the form at the bottom
of each column to create a new one. Duplicate names, duplicate SKU codes and
negative numbers are rejected with a message under the form. The fourth
column, the assistant, needs an API key (Part 2).

The API reference at http://127.0.0.1:8000/docs lets you try every endpoint
directly, including update and delete. Data is saved in `inventory.db`,
created automatically in the project folder.

**Step 4. Try the hierarchy from the command line** (or do the same from
the UI or the /docs page):

```bash
# 1. a product
curl -X POST localhost:8000/products -H "Content-Type: application/json" \
     -d '{"name": "Cloud Storage", "description": "File storage service"}'

# 2. an offering under product 1
curl -X POST localhost:8000/products/1/offerings -H "Content-Type: application/json" \
     -d '{"name": "Business Plan"}'

# 3. a SKU under offering 1
curl -X POST localhost:8000/offerings/1/skus -H "Content-Type: application/json" \
     -d '{"sku_code": "CS-BIZ-1TB-ANNUAL", "price": 4999, "quantity": 4}'

# 4. the whole tree, and what is running low
curl localhost:8000/products/1/tree
curl "localhost:8000/reports/low-stock?threshold=10"
```

### Endpoints

| Action | Products | Offerings | SKUs |
|---|---|---|---|
| Create | `POST /products` | `POST /products/{id}/offerings` | `POST /offerings/{id}/skus` |
| List | `GET /products` | `GET /products/{id}/offerings` | `GET /offerings/{id}/skus` |
| Read one | `GET /products/{id}` | `GET /offerings/{id}` | `GET /skus/{id}` |
| Update | `PATCH /products/{id}` | `PATCH /offerings/{id}` | `PATCH /skus/{id}` |
| Delete | `DELETE /products/{id}` | `DELETE /offerings/{id}` | `DELETE /skus/{id}` |

Also: `GET /products/{id}/tree`, `GET /reports/low-stock?threshold=10`, and
`POST /products/bulk`, which creates a product with its offerings and SKUs in
one call and one transaction. The body is a product with a nested `offerings`
list, each with a nested `skus` list (or a list of such products). If any
record is invalid or a duplicate, nothing is saved and the error says which
record failed, for example `offerings[0].skus[1]: a sku with sku_code ... already exists`.

```bash
curl -X POST localhost:8000/products/bulk -H "Content-Type: application/json" -d '{
  "name": "Laptop", "description": "Portable computers",
  "offerings": [
    {"name": "Pro", "skus": [
      {"sku_code": "LT-PRO-16GB-ANNUAL", "price": 1500, "quantity": 12},
      {"sku_code": "LT-PRO-32GB-ANNUAL", "price": 1900, "quantity": 8}]},
    {"name": "Air", "skus": [
      {"sku_code": "LT-AIR-8GB-ANNUAL", "price": 900, "quantity": 20}]}
  ]
}'
```

Also `POST /chat` for the assistant (Part 2).

Status codes: 404 record or parent not found, 409 duplicate name or SKU
code, 422 invalid input.

### Validation rules

All of these live in `service.py`, so they apply to the API, the UI and the
agents alike:

- Names and SKU codes are trimmed. Surrounding spaces never make a new record.
- Product and offering names get the first letter of each word capitalized:
  "cloud storage" is stored as "Cloud Storage", on create and on rename. The
  rest of each word is left as typed. SKU codes are stored as given.
- No duplicates, ignoring case: product names and SKU codes are unique across
  the whole inventory, offering names are unique within their product. This
  is checked on create and on update, so a rename cannot collide either.
- Prices and quantities cannot be negative; quantities are whole numbers.
- A lookup by name (`service.find`, the agents' `find_record` tool) must match
  exactly one record. Several matches is an error, so an update or delete by
  name can never land on the wrong record.
- Deletes target one id. Deleting a product removes its offerings and SKUs;
  deleting an offering removes its SKUs.

## Part 2: The multi-agent layer

**Step 1.** Copy `.env.example` to `.env` and add an Anthropic API key from
the Claude Console (https://console.anthropic.com).

**Step 2.** Ask in plain language, either from the terminal:

```bash
python agents.py "Add a product 'Laptop' with offerings 'Pro' and 'Air'. Give each two SKUs with prices and stock. Then tell me what is low on stock."
python agents.py "Which products have no SKUs yet?"
python agents.py "Raise the price of every Pro SKU by 10 percent"
```

or from the assistant column in the web UI, which sends the same request
through `POST /chat`. The UI shows every tool call the workers make as it
happens, then the orchestrator's answer, and refreshes the three columns.
From the terminal the server does not need to be running; agents use
`service.py` directly and share the same `inventory.db`.

**Follow-ups work.** The page keeps the conversation and sends the earlier
turns with each message (the `history` field of `POST /chat`; the server
stores nothing), so when the assistant ends with "Needs your decision: rename
'database' to 'Database'?" you can answer "yes, rename it". Confirming or
keeping a queued delete is added to the conversation too. **New chat** in the
assistant header forgets it. Running `python agents.py` with no arguments
gives the same multi-turn conversation in the terminal.

**Deletes always wait for you.** In the terminal the editor asks `[y/N]`.
In the web UI the agent cannot delete anything itself: each delete it asks
for is queued and shown with Delete and Keep buttons, and only your click
runs it (through the normal `DELETE` endpoint). The agent is told the delete
is awaiting confirmation and reports that back to you.

### How the CRUD app became a multi-agent app

```
            your request
                 |
          +--------------+
          | orchestrator |     plans; only tool: delegate_task
          +--------------+
          /       |        \
   analyst      editor      reviewer
 (read-only) (read + write) (read + fix)
 list_records create_record  checks a request before the editor
 find_record  update_record  acts and the result after: near-
 get_tree     delete_record  duplicates, sku code pattern, odd
 low_stock     -> confirm    prices; fixes mechanical issues,
                             asks you about judgment calls
          \       |        /
            service.py           same rules as the REST API
                 |
            inventory.db
```

Four steps turned one into the other:

1. **Keep the logic out of the web layer.** All rules live in `service.py`,
   so there is one place both the API and the agents must go through.
2. **Expose service functions as tools.** Each tool in `agents.py` is a
   three-line wrapper plus a JSON schema the model reads.
3. **Split agents by permission, not by table.** The analyst cannot write.
   Questions and reports never risk changing data.
4. **Put an orchestrator on top.** It turns a request into tasks, sends
   every change through the reviewer, then the editor, then the reviewer
   again to verify. Its answer has three parts: what changed, what the
   reviewer fixed, and what needs your decision.

### Guardrails

- Agents cannot run SQL. They can only call the seven tools, and the service
  rejects unknown tables, unknown fields, wrong types, negative numbers and
  duplicates (see Validation rules above). The editor is told to report a
  duplicate rather than work around it.
- Names are resolved with `find_record`, which refuses ambiguous matches, so
  the editor never guesses which "Pro" offering you meant.
- Deletes stop and ask you: `[y/N]` in the terminal, Delete/Keep buttons in
  the web UI.
- Tool errors go back to the agent as errors, so it can correct itself
  and cannot report a failed change as done.
- Writes run one at a time, in order.

### Good next agents to add

| Agent | Tools it would need | What it does |
|---|---|---|
| Reorder planner | `low_stock` + a `draft_purchase_order` tool | Proposes restock quantities |
| Data-quality auditor | read tools | Finds products without offerings, SKUs priced at 0, near-duplicate names |
| Importer | `create_record` + a `read_csv` tool | Loads a supplier's spreadsheet into the hierarchy |
| Pricing analyst | read tools + `update_record` behind confirmation | Suggests and applies price changes |

To add one, add an entry to `WORKERS` in `agents.py` with a system prompt
and a tool list. The orchestrator picks it up automatically.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `uvicorn: command not found` | Activate the virtual environment, then reinstall requirements |
| Port already in use | `uvicorn main:app --reload --port 8001` |
| 409 on create | That product name or SKU code already exists |
| `ANTHROPIC_API_KEY is not set`, or the assistant column says it is not configured | Create `.env` from `.env.example`, then restart the server |
| `NotFoundError` mentioning the model | Set a model name your account can use in `.env` |
| Start with empty data | Stop the server and delete `inventory.db` |
