//use std::collections::BTreeMap;
use rustc_hash::FxHashMap;

use std::io::{prelude::*};
use std::env;

fn main() {
	let args: Vec<String> = env::args().collect();
	let mut min_count:u32 = 0;
	if args.len() > 1 {
		min_count = args[1].parse::<u32>().unwrap();
	}

	//let mut id_count: BTreeMap<u64,u32> = BTreeMap::new();
	let mut id_count: FxHashMap<u64,u32> = FxHashMap::default();

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
					if c == ']' {
						in_brackets = false;
					}
				}
			} else {
				if c == '[' {
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
