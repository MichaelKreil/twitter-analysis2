var config = {
	activityMinimumName: '45',
}

config.activityMinimum = Math.pow(10, parseFloat(config.activityMinimumName)/10),

module.exports = config
