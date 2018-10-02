var config = {
	activityMinimumName: '35',
	step: '1',
	stepNext: '2',
}

config.activityMinimum = Math.pow(10, parseFloat(config.activityMinimumName)/10),

module.exports = config
