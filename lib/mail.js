/**
 * send mail class
 */

var nodemailer = require('nodemailer'),
util = require('../lib/util.js');

//nodemailer.sendmail = true;

exports.send_mail = function(options, callback) {
	var _conf = {
		sender: 'admin@tuer.me',
        headers:{
        }
	};
    util.mix(_conf,options);
console.log(_conf);
var transporter = nodemailer.createTransport();
	transporter.sendMail(_conf, function(err, success) {
		if (err) callback(err);
		else callback(null,success);
	});
};

