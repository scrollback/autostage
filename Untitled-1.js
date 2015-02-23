var fs = require('fs-extra'),
	base_dir = '/home/chandrakant/scrollback1',
	config = require('./config.js'),
	teamMembers = config.teamMembers;

var createDomain = function(user, branch) {

	var changeFile = function(path, old_line, new_line, regex1, regex2) {
		fs.readFile(path, function(err, data) {
			if (err) throw err;
			data = data.toString('utf-8');
			var lines = data.split("\n");
			var newdata = [];
			lines.forEach(function(line) {
				if (regex1.test(line)) {
					line = line.replace(old_line, new_line);
					//console.log(line);
				}
				newdata.push(line);
			});
			data = newdata.join("\n");
			console.log(data);
			fs.writeFile(path + "-" + branch, data, function(err) {
				if (err) throw err;
			});
		});
	};

	if (teamMembers.indexOf(user) > -1) {
		fs.copy(base_dir, base_dir + "-" + branch, function(err) {
			if (err) return console.error(err);

			changeFile(config.nginx_path + "scrollback", "stage.scrollback.io",
					   branch + ".scrollback.io", /server_name /);   

			// change config.
			changeFile(base_dir + "-" + branch + '/server-config.js',
					   "stage.scrollback.io", branch + ".scrollback.io",
					   /stage.scrollback.io/);

			changeFile(base_dir + "-" + branch + '/client-config.js', "//stage.scrollback.io",
					   branch + ".scrollback.io", /host: /);

		});


		// create new database and create tables.
		// create new redis databases or edit server-config.js database numbers.

	}
};
createDomain("chandrascrollback", "est");