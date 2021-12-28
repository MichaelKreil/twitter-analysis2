
# Aufbau

always sorted

1. status = scrape(check_ids') + status'
2. correct_ids = filter(status) -> id
3. friends = scrape(correct_ids) + friends'
4. check_ids = friends->ids | sort | uniq -c | filter
