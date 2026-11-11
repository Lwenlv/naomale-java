#!/usr/bin/env bash
set -euo pipefail

# 闹麻了点单 · CentOS / Linux 启动脚本
# 发布目录只需要：naomale-java.jar、application.yml、start.sh、stop.sh
# 用法：./start.sh
# 可选环境变量：JAVA_HOME、JAVA_OPTS、SERVER_PORT

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

JAR="$APP_DIR/naomale-java.jar"
CONFIG="$APP_DIR/application.yml"
PID_FILE="$APP_DIR/naomale-java.pid"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/naomale-java.log"
PORT="${SERVER_PORT:-3000}"

if [[ ! -f "$JAR" ]]; then
  echo "错误：找不到 $JAR"
  echo "请确认发布目录中包含 naomale-java.jar。"
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "错误：找不到 $CONFIG"
  echo "请把 application.yml 和 naomale-java.jar 放在同一目录。"
  exit 1
fi

if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
  JAVA_BIN="$JAVA_HOME/bin/java"
elif command -v java >/dev/null 2>&1; then
  JAVA_BIN="$(command -v java)"
else
  echo "错误：未找到 Java，请安装 JDK 17+，或设置 JAVA_HOME。"
  exit 1
fi

JAVA_MAJOR="$("$JAVA_BIN" -version 2>&1 | sed -n '1s/.*version "\([0-9][0-9]*\).*/\1/p')"
if [[ -n "$JAVA_MAJOR" ]] && (( JAVA_MAJOR < 17 )); then
  echo "错误：当前 Java 版本为 $JAVA_MAJOR，至少需要 JDK 17。"
  echo "请安装 JDK 17，或设置 JAVA_HOME 指向 JDK 17。"
  exit 1
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    if [[ -r "/proc/$OLD_PID/cmdline" ]]; then
      OLD_CMDLINE="$(tr '\0' ' ' < "/proc/$OLD_PID/cmdline")"
    else
      OLD_CMDLINE="$(ps -p "$OLD_PID" -o args= 2>/dev/null || true)"
    fi
    if [[ "$OLD_CMDLINE" == *"naomale-java.jar"* ]]; then
      echo "闹麻了点单已经在运行，PID=$OLD_PID"
      echo "如需重启：./stop.sh && ./start.sh"
      exit 0
    fi
    echo "PID 文件指向了其他进程（PID=$OLD_PID），将忽略并继续启动。"
  fi
  rm -f "$PID_FILE"
fi

mkdir -p "$LOG_DIR"

# 默认堆内存适合 1~2 核小机器；可按需覆盖：JAVA_OPTS="-Xms256m -Xmx512m"
read -r -a JAVA_ARGS <<< "${JAVA_OPTS:--Xms256m -Xmx512m}"

echo "正在启动 naomale-java ..."
echo "  端口：$PORT"
echo "  配置：$CONFIG"
echo "  日志：$LOG_FILE"

nohup "$JAVA_BIN" "${JAVA_ARGS[@]}" -jar "$JAR" \
  --spring.config.additional-location=file:./application.yml \
  >> "$LOG_FILE" 2>&1 &
APP_PID=$!
echo "$APP_PID" > "$PID_FILE"

# 最多等待 40 秒，确认进程存活并且接口可访问
READY=0
for _ in $(seq 1 40); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "启动失败，进程已退出。最近日志："
    tail -n 40 "$LOG_FILE" || true
    rm -f "$PID_FILE"
    exit 1
  fi

  if command -v curl >/dev/null 2>&1; then
    if curl -fsS "http://127.0.0.1:${PORT}/api/ping" >/dev/null 2>&1; then
      READY=1
      break
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -qO- "http://127.0.0.1:${PORT}/api/ping" >/dev/null 2>&1; then
      READY=1
      break
    fi
  else
    # 没有 curl/wget 时，等待几秒并确认进程存活
    sleep 5
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" -eq 1 ]]; then
  echo "启动成功，PID=$APP_PID"
  echo "访问：http://127.0.0.1:${PORT}"
else
  echo "进程已启动（PID=$APP_PID），但健康检查暂未通过。"
  echo "请查看日志：tail -n 80 $LOG_FILE"
fi
