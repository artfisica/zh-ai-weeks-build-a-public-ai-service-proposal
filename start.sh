#!/usr/bin/env bash
# One-shot start for the Apertus proxy inside a GitHub Codespace.
# Runs automatically when the Codespace starts (see .devcontainer/devcontainer.json).
# Safe to run again at any time:   bash proxy/start.sh
#
# What it does, in order:
#   1. pulls the latest repository content (fast-forward only),
#   2. starts proxy/server.js in the background if it is not already running,
#   3. waits for GET /health locally,
#   4. makes port 8787 public (via GitHub CLI when it can; otherwise tells you the one click),
#   5. writes the public proxy URL into proxy-url.json and pushes it, so the page on GitHub Pages
#      finds the proxy without anyone editing index.html,
#   6. prints the status.
#
# Configuration comes from Codespaces secrets: APERTUS_API_KEY (required), UPSTREAM_BASE and
# UPSTREAM_MODEL (required unless already set in proxy/proxy.config.json), DEMO_TOKEN (optional).

set -u
cd "$(dirname "$0")/.." || exit 1
LOG=/tmp/public-ai-commune-proxy.log
PORT="${PORT:-8787}"

echo "== Apertus proxy start =="

# 1. latest content
git pull --ff-only --quiet 2>/dev/null && echo "repository: up to date" || echo "repository: pull skipped"

# 2. server
# always restart, so a pulled server.js or proxy.config.json is what actually runs
if pgrep -f "node proxy/server.js" >/dev/null 2>&1; then pkill -f "node proxy/server.js"; sleep 1; echo "server: restarted"; else echo "server: started"; fi
nohup node proxy/server.js > "$LOG" 2>&1 < /dev/null &

# 3. health
READY=""
for i in $(seq 1 15); do
  H=$(curl -s "http://127.0.0.1:${PORT}/health" 2>/dev/null || true)
  if [ -n "$H" ]; then READY=$(printf '%s' "$H" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.ready?"yes":"no:"+(j.missing||[]).join(", "))}catch(e){console.log("unreadable")}})'); break; fi
  sleep 1
done
if [ "$READY" = "yes" ]; then
  echo "ready: yes"
else
  echo "ready: NO ${READY#no:}"
  echo "   Fix: profile picture → Settings → Codespaces → Secrets. Needed: APERTUS_API_KEY, UPSTREAM_BASE, UPSTREAM_MODEL,"
  echo "   each with this repository ticked under 'Repository access'. Then stop and reopen the Codespace (secrets load at start)."
fi

# 4. public port + 5. URL
if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  if command -v gh >/dev/null 2>&1 && gh codespace ports visibility "${PORT}:public" -c "$CODESPACE_NAME" >/dev/null 2>&1; then
    echo "port ${PORT}: public"
  else
    echo "port ${PORT}: could not set automatically. One click: Ports tab → row ${PORT} → right-click → Port Visibility → Public."
  fi
  echo "proxy url: $URL"
  echo "health:    $URL/health"
  NEW="{\"url\": \"$URL\"}"
  if [ ! -f proxy-url.json ] || [ "$(cat proxy-url.json)" != "$NEW" ]; then
    printf '%s\n' "$NEW" > proxy-url.json
    git config user.email >/dev/null 2>&1 || git config user.email "${GITHUB_USER:-codespace}@users.noreply.github.com"
    git config user.name  >/dev/null 2>&1 || git config user.name  "${GITHUB_USER:-codespace}"
    if git add proxy-url.json && git commit -q -m "Proxy URL for GitHub Pages" && git push -q 2>/dev/null; then
      echo "pages:     proxy-url.json pushed — the live page will connect by itself in a minute or two"
    else
      echo "pages:     could not push proxy-url.json; paste the proxy url into the page's connection panel instead"
    fi
  else
    echo "pages:     proxy-url.json already current"
  fi
else
  echo "not in a Codespace: proxy is on http://127.0.0.1:${PORT}"
fi
echo "log:       $LOG"
