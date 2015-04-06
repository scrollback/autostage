/* global require, exports */
/* jshint -W116 */

var fs = require('fs'),
	childProcess = require('child_process'),
	config = require('./config.js'),
	teamMembers = config.teamMembers,
	scrollbackProcesses = {};


var startScrollback = function(branch , callback ) {
	process.chdir(config.baseDir + 'scrollback-' + branch);
	childProcess.exec('npm install',
		childProcess.exec('bower install',
			childProcess.exec('gulp',
				scrollbackProcesses[branch] = childProcess.exec('npm start',
					function() {

						console.log('scrollback-' + branch + ' is ready');
					})
			)
		)
	);
	callback();
};

//delete the directory when a pull request is closed
/*var stopScrollback = function(branch) {
	scrollbackProcesses[branch].kill();
	delete scrollbackProcesses[branch];
};*/

exports.createDomain = function(user, branch, pullRequestNo) {
	var port = 7000 + pullRequestNo;

	var copyFile = function(readPath, writePath, lineTransform, callback) {
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
		' https://github.com/scrollback/scrollback.git scrollback-' + branch,
		function(err) {
			if (err !== null) {
				console.log('Error occured while checking out ' + branch, err);
				return;
			}

			var createCallback = (function() {
				var numOps = 0;
				return function() {
					numOps++;
					return function() {
						numOps--;
						if (numOps === 0)
							startScrollback(branch, function() {
								process.chdir(config.baseDir + 'autostage');
								childProcess.exec('sudo node server.js');
							});
					};
				};
			})();

			copyFile(
				config.baseDir + 'scrollback-' + branch + '/server-config.template.js',
				config.baseDir + 'scrollback-' + branch + '/server-config.js',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, branch).replace(/\$port\b/g, port);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + branch + '/client-config.template.js',
				config.baseDir + 'scrollback-' + branch + '/client-config.js',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, branch);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);


		});
};

/*exports.deleteDomain = function (user, branch) {
	stopScrollback(branch);
}*/
