#!/usr/bin/env bash
#
# Termux supervisor untuk gmailforwarder.
#
# Android bisa membunuh proses node kapan saja (low memory killer,
# battery saver, atau swipe away dari recent apps). Node tidak punya
# cara untuk melawan itu, jadi shell loop ini yang menghidupkan
# kembali prosesnya.
#
# Pakai:  bash scripts/termux-run.sh
# Stop:   Ctrl+C, atau tmux kill-session -t gmailforwarder

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

LOG_DIR="storage/logs"
SUPERVISOR_LOG="$LOG_DIR/supervisor.log"
PID_FILE="$LOG_DIR/supervisor.pid"
RESTART_DELAY="${RESTART_DELAY:-10}"
BRAKE_THRESHOLD="${BRAKE_THRESHOLD:-5}"
BRAKE_WINDOW="${BRAKE_WINDOW:-300}"
BRAKE_COOLDOWN="${BRAKE_COOLDOWN:-300}"

mkdir -p "$LOG_DIR"

log() {
    printf '[%s] [GUARD] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" \
        | tee -a "$SUPERVISOR_LOG"
}

node_pid=""
running=1

shutdown() {

    log "Stopping supervisor..."

    if [ -n "$node_pid" ] && kill -0 "$node_pid" 2>/dev/null; then

        log "Sending SIGTERM to node (PID $node_pid)..."

        kill -TERM "$node_pid" 2>/dev/null

        for _ in $(seq 1 10); do
            kill -0 "$node_pid" 2>/dev/null || break
            sleep 1
        done

        if kill -0 "$node_pid" 2>/dev/null; then
            log "Node did not exit, force killing."
            kill -9 "$node_pid" 2>/dev/null
        fi

    fi

    termux-wake-unlock 2>/dev/null

    rm -f "$PID_FILE"

    log "Supervisor stopped."

}

trap 'running=0' INT TERM

if command -v termux-wake-lock >/dev/null 2>&1; then

    if termux-wake-lock 2>/dev/null; then
        log "Wake lock acquired (CPU will stay awake)."
    else
        log "WARNING: could not acquire wake lock."
    fi

else
    log "WARNING: termux-wake-lock not found. Install the Termux:API app."
fi

if [ ! -f .env ]; then

    log "ERROR: .env not found in $(pwd)"

    termux-wake-unlock 2>/dev/null

    exit 1

fi

log "Starting supervisor in $(pwd)"
log "Restart delay: ${RESTART_DELAY}s"

echo $$ > "$PID_FILE"

crash_times=()

while [ "$running" = 1 ]; do

    node src/index.js >> "$SUPERVISOR_LOG" 2>&1 &

    node_pid=$!

    log "node started (PID $node_pid)"

    wait "$node_pid"

    exit_code=$?

    node_pid=""

    [ "$running" = 1 ] || break

    now=$(date +%s)

    crash_times=(
        $(printf '%s\n' "${crash_times[@]:-}" \
            | awk -v now="$now" -v window="$BRAKE_WINDOW" '$1 > now - window')
    )

    crash_times+=("$now")

    count=${#crash_times[@]}

    if [ "$count" -ge "$BRAKE_THRESHOLD" ]; then

        log "node exited $count times within ${BRAKE_WINDOW}s."
        log "Cooling down for ${BRAKE_COOLDOWN}s (probably bad config)."

        crash_times=()

        sleep "$BRAKE_COOLDOWN"

    else

        log "node exited with code $exit_code. Restarting in ${RESTART_DELAY}s."

        sleep "$RESTART_DELAY"

    fi

done

shutdown