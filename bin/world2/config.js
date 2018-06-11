var config = {
	activityMinimumName: '40',
	step: '0',
}

config.activityMinimum = Math.pow(10, parseFloat(config.activityMinimumName)/10),

module.exports = config
