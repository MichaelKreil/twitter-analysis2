//use std::collections::BTreeSet;
use rustc_hash::FxHashSet;

use std::io::{prelude::*};

fn main() {
	//let mut ids: BTreeSet<u64> = BTreeSet::new();
	let mut ids: FxHashSet<u64> = FxHashSet::default();

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

