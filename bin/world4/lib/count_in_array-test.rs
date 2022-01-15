//use std::collections::BTreeMap;
//use rustc_hash::FxHashMap;
use std::collections::LinkedList;

use std::io::{prelude::*};
use std::env;

const BUFFER_MAX_COUNT:usize = 1*1024*1024;
//const   DATA_MAX_COUNT:usize = 1*1024*1024;

struct Account {
	id: u64,
	count: u32,
}


struct Database {
	buffer: Vec<u64>,
	data: LinkedList<Account>,
}

impl Database {
	fn new() -> Self {
		Database {
			buffer: Vec::new(),
			data: LinkedList::new()
		}
	}

	fn add(&mut self, id: &u64) {
		//eprintln!("add {}", *id);
		self.buffer.push(*id);

		if self.buffer.len() >= BUFFER_MAX_COUNT {
			self.flush();
		}
	}

	fn reset_buffer(&mut self) {
		eprintln!("reset_buffer");
	}

	fn flush(&mut self) {
		eprintln!("flush");
		eprintln!("   sort");
		self.buffer.sort_unstable();
		//buffer.iter_mut().for_each(|m| *m = 0)
		//self.reset_buffer();
		eprintln!("finished");
	}
}

fn main() {
	let args: Vec<String> = env::args().collect();
	let mut min_count:u32 = 0;
	if args.len() > 1 {
		min_count = args[1].parse::<u32>().unwrap();
	}
	eprintln!("min_count: {}", min_count);

	let mut database = Database::new();

	let stdin = std::io::stdin();
	let lines = stdin.lock().lines();

	for line in lines {
		let text = line.unwrap();

		let mut in_number: bool = false;
		let mut in_brackets: bool = false;
		let mut id:u64 = 0;

		for code in text.bytes() {

			if in_brackets {
				if (code >= 48) && (code <= 57) {
					if !in_number {
						in_number = true;
						id = 0;
					}
					id = id*10 + ((code as u64) - 48);
				} else {
					if in_number {
						in_number = false;
						database.add(&id);
					}
					if code == 93 {
						in_brackets = false;
					}
				}
			} else {
				if code == 91 {
					in_brackets = true;
				}
			}
		}

		/*
		i += 1;
		if (i % 1024 == 0) && (id_count.len() >= CLEANUP_THRESHOLD) {
			eprintln!("cleanup from {}", id_count.len());
			id_count.retain(|_k, v| v > &mut 1);
			eprintln!("   … to {}", id_count.len());
		}
		*/
	}
/*
	for (id, count) in id_count.iter() {
		if count < &min_count {
			continue
		}
		println!("{}", id);
	}
	*/
}
