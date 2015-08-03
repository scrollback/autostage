/* global require, exports */
/* jshint -W116 */
/*eslint no-use-before-define: 0*/
"use strict";
var fs = require('fs'),
	childProcess = require('child_process'),
	gitcomment = require('./git-api.js')[0],
	config = require('./config.js'),
	log = require('./logger.js'),
	dir,
	scrollbackProcesses = {};

var startScrollback = function(branch, cb) {
	//process.chdir(config.baseDir + 'scrollback-' + branch);
	childProcess.execSync('rm -rf node_modules/');
	try {
		//installing npm
		log.i('installing npm module...');
		childProcess.execSync('npm install');
		//childProcess.execSync('npm rebuild node-sass');
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
		childProcess.execSync('npm rebuild node-sass');
		childProcess.execSync('gulp');
	}
	//starting scrollback
	log.i('Autostaging the ' + branch + ' branch ');
	try {
		scrollbackProcesses[branch] = childProcess.execSync('sudo start ' + branch);
		log.i(scrollbackProcesses[branch].toString('utf-8'));
	} catch (err) {
		log.e(err.message);
	}
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

var updateDomain = function(branch, pullRequestNo, release) { //upadate the directory
	if (release) dir = release;
	else dir = branch;
	if (fs.existsSync(config.baseDir + 'scrollback-' + dir)) {
		process.chdir(config.baseDir + 'scrollback-' + dir);
		log.i(process.cwd());
		childProcess.exec('git pull', function() {
			log.i("updating the repository scrollback-" + dir);
			try {
				//running gulp files
				log.i('running gulp...');
				childProcess.execSync('gulp');
			} catch (err) {
				log.i(err.message);
				try {
					childProcess.execSync('sudo service ' + dir + ' stop');
				} catch (err2) {
					log.e(err2.message);
				}
				startScrollback(dir, function() {
					log.e('Restarting ' + dir + '.stage.scrollback.io ...');
				});
				return;
			}
			//starting scrollback
			log.i('Restarting ' + dir + '.stage.scrollback.io ...');
			try {
				childProcess.execSync('sudo restart ' + dir);
			} catch (err) {
				log.e(err.message);
				try {
					childProcess.execSync('sudo start ' + dir);
				} catch (err2) {
					log.e(err2.message);
				}

			}

		});
	} else if (release) {
		createDomain(branch, pullRequestNo, release);
	} else createDomain(branch, pullRequestNo);
};

var createDomain = function(branch, pullRequestNo, release) { //create a new directory
	var port = 7000 + pullRequestNo;

	if (release) {
		dir = release;
	} else dir = branch;
	log.i("cloning ur branch into scrollback-" + dir);
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
		' https://github.com/scrollback/scrollback.git scrollback-' + dir,
		function(err1) {
			log.i("scrollback-" + dir + " created");
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
							nginxOp(dir, function() {
								log.i('reload nginx');
								try {
									childProcess.execSync("sudo nginx -s reload");
								} catch (err) {
									log.e(err.message);
								}
							});
							process.chdir(config.baseDir + 'scrollback-' + dir);
							startScrollback(dir, function() {
								if (release) return;
								gitcomment(branch, pullRequestNo);
							});
						}

					};
				};
			})();

			copyFile(
				config.baseDir + 'scrollback-' + dir + '/server-config-template.js',
				config.baseDir + 'scrollback-' + dir + '/server-config.js',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, dir).replace(/\$port\b/g, port);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + dir + '/client-config-template.js',
				config.baseDir + 'scrollback-' + dir + '/client-config.js',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, dir);
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);


			copyFile(
				config.baseDir + 'scrollback-' + dir + '/lib/logger.js',
				config.baseDir + 'scrollback-' + dir + '/lib/logger.js',
				function(line) { // line transform function
					return line.replace(/email && isProduction\(\)/, "email").replace(/Error logs/, 'Error logs from ' + branch + ' server');
					// inside the file, write server_name $branch.stage.scrollack.io
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + dir + '/tools/nginx.conf',
				config.baseDir + dir + '.nginx.conf',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, dir).replace(/\$port\b/g, port);
					// inside the file, replace $branch with branch name and $port with port no
				},
				createCallback()
			);

			copyFile(
				config.baseDir + 'scrollback-' + dir + '/tools/scrollback.template.conf',
				config.baseDir + dir + '.conf',
				function(line) { // line transform function
					return line.replace(/\$branch\b/g, dir);
					// inside the file, replace $branch with branch name
				},

				createCallback()
			);


		});
};

exports.autostage = function(state, branch, pullRequestNo, release) {
	//	console.log(arguments)
	if (state === 'opened' || state === 'reopened') {
		if (release) { //check if its a release branch
			try {
				childProcess.execSync('sudo stop release');
			} catch (err1) {
				log.e(err1.message);
			}
			if (fs.existsSync(config.baseDir + 'scrollback-' + release)) {
				childProcess.exec('rm -rf ' + config.baseDir + 'scrollback-' + release, function(err) { //delete the previous release branch directory
					if (err) {
						log.e(err);
					}
					log.i("deleting previous release directory and creating a new one");
					createDomain(branch, pullRequestNo, release);
				});
			} else createDomain(branch, pullRequestNo, release);

		} else createDomain(branch, pullRequestNo);
	}
	if (state === "synchronize") {
		//		if (release) updateDomain(branch, pullRequestNo, release);
		//		else
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

exports.hotfix = function(sha, user) {
	log.i("creating a pull request with " + sha + " commit only")
	var newBranch = user + "-hotfix";
	process.chdir(config.baseDir + "scrollback");
	childProcess.execSync("git pull");
	try {
		childProcess.execSync("git checkout -b " + newBranch + " master");
	} catch (err) {
		log.e(err.message)
	}


	childProcess.execSync("git cherry-pick " + sha);

	childProcess.execSync("git push origin " + newBranch);
	childProcess.execSync("git checkout master");


}
