#!/bin/zsh
# one grok deep-search pass: run.sh q1 -> q1.out.md
export PATH=$HOME/.local/bin:/opt/homebrew/bin:$PATH
export TMPDIR=/Volumes/DevSSD/tmp/
cd /Volumes/DevSSD/tmp/opc-grok
R=/Volumes/DevSSD/Projects/code/shapeof.world/.claude/worktrees/opc/films/opc/research/grok
grok -m grok-4.7 --always-approve -p "$(cat $R/$1.prompt.md)" > $R/$1.out.md 2> $R/$1.err.log
echo "exit $?" >> $R/$1.err.log
