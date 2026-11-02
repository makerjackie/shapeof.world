#!/bin/bash
# run a command in the film dir with node + homebrew on PATH:  bash tools/r.sh <cmd...>
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd "$(dirname "$0")/.."
eval "$@"
