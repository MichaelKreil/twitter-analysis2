#!/bin/sh

# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd ${0%/*};

message() {
	# curl -X POST --data-urlencode "payload={\"channel\":\"#monitoring\", \"username\":\"kreilbot\", \"link_names\":\"1\", \"text\":\"Error for <@U8LAL8Z5E> - $1\", \"icon_emoji\":\":rotating_light:\"}" https://hooks.slack.com/services/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;
	exit 1
}

git pull
node ./bin/search_and_dump/1_search_and_dump.js || message 'search_and_dump.js failed'
# rm -r ./cache/search_and_dump
node /home/pi/projects/sync/bin/dropbox.js || message 'dropbox.js failed'
