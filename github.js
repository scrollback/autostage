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

var nginxOp = function(branch, callback) {
	childProcess.execSync("mkdir -p " + config.baseDir + "scrollback-" + branch + "/logs/nginx");
	childProcess.execSync("touch " + config.baseDir + "scrollback-" + branch + "/logs/nginx/access.log");
	childProcess.execSync("touch " + config.baseDir + "scrollback-" + branch + "/logs/nginx/error.log");
	childProcess.exec("sudo cp " + config.baseDir + branch + ".nginx.conf /etc/nginx/sites-enabled/" + branch + ".stage.scrollback.io");
	callback();
};

var startScrollback = function(branch) {
	//process.chdir(config.baseDir + 'scrollback-' + branch);
	try {
		log.i('deleting npm module...');
		childProcess.execSync('rm -rf node_modules/');
	} catch (err) {
		log.e(err);
	}
	try {
		//installing npm
		log.i('installing npm module...');
		childProcess.execSync('npm install');
	} catch (err) {
		log.e(err);
	}
	try {
		//installingg bower
		log.i('installing bower...');
		childProcess.execSync('bower install');
	} catch (err) {
		log.e(err);
	}
	try {
		//running gulp files
		log.i('running gulp...');
		childProcess.execSync('gulp');
	} catch (err) {
		log.e(err);
	}
	//starting scrollback
	log.i('Autostaging ' + branch + '.stage.scrollback.io');

	scrollbackProcesses[branch] = childProcess.execSync('node index &');

};

var deleteDomain = function(branch) { //delete the directory when a pull request is closed
	process.chdir(config.baseDir);
	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {

		childProcess.exec('rm -rf scrollback-' + branch + ' ' + branch + '.nginx.conf', function(err) {
			if (err) log.e(err);
			log.i('deleting the scrollback-' + branch + ' directory and all config files');
		});
		childProcess.exec('sudo rm -rf ' + config.nginxDir + branch + '.stage.scrollback.io', function(err) {
			if (err) log.e(err);
			log.i('deleting the nginx files');
		});
		if (scrollbackProcesses[branch]) {
			scrollbackProcesses[branch].kill();
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
				log.e(err);
			}
			//starting scrollback
			log.i('Restarting ' + branch + '.stage.scrollback.io ...');
			childProcess.execSync('node index &');
		});
	} else createDomain(branch, pullRequestNo);
};

var createDomain = function(branch, pullRequestNo) { //create a new directory
	var port = 7000 + pullRequestNo;
	if (fs.existsSync(config.baseDir + 'scrollback-' + branch)) {
		updateDomain(branch, pullRequestNo);
	}
	var copyFile = function(readPath, writePath, lineTransform, callback) {
		fs.readFile(readPath, function(err, data) {
			if (err) throw err;

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
		function(err) {
			if (err !== null) {
				log.e('Error occured while checking out ' + branch, err);
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
	gitcomment.gitComment(branch, pullRequestNo);
};
