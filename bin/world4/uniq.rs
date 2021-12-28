// rustc -C opt-level=3 ./uniq.rs
// find ~/data/twitter/data_280/coronarvirus/ -type f -iname "*.xz" | parallel --bar --eta "xz -dkc {} | jq -rc '.user | select(.followers_count >= 1000) | .id_str' | ./uniq" | ./uniq | xz -z9T 0 > coronarvirus.txt.xz

use std::collections::BTreeSet;
use std::io::{prelude::*};

fn main() {
	let mut ids: BTreeSet<u64> = BTreeSet::new();
	let stdin = std::io::stdin();
	let lines = stdin.lock().lines();

	for line in lines {
		let id = line.unwrap().parse::<u64>().unwrap();
		ids.insert(id);
	}

	for id in ids.iter() {
		println!("{}", id);
	}
}

