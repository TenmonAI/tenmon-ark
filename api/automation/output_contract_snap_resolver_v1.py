#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Path resolver for OS output artifacts (snap v1).
探索順: 明示 env → api/automation/out/<subdir> → /var/log/tenmon/card_*/*/file → /var/log/tenmon/card
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from output_contract_registry_v1 import CANONICAL_SYSTEMS, worldclass_seal_search_roots


@dataclass
class SnapResolution:
    """単一ファイルの解決結果。"""

    filename: str
    system_id: str
    path: Optional[Path]
    source_resolved_from: str
    emission_state: str
    contract_ok: bool
    contract_detail: str
    alternate_hits: List[Dict[str, Any]] = field(default_factory=list)


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return None


def _check_json_keys(obj: Any, keys: List[str]) -> Tuple[bool, str]:
    if not keys:
        return True, "ok"
    if not isinstance(obj, dict):
        return False, "not_a_json_object"
    missing = [k for k in keys if k not in obj]
    if missing:
        return False, f"missing_keys:{','.join(missing)}"
    return True, "ok"


def _api_root_from(api_root: Optional[Path]) -> Path:
    if api_root is not None:
        return api_root.resolve()
    return Path(__file__).resolve().parents[1]


def _find_in_var_log(filename: str) -> List[Path]:
    base = Path("/var/log/tenmon")
    if not base.is_dir():
        return []
    hits: List[Path] = []
    try:
        for card_dir in base.glob("card_*"):
            if not card_dir.is_dir():
                continue
            for ts_dir in card_dir.iterdir():
                if not ts_dir.is_dir():
                    continue
                p = ts_dir / filename
                if p.is_file():
                    hits.append(p)
        latest = base / "card"
        if latest.is_symlink() or latest.is_dir():
            try:
                lp = latest / filename
                if lp.is_file():
                    hits.append(lp)
            except Exception:
                pass
    except Exception:
        pass
    return sorted(hits, key=lambda p: p.stat().st_mtime, reverse=True)


def _find_worldclass_seal_in_out(api: Path, filename: str) -> List[Tuple[str, Path]]:
    """automation/out 以下を探索（false negative 減少）。明示ルート優先、rglob は新しい順に上限。"""
    out = api / "automation" / "out"
    found: List[Tuple[str, Path]] = []
    if not out.is_dir():
        return found
    for root in worldclass_seal_search_roots(api):
        p = root / filename
        if p.is_file():
            found.append((f"out_scan:{root.relative_to(api)}", p))
    try:
        rg: List[Path] = []
        for p in out.rglob(filename):
            if p.is_file() and "node_modules" not in str(p):
                rg.append(p)
        rg.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        for p in rg[:40]:
            rel = str(p.relative_to(api))
            found.append((f"out_rglob:{rel}", p))
    except Exception:
        pass
    seen: set = set()
    uniq: List[Tuple[str, Path]] = []
    for src, p in found:
        k = str(p.resolve())
        if k not in seen:
            seen.add(k)
            uniq.append((src, p))
    return uniq


def resolve_artifact(
    system_id: str,
    filename: str,
    required_json_keys: List[str],
    api_root: Optional[Path] = None,
    optional: bool = False,
) -> SnapResolution:
    api = _api_root_from(api_root)
    spec = CANONICAL_SYSTEMS.get(system_id)
    if not spec:
        return SnapResolution(
            filename=filename,
            system_id=system_id,
            path=None,
            source_resolved_from="none",
            emission_state="not_emitted",
            contract_ok=False,
            contract_detail="unknown_system",
        )

    alternates: List[Dict[str, Any]] = []
    candidates: List[Tuple[str, Path]] = []
    seen_paths: set = set()

    def addc(src: str, p: Path) -> None:
        k = str(p.resolve())
        if k in seen_paths:
            return
        seen_paths.add(k)
        candidates.append((src, p))

    # 1) env
    env_name = spec.get("env_out_dir") or ""
    if env_name:
        ev = os.environ.get(env_name)
        if ev:
            ep = Path(ev) / filename
            if ep.is_file():
                addc(f"env:{env_name}", ep)

    # 2) out subdir
    sub = spec.get("out_subdir") or ""
    if sub:
        op = api / "automation" / "out" / sub / filename
        if op.is_file():
            addc(f"out_dir:automation/out/{sub}/{filename}", op)

    # worldclass_seal: 複数ルート
    if system_id == "worldclass_seal":
        for src, p in _find_worldclass_seal_in_out(api, filename):
            addc(src, p)

    # 3) var log
    for p in _find_in_var_log(filename):
        alternates.append({"kind": "var_log", "path": str(p)})
        addc(f"var_log:{p}", p)

    if not candidates:
        if optional:
            return SnapResolution(
                filename=filename,
                system_id=system_id,
                path=None,
                source_resolved_from="none",
                emission_state="not_emitted",
                contract_ok=True,
                contract_detail="optional_absent",
                alternate_hits=alternates,
            )
        return SnapResolution(
            filename=filename,
            system_id=system_id,
            path=None,
            source_resolved_from="none",
            emission_state="not_emitted",
            contract_ok=False,
            contract_detail="no_file_found",
            alternate_hits=alternates,
        )

    # 優先: env > out_dir > out_scan/rglob > var_log、同順位は mtime 新しい方
    def sort_key(c: Tuple[str, Path]) -> Tuple[int, float]:
        s = c[0]
        if s.startswith("env:"):
            r = 0
        elif s.startswith("out_dir:"):
            r = 1
        elif s.startswith("out_scan:") or s.startswith("out_rglob:"):
            r = 2
        elif s.startswith("var_log:"):
            r = 3
        else:
            r = 4
        try:
            mt = -c[1].stat().st_mtime if c[1].is_file() else 0.0
        except Exception:
            mt = 0.0
        return (r, mt)

    candidates.sort(key=sort_key)
    best_src, best_path = candidates[0]

    out_like = [c for c in candidates if c[0].startswith(("env:", "out_dir:", "out_scan:", "out_rglob:"))]
    log_like = [c for c in candidates if c[0].startswith("var_log:")]
    if out_like and log_like:
        emission = "emitted_both_out_and_log"
    elif out_like:
        emission = "emitted_in_out_dir"
    else:
        emission = "emitted_in_log_only"

    obj = _read_json(best_path)
    if filename.endswith(".json"):
        if obj is None:
            return SnapResolution(
                filename=filename,
                system_id=system_id,
                path=best_path,
                source_resolved_from=best_src,
                emission_state="emitted_but_contract_mismatch",
                contract_ok=False,
                contract_detail="invalid_or_empty_json",
                alternate_hits=alternates,
            )
        ok, detail = _check_json_keys(obj, required_json_keys)
        if not ok:
            return SnapResolution(
                filename=filename,
                system_id=system_id,
                path=best_path,
                source_resolved_from=best_src,
                emission_state="emitted_but_contract_mismatch",
                contract_ok=False,
                contract_detail=detail,
                alternate_hits=alternates,
            )

    return SnapResolution(
        filename=filename,
        system_id=system_id,
        path=best_path,
        source_resolved_from=best_src,
        emission_state=emission,
        contract_ok=True,
        contract_detail="ok",
        alternate_hits=alternates,
    )
