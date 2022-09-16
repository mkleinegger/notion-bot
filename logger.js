var fs = require("fs");
var util = require("util");
var logFile = fs.createWriteStream("logs.txt", { flags: "a" });
var logStdout = process.stdout;

exports.logger = function () {
  logFile.write(
    new Date().toISOString() + ": " + util.format.apply(null, arguments) + "\n"
  );
  logStdout.write(
    new Date().toISOString + ": " + util.format.apply(null, arguments) + "\n"
  );
};
