
use std::io::prelude::*;
use std::env;
use std::mem::{size_of, transmute};
use std::fs::File;

const BUFFER_MAX_COUNT:usize = 128*1024;

#[derive(Debug)]
#[repr(C)]
struct Entry {
	id: u64,
	count: u32,
}

impl Entry {
	fn readFrom(mut file: File) -> Self {
		//let mut file = File::open(path)?;

		let entry: Entry = {
			let mut h = [0u8; size_of::<Entry>()];

			file.read_exact(&mut h[..]).unwrap();

			unsafe { transmute(h) }
		};

		return entry;
	}

	fn writeTo(self, mut file: &File) {
		//let mut file = File::create(path)?;

		let bytes: [u8; size_of::<Entry>()] = unsafe { transmute(self) };

		file.write_all(&bytes).unwrap();
	}
}

struct Database {
	buffer_in: Vec<u64>,
	filenames: Vec<String>,
}

impl Database {
	fn new() -> Self {
		let mut _self = Database {
			buffer_in: Vec::new(),
			filenames: Vec::new(),
		};
		_self.buffer_in.reserve(BUFFER_MAX_COUNT);
		_self.reset_buffer();
		return _self;
	}

	fn add(&mut self, id: &u64) {
		self.buffer_in.push(*id);

		if self.buffer_in.len() >= BUFFER_MAX_COUNT {
			self.flush_buffer();
			self.reset_buffer();
		}
	}

	fn reset_buffer(&mut self) {
		eprintln!("reset_buffer");
		self.buffer_in.clear();
	}

	fn flush_buffer(&mut self) {
		eprintln!("flush_buffer");

		eprintln!("   sort");
		self.buffer_in.sort_unstable();
		eprintln!("   0: {}", self.buffer_in[0]);
		eprintln!("   {}: {}", self.buffer_in.len(), self.buffer_in[self.buffer_in.len() - 1]);

		eprintln!("   count");
		let mut entry:Entry = Entry { id:0, count:0 };
		let mut file = File::create("test.tmp").unwrap();

		for next_id in self.buffer_in.iter_mut() {
			if entry.id == *next_id {
				entry.count += 1;
			} else {
				if entry.id != 0 {
					entry.writeTo(&file);
				}
				entry = Entry { id: *next_id, count: 1 };
			}
		}
		entry.writeTo(&file);


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
	}

	database.flush_buffer();
/*
	for (id, count) in id_count.iter() {
		if count < &min_count {
			continue
		}
		println!("{}", id);
	}
	*/
}
