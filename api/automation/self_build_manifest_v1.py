#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SELF_BUILD_OS_PARENT_01 — repo / automation / scripts / constitution /
generated_cursor_apply を横断観測し、自己構築の唯一起点 manifest を生成（read-only）
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

VERSION = 1
CARD = "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_VPS_V1"
FAIL_NEXT = "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_RETRY_CURSOR_AUTO_V1"

SKIP_DIR_NAMES = {"__pycache__", "node_modules", "dist", ".git", "out"}


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def repo_root() -> Path:
    return api_root().parent


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def rel_to_repo(p: Path, root: Path) -> str:
    try:
        return p.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(p)


def classify_group(rel_posix: str) -> str:
    """5 分類: automation_scripts | constitution_docs | generated_cursor_cards | runtime_verification_scripts | learning_seed_seal_scorer"""
    low = rel_posix.replace("\\", "/").lower()
    if "api/docs/constitution/" in low:
        return "constitution_docs"
    if "generated_cursor_apply/" in low:
        return "generated_cursor_cards"
    if "api/scripts/" in low:
        return "runtime_verification_scripts"
    if "api/automation/" in low and low.endswith(".py"):
        base = Path(rel_posix).name.lower()
        if re.search(
            r"learning|kokuzo|kg0|kg1|kg2|seed|seal|scorer|ledger|governor|forensic|orchestrat|acceptance|observation|priority_queue|blocker_taxonomy|integration_seal|self_repair|vps_acceptance|cursor_autobuild|remote_cursor",
            base,
        ):
            return "learning_seed_seal_scorer"
        return "automation_scripts"
    return "automation_scripts"


def role_guess(rel_posix: str, group: str) -> str:
    name = Path(rel_posix).name
    if group == "constitution_docs":
        return "constitution_policy_doc"
    if group == "generated_cursor_cards":
        return "generated_cursor_apply_card"
    if group == "runtime_verification_scripts":
        return "shell_runtime_or_probe"
    if group == "learning_seed_seal_scorer":
        return "learning_or_seal_pipeline"
    if name.endswith("_v1.py") or name.endswith("_v2.py"):
        return "automation_python_module"
    return "automation_asset"


def status_guess(p: Path) -> str:
    if not p.is_file():
        return "missing"
    try:
        sz = p.stat().st_size
    except OSError:
        return "unreadable"
    if sz == 0:
        return "empty"
    if sz < 400:
        return "minimal_stub?"
    return "present"


def dependency_guess_py(p: Path) -> List[str]:
    if not p.suffix == ".py":
        return []
    try:
        text = p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    mods: Set[str] = set()
    for line in text.splitlines()[:200]:
        m = re.match(r"^from\s+([\w.]+)\s+import", line)
        if m:
            root_mod = m.group(1).split(".")[0]
            if root_mod not in {"__future__", "typing", "pathlib", "os", "sys", "json", "re", "argparse", "subprocess"}:
                mods.add(root_mod)
        m2 = re.match(r"^import\s+([\w.]+)", line)
        if m2:
            root_mod = m2.group(1).split(".")[0]
            if root_mod not in {"os", "sys", "json", "re", "argparse", "subprocess", "pathlib"}:
                mods.add(root_mod)
    return sorted(mods)[:24]


def stable_id(rel_posix: str) -> str:
    h = hashlib.sha256(rel_posix.encode("utf-8")).hexdigest()[:10]
    slug = re.sub(r"[^\w]+", "_", Path(rel_posix).stem)[:40]
    return f"{slug}_{h}"


def collect_files(root: Path, patterns: List[str], root_label: Path) -> List[Path]:
    out: List[Path] = []
    if not root.is_dir():
        return out
    for pat in patterns:
        for p in root.rglob(pat):
            if any(part in SKIP_DIR_NAMES for part in p.parts):
                continue
            if p.is_file():
                out.append(p)
    return sorted(set(out), key=lambda x: str(x))


