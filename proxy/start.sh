#!/usr/bin/env bash
# Start the checked-out proxy; publishing its URL is an explicit operator action.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8787}"
LOG="${TMPDIR:-/tmp}/public-ai-commune-proxy.log"
PID_FILE="$ROOT/proxy/.proxy.pid"
LOCK="$ROOT/proxy/.start-lock"
mkdir "$LOCK" 2>/dev/null || { echo 'Another startup is in progress; inspect proxy/.start-lock if stale.' >&2; exit 1; }
trap 'rmdir "$LOCK"' EXIT
if [ -f "$PID_FILE" ]; then
  PREVIOUS="$(cat "$PID_FILE")"
  case "$PREVIOUS" in ''|*[!0-9]*) echo 'Invalid proxy PID file; inspect it before restarting.' >&2; exit 1;; esac
  COMMAND="$(ps -p "$PREVIOUS" -o command= 2>/dev/null || true)"
  if [ "$COMMAND" = "node $ROOT/proxy/server.js" ]; then
    kill "$PREVIOUS"
    for _ in $(seq 1 6); do kill -0 "$PREVIOUS" 2>/dev/null || break; sleep 1; done
    if kill -0 "$PREVIOUS" 2>/dev/null; then echo 'Previous proxy has not stopped; inspect its process.' >&2; exit 1; fi
  elif [ -n "$COMMAND" ]; then echo 'PID belongs to another process; refusing to stop it.' >&2; exit 1
  fi
fi
nohup node "$ROOT/proxy/server.js" > "$LOG" 2>&1 < /dev/null &
PROXY_PID=$!
printf '%s\n' "$PROXY_PID" > "$PID_FILE"
READY=no
for _ in $(seq 1 15); do
  kill -0 "$PROXY_PID" 2>/dev/null || { cat "$LOG"; exit 1; }
  if curl --fail --silent --max-time 2 "http://127.0.0.1:${PORT}/health" | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{try{process.exit((JSON.parse(s).ready && JSON.parse(s).instance===Number(process.argv[1]))?0:1)}catch(_){process.exit(1)}})' "$PROXY_PID"; then READY=yes; break; fi
  sleep 1
done
if [ "$READY" != yes ]; then echo "Proxy not ready; inspect $LOG and Codespaces secrets." >&2; exit 1; fi
echo "ready: yes · PID $PROXY_PID · log: $LOG"
if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo "proxy url: $URL"
  echo "Set port $PORT visibility to Public in the Ports panel when public access is intended."
  if [ "${PUBLISH_PROXY_URL:-0}" = 1 ]; then
    git diff --quiet && git diff --cached --quiet || { echo "Commit or set aside other changes before publishing." >&2; exit 1; }
    gh codespace ports visibility "${PORT}:public" -c "$CODESPACE_NAME"
    node -e 'require("fs").writeFileSync("proxy-url.json",JSON.stringify({url:process.argv[1]})+"\n")' "$URL"
    git add proxy-url.json
    if ! git diff --cached --quiet -- proxy-url.json; then git commit --only proxy-url.json -m 'Update public demo proxy URL'; git push; fi
  fi
fi
