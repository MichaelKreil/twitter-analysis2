rsync -avhtWe ssh --exclude='.DS_Store' --exclude='/.git/' --exclude='/cache/' --exclude='/node_modules/' --exclude='/tmp/' --exclude='*.tmp.xz' --exclude='*.jsonstream.xz' --exclude='/data/world/dbs/*/' --exclude='/data/search_and_dump/' infographicsgroup@hypatia.local:/Users/infographicsgroup/dev/twitter-analysis2/ /Users/michaelkreil/Documents/Projekte/Tagesspiegel/twitter-scraper/twitter-analysis --dry-run
