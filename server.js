var http = require('http'),
	nginx = require('./nginx.js'),
	server = http.createServer(function (req) {
		var response = [];
		if (req.method === "POST" && req.headers && (/^GitHub/).test(req.headers["user-agent"])) {
			req.on('data', function (data) {
				response.push(data.toString("utf-8"));

			});

			req.on('end', function () {
				var data = response.join("");
				data = JSON.parse(data.toString('utf-8'));

				var user = data.sender.login,
					pullRequestNo = data.pull_request.number,
					branch = data.pull_request.head.ref;

					console.log(user, branch, pullRequestNo);

				nginx.copyNginx(branch, pullRequestNo);
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
server.listen(7001);
console.log('Server is running on port 7001');

