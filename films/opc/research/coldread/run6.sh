#!/bin/zsh
export PATH=$HOME/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
export TMPDIR=/Volumes/DevSSD/tmp/
R=/Volumes/DevSSD/Projects/code/shapeof.world/.claude/worktrees/opc/films/opc/research/coldread
cd /Volumes/DevSSD/tmp
opencode run -m "$1" "$(cat $R/v6.md)" > $R/$2-v6.md 2> $R/$2-v6.err
echo "exit $?" >> $R/$2-v6.err
