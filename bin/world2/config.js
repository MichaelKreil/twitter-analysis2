var config = {
	activityMinimumName: '35',
	step: '0',
	stepNext: '1',
}

config.activityMinimum = Math.pow(10, parseFloat(config.activityMinimumName)/10),

module.exports = config
