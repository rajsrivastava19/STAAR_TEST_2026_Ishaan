#!/bin/bash
cd "$(dirname "$0")" || exit

echo "========================================="
echo "   Restarting Math STAAR App Services    "
echo "========================================="

echo "[1/4] Gracefully clearing active ports 3001 and 5173..."
# Send graceful shutdown signals to any process blocking our app
lsof -ti:3001 | xargs kill -15 2>/dev/null || true
lsof -ti:5173 | xargs kill -15 2>/dev/null || true

# Give them up to 3 seconds to save data and exit
sleep 2

# Force kill any stubborn zombies
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -9 -f "npm run dev:server" 2>/dev/null || true
pkill -9 -f "npm run dev:client" 2>/dev/null || true

echo "[2/4] Booting Backend APIs..."
npm run dev:server > server.log 2>&1 &

echo "[3/4] Compiling Frontend DOM..."
npm run dev:client > client.log 2>&1 &

echo "Waiting for Vite builder to lock in..."
sleep 4

echo "[4/4] Launching Browser..."
open http://localhost:5173

echo "========================================="
echo "        Safari Suite Boot Sequence       "
echo "               SUCCESSFUL                "
echo "========================================="
echo "The servers are actively running in the background."
echo "You can close this specific Terminal window safely!"
