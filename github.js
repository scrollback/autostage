var fs = require('fs-extra'),
    base_dir = '/home/scrollback/scrollback',
    config = require('./config.js'),
    teamMembers = config.teamMembers;

module.exports.createDomain = function (user, branch, pull_request_no) {
    var port = 7000 + pull_request_no,
        arr = [];
    var changeFile = function (path, write_path, regex, old_line, new_line, callback) {
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
            fs.writeFile(write_path, data, function (err) {
                if (err) throw err;
                callback();
            });
        });
    };

    if (teamMembers.indexOf(user) > -1) {
        function run(i) {
            if (i === arr.length) return;
            arr[i](function () {
                run(i + 1);
            });
        };

        arr.push(function (callback) {
            changeFile(config.nginx_path + "scrollback", config.nginx_path + "scrollback-" + branch,
                /server_name /, "stage.scrollback.io",
                branch + ".scrollback.io", callback);
        });

        arr.push(function (callback) {
            changeFile(config.nginx_path + "scrollback-" + branch, config.nginx_path + "scrollback-" + branch,
                /access_log /, "/home/scrollback/scrollback/logs/nginx/access.log",
                "/home/scrollback/scrollback-" + branch + "/logs/nginx/access.log", callback);
        });

        arr.push(function (callback) {
            changeFile(config.nginx_path + "scrollback-" + branch, config.nginx_path + "scrollback-" + branch,
                /root /, "/home/scrollback/scrollback",
                "/home/scrollback/scrollback-" + branch, callback);
        });

        run(0);

        fs.copy(base_dir, base_dir + "-" + branch, function (err) {
            if (err) return console.error(err);
            // change config.
            changeFile(base_dir + "-" + branch + '/server-config.js',
                base_dir + "-" + branch + '/server-config.js', /stage.scrollback.io/,
                "stage.scrollback.io", branch + ".scrollback.io",
                function () {});

            changeFile(base_dir + "-" + branch + '/client-config.js',
                base_dir + "-" + branch + '/client-config.js', /host: /, "//stage.scrollback.io",
                branch + ".scrollback.io",
                function () {});
        });


        // create new database and create tables.
        // create new redis databases or edit server-config.js database numbers.

    }
};