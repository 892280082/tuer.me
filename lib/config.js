var rootdir = '/home/tuer2.0/',
port = 3000,
mport = 3030,
cookiepath = '127.0.0.1',
host = '127.0.0.1:' + port,
jshost = '127.0.0.1:' + port,
csshost = '127.0.0.1:' + port,
imagehost = '127.0.0.1:' + port,
dbname = 'node-mongo-tuer',
dbhost = '127.0.0.1',
dbport = 27017,
mhost = '127.0.0.1:' + mport;

var config = {
	port: port,
	mport: mport,
	dbhost: dbhost,
	dbname: dbname,
	dbport: dbport,
	error: undefined,
	userdata: undefined,
	template: undefined,
	mood: [{
		value: '喜',
		_id: 0
	},
	{
		value: '怒',
		_id: 1
	},
	{
		value: '哀',
		_id: 2
	},
	{
		value: '乐',
		_id: 3
	}],
	weather: [{
		value: '晴',
		_id: 0
	},
	{
		value: '阴',
		_id: 1
	},
	{
		value: '雨',
		_id: 2
	},
	{
		value: '雪',
		_id: 3
	},
	{
		value: '大风',
		_id: 4
	}],
	rootdir: rootdir,
	host: host,
	imagehost: imagehost,
	jshost: jshost,
	csshost: csshost,
	mhost: mhost,
	cookiepath: cookiepath,
	timeout: 1000 * 60 * 60 * 2,
	nav: [{
		text: '登录',
		href: '/login'
	},
	{
		text: '注册',
		href: '/register'
	}],
	loginnav: [{
        text:'写日记',
        href:'/diary/write'
    },
    {
		text: '帐号设置',
		href: '/set'
	},
	{
		text: '登出',
		href: '/logout'
	}],
    adminnav:[{
		text: '登出',
		href: '/logout'
    }],
	is_login: false,
	countDownTime: function() {
		var D = new Date(),
		lefttime = (24 * 60) - ((D.getHours() * 60) + D.getMinutes());
		return '距离明天还有：' + Math.floor(lefttime / 60) + '小时' + lefttime % 60 + '分钟';
	},
	scripts: [
    'seajs/sea.js',
    'jquery/jquery-1.7.2.min.js',
	'bootstrap/js/bootstrap.min.js'],
	footer: [{
        text:'WAP版',
        href:'https://m.tuer.me'
    },
    {
		text: '关于兔耳',
		href: 'https://www.tuer.me/about/'
	},
	{
		text: '使用帮助',
		href: 'https://www.tuer.me/help/'
	},
	{
		text: '兔耳API',
		href: 'https://github.com/xiaojue/tuer.me/blob/master/docs/index.md'
	},
	{
		text: 'ChangeLog',
		href: 'https://www.tuer.me/log'
	},
	{
		text: '提交BUG',
		href: 'https://www.tuer.me/diary/50851ba98bd5768b4d000001'
    }]
};

module.exports = config;

