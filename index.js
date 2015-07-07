"use strict";
var http = require('http'),
	github = require('./github.js'),
	config = require('./config.js'),
	log = require('./logger.js'),
	teamMembers = config.teamMembers,
	server = http.createServer(function(req, res) {
		var response = [];
		if (req.method === "POST" && req.headers && (/^GitHub/).test(req.headers["user-agent"])) {
			req.on('data', function(data) {
				response.push(data.toString("utf-8"));

			});
			req.on('end', function() {
				var data = response.join("");
				data = JSON.parse(data.toString('utf-8'));

				var user = data.sender.login,
					pullRequestNo = data.pull_request.number,
					state = data.action,
					branch = data.pull_request.head.ref;
				log.i(user, state, branch);
				if (teamMembers.indexOf(user) < 0) return;
				github.autostage(state, branch, pullRequestNo);
				log.i('Request ended');
				res.end('Autostage Server');
			});

			req.on('close', function() {
				console.log('connection closed');
			});
		}
		req.on("err", function() {
			console.log("err");
		});
	});
server.listen(7001);
console.log('Server is running on port 7001');
