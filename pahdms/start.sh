#!/usr/bin/env bash
# Starts PAHDMS locally on http://localhost:8000
set -e
cd "$(dirname "$0")"

open_browser() {
  URL="http://localhost:8000/login.html"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 &
  fi
}

echo "Starting PAHDMS locally..."
if command -v python3 >/dev/null 2>&1; then
  open_browser
  python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  open_browser
  python -m http.server 8000
elif command -v npx >/dev/null 2>&1; then
  open_browser
  npx --yes serve -l 8000 .
else
  echo "Could not find Python or Node/npx on this computer."
  echo "Please install Python (https://python.org) or Node.js (https://nodejs.org) and run this script again."
  exit 1
fi
