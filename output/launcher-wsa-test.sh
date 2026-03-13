set -euo pipefail
cd "/d/CODING/React Projects/uniai-chat/automaker"

npm() {
  echo "MOCK_NPM $*"
  return 0
}
export -f npm

echo "=== W ==="
env AUTOMAKER_FORCE_FAST_MODE_WARNING=1 AUTOMAKER_FAST_MODE_CHOICE=W ./start-automaker.sh electron-fast --no-colors

echo "=== S ==="
env AUTOMAKER_FORCE_FAST_MODE_WARNING=1 AUTOMAKER_FAST_MODE_CHOICE=S ./start-automaker.sh electron-fast --no-colors

echo "=== A ==="
env AUTOMAKER_FORCE_FAST_MODE_WARNING=1 AUTOMAKER_FAST_MODE_CHOICE=A AUTOMAKER_TEST_SKIP_MENU_RESTART=1 ./start-automaker.sh electron-fast --no-colors
