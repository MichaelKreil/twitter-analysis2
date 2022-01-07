#!/bin/sh

cd ${0%/*};

rustc -C opt-level=3 -o lib/count lib/count.rs
printf -v date '%(%Y-%m-%d-%H-%M-%S)T' -1
pv ~/data/twitter/world4/4_friends-2021-12-28-22-53-25.tsv.xz | xz -d | jq -r '.ids? | join(",")' | lib/count 300 | xz -z9 > ~/data/twitter/world4/5_friend_ids-${date}.tsv.xz
