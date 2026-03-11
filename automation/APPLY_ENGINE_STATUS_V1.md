# APPLY_ENGINE_STATUS_V1

## current mode
- health lane: enabled
- apply lane: UNWIRED / skip-disabled official

## observed facts
- TENMON_AI_APPLY_CMD is not set
- tenmon-auto-runner.service succeeds in health-only mode
- tenmon-auto-runner.timer remains active
- current release freeze already passed without apply lane

## policy
- Do not fail the runner merely because apply engine is unset
- Keep build / restart / audit / probe / freeze active
- Keep apply lane disabled until a real headless patch engine is chosen

## apply engine requirements
- must be headless
- must be able to apply patches non-interactively
- must be callable from systemd env / command
- cursor remote-cli is not treated as the apply engine

## next step
- compare actual apply engine candidates
- wire only after a single-engine decision
