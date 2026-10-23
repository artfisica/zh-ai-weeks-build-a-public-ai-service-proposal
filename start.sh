#!/usr/bin/env bash
# Compatibility entry point; use the maintained Codespaces startup script.
exec bash "$(dirname "$0")/proxy/start.sh" "$@"
