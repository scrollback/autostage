"use strict";
/**
It usage process.env.NODE_ENV to show vesbose log.
*/
var winston = require('winston'),
	util = require('util'),
	fs = require("fs");
var customLevels = {
	levels: {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3
	},
	colors: {
		debug: 'blue',
		info: 'green',
		warn: 'yellow',
		error: 'red'
	}
};
var logger = new(winston.Logger)({
	transports: [
		new(winston.transports.Console)({
			level: 'debug',
			levels: customLevels.levels,
			colorize: true
		})
	]
});

function line(args) {
	var parts = [
			(new Error()).stack.
		replace(/.*(Error|node_modules|logger|native).*\n/g, ''). // remove lines with these words
		replace(/\n[\s\S]*$/, ''). // take the first line
		replace(/^[\s\S]*?\/home\/scrollback\/autostage\//, ''). // relative path
		replace(/^.*\s+at\s*/, '').
		replace(/[\)\(]/g, '')
	],
		logLine;
	logLine = util.format.apply(util, args).replace(/\s+/g, ' ');
	parts.push(logLine);

	return parts.join(' ');
}

var log = function() {
	logger.info(line(arguments));
};

log.i = function() {
	logger.info(line(arguments));
};

log.e = function() {
	var l = line(arguments);
	logger.error(l);
};

log.w = function() {
	logger.warn(line(arguments));
};

log.d = function() {
	//	if(process.env.TRAVIS){
	//		return;
	//	}

};

module.exports = log;
