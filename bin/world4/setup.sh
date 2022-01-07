#!/bin/sh

cd ${0%/*};

rustc -C opt-level=3 -o lib/count lib/count.rs
rustc -C opt-level=3 -o lib/uniq lib/uniq.rs
