"""CLI entry point for running the Deep Agent without Streamlit."""

from __future__ import annotations

import argparse
import sys

from agent import get_deep_agent


def run_agent(prompt: str) -> str:
    agent = get_deep_agent()
    final_response = ""

    for event in agent.stream({"messages": [("user", prompt)]}, stream_mode="updates"):
        for _node_name, data in event.items():
            if not isinstance(data, dict) or "messages" not in data:
                continue

            messages = data["messages"]
            if hasattr(messages, "value") and isinstance(messages.value, list):
                messages = messages.value
            if not isinstance(messages, list):
                continue

            for msg in messages:
                if hasattr(msg, "content") and msg.content:
                    final_response = msg.content

    return final_response or "Agent finished without a text response."


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the Deep Agent orchestrator from the command line."
    )
    parser.add_argument(
        "prompt",
        nargs="?",
        help="Task for the agent (interactive mode if omitted)",
    )
    args = parser.parse_args(argv)

    if args.prompt:
        print(run_agent(args.prompt))
        return 0

    print("Deep Agent CLI — type 'exit' to quit.\n")
    while True:
        try:
            prompt = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not prompt:
            continue
        if prompt.lower() in {"exit", "quit"}:
            break

        print("\nAgent:\n")
        print(run_agent(prompt))
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
