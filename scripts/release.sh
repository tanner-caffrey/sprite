#!/usr/bin/env bash
# Release: guide → build → test → bump → commit → push → GitHub Release → install.
# Stops at the first failure. The test step uses the real exit code, never a
# pipe into grep.
#
#   scripts/release.sh <version> <commit-message-file-or-text> [--no-install]
#
# The GitHub Release's notes are that version's section of CHANGELOG.md, so
# write the changelog entry first.
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:?version, e.g. 0.9.10}"
msg="${2:?commit message (text, or a path to a file)}"
install=1; [[ "${3:-}" == "--no-install" ]] && install=0

# Refuse to release with untracked files lying around: `git add -A` would
# ship them. Modified tracked files are the release; new files must be added
# on purpose first.
untracked="$(git ls-files --others --exclude-standard)"
if [[ -n "$untracked" ]]; then
  echo "untracked files present — add them deliberately or remove them before releasing:"
  printf '  %s\n' $untracked
  exit 1
fi

# The changelog must already describe this version.
if ! grep -qE "^## v${version//./\\.}( |$)" CHANGELOG.md; then
  echo "CHANGELOG.md has no '## v${version}' section — write the notes first."
  exit 1
fi

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
msgfile="$(mktemp)"
printf '%s\n\n%s\n' "$body" "$trailer" > "$msgfile"
git -c user.name="Tanner Caffrey" -c user.email="tanner.caffrey@gmail.com" commit -q -F "$msgfile"
rm -f "$msgfile"
git push -q
git log --oneline -1

# GitHub Release: tag v<version>, notes = this version's changelog section.
notes="$(awk -v v="## v${version}" '
  $0 ~ "^## v" { if (found) exit; if (index($0, v) == 1) { found = 1; next } }
  found { print }
' CHANGELOG.md | sed -e '1{/^$/d}' -e '${/^$/d}')"
title="$(grep -E "^## v${version//./\\.}" CHANGELOG.md | head -1 | sed -E 's/^## v[0-9.]+ *(— *)?//')"
[[ -z "$title" ]] && title="v${version}"
gh release create "v${version}" --title "v${version}${title:+ — $title}" --notes "$notes" >/dev/null
echo "GitHub release: https://github.com/tanner-caffrey/sprite/releases/tag/v${version}"

if (( install )); then letta install git:github.com/tanner-caffrey/sprite 2>&1 | tail -1; fi
