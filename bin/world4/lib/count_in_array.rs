// test: rustc count_in_array.rs

#![allow(unused_must_use)]

//use std::io::BufReader;
//use std::mem::{size_of, transmute};
use std::collections::BTreeMap;
use std::env;
use std::fs::File;
use std::io::BufWriter;
use std::io::prelude::*;
//use std::rc::Rc;

const BUFFER_MAX_COUNT:usize = 128*1024;

//#[derive(Debug)]
//#[repr(C)]
//struct Entry {
//	id: u64,
//	count: u32,
//}

	/*
impl Entry {
	fn readFrom(mut file: &BufReader) -> Self {
		let entry: Entry = {
			let mut h = [0u8; size_of::<Entry>()];
			file.read_exact(&mut h[..]).unwrap();
			unsafe { transmute(h) }
		};
		return entry;
	}

	fn writeTo(self, mut bufWriter: BufWriter<File>) {
		let bytes: [u8; size_of::<Entry>()] = unsafe { transmute(self) };
		bufWriter.write(&bytes).unwrap();
	}
}
	*/

struct Database {
	map: BTreeMap<u64,u32>,
	filename: String,
	is_ready_to_write: bool,
}

impl Database {
	fn new(index: usize) -> Self {
		let mut _self = Database {
			map: BTreeMap::new(),
			filename: format!("count_in_array_{}.tmp", index),
			is_ready_to_write: true,
		};
		return _self;
	}

	fn add(&mut self, id: &u64) {
		assert!(self.is_ready_to_write, "not ready to add data");
		*self.map.entry(*id).or_insert(0) += 1;
	}

	fn flush(&mut self) {
		let file = File::create(&self.filename).unwrap();
		let mut buffered_file = BufWriter::with_capacity(65536, file);
		for (id, count) in self.map.iter() {
			buffered_file.write(&id.to_le_bytes());
			buffered_file.write(&count.to_le_bytes());
		}
		buffered_file.flush();
		self.is_ready_to_write = false;

		drop(buffered_file);
		self.map.clear();
	}

	fn is_full(&self) -> bool {
		assert!(self.is_ready_to_write, "not ready to read fullness");
		return self.map.len() >= BUFFER_MAX_COUNT;
	}
}

struct DatabaseWrapper {
	list: Vec<Database>,
}

impl DatabaseWrapper {
	fn new() -> Self {
		let mut _self = DatabaseWrapper {
			list: Vec::new(),
		};
		_self.list.push(Database::new(0));
		return _self;
	}

	fn add(&mut self, id: &u64) {
		let database:&mut Database = self.list.last_mut().unwrap();
		if database.is_full() {
			database.flush();
			&self.list.push(Database::new(self.list.len()));
			self.list.last_mut().unwrap().add(&id);
		} else {
			database.add(&id);
		}
	}
}

fn main() {
	let args: Vec<String> = env::args().collect();
	let mut min_count:u32 = 0;
	if args.len() > 1 {
		min_count = args[1].parse::<u32>().unwrap();
	}
	eprintln!("min_count: {}", min_count);

	let mut databases = DatabaseWrapper::new();

	let stdin = std::io::stdin();
	let lines = stdin.lock().lines();

	for line in lines {
		let text = line.unwrap();

		// scan line
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
						databases.add(&id);
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

	//println!("{}", databases.len())
	//database.flush_buffer();
/*
	for (id, count) in id_count.iter() {
		if count < &min_count {
			continue
		}
		println!("{}", id);
	}
	*/
}
