# -*- coding: utf-8 -*-
"""
/etc/tenmon/llm.env を読んで os.environ に注入する。
python スクリプトの先頭で import するだけで有効になる。
"""
import os
from pathlib import Path

ENV_PATH = Path("/etc/tenmon/llm.env")

def load_llm_env() -> dict:
    loaded = {}
    if not ENV_PATH.exists():
        return loaded
    for line in ENV_PATH.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip()
        if k and k not in os.environ:
            os.environ[k] = v
            loaded[k] = "***"
    return loaded

load_llm_env()
