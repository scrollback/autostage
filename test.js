//var request = require("request");
//
//request({
//	url: "https://api.github.com/repos/scrollback/scrollback/issues/745/comments", 
//	method: 'PUT',
//	headers: {
//		'User-Agent': "scrollbackbot"
//	},
//	json: {"body": "Hello, world"}}, function(error, request, body){
//   console.log("body ", body);
//});


var childProcess = require('child_process'),
	fs = require("fs");
childProcess.exec("chmd +x test1.sh")
childProcess.execSync("./test1.sh");


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


copyFile(
	'/home/chandra/autostage/test.sh',
	'/home/chandra/autostage/test1.sh',
	function(line) { // line transform function
		return line.replace(/\$pullre\b/g, 745)/*.replace(/\$port\b/g, port)*/;
		// inside the file, write server_name $branch.stage.scrollack.io
	},
	function(){
		console.log("helo");
	}
);
