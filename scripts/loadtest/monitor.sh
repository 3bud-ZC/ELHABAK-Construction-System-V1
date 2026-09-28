#!/usr/bin/env bash
# Resource sampler for load tests on the VPS (run as root while run.mjs executes):
#   scripts/loadtest/monitor.sh <pm2-app-prefix> <database> <seconds> [interval]
#   scripts/loadtest/monitor.sh elhabak-staging elhabak_staging 180 2
# Prints one CSV line per sample, then peak/final summary lines:
#   time,api_rss_mb,api_cpu,web_rss_mb,web_cpu,db_connections,load1,mem_avail_mb,api_fds
set -euo pipefail
PREFIX="${1:?pm2 app prefix}"
DB="${2:?database}"
SECONDS_TOTAL="${3:-120}"
INTERVAL="${4:-2}"

pid_of() { su -s /bin/bash elhabak -c "pm2 pid $1" 2>/dev/null | tail -1; }
# utime+stime in clock ticks; CPU% is the delta between samples (not ps's lifetime average).
ticks() { awk '{print $14 + $15}' "/proc/$1/stat" 2>/dev/null || echo 0; }
HZ="$(getconf CLK_TCK)"
API_PID="$(pid_of "$PREFIX-api")"
WEB_PID="$(pid_of "$PREFIX-web")"
echo "time,api_rss_mb,api_cpu,web_rss_mb,web_cpu,db_connections,load1,mem_avail_mb,api_fds"
END=$(( $(date +%s) + SECONDS_TOTAL ))
PREV_API="$(ticks "$API_PID")"
PREV_WEB="$(ticks "$WEB_PID")"
while [ "$(date +%s)" -lt "$END" ]; do
  sleep "$INTERVAL"
  NOW_API="$(ticks "$API_PID")"
  NOW_WEB="$(ticks "$WEB_PID")"
  API_CPU=$(( (NOW_API - PREV_API) * 100 / (HZ * INTERVAL) ))
  WEB_CPU=$(( (NOW_WEB - PREV_WEB) * 100 / (HZ * INTERVAL) ))
  PREV_API="$NOW_API"
  PREV_WEB="$NOW_WEB"
  API_RSS="$(ps -o rss= -p "$API_PID" 2>/dev/null | tr -d ' ' || echo 0)"
  WEB_RSS="$(ps -o rss= -p "$WEB_PID" 2>/dev/null | tr -d ' ' || echo 0)"
  CONNS="$(sudo -u postgres psql -tAqc "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB'" 2>/dev/null || echo 0)"
  LOAD1="$(cut -d' ' -f1 /proc/loadavg)"
  AVAIL="$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)"
  FDS="$(ls /proc/"$API_PID"/fd 2>/dev/null | wc -l)"
  echo "$(date +%H:%M:%S),$((${API_RSS:-0} / 1024)),$API_CPU,$((${WEB_RSS:-0} / 1024)),$WEB_CPU,$CONNS,$LOAD1,$AVAIL,$FDS"
done
