var fs = require('fs'),
	config = require('./config');

module.exports.createDomain = function(user, branch) {
	//console.log("Create domain:", arguments);
	var teamMembers = config.teamMembers;
	if (teamMembers.indexOf(user) > -1) {
		fs.readFile(config.nginx_path+ "scrollback", function(err, data) {
			if (err) throw err;
			data = data.toString('utf-8');
			var lines = data.split("\n");
			var newdata = [];
			lines.forEach(function(line) {
				if (/server_name /.test(line)) {
					line = line.replace("stage.scrollback.io", branch + ".scrollback.com");
					//console.log(line);
				}
			
				newdata.push(line);
			});
			// set up new scrollback
			// change port on config.
			// create new database and create tables.
			// create new redis databases or edit server-config.js database numbers.

			data = newdata.join("\n");
			console.log("new data is ", data);
			fs.writeFile(config.nginx_path + branch + '.com', data, function(err) {
				if (err) throw err;
			});
		});
	}
};
//createDomain("chandrascrollback", "helo");