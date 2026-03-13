set -euo pipefail
cd "/d/CODING/React Projects/uniai-chat/automaker"

npm() {
  echo "MOCK_NPM $*"
  return 0
}
export -f npm

env AUTOMAKER_FORCE_FAST_MODE_WARNING=1 bash ./start-automaker.sh electron-fast --no-colors
