#!/bin/sh

cd ${0%/*};

rustc -C opt-level=3 -o lib/uniq lib/uniq.rs
printf -v date '%(%Y-%m-%d-%H-%M-%S)T' -1
( xz -dkc ~/data/twitter/world4/3_ids-2022_01_07_102301.tsv.xz; xz -dkc ~/data/twitter/world4/5_friend_ids-2022_02_21_140303.tsv.xz ) | lib/uniq | xz -z9 > ~/data/twitter/world4/1_ids-${date}.tsv.xz
