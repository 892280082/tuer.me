/**
 * Module dependencies.
 */

var express = require('express'),
config = require('./lib/config'),
rootdir = config.rootdir;
//RedisStore = require('connect-redis')(express);
var myOAP = require('./lib/OAP');
var app = express.createServer();
var wap = express.createServer();

// Configuration
function Configuration(app, rootdir) {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', {
		layout: false
	});
	app.use(express.bodyParser({
		uploadDir: rootdir + '/public/simg/'
	}));
	app.use(express.cookieParser());
	app.use(express.query());
	app.use(express.session({
		secret: 'tuer secret'
		//store: new RedisStore
	}));
	app.use(express.methodOverride());
	app.use(express['static'](__dirname + '/public'));
	app.use(express.favicon(__dirname + '/public/favicon.ico'), {
		maxAge: 2592000000
	});
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "X-Requested-With");
		res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
next();
	});
	app.use(myOAP.oauth());
	app.use(myOAP.login());
	app.use(function(req, res, next) {
		//判断ie版本
		var sys = {};
		var s;
		var ua = req.headers['user-agent'] ? req.headers['user-agent'].toLowerCase() : '';
		console.log(host);
		if (! ((/^m.tuer.me/).test(host)) && (s = ua.match(/msie ([\d.]+)/)) && parseInt(s[1], 10) <= 7) {
			res.render('custom/ie', {
				version: s[1]
			});
		} else {
			next();
		}
	});
	app.use(app.router);
}

function development(app) {
	app.use(express.errorHandler({
		dumpExceptions: true,
		showStack: true
	}));
}

function production(app) {
	app.use(express.errorHandler());
}

exports.start = function(conf) {
	if (conf) {
		for (var i in conf) {
			if (config.hasOwnProperty(i)) config[i] = conf[i];
		}
	}
	app.configure(function() {
		Configuration(app, config.rootdir);
	});

	app.configure('development', function() {
		development(app);
	});

	app.configure('production', function() {
		production(app);
	});

	wap.configure(function() {
		Configuration(wap, config.rootdir);
	});

	wap.configure('development', function() {
		development(wap);
	});

	wap.configure('production', function() {
		production(wap);
	});
	//controllers
console.log('routes');
	require('./routes')(app);
	require('./wapRoutes')(wap);

	server = app.listen(config.port);
	wap.listen(config.mport);

	process.on('SIGINT', function() {
		server.close();
		process.exit();
	});

	console.log('app server on ' + config.host);
	console.log('wap server on ' + config.mhost);

};

