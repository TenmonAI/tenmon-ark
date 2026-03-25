#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
後方互換: TENMON_CHAT_REFACTOR_AUTONOMOUS_RUNNER_V1 カード名。
canonical は chat_refactor_os_runner_v1.py（BRANDING_AUTONOMOUS）。
"""
from __future__ import annotations

from chat_refactor_os_runner_v1 import BRANDING_AUTONOMOUS, cmd_run, parse_args


def main() -> int:
    ns = parse_args()
    ns.write_repo = not ns.no_write_repo
    return cmd_run(ns, BRANDING_AUTONOMOUS)


if __name__ == "__main__":
    raise SystemExit(main())
