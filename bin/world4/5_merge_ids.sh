#!/bin/sh

cd ${0%/*};

rustc -C opt-level=3 -o lib/uniq lib/uniq.rs
printf -v date '%(%Y-%m-%d-%H-%M-%S)T' -1
( xz -dkc ~/data/twitter/world4/3_id-2021-12-28-22-26-15.tsv.xz; xz -dkc ~/data/twitter/world4/5_friend_ids-2022-01-06-14-30-13.tsv.xz ) | lib/uniq | xz -z9 > ~/data/twitter/world4/1_ids-${date}.tsv.xz
