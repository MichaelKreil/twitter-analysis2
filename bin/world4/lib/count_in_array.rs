/*
	test:
		rustc count_in_array.rs && xz -dkc friends_10.tsv.xz | ./count_in_array
*/

#![allow(unused_must_use)]

#![feature(map_first_last)]
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::prelude::*;

struct Entry {
	id: u64,
	count: u32,
}

struct BlockWriter {
	map: BTreeMap<u64,u32>,
	max_block_entries_count: usize,
}

impl BlockWriter {
	fn new(max_count:usize) -> Self {
		return BlockWriter {
			map: BTreeMap::new(),
			max_block_entries_count: max_count,
		}
	}

	fn add(&mut self, &id: &u64) {
		*self.map.entry(id).or_insert(0) += 1;
	}

	fn is_full(&self) -> bool {
		return self.map.len() >= self.max_block_entries_count;
	}

	fn save(&mut self, filename:&String) {
		let file = fs::File::create(filename).unwrap();
		let mut buffered_file = BufWriter::with_capacity(65536, file);
		for (id, count) in self.map.iter() {
			buffered_file.write(&id.to_le_bytes());
			buffered_file.write(&count.to_le_bytes());
		}
		buffered_file.flush();
	}
}

struct BlockReader {
	reader: BufReader<fs::File>,
}

impl BlockReader {
	fn new(filename:&String) -> Self {
		let file = fs::File::open(filename).unwrap();
		return BlockReader {
			reader: BufReader::with_capacity(65536, file),
		};
	}
}

impl Iterator for BlockReader {
	type Item = Entry;
 	
	fn next(&mut self) -> Option<Self::Item> {
		let buf1 = &mut [0u8;8];
		let buf2 = &mut [0u8;4];

		self.reader.read_exact(buf1).ok()?;
		self.reader.read_exact(buf2).ok()?;

		return Some(Entry {
			id: u64::from_le_bytes(*buf1),
			count: u32::from_le_bytes(*buf2),
		})
	}
}

struct LookupEntry {
	reader_ids: Vec<usize>,
	id: u64,
	count: u32,
}

struct BlockReaders {
	readers: Vec<BlockReader>,
	entries: BTreeMap<u64,LookupEntry>,
}

impl BlockReaders {
	fn new() -> Self {
		return BlockReaders {
			readers: Vec::new(),
			entries: BTreeMap::new(),
		}
	}

	fn add_block_reader(&mut self, filename:&String) {
		let reader_id:usize = self.readers.len();
		self.readers.push(BlockReader::new(filename));
		self.add_reader_entry(&reader_id);
	}

	fn add_reader_entry(&mut self, reader_id:&usize) -> bool {
		let block_reader = &mut self.readers[*reader_id];
		let result:Option<Entry> = block_reader.next();

		if result.is_none() {
			return false
		}

		let entry:Entry = result.unwrap();

		if self.entries.contains_key(&entry.id) {
			let lookup_entry = self.entries.get_mut(&entry.id).unwrap();
			lookup_entry.count += entry.count;
			lookup_entry.reader_ids.push(*reader_id);
		} else {
			let mut lookup_entry = LookupEntry {
				reader_ids: Vec::new(),
				id: entry.id,
				count: entry.count,
			};
			lookup_entry.reader_ids.push(*reader_id);
			self.entries.insert(lookup_entry.id, lookup_entry);
		}

		return true;
	}
}

impl Iterator for BlockReaders {
	type Item = Entry;

	fn next(&mut self) -> Option<Self::Item> {
		if self.entries.is_empty() {
			return None;
		}

		let (_id,lookup_entry):(u64,LookupEntry) = self.entries.pop_first().unwrap();
		for reader_id in lookup_entry.reader_ids.iter() {
			self.add_reader_entry(reader_id);
		}
		return Some(Entry {
			id:lookup_entry.id,
			count:lookup_entry.count,
		})
	}
}

fn main() {
	let args: Vec<String> = env::args().collect();
	let mut min_count:u32 = 0;
	let mut max_block_entries:usize = 128*1024*1024;
	if args.len() > 1 {
		min_count = args[1].parse::<u32>().unwrap();
	}
	if args.len() > 2 {
		max_block_entries = args[2].parse::<usize>().unwrap();
	}
	eprintln!("min_count: {}", min_count);
	eprintln!("max_block_entries: {}", max_block_entries);

	let mut block = BlockWriter::new(max_block_entries);
	let mut block_filenames:Vec<String> = Vec::new();

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
						block.add(&id);
						if block.is_full() {
							let filename:String = format!("count_in_array_{}.tmp", block_filenames.len());
							block.save(&filename);
							block_filenames.push(filename);
							drop(block);
							block = BlockWriter::new(max_block_entries);
						}
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

	if block_filenames.len() == 0 {
		for (id, count) in block.map.iter() {
			if count < &min_count {
				continue;
			}
			//println!("{}\t{}", id, count);
			println!("{}", id);
		}
	} else {
		let filename:String = format!("count_in_array_{}.tmp", block_filenames.len());
		block.save(&filename);
		block_filenames.push(filename);

		let mut block_readers = BlockReaders::new();
		for filename in block_filenames.iter() {
			block_readers.add_block_reader(filename);
		}

		for entry in block_readers {
			if entry.count < min_count {
				continue;
			}
			//println!("{}\t{}", entry.id, entry.count);
			println!("{}", entry.id);
		}

		for filename in block_filenames.iter() {
			fs::remove_file(filename);
		}
	}
}
