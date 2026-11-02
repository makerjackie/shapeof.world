#!/bin/bash
# usage: gem.sh <prompt.md> <out.md>  (runs Gemini via opencode in background)
cd "$(dirname "$1")"
nohup bash -c "opencode run -m opencode-go/gemini-4-argon \"\$(cat '$1')\" > '$2' 2>&1" >/dev/null 2>&1 &
echo started
