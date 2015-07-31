"use strict";

var request = require('request');

module.exports = [
	function(branch, pull_no) {
		request({
			url: "https://api.github.com/repos/scrollback/scrollback/issues/" + pull_no + "/comments",
			auth: {
				"user": "scrollbackbot",
				"pass": "wotgiz345"
			},
			method: "POST",
			headers: {
				"user-Agent": "scrollbackbot"
			},
			json: true,
			body: {
				"body": "Your branch is staged [here](https://" + branch + ".stage.scrollback.io)\n[Run integration tests](https://" +
					branch + ".stage.scrollback.io/t/integration)"
			}
		}, function(error, response) {
			if (!error) console.log("response: ", response.body.body);
			else {
				console.log(error);
			}
			//console.log("body: ", body);
		});
	},

	function(branch, msg) {
		request({
			url: "https://api.github.com/repos/scrollback/scrollback/pulls",
			auth: {
				"user": "scrollbackbot",
				"pass": "wotgiz345"
			},
			method: "POST",
			headers: {
				"user-Agent": "scrollbackbot"
			},
			json: true,
			body: {
				"title": msg + "[auto PR]",
				"head": branch,
				"base": "master"
			}
		}, function(error) {
			if (!error) console.log("A pull request have been succesfuly created for branch " + branch);
			else {
				console.log(error);
			}

		});
	}
];


//git log -n 1 --pretty=format:"%H"