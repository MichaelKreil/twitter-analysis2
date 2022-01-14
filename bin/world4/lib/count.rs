
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
		//println!("{}", text);

		let mut in_number: bool = false;
		let mut start_index = 1;
		let mut number:&str;
		let mut id:u64;

		for (i, c) in text.chars().enumerate() {
			if c.is_numeric() {
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
			}

			//println!("{} {} {}", i, c, c.is_numeric());
		}

		//let id = line.unwrap().parse::<u64>().unwrap();
		//ids.insert(id);
	}

	for (id, count) in id_count.iter() {
		if count < &min_count {
			continue
		}
		//println!("{}: {}", id, count);
		println!("{}", id);
	}
}



//let v = bytes.iter().cloned().filter(|c| b"0123456789".contains(c) ).map(|c| c - b'0').collect::<Vec<u8>>();