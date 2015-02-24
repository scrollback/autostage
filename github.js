var fs = require('fs-extra'),
    base_dir = '/home/scrollback/scrollback',
    config = require('./config.js'),
    teamMembers = config.teamMembers;

module.exports.createDomain = function (user, branch) { 
    
    var changeFile = function(path, write_path, regex, old_line, new_line) {
        fs.readFile(path, function(err, data) {
            if (err) throw err;
            data = data.toString('utf-8');
            var lines = data.split("\n");
            var newdata = [];
            lines.forEach(function(line) {
                if (regex.test(line)) {
                    line = line.replace(old_line, new_line);
                    //console.log(line);
                }
                newdata.push(line);
            });
            data = newdata.join("\n");
            console.log(data);
            fs.writeFile(write_path, data, function(err) {
                if (err) throw err;
            });
        });
    };

    if (teamMembers.indexOf(user) > -1) {
        fs.copy(base_dir, base_dir + "-" + branch, function(err) {
            if (err) return console.error(err);

            changeFile(config.nginx_path + "scrollback", config.nginx_path + "scrollback-"+branch,
                       /server_name /, "stage.scrollback.io",
                       branch + ".scrollback.io");

            changeFile(config.nginx_path + "scrollback-"+branch, config.nginx_path + "scrollback-"+branch,
                       /access_log /, "/home/scrollback/scrollback/logs/nginx/access.log",
                       "/home/scrollback/scrollback-"+branch+"/logs/nginx/access.log");

            // change config.
            changeFile(base_dir+"-"+ branch + '/server-config.js',
                       base_dir+"-"+ branch + '/server-config.js', /stage.scrollback.io/,
                       "stage.scrollback.io", branch + ".scrollback.io");

            changeFile(base_dir + "-" + branch + '/client-config.js',
                       base_dir + "-" + branch + '/client-config.js',/host: /, "//stage.scrollback.io",
                       branch + ".scrollback.io");

        });


        // create new database and create tables.
        // create new redis databases or edit server-config.js database numbers.

    }
};
//createDomain("chandrascrollback", "helo");