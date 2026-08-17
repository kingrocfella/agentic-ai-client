# Agentic AI client (Next.js) — developer commands.
# `make up` builds and runs the web app in Docker.
#
# This app is the browser-facing front end for the Agentic AI API. Both join the
# private `agentic-ai` network, so the API is reached by service DNS and neither
# side publishes anything to the LAN. Start the API first (`make up` in
# ../agentic-ai) — this compose project does not manage it.

.PHONY: up down restart logs ps rebuild sh check-env init-env ensure-app-network \
	install-dev dev build lint type-check test test-coverage check clean help

COMPOSE = docker compose --env-file .env
LOG_TAIL ?= 200

help:
	@echo "Stack:   make up | down | restart | logs | ps | rebuild | sh"
	@echo "Env:     make check-env | init-env"
	@echo "Network: make ensure-app-network   (shared with the Agentic AI API)"
	@echo "Quality: make lint | type-check | test | test-coverage | check"
	@echo "         make install-dev | dev | build | clean"

# ---------------------------------------------------------------------------
# Stack
# ---------------------------------------------------------------------------

## Create the private network this app shares with the Agentic AI API.
## Idempotent; ../agentic-ai's Makefile creates the same network.
ensure-app-network:
	@docker network inspect agentic-ai >/dev/null 2>&1 || \
		docker network create --driver bridge --internal agentic-ai >/dev/null

## Start the web app in the background (builds if needed).
up: ensure-app-network
	chmod 600 .env
	$(MAKE) check-env
	$(COMPOSE) up -d --build

## Stop and remove the container.
down:
	$(COMPOSE) down

## Restart the web container.
restart:
	$(COMPOSE) restart nextjs

## Follow web logs. Override history with LOG_TAIL=500 or LOG_TAIL=all.
logs:
	$(COMPOSE) logs --follow --tail=$(LOG_TAIL) nextjs

## Show container status.
ps:
	$(COMPOSE) ps

## Rebuild the web image from scratch (no cache).
rebuild:
	$(COMPOSE) build --no-cache nextjs

## Open a shell in the web container.
sh:
	$(COMPOSE) exec nextjs sh

# ---------------------------------------------------------------------------
# Env
# ---------------------------------------------------------------------------

## .env is the only environment file allowed anywhere in this repo, it must
## be mode 0600, and it must carry exactly one entry for every key init-env
## emits — so a variable the code starts reading can never be silently absent.
check-env:
	@test -f .env || (echo "check-env: .env is missing; run 'make init-env'" >&2; exit 1)
	@extra=$$(find . -name '.env' -o -name '.env.*' 2>/dev/null \
		| grep -Ev '(^|/)(node_modules|\.git|\.venv|venv|\.next|\.claude)/' \
		| grep -v '^\./.env$$' || true); \
	if [ -n "$$extra" ]; then \
		echo "check-env: only .env is allowed; remove:" >&2; echo "$$extra" | sed 's/^/  /' >&2; exit 1; \
	fi
	@mode=$$(stat -c '%a' .env 2>/dev/null || stat -f '%Lp' .env); \
	if [ "$$mode" != "600" ]; then \
		echo "check-env: .env permissions are $$mode; expected 600" >&2; exit 1; \
	fi
	@bad=$$(grep -oE "^[[:space:]]+['\"][A-Z][A-Z0-9_]*=" Makefile | grep -oE "[A-Z][A-Z0-9_]*" | sort -u \
		| while read -r key; do \
			[ "$$(grep -c "^$$key=" .env)" -eq 1 ] || echo "  $$key"; \
		done); \
	if [ -n "$$bad" ]; then \
		echo "check-env: .env needs exactly one entry per init-env key; missing or duplicated:" >&2; \
		echo "$$bad" >&2; exit 1; \
	fi
	@echo "check-env: clean — .env is complete and mode 0600"

## Create the one canonical .env with safe local defaults (only if missing).
## Every value here is server-side only. Nothing in this file reaches a
## browser — a NEXT_PUBLIC_ prefix would put it in the bundle, so never add one.
init-env:
	@if [ -f .env ]; then \
		echo "init-env: .env already exists; leaving it untouched"; \
	else \
		printf '%s\n' \
			'NODE_ENV=production' \
			'AGENT_API_BASE_URL=http://app:9000' \
			'WEB_HOST_PORT=3000' \
			'FORCE_SECURE_COOKIES=true' \
			'COOKIE_AGE_DAYS=7' > .env; \
		chmod 600 .env; \
		echo "init-env: wrote .env with safe local defaults"; \
	fi

# ---------------------------------------------------------------------------
# Quality / tests
# ---------------------------------------------------------------------------

install-dev:
	npm ci

## Run the Next.js dev server on the host (not in Docker).
dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

type-check:
	npx tsc --noEmit

test:
	npm test

test-coverage:
	npm run test:coverage

check: lint type-check test
	@echo "All checks passed!"

clean:
	rm -rf .next out coverage node_modules/.cache
