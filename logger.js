"use strict";
/**
It usage process.env.NODE_ENV to show vesbose log.
*/
var winston = require('winston'),
	util = require('util'),
	dir = process.cwd(),
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
		}),
		new(winston.transports.File)({
			name: 'info-file',
			filename: dir + '/logs/now.log',
			level: 'info'
		}),
		new(winston.transports.File)({
			name: 'error-file',
			filename: dir + '/logs/error.log',
			level: 'error'
		})
	]
});

function line(args) {
	var parts = [
			(new Date()).toISOString().replace(/\.\w*$/, '').replace(/^20/, ""),
			(function() {
				var str = (new Error()).stack.
				replace(/.*(Error|node_modules|logger|native).*\n/g, ''). // remove lines with these words
				replace(/\n[\s\S]*$/, ''); // take the first line

				var parts = str.match(/([^\/^\(]*)(\/.+\/)([^\/]+\.js\:[0-9]+\:[0-9]+)([^/(])(.*)/);

				return parts[1].trim() + parts[3] + parts[5];
			}())
	],
		logLine;
	logLine = util.format.apply(util, args).replace(/\s+/g, ' ');
	parts.push(logLine.substr(0, 1024));

	return parts.join(' ');
}

var log = function() {
	logger.info(line(arguments));
	//console.log(line(arguments));
};

log.i = function() {
	//	fs.renameSync('/home/chandra/autostage/logs/now.log', '/home/chandra/autostage/logs/' + new Date().getTime() + '.log');
	//	fs.writeFileSync('/home/chandra/autostage/logs/now.log', "logs: ");
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

log.tag = function(tag) {
	var ws, queue = [],
		bytes = 0,
		opening = false,
		dir = require("path").normalize(__dirname + '/../logs/' + tag);

	function write() {
		if (!queue.length) return;
		var l = queue.join('\n') + '\n';
		bytes += l.length;
		ws.write(l);
		queue = [];
		if (bytes > 1024 * 1024 * 128) open();
	}

	if (!fs.existsSync(dir)) fs.mkdirSync(dir);

	return function() {
		queue.push(line(arguments));
		if (ws) write();
		else if (!opening) open();
	};

	function open() {
		if (ws) {
			ws.end();
			ws = null;
		}
		opening = true;
		var time = (new Date()).toISOString().replace(/[T:]/g, '-').replace(/\.\w*$/, ''),
			nws = fs.createWriteStream(dir + '/' + time + '.log').on('open', function() {
				opening = false;
				ws = nws;
				bytes = 0;
				write();
			});
	}


};

module.exports = log;
