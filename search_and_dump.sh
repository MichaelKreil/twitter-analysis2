#!/bin/sh

cd ${0%/*};

while true; do
	git pull

	node ./bin/search_and_dump/1_search_and_dump.js

	sleep 10800s
done
