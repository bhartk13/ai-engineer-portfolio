#!/bin/bash
cd "$(dirname "$0")"
PORT=4173
python3 -m http.server "$PORT" >/tmp/prepme-server.log 2>&1 &
server_pid=$!
sleep 0.4
open "http://127.0.0.1:${PORT}"
echo "PrepMe is at http://127.0.0.1:${PORT}"
echo "Leave this window open. Closing it stops the app."
wait "$server_pid"
