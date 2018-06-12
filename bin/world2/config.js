var config = {
	activityMinimumName: '40',
	step: '2',
	stepNext: '3',
}

config.activityMinimum = Math.pow(10, parseFloat(config.activityMinimumName)/10),

module.exports = config
