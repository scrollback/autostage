/* global require, exports */
/* jshint -W116 */
/*eslint no-use-before-define: 0*/
"use strict";
var fs = require('fs'),
	childProcess = require('child_process'),
	gitcomment = require('./git-comment.js'),
	config = require('./config.js'),
	log = require('./logger.js'),
	scrollbackProcesses = {};

var startScrollback = function(branch, cb) {
	//process.chdir(config.baseDir + 'scrollback-' + branch);
	childProcess.execSync('rm -rf node_modules/');
	try {
		//installing npm
		log.i('installing npm module...');
		childProcess.execSync('npm install');
	} catch (err) {
		log.e(err.message);
	}
	try {
		//installingg bower
		log.i('installing bower...');
		childProcess.execSync('bower install');
	} catch (err) {
		log.e(err.message);
	}


	try {
		//running gulp files
		log.i('running gulp...');
		childProcess.execSync('gulp');
	} catch (err) {
		log.e(err.message);
	}
	//starting scrollback
	log.i('Staging your branch ' + branch);
	try {
		scrollbackProcesses[branch] = childProcess.execSync('sudo start ' + branch);
	} catch (err) {
		log.e(err.message);
	}
	log.i(scrollbackProcesses[branch].toString('utf-8'));
	cb();

};

var deleteDomain = function(branch) { //delete the directory when a pull request is closed
	process.chdir(config.baseDir);
	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {
		try {
			childProcess.execSync('sudo service ' + branch + ' stop');
		} catch (err) {
			log.e(err.message);
		}
		childProcess.exec('rm -rf scrollback-' + branch + ' ' + branch + '.nginx.conf ' + branch + '.conf', function(err) {
			if (err) log.e(err);
			log.i('Removing the scrollback-' + branch + ' directory and all config files');
		});
		childProcess.exec('sudo rm ' + config.nginxDir + 'scrollback-' + branch, function(err) {
			if (err) log.e(err);
			log.i('Removing nginx config files');
		});
		childProcess.exec('sudo rm /etc/init/' + branch + '.conf', function(err) {
			if (err) log.e(err);
			log.i('Removing upstart config files');
		});

		childProcess.exec('sudo rm -rf /var/run/scrollback-' + branch, function(err) {
			if (err) log.e(err);
			log.i('Removing upstart config files');
		});
		if (scrollbackProcesses[branch]) {
			//			scrollbackProcesses[branch].kill();

			delete scrollbackProcesses[branch];
		} else {
			log.i("no scrollbackProcesss");
		}
	} else {
		log.i("no scrollback-" + branch + " directory present");
	}
};

var updateDomain = function(branch, pullRequestNo) { //upadate the directory
	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {
		process.chdir(config.baseDir + 'scrollback-' + branch);
		log.i(process.cwd());
		childProcess.exec('git pull', function() {
			log.i("updating the repository");
			try {
				//running gulp files
				log.i('running gulp...');
				childProcess.execSync('gulp');
			} catch (err) {
				log.i(err.message);
				startScrollback(branch, function() {
					log.e('Restarting ' + branch + '.stage.scrollback.io ...');
				});
				return;
			}
			//starting scrollback
			log.i('Restarting ' + branch + '.stage.scrollback.io ...');
			childProcess.execSync('sudo restart ' + branch);
		});
	} else createDomain(branch, pullRequestNo);
};

var createDomain = function(branch, pullRequestNo) { //create a new directory
	var port = 7000 + pullRequestNo;
	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {
		updateDomain(branch, pullRequestNo);
		return;
	}
	var copyFile = function(readPath, writePath, lineTransform, callback) {
		fs.readFile(readPath, function(err, data) {
			if (err) log.e(err);
			fs.writeFile(
				writePath,
				data.toString('utf-8').split("\n").map(lineTransform).join('\n'),
				function(err1) {
					if (err1) throw err1;
					callback();
				}
			);
		});
	};

	process.chdir(config.baseDir);
	childProcess.exec(
		'git clone --depth 1 --branch ' + branch +
		' https://github.com/scrollback/scrollback.git scrollback-' + branch,
		function(err1) {
			log.i("cloning ur branch...");
			if (err1 !== null) {
				log.e('Error occured while checking out ' + branch, err1.message);
				return;
			}

			var createCallback = (function() {
				var numOps = 0;
				return function() {
					numOps++;
					return function() {
						numOps--;
						if (numOps === 0) {
							nginxOp(branch, function() {
								log.i('reload nginx');
								try {
									childProcess.execSync("sudo nginx -s reload");
								} catch (err) {
									log.e(err.message);
								}
							});
							process.chdir(config.baseDir + 'scrollback-' + branch);
							startScrollback(branch, function() {
								gitcomment.gitComment(branch, pullRequestNo);
							});
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
				config.baseDir + 'scrollback-' + branch + '/lib/logger.js',
				config.baseDir + 'scrollback-' + branch + '/lib/logger.js',
				function(line) { // line transform function
					return line.replace(/email && isProduction\(\)/, "email");
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + branch + '/tools/nginx.conf',
				config.baseDir + branch + '.nginx.conf',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, branch).replace(/\$port\b/g, port);
					// inside the file, replace $branch with branch name and $port with port no
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + branch + '/tools/scrollback.template.conf',
				config.baseDir + branch + '.conf',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, branch);
					// inside the file, replace $branch with branch name
				},

				createCallback()
			);


		});
};

exports.autostage = function(state, branch, pullRequestNo) {
	if (state === 'opened' || state === 'reopened') createDomain(branch, pullRequestNo);
	if (state === "synchronize") {
		updateDomain(branch, pullRequestNo);
		return;
	}
	if (state === 'closed') {
		deleteDomain(branch);
		return;
	}
	//gitcomment.gitComment(branch, pullRequestNo);
};

var nginxOp = function(branch, callback) {
	try {
		childProcess.exec("chmod +x autostage/./run.sh");
	} catch (err) {
		log.e(err.message);
	}
	try {
		childProcess.execSync("autostage/./run.sh " + branch);
	} catch (err) {
		log.e(err.message);
	}
	log.i("can start your server with upstart");
	callback();
};
