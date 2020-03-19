#!/bin/sh

cd ${0%/*};

echo '# git pull'
git pull

echo '# search dump'
node ./bin/search_and_dump/1_search_and_dump.js

# echo '# sync dropbox'
# node /home/pi/projects/sync/bin/dropbox.js
