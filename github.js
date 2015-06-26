/* global require, exports */
/* jshint -W116 */

var fs = require('fs'),
	childProcess = require('child_process'),
	config = require('./config.js'),
	teamMembers = config.teamMembers,
	gitcomit = require('./git-comment.js'),
	scrollbackProcesses = {};

var startScrollback = function(branch, pullno) {
	//process.chdir(config.baseDir + 'scrollback-' + branch);
	gitcomit.gitComment(branch, pullno);
	try {
		console.log('deleting npm module...');
		childProcess.execSync('rm -rf node_modules/');
	} catch (err) {
		console.log(err);
	}
	try {
		//installing npm
		console.log('installing npm module...');
		childProcess.execSync('npm install');
	} catch (err) {
		console.log(err);
	}
	try {
		//installingg bower
		console.log('installing bower...');
		childProcess.execSync('bower install');
	} catch (err) {
		console.log(err);
	}
	try {
		//running gulp files
		console.log('running gulp...');
		childProcess.execSync('gulp');
	} catch (err) {
		console.log(err);
	}
	//starting scrollback
	console.log('Autostaging ' + branch + '.stage.scrollback.io...');

	scrollbackProcesses[branch] = childProcess.execSync('node index &');

};

//delete the directory when a pull request is closed
exports.deleteDomain = function(branch) {
	process.chdir(config.baseDir);
	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {

		childProcess.exec('rm -rf scrollback-' + branch + ' ' + branch + '.nginx.conf', function() {
			console.log('deleting the scrollback-' + branch + ' directory and all config files');
		});
		childProcess.exec('sudo rm -rf ' + config.nginxDir + branch + '.stage.scrollback.io');
		if (scrollbackProcesses[branch]) {
			scrollbackProcesses[branch].kill();
			delete scrollbackProcesses[branch];
		} else {
			console.log("no scrollbackProcesss");
		}
	} else {
		console.log("no scrollback-" + branch + " directory present");
	}
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

	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {
		process.chdir(config.baseDir + 'scrollback-' + branch);
		console.log(process.cwd());
		childProcess.exec('git pull', function() {
			console.log("updating the repository");
			try {
				//running gulp files
				console.log('running gulp...');
				childProcess.execSync('gulp');
			} catch (err) {
				console.log(err);
			}
			//starting scrollback
			console.log(scrollbackProcesses)
			console.log('Autostaging ' + branch + '.stage.scrollback.io...');
			scrollbackProcesses[branch] = childProcess.execSync('node index &');
		});

	} else {
//		gitcomit.gitComment(branch, pullRequestNo);
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
							if (numOps === 0) {
								process.chdir(config.baseDir + 'scrollback-' + branch);
								startScrollback(branch, pullRequestNo);
							}

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
	childProcess.execSync("touch " + config.baseDir + "scrollback-" + branch + "/logs/nginx/error.log");
	childProcess.exec("sudo cp " + config.baseDir + branch + ".nginx.conf /etc/nginx/sites-enabled/" + branch + ".stage.scrollback.io");
	callback();
};
