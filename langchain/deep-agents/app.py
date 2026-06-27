"""Legacy Streamlit UI. Prefer the React app: `scripts/run.sh` or `npm run dev` in frontend/."""

from __future__ import annotations

import os

import streamlit as st
from dotenv import load_dotenv

from agent import get_deep_agent
from config import WORKSPACE_ROOT

load_dotenv()

st.set_page_config(
    page_title="Deep Agents — LangChain",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

os.makedirs(WORKSPACE_ROOT, exist_ok=True)

st.markdown(
    """
<style>
    .skill-card {
        background-color: #161b22;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
    }
    .skill-name { color: #58a6ff; font-weight: 600; }
    .skill-desc { color: #8b949e; font-size: 0.9rem; }
</style>
""",
    unsafe_allow_html=True,
)


def parse_skill_frontmatter(skill_path: str) -> dict[str, str] | None:
    skill_md = os.path.join(skill_path, "SKILL.md")
    if not os.path.exists(skill_md):
        return None

    with open(skill_md, encoding="utf-8") as handle:
        content = handle.read()

    if not content.startswith("---"):
        return None

    parts = content.split("---", 2)
    if len(parts) < 3:
        return None

    info: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            info[key.strip()] = value.strip()
    return info


def list_workspace_files() -> list[str]:
    files: list[str] = []
    for root, _dirs, filenames in os.walk(WORKSPACE_ROOT):
        for filename in filenames:
            if filename == ".gitkeep":
                continue
            rel_path = os.path.relpath(os.path.join(root, filename), WORKSPACE_ROOT)
            files.append(rel_path)
    return sorted(files)


def normalize_messages(messages) -> list:
    if isinstance(messages, list):
        return messages
    if hasattr(messages, "value") and isinstance(messages.value, list):
        return messages.value
    return []


if "messages" not in st.session_state:
    st.session_state.messages = []
if "agent" not in st.session_state:
    with st.spinner("Initializing Deep Agent..."):
        st.session_state.agent = get_deep_agent()
if "current_plan" not in st.session_state:
    st.session_state.current_plan = []


with st.sidebar:
    st.title("Deep Agent Context")
    st.caption("Skills, shared memory, and workspace artifacts")

    st.subheader("Active skills")
    skills_dir = "./skills"
    if os.path.isdir(skills_dir):
        for entry in sorted(os.listdir(skills_dir)):
            skill_path = os.path.join(skills_dir, entry)
            if not os.path.isdir(skill_path):
                continue
            info = parse_skill_frontmatter(skill_path)
            if info:
                st.markdown(
                    f"""
<div class="skill-card">
  <div class="skill-name">{info.get("name", entry)}</div>
  <div class="skill-desc">{info.get("description", "")}</div>
</div>
""",
                    unsafe_allow_html=True,
                )

    st.divider()
    st.subheader("Shared memory (AGENTS.md)")
    if os.path.exists("./AGENTS.md"):
        with open("./AGENTS.md", encoding="utf-8") as handle:
            st.markdown(handle.read())

    st.divider()
    st.subheader("Workspace files")
    workspace_files = list_workspace_files()
    if not workspace_files:
        st.info("No artifacts yet. Agents write outputs to `./workspace/`.")
    else:
        for rel_path in workspace_files:
            file_path = os.path.join(WORKSPACE_ROOT, rel_path)
            with st.expander(rel_path):
                with open(file_path, encoding="utf-8") as handle:
                    content = handle.read()
                st.code(content, language="markdown")
                st.download_button(
                    "Download",
                    data=content,
                    file_name=os.path.basename(rel_path),
                    mime="text/markdown",
                    key=f"download-{rel_path}",
                )

    if st.button("Clear workspace"):
        for rel_path in list_workspace_files():
            os.remove(os.path.join(WORKSPACE_ROOT, rel_path))
        st.rerun()

    plan_section = st.empty()
    if st.session_state.current_plan:
        with plan_section.container():
            st.divider()
            st.subheader("Current plan")
            for index, task in enumerate(st.session_state.current_plan):
                st.checkbox(str(task), key=f"plan_{index}", disabled=True)


st.title("Deep Agent Orchestrator")
st.markdown(
    "Autonomous agents plan, load **SKILL.md** workflows on demand, delegate to "
    "subagents, and collaborate through the filesystem."
)

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("Ask the team to research, write, or review..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        full_response = ""
        with st.status("Agent is working...", expanded=True) as status:
            try:
                for event in st.session_state.agent.stream(
                    {"messages": [("user", prompt)]},
                    stream_mode="updates",
                ):
                    for node_name, data in event.items():
                        if not isinstance(data, dict):
                            continue

                        if "todos" in data:
                            st.session_state.current_plan = data["todos"]

                        if "messages" not in data:
                            continue

                        for msg in normalize_messages(data["messages"]):
                            if getattr(msg, "content", None):
                                if node_name == "agent":
                                    st.markdown(f"**Thought:** {msg.content}")
                                else:
                                    full_response = msg.content

                            for tool_call in getattr(msg, "tool_calls", []) or []:
                                tool_name = tool_call.get("name")
                                tool_args = tool_call.get("args", {})

                                if tool_name == "task":
                                    subagent = tool_args.get("subagent_type", "unknown")
                                    st.write(f"Delegating to subagent: `{subagent}`")
                                    st.caption(tool_args.get("description", ""))
                                elif tool_name == "write_todos":
                                    st.session_state.current_plan = tool_args.get(
                                        "todos", []
                                    )
                                    st.success("Plan updated")
                                elif tool_name == "read_file" and "SKILL.md" in str(
                                    tool_args.get("path", "")
                                ):
                                    skill_name = os.path.basename(
                                        os.path.dirname(tool_args["path"])
                                    )
                                    st.info(f"Loading skill: `{skill_name}`")
                                else:
                                    st.write(f"Tool: `{tool_name}`")
                                    if tool_args:
                                        st.caption(str(tool_args))

                status.update(label="Done", state="complete", expanded=False)
            except Exception as exc:
                import traceback

                st.error(f"Agent error: {exc}")
                st.code(traceback.format_exc())
                status.update(label="Error", state="error")
                full_response = "Something went wrong while running the agent."

        st.markdown(full_response or "_No final message returned._")
        st.session_state.messages.append(
            {"role": "assistant", "content": full_response or "_No response._"}
        )
