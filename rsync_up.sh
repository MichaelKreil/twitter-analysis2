rsync -avhtWe ssh --dry-run --exclude='.DS_Store' --exclude='/.git/' --exclude='/data/world/' --exclude='/cache/world' --exclude='/node_modules/' --exclude='/tmp/' --exclude='*.tmp.xz' /Users/michaelkreil/Documents/Projekte/Tagesspiegel/twitter-scraper/twitter-analysis/ infographicsgroup@hypatia.local:/Users/infographicsgroup/dev/twitter-analysis2
