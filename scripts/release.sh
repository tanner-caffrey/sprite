#!/usr/bin/env bash
# Release: build → test → bump → commit → push → install. Stops at the first
# failure. The test step uses the real exit code, never a pipe into grep.
#
#   scripts/release.sh <version> <commit-message-file-or-text> [--no-install]
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:?version, e.g. 0.8.7}"
msg="${2:?commit message (text, or a path to a file)}"
install=1; [[ "${3:-}" == "--no-install" ]] && install=0

bun run guide >/dev/null
bun run build >/dev/null
bun run test >/tmp/sprite-release-test.log 2>&1 || { echo "TESTS FAILED — not releasing:"; tail -20 /tmp/sprite-release-test.log; exit 1; }
grep -E "passed|ALL PASS" /tmp/sprite-release-test.log

python3 - "$version" <<'EOF'
import json, sys
p = "package.json"; d = json.load(open(p)); d["version"] = sys.argv[1]
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False); open(p, "a").write("\n")
EOF
bun run build >/dev/null  # bundle carries the version

git add -A
# Tanner authors; Faye co-authors (matches the upstream commits).
trailer="Co-Authored-By: Faye <faye@gwynnie.gay>"
if [[ -f "$msg" ]]; then body="$(cat "$msg")"; else body="$msg"; fi
printf '%s\n\n%s\n' "$body" "$trailer" > /tmp/sprite-release-msg.txt
git -c user.name="Tanner Caffrey" -c user.email="tanner.caffrey@gmail.com" commit -q -F /tmp/sprite-release-msg.txt
git push -q
git log --oneline -1
if (( install )); then letta install git:github.com/tanner-caffrey/sprite 2>&1 | tail -1; fi
