"""App-scoped tool bridge for Hermes 0.21.2; never changes non-Axl requests.

The gateway retains Responses streaming and conversation storage. Axl tools are
executed by its backend, which enforces modes and holds explicit approvals.
"""
import json
import threading
import time
import types

from aiohttp import web

PREFIX = "AXL_CONTROL_V1 "
PENDING = {}
LOCK = threading.Lock()
SCHEMA = {
    "type": "function",
    "function": {
        "name": "axl_browser",
        "description": "Operate the user's visible browser. snapshot returns page text and target refs. Use only refs from the latest snapshot. No arbitrary code is available. Browser actions are checked by the app and may wait for user approval. Follow the selected mode for credential entry.",
        "parameters": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "action": {"type": "string", "enum": ["navigate", "snapshot", "click", "type", "scroll"]},
                "url": {"type": "string"}, "target": {"type": "string"},
                "text": {"type": "string"}, "amount": {"type": "integer"},
            }, "required": ["action"],
        },
    },
}


def prepare(instructions):
    if not isinstance(instructions, str) or not instructions.startswith(PREFIX):
        return instructions, None
    first, _, rest = instructions.partition("\n")
    config = json.loads(first[len(PREFIX):])
    if config.get("mode") not in {"guide", "together", "aide", "full"}:
        raise ValueError("Invalid Axl mode")
    if not isinstance(config.get("run_id"), str) or len(config["run_id"]) != 32:
        raise ValueError("Invalid Axl run")
    return rest, config


def attach(agent, config):
    if config is None:
        return agent
    # Both advertised tools and the execution boundary are restricted. Unknown
    # calls (including hallucinated terminal/delegate/browser_exec) never dispatch.
    agent.tools = [] if config["mode"] == "guide" else [SCHEMA]
    agent.valid_tool_names = {t["function"]["name"] for t in agent.tools}

    def execute(self, assistant_message, messages, effective_task_id, api_call_count=0):
        from agent.tool_dispatch_helpers import make_tool_result_message
        for call in assistant_message.tool_calls:
            name, call_id = call.function.name, call.id
            try:
                args = json.loads(call.function.arguments)
                if not isinstance(args, dict):
                    raise ValueError("Tool arguments must be an object")
            except (ValueError, TypeError):
                args = {}
            if self.tool_start_callback:
                self.tool_start_callback(call_id, name, args)
            if name != "axl_browser" or config["mode"] == "guide":
                result = {"error": "BLOCKED: this tool is not available in the selected mode"}
            else:
                key = (config["run_id"], call_id)
                job = {"event": threading.Event(), "args": args, "result": None, "created": time.monotonic()}
                with LOCK:
                    PENDING[key] = job
                # Bounded waiting. On timeout or disconnect, no tool executes here.
                while not job["event"].wait(0.25):
                    if getattr(self, "_interrupt_requested", False) or time.monotonic() - job["created"] > 300:
                        break
                with LOCK:
                    PENDING.pop(key, None)
                result = job["result"] or {"error": "Browser request expired or was cancelled"}
            raw = json.dumps(result)
            messages.append(make_tool_result_message(name, raw, call_id))
            if self.tool_complete_callback:
                self.tool_complete_callback(call_id, name, args, raw)

    agent._execute_tool_calls = types.MethodType(execute, agent)
    return agent


async def capabilities(request):
    return web.json_response({"version": 1, "modes": ["guide", "together", "aide", "full"]})


async def pending(request):
    run_id = request.match_info["run_id"]
    with LOCK:
        calls = [{"call_id": key[1], "arguments": job["args"]}
                 for key, job in PENDING.items() if key[0] == run_id]
    return web.json_response({"calls": calls})


async def resolve(request):
    key = (request.match_info["run_id"], request.match_info["call_id"])
    body = await request.json()
    with LOCK:
        job = PENDING.get(key)
        if job is None or job["event"].is_set():
            return web.json_response({"error": "No pending call"}, status=409)
        job["result"] = body
        job["event"].set()
    return web.json_response({"ok": True})


def routes():
    # Registered inside the gateway's existing authenticated middleware.
    return [("GET", "/v1/axl/capabilities", capabilities),
            ("GET", "/v1/axl/{run_id}/calls", pending),
            ("POST", "/v1/axl/{run_id}/calls/{call_id}", resolve)]