def build() -> Dict[str, Any]:
    api = api_root()
    repo = repo_root()
    gen_at = utc_now_iso()

    roots = {
        "repo_root": str(repo),
        "api_root": str(api),
        "automation": str(api / "automation"),
        "scripts": str(api / "scripts"),
        "constitution": str(api / "docs" / "constitution"),
        "generated_cursor_apply": str(api / "automation" / "generated_cursor_apply"),
    }

    paths: List[Path] = []
    paths += collect_files(api / "automation", ["*.py"], api)
    paths += collect_files(api / "scripts", ["*.sh", "*.py"], api)
    paths += collect_files(api / "docs" / "constitution", ["*.md"], api)
    paths += collect_files(api / "automation" / "generated_cursor_apply", ["*.md"], api)

    entries: List[Dict[str, Any]] = []
    groups: Dict[str, List[Dict[str, Any]]] = {
        "automation_scripts": [],
        "constitution_docs": [],
        "generated_cursor_cards": [],
        "runtime_verification_scripts": [],
        "learning_seed_seal_scorer": [],
    }

    for p in paths:
        rel = rel_to_repo(p, repo)
        grp = classify_group(rel)
        ent = {
            "id": stable_id(rel),
            "exists": p.is_file(),
            "file_path": rel,
            "group": grp,
            "role": role_guess(rel, grp),
            "status_guess": status_guess(p),
            "dependency_guess": dependency_guess_py(p) if p.suffix == ".py" else [],
        }
        entries.append(ent)
        groups[grp].append({"id": ent["id"], "file_path": rel, "status_guess": ent["status_guess"]})

    # 4 群の最低要件（+ learning 系は第5群）を明示
    manifest = {
        "version": VERSION,
        "card": CARD,
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "generatedAt": gen_at,
        "policy": "read_only_observation",
        "roots_observed": roots,
        "group_definitions": {
            "automation_scripts": "api/automation の一般 Python モジュール",
            "constitution_docs": "api/docs/constitution の憲法・ポリシー MD",
            "generated_cursor_cards": "api/automation/generated_cursor_apply の生成カード MD",
            "runtime_verification_scripts": "api/scripts のシェル・補助スクリプト全般",
            "learning_seed_seal_scorer": "学習・seed・seal・scorer・観測・acceptance・統合系（ファイル名ヒューリスティック）",
        },
        "counts_by_group": {k: len(v) for k, v in groups.items()},
        "groups": groups,
        "entries": entries,
        "entry_count": len(entries),
    }
    return manifest


def write_summary_md(manifest: Dict[str, Any], out: Path) -> None:
    lines = [
        "# self_build_manifest_summary",
        "",
        f"- generatedAt: {manifest.get('generatedAt')}",
        f"- card: `{manifest.get('card')}`",
        f"- total entries: **{manifest.get('entry_count')}**",
        "",
        "## Counts by group",
        "",
    ]
    for g, c in sorted((manifest.get("counts_by_group") or {}).items()):
        lines.append(f"- **{g}**: {c}")
    lines.extend(["", "## Sample paths (first 12 per group)", ""])
    groups = manifest.get("groups") or {}
    for g in sorted(groups.keys()):
        lines.append(f"### {g}")
        for row in (groups[g] or [])[:12]:
            lines.append(f"- `{row.get('file_path')}` ({row.get('status_guess')})")
        lines.append("")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-json", type=str, default="")
    ap.add_argument("--out-md", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    body = build()
    jtext = json.dumps(body, ensure_ascii=False, indent=2) + "\n"

    out_j = Path(args.out_json) if args.out_json else auto / "self_build_manifest.json"
    out_j.write_text(jtext, encoding="utf-8")

    out_m = Path(args.out_md) if args.out_md else auto / "self_build_manifest_summary.md"
    write_summary_md(body, out_m)

    (auto / "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_VPS_V1").write_text(
        f"{VPS_CARD}\n{body['generatedAt']}\nentry_count={body['entry_count']}\n",
        encoding="utf-8",
    )

    retry = auto / "generated_cursor_apply" / "TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_RETRY_CURSOR_AUTO_V1.md"
    retry.parent.mkdir(parents=True, exist_ok=True)
    retry.write_text(
        "\n".join(
            [
                f"# {FAIL_NEXT}",
                "",
                f"親カード: `{CARD}`",
                "",
                "## トリガー",
                "",
                "- `self_build_manifest.json` が欠落 / 破損",
                "- 4+1 群のいずれかが count 0（観測ルート誤り）",
                "",
                "## 手順",
                "",
                "1. `api/scripts/self_build_manifest_v1.sh` を再実行。",
                "2. `api/docs/constitution` と `generated_cursor_apply` のパスを確認。",
                "3. `SKIP_DIR_NAMES` に誤って除外していないか `self_build_manifest_v1.py` を確認。",
                "",
                "## 参照",
                "",
                f"- `api/docs/constitution/TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_CURSOR_AUTO_V1.md`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    if args.stdout_json:
        print(jtext, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
