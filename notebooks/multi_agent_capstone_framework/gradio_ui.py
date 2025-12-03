import gradio as gr
import requests
import json
import os

API_BASE = os.getenv("API_BASE", "http://localhost:8000")


# ========================
# Backend API Call Helpers
# ========================

def call_plan(session_id, goal):
    try:
        resp = requests.post(
            f"{API_BASE}/plan",
            json={"session_id": session_id, "goal": goal},
            timeout=120
        )
        if resp.status_code != 200:
            return f"❌ Error: {resp.text}", ""
        return json.dumps(resp.json(), indent=2), "Planner finished. Now load session ➜"
    except Exception as e:
        return f"❌ Exception: {e}", ""


def load_session(session_id):
    try:
        resp = requests.get(f"{API_BASE}/session/{session_id}", timeout=15)
        if resp.status_code != 200:
            return f"❌ Session not found: {resp.text}", "", "", ""
        data = resp.json()

        plan = json.dumps(data.get("plan", {}), indent=2)
        results = json.dumps(data.get("results", {}), indent=2)
        final_output = json.dumps(data.get("final_output", data.get("results", {})), indent=2)

        status = f"Status: {data.get('status')} | Goal: {data.get('goal')}"

        return status, plan, results, final_output

    except Exception as e:
        return f"❌ Error loading session: {e}", "", "", ""


def save_review(session_id, edited_json):
    try:
        parsed = json.loads(edited_json)
    except:
        return "❌ Invalid JSON. Please fix formatting."

    try:
        resp = requests.post(
            f"{API_BASE}/review/{session_id}",
            json={"final_output": parsed},
            timeout=60
        )
        return f"✅ Saved: {resp.json()}"
    except Exception as e:
        return f"❌ Error saving review: {e}"


def approve_session(session_id):
    try:
        resp = requests.post(f"{API_BASE}/approve/{session_id}", timeout=60)
        return f"✅ Approved: {resp.json()}"
    except Exception as e:
        return f"❌ Error approving session: {e}"


# ========================
#         UI LAYOUT
# ========================

with gr.Blocks(title="Multi-Agent HITL Orchestration") as demo:

    gr.Markdown("# 🧠 Multi-Agent Orchestration (Human-In-The-Loop)")
    gr.Markdown("Simple UI: Run → Load Session → Edit → Approve")

    with gr.Tab("1️⃣ Run Planner"):
        session_id = gr.Textbox(label="Session ID", value="session1")
        goal = gr.Textbox(label="Goal", lines=3, placeholder="Describe what you want the agents to do.")

        run_btn = gr.Button("Run Planner")
        planner_raw = gr.Code(label="Orchestrator Response")
        planner_msg = gr.Markdown("")

        run_btn.click(call_plan, inputs=[session_id, goal], outputs=[planner_raw, planner_msg])

    with gr.Tab("2️⃣ Load Session"):
        load_sid = gr.Textbox(label="Session ID", value="session1")
        load_btn = gr.Button("Load")

        session_status = gr.Markdown("Session status will appear here.")
        plan_box = gr.Code(label="Plan")
        results_box = gr.Code(label="Per-Step Outputs")
        final_output_box = gr.Code(label="Editable Final Output (JSON)", interactive=True)

        load_btn.click(
            load_session,
            inputs=[load_sid],
            outputs=[session_status, plan_box, results_box, final_output_box]
        )

    with gr.Tab("3️⃣ Review & Approve"):
        review_sid = gr.Textbox(label="Session ID", value="session1")
        edit_box = gr.Code(label="Edited Final JSON", interactive=True)
        save_btn = gr.Button("Save Review")
        approve_btn = gr.Button("Approve Session")

        save_msg = gr.Markdown("")
        approve_msg = gr.Markdown("")

        save_btn.click(save_review, inputs=[review_sid, edit_box], outputs=[save_msg])
        approve_btn.click(approve_session, inputs=[review_sid], outputs=[approve_msg])


demo.launch()
