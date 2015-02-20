var fs = require('fs-extra'),
    base_dir = '/home/scrollback/scrollback',
    config = require('./config'),
    teamMembers = config.teamMembers;

module.exports.createDomain = function (user, branch) { 
    var changeFile = function (path, regex, old_line, new_line,) {
        fs.readFile(path, function (err, data) {
            if (err) throw err;
            data = data.toString('utf-8');
            var lines = data.split("\n");
            var newdata = [];
            lines.forEach(function (line) {
                if (regex.test(line)) {
                    line = line.replace(old_line, new_line);
                    //console.log(line);
                }
                newdata.push(line);
            });
            data = newdata.join("\n");
            callback();
            fs.writeFile(path +"-"+ branch, data, function (err) {
                if (err) throw err;
            });
        });
    };

    if (teamMembers.indexOf(user) > -1) {
        fs.copy(base_dir, base_dir +"-"+ branch, function (err) {
            if (err) return console.error(err);

            changeFile(config.nginx_path + "scrollback", /server_name /, "stage.scrollback.io",
                       branch + ".scrollback.io");

            // change config.
            changeFile(base_dir +"-"+ branch + '/server-config.js',
                       /stage.scrollback.io/, "stage.scrollback.io", branch + ".scrollback.io");

            changeFile(base_dir +"-"+ branch + '/client-config.js', /host: /, "//stage.scrollback.io",
                       branch + ".scrollback.io");

        });


        // create new database and create tables.
        // create new redis databases or edit server-config.js database numbers.

    }
};
//createDomain("chandrascrollback", "helo");