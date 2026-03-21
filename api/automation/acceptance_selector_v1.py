#!/usr/bin/env python3
"""
TENMON-ARK — acceptance_selector_v1
Maps card.acceptanceProfile to ordered check steps (commands are suggestions; runner may skip in dry-run).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List


@dataclass
class AcceptanceStep:
    id: str
    kind: str
    command: str | None = None
    description: str = ""


_PROFILE_STEPS: dict[str, List[AcceptanceStep]] = {
    "build_only": [
        AcceptanceStep("npm_api_build", "shell", "cd api && npm run build", "API tsc + copy-assets"),
    ],
    "api_health": [
        AcceptanceStep("npm_api_build", "shell", "cd api && npm run build", "API build"),
        AcceptanceStep("curl_health", "shell", "curl -sf http://127.0.0.1:3000/health", "Health JSON"),
    ],
    "smoke_min": [
        AcceptanceStep("npm_api_build", "shell", "cd api && npm run build", "API build"),
        AcceptanceStep("curl_health", "shell", "curl -sf http://127.0.0.1:3000/health", "Health"),
        AcceptanceStep("smoke_placeholder", "note", None, "Wire repo smoke script when present"),
    ],
    "route_regression": [
        AcceptanceStep("npm_api_build", "shell", "cd api && npm run build", "API build"),
        AcceptanceStep("curl_health", "shell", "curl -sf http://127.0.0.1:3000/health", "Health"),
        AcceptanceStep("route_regression", "note", None, "Route-level regression harness (project-specific)"),
    ],
    "client_build": [
        AcceptanceStep("client_vite", "shell", "cd client && npx vite build", "Client production build"),
    ],
    "full_acceptance": [
        AcceptanceStep("npm_api_build", "shell", "cd api && npm run build", "API build"),
        AcceptanceStep("client_vite", "shell", "cd client && npx vite build", "Client build"),
        AcceptanceStep("curl_health", "shell", "curl -sf http://127.0.0.1:3000/health", "Health"),
        AcceptanceStep("full_acceptance_scripts", "note", None, "api/scripts acceptance when configured"),
    ],
}


def select_acceptance_steps(profile: str) -> List[AcceptanceStep]:
    if profile not in _PROFILE_STEPS:
        raise ValueError(f"Unknown acceptanceProfile: {profile}")
    return list(_PROFILE_STEPS[profile])


def profile_to_dict_list(profile: str) -> List[dict[str, Any]]:
    return [
        {"id": s.id, "kind": s.kind, "command": s.command, "description": s.description}
        for s in select_acceptance_steps(profile)
    ]
