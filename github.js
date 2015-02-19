var fs = require('fs-extra'),
    base_dir = '/home/scrollback/scrollback',
    config = require('./config');

module.exports.createDomain = function (user, branch) {
    var teamMembers = config.teamMembers;
    if (teamMembers.indexOf(user) > -1) {

        changeFile(config.nginx_path + "scrollback", "/server_name /", "stage.scrollback.io",
            branch + ".scrollback.com");

        fs.copy(base_dir, base_dir '-' + branch, function (err) {
            if (err) return console.error(err);
        });

        // change config.
        changeFile(base_dir '-' + branch + 'server-config.js',
            "/stage.scrollback.io/", "stage.scrollback.io", branch + ".scrollback.com");

        changeFile(base_dir '-' + branch + 'client-config.js', "/host: /", "//stage.scrollback.io",
            branch + ".scrollback.com");

        // create new database and create tables.
        // create new redis databases or edit server-config.js database numbers.

    }
};

var changeFile = function (path, regex, old_line, new_line) {
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
        console.log("new data is ", data);
        fs.writeFile(path, data, function (err) {
            if (err) throw err;
        });
    });
};
//createDomain("chandrascrollback", "helo");