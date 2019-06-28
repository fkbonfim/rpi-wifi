var exec = require('child_process').exec;
var self;

function WpaCliService(path) {
	self = this;
	this._path = path ? path : 'wpa_cli';
}

//Private methods

function parseStatus(text) {
	var content = text.split("\n");
	var current = {};

	if (!content.length) return null;
	content.forEach(function (item) {
		if (item.includes('bssid')) current.address = item.replace(/bssid=\s*/, '').toUpperCase();
		else if (item.includes('ssid')) current.ssid = item.replace(/ssid=\s*/, '');
		else if (item.includes('wpa_state')) current.wpa_state = item.replace(/wpa_state=\s*/, '');
	});

	return current.address ? current : null;
}

//Public methods

WpaCliService.prototype.reconfigure = function (callback) {
	var command = this._path + ' reconfigure';
	exec(command, (error, stdout, stderr) => {
		if (stdout.includes("FAIL")) {
			callback(stdout);
		} else {
			callback();
		}
	});
}

WpaCliService.prototype.disconnect = function (callback) {
	var command = this._path + ' disconnect';
	exec(command, (error, stdout, stderr) => {
		if (stdout.includes("FAIL")) {
			callback(stdout);
		} else {
			callback();
		}
	});
}

WpaCliService.prototype.reconnect = function (callback) {
	var command = this._path + ' reconnect';
	exec(command, (error, stdout, stderr) => {
		if (stdout.includes("FAIL")) {
			callback(stdout);
		} else {
			callback();
		}
	});
}

WpaCliService.prototype.selectNetwork = function (id, callback) {
	var command = this._path + ' select_network ' + id;
	exec(command, (error, stdout, stderr) => {
		if (stdout.includes("FAIL")) {
			callback(stdout);
		} else {
			callback();
		}
	});
}

WpaCliService.prototype.status = function (callback, wInterface) {
	var command = this._path + ' status';
	if (wInterface) {
		command += ' -i ' + wInterface;
	}
	exec(command, (error, stdout, stderr) => {
		if (stdout.includes("FAIL")) {
			callback(stdout);
		} else {
			var current = parseStatus(stdout);
			callback(null, current);
		}
	});
}

module.exports = WpaCliService;
