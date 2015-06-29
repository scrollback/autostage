"use strict";
var http = require('http'),
	github = require('./git.js'),
	config = require('./config.js'),
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

				console.log(user, branch, pullRequestNo, state);
				if (teamMembers.indexOf(user) < 0) return;
				github.autostage(state, branch, pullRequestNo);
				console.log('Request ended');
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
