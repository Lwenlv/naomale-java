#!/usr/bin/env bash
set -euo pipefail

# 闹麻了点单 · CentOS / Linux 停止脚本
# 用法：./stop.sh

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$APP_DIR/naomale-java.pid"
JAR_NAME="naomale-java.jar"

if [[ ! -f "$PID_FILE" ]]; then
  echo "闹麻了点单未在运行（没有找到 PID 文件）。"
  exit 0
fi

APP_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "$APP_PID" ]]; then
  rm -f "$PID_FILE"
  echo "PID 文件为空，已清理。"
  exit 0
fi

if ! kill -0 "$APP_PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "进程 $APP_PID 已经不存在，已清理 PID 文件。"
  exit 0
fi

# 防止 PID 被系统复用后误杀其他进程
if [[ -r "/proc/$APP_PID/cmdline" ]]; then
  CMDLINE="$(tr '\0' ' ' < "/proc/$APP_PID/cmdline")"
else
  CMDLINE="$(ps -p "$APP_PID" -o args= 2>/dev/null || true)"
fi
if [[ "$CMDLINE" != *"$JAR_NAME"* ]]; then
  echo "PID $APP_PID 不是 naomale-java 进程，已停止操作。"
  echo "如确认需要清理，请手动删除：$PID_FILE"
  exit 1
fi

echo "正在停止 naomale-java（PID=$APP_PID）..."
kill -TERM "$APP_PID" 2>/dev/null || true

for _ in $(seq 1 30); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "已停止。"
    exit 0
  fi
  sleep 1
done

echo "30 秒内未退出，执行强制停止 ..."
kill -KILL "$APP_PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "已强制停止。"
