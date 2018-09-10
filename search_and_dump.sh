#!/bin/sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd ${0%/*};

git pull
node ./bin/search_and_dump/1_search_and_dump.js || exit 1
rm -r ./cache/search_and_dump
node /home/igg/apps/sync/bin/dropbox.js
