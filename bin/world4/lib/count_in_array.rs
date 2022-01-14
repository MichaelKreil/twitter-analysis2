// rustc -C opt-level=3 ./count_in_array.rs
// xz -dkc 4_friends-2021-12-28-22-53-25.tsv.xz | ~/projects/twitter-analysis2/bin/world4/lib/count_in_array 300

use std::collections::BTreeMap;
use std::io::{prelude::*};
use std::env;

fn main() {
	let args: Vec<String> = env::args().collect();
	let mut min_count:u32 = 0;
	if args.len() > 1 {
		min_count = args[1].parse::<u32>().unwrap();
	}

	let mut id_count: BTreeMap<u64,u32> = BTreeMap::new();
	let stdin = std::io::stdin();
	let lines = stdin.lock().lines();

	for line in lines {
		let text = line.unwrap();

		let mut in_number: bool = false;
		let mut in_brackets: bool = false;
		let mut start_index = 1;
		let mut number:&str;
		let mut id:u64;

		for (i, c) in text.chars().enumerate() {
			if in_brackets {
				if c.is_digit(10) {
					if !in_number {
						in_number = true;
						start_index = i;
					}
				} else {
					if in_number {
						in_number = false;
						number = &text[start_index..i];
						id = number.parse::<u64>().unwrap();
						*id_count.entry(id).or_insert(0) += 1;
					}
					if *c == ']' {
						in_brackets = false;
					}
				}
			} else {
				if *c == '[' {
					in_brackets = true;
				}
			}
		}
	}

	for (id, count) in id_count.iter() {
		if count < &min_count {
			continue
		}
		println!("{}", id);
	}
}
