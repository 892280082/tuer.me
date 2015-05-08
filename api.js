var restify = require('restify'),
tuerBase = require('./model/base'),
util = require('util'),
path = require('path'),
secret = 'tuer-jwt-secret',
jwt = require('jwt-simple'),
querystring = require('querystring'),
serializer = require('serializer');

var user = require('./routes/apis/user'),
diary = require('./routes/apis/diary'),
comment = require('./routes/apis/comment'),
feed = require('./routes/apis/feed'),
notebook = require('./routes/apis/notebook'),
tips = require('./routes/apis/tips');

var paths = {
	//user
	'user/info/:uid': ['public', user.info, 'get'],
	'user/follow/:uid': ['public', user.follow, 'get'],
	'user/edit/:uid': ['private', user.edit, 'post'],
	'user/attention/:uid': ['private', user.attention, 'post'],
	'user/hots': ['public', user.hots, 'get'],
	'user/news': ['public', user.news, 'get'],
	//feed
	'feed/news': ['public', feed.news, 'get'],
	//diary
	'diary/info/:id': ['public', diary.info, 'get'],
	'diary/edit/:id': ['private', diary.edit, 'post'],
	'diary/del': ['private', diary.del, 'post'],
	'diary/save': ['private', diary.save, 'post'],
	'diaries/user/:uid': ['public', diary.user, 'get'],
	'diaries/notebook/:bookid': ['public', diary.notebook, 'get'],
	'diaries/news': ['public', diary.news, 'get'],
	'diaries/follow/:uid': ['public', diary.follow, 'get'],
	//comment
	'comment/info/:id': ['public', comment.info, 'get'],
	'comment/save/:id': ['private', comment.save, 'post'],
	'comment/del/:id': ['private', comment.del, 'post'],
	//notebook
	'notebook/user/:uid': ['public', notebook.user, 'get'],
	'notebook/save': ['private', notebook.save, 'post'],
	'notebook/edit/:id': ['private', notebook.edit, 'post'],
	'notebook/del/:id': ['private', notebook.del, 'post'],
	//tips
	'tips/all': ['private', tips.all, 'get'],
	'tips/del/:id': ['private', tips.del, 'post']
};

serializer = serializer.createSecureSerializer('tuer encrytion secret', 'tuer signing secret');

var server = restify.createServer({
	name: 'tuerApi',
	version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());
server.use(restify.bodyParser({
	mapParams: false
}));
server.use(restify.throttle({
	burst: 3,
	rate: 1,
	ip: true
}));

server.use(function(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    next();
});

//全局校验
server.use(function(req, res, next) {
	//增加兔耳客户端的权限判断
	if(req.query['supertoken']){
	   var key = req.query['supertoken'];
	   try{
	   	var t = jwt.decode(key,secret);	  
	   }catch(e){
		next(new restify.NotAuthorizedError(e.message));
		return;
	   }
	   if(t.exp <= Date.now()){
		next(new restify.NotAuthorizedError('access token has expired'));
		return;
	   }
	   tuerBase.findUser(t.id, function(err, data) {
		if(err){
		  next(new restify.NotAuthorizedError(err));
		}else{
		req.authorization = {
			userdata: data,
			client_id:'4214a2d24465e6daf7b8ba59a4beca6b',
			user_id:data.id
		};
		 var url = req.url.slice(1);
		 for (var uri in paths) {
			var route = uri.slice(0, uri.indexOf(':')),
			matchs = url.match(new RegExp("^(" + route + ")"));
			if (matchs) {
			  var query = querystring.parse(req.getQuery());
			  if (req.authorization || (paths[uri][0] === 'public' && query['client_id'])) return next();
			  else return next(new restify.NotAuthorizedError('not authorized'));
			  break;
			}
		 }
		 return next();
		}		
	   });
	   return;
	}

	var data, atok, user_id, client_id, grant_date, extra_data, TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; //30天有效期
	if (req.query['access_token']) {
		atok = req.query['access_token'];
	} else if ((req.headers['authorization'] || '').indexOf('Bearer ') === 0) {
		atok = req.headers['authorization'].replace('Bearer', '').trim();
	} else if (req.query['client_id']) {
		tuerBase.findOne({
			'appkey': req.query['client_id']
		},
		'apis', function(err, data) {
			if (err) next(new restify.NotAuthorizedError(err));
			else {
				if (data) next();
				else next(new restify.NotAuthorizedError('appkey is not exits'));
			}
		});
		return;
	} else {
		//没有atok直接干掉，转到没权限的提示
		next(new restify.NotAuthorizedError('access_token must have'));
		return;
	}
    console.log(atok);
	try {
		data = serializer.parse(atok);
		user_id = data[0];
		client_id = data[1];
		grant_date = new Date(data[2]);
		extra_data = data[3];
	} catch(e) {	
		next(new restify.NotAuthorizedError(e.message));
		return;
	}
    console.log(data);
	tuerBase.findUser(user_id, function(err, data) {
		//对上面的user_id,client_id,grant_data,extra_data进行校验，ok则可获取api
		if (err) return next(new restify.NotAuthorizedError(err));
        console.log(data);
		if (data && data.tokens) {
			for (var i = 0; i < data.tokens.length; i++) {
				var grant = data.tokens[i];
				if (grant.appkey == client_id && grant.token == atok) {
					if (grant_date.getTime() + TOKEN_TTL > Date.now()) {
						req.authorization = {
							atok: atok,
							extra_data: extra_data,
							userdata: data,
							user_id: user_id,
							client_id: client_id,
							grant_date: grant_date
						};
						var url = req.url.slice(1);
						for (var uri in paths) {
							var route = uri.slice(0, uri.indexOf(':')),
							matchs = url.match(new RegExp("^(" + route + ")"));
							if (matchs) {
								var query = querystring.parse(req.getQuery());
								if (req.authorization || (paths[uri][0] === 'public' && query['client_id'])) return next();
								else return next(new restify.NotAuthorizedError('not authorized'));
								break;
							}
						}
						return next();
					} else {
						return next(new restify.NotAuthorizedError('the token has expired'));
					}
				}
			}
        }
	    return next(new restify.InvalidArgumentError('this token not exits'));
	});
});

for (var pat in paths) {
	var data = paths[pat],
	fun = data[1],
	type = data[2];
	server[type](pat, fun);
}

server.listen(3333, function() {
	console.log('server at 3333');
});

