var config = {
	activityMinimumName: '40',
}

config.activityMinimum = Math.pow(10, parseFloat(config.activityMinimumName)/10),

module.exports = config
