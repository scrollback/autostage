/* global require, exports */
/* jshint -W116 */

var fs = require('fs'),
	childProcess = require('child_process'),
	config = require('./config.js'),
	teamMembers = config.teamMembers,
	scrollbackProcesses = {};

var startScrollback = function(branch) {
	process.chdir(config.baseDir + 'scrollback-' + branch);
	//console.log(process.cwd());
	console.log('deleting npm module...');
	childProcess.execSync('rm -rf node_modules/');
	//installing npm
	console.log('installing npm module...');
	childProcess.execSync('npm install');
	//installingg bower
	console.log('installing bower...');
	childProcess.execSync('bower install');
	//running gulp files
	console.log('running gulp...');
	childProcess.execSync('gulp');
	//starting scrollback
	console.log('staring scrollback-' + branch + '...');
	scrollbackProcesses[branch] = childProcess.execSync('node index &');
};

//delete the directory when a pull request is closed
exports.deleteDomain = function(branch) {
	process.chdir(config.baseDir);
	console.log('deleting the scrollback-' + branch + ' directory and all config files');
	childProcess.exec('rm -rf scrollback-' + branch + ' ' + branch + '.nginx.conf');
	childProcess.exec('sudo rm -rf ' + config.nginxDir + branch + '.stage.scrollback.io');
	//scrollbackProcesses[branch].kill();
	delete scrollbackProcesses[branch];
};

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


	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {
		process.chdir(config.baseDir + 'scrollback-' + branch);
		console.log(process.cwd());
		childProcess.exec('git pull', childProcess.exec('npm start'));
		startScrollback(branch);

	} else {
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
								startScrollback(branch);
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

				copyFile(
					config.baseDir + 'scrollback-' + branch + '/tools/nginx.conf',
					config.baseDir + branch + '.nginx.conf',
					function(line) { // line transform function
						return line.replace(/\$branch\b/g, branch).replace(/\$port\b/g, port);
						// inside the file, write server_name $branch.stage.scrollack.io
					},
					createCallback()
				);

				nginxOp(branch, function() {
					childProcess.exec("sudo nginx -s reload", createCallback());
				});
			});
	}
};

var nginxOp = function(branch, callback) {
	childProcess.execSync("mkdir -p " + config.baseDir + "scrollback-" + branch + "/logs/nginx");
	childProcess.execSync("touch " + config.baseDir + "scrollback-" + branch + "/logs/nginx/access.log");
	childProcess.exec("sudo cp " + config.baseDir + branch + ".nginx.conf /etc/nginx/sites-enabled/" + branch + ".stage.scrollback.io");
	callback();
};
