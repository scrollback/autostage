/* global require, exports */
/* jshint -W116 */

var fs = require('fs'),
	process = require('process'),
	childProcess = require('child_process'),
    config = require('./config.js'),
    teamMembers = config.teamMembers,
	scrollbackProcesses = {};


var startScrollback = function(branch) {
	process.chdir(config.baseDir + 'scrollback-' + branch);
	scrollbackProcesses[branch] = childProcess.spawn('node index.js');
};

/*var stopScrollback = function(branch) {
	scrollbackProcesses[branch].kill();
	delete scrollbackProcesses[branch];
};*/

exports.createDomain = function(user, branch, pullRequestNo) {
    var port = 7000 + pullRequestNo;

	var copyFile = function (readPath, writePath, lineTransform, callback) {
        fs.readFile(readPath, function(err, data) {
            if (err) throw err;

			fs.writeFile(
				writePath,
				data.toString('utf-8').split("\n").map(lineTransform).join('\n'),
				function(err) {
					if (err) throw err;
					callback();
				}
			);
        });
	};

    if (teamMembers.indexOf(user) < 0) return;

	// First, check out this branch into a new directory.

	process.chdir(config.baseDir);
	childProcess.exec(
		'git clone --depth 1 --branch ' + branch +
		' https://github.com/scrollback/scrollback.git scrollback-' + branch, function (err) {
			if(err !== null) {
				console.log('Error occured while checking out ' + branch, err);
				return;
			}

			var createCallback = (function () {
				var numOps = 0;
				return function () {
					numOps++;
					return function () {
						numOps--;
						if(numOps === 0) startScrollback(branch);
					};
				};
			})();

			// copy and transform the nginx file
			copyFile(
				config.base_dir + 'scrollback-' + branch + '/tools/nginx.conf',
				config.nginx_dir + 'scrollback-' + branch + '.stage.scrollback.io',
				function (line) { // line transform function
					return line.replace(/$branch\b/g, branch).replace(/$port\b/g, port);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + branch + '/server-config.sample.js',
				config.baseDir + 'scrollback-' + branch + '/server-config.js',
				function (line) { // line transform function
					return line.replace(/$branch\b/g, branch).replace(/$port\b/g, port);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + branch + '/client-config.sample.js',
				config.baseDir + 'scrollback-' + branch + '/client-config.js',
				function (line) { // line transform function
					return line.replace(/$branch\b/g, branch);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);
		});
    };

/*exports.deleteDomain = function (user, branch) {
	stopScrollback(branch);
}*/
