var http = require('http'),

	github = require('./github.js'),
	server = http.createServer(function (req, res) {
		console.log("Create domain:");
		var response = [];
		if (req.method === "POST" && req.headers && (/^GitHub/).test(req.headers["user-agent"])) {
			req.on('data', function (data) {
				response.push(data.toString("utf-8"));

			});

			req.on('end', function () {
				var data = response.join("");
				data = JSON.parse(data.toString('utf-8'));

				var user = data.sender.login,
					pull_request_no = data.pull_request.number,
					branch = data.pull_request.head.ref;

				console.log(user, branch, pull_request_no)

				github.createDomain(user, branch);
				console.log('Request ended');
			});

			req.on('close', function () {
				console.log('connection closed');
			});
		}
		//res.end('not-implemented');

		req.on("err", function () {
			console.log("err");
		});
	});

server.listen(7000);
console.log('Server is running on port 7000');