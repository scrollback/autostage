"use strict";
var http = require('http'),
	github = require('./github.js'),
	config = require('./config.js'),
	log = require('./logger.js'),
	teamMembers = config.teamMembers,
	state, branch,
	server = http.createServer(function(req, res) {
		var response = [];
		if (req.method === "POST" && req.headers && (/^GitHub/).test(req.headers["user-agent"])) {
			req.on('data', function(data) {
				response.push(data.toString("utf-8"));

			});
			req.on('end', function() {
				var data = response.join("");
				data = JSON.parse(data.toString('utf-8'));

				if (data.pusher && data.pusher.name === 'scrollbackbot') {

					branch = data.ref.replace(/^refs\/heads\//, "");
					if (data.created) {
						state = "opened";
					} else if (!data.created && !data.deleted) {
						state = 'synchronize';
					} else state = 'closed';
					github.autostage(state, branch, 527, "release");
					log.i(data.pusher.name, state, branch);
				} else if(data.pull_request){
					var user = data.sender.login,
						pullRequestNo = data.pull_request.number;
					branch = data.pull_request.head.ref;
					state = data.action;
					log.i(user, state, branch);
					if (teamMembers.indexOf(user) < 0) return;
					github.autostage(state, branch, pullRequestNo);
				}else{
					return;
				}
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
