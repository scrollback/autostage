/* global require */
/* jshint -W116 */

var fs = require('fs'),
	config = require('./config.js');
exports.copyNginx = function(branch, pullRequestNo) {
	var port = 7000 + pullRequestNo;
	var copyFile = function(readPath, writePath, lineTransform) {
		fs.readFile(readPath, function(err, data) {
			if (err) throw err;

			fs.writeFile(
				writePath,
				data.toString('utf-8').split("\n").map(lineTransform).join('\n'),
				function(err) {
					if (err) throw err;
				}
			);
		});
	};

	copyFile(
		config.baseDir + 'scrollback-' + branch + '/tools/nginx.conf',
		config.nginxDir + branch + '.stage.scrollback.io',
		function(line) { // line transform function
			console.log("nginx  file transform");
			return line.replace(/\$branch\b/g, branch).replace(/\$port\b/g, port);
			// inside the file, write server_name $branch.stage.scrollack.io
		}
	);
};
