var request = require('request');

exports.gitComment = function(branch, pull_no) {
	request({
		url: "https://api.github.com/repos/scrollback/scrollback/issues/"+pull_no+"/comments",
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
			"body": "Your branch is staged [here](https://"+branch+".stage.scrollback.io)\n[Run integration tests](https://"+
			branch+".stage.scrollback.io/t/integration)"
		}
	}, function(error, response, body) {
		if (!error) console.log("response: ", response.body.body);
		else {
			console.log(error);
		}
		//console.log("body: ", body);
	});
};

//comment("direct", 6);
