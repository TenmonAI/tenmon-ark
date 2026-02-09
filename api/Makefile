.PHONY: deploy health

deploy:
	bash scripts/deploy_live.sh

health:
	curl -fsS http://127.0.0.1:3000/api/audit | jq -r '.ok,.readiness.stage' || true
