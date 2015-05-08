var tuerBase = require('../model/base'),
config = require('../lib/config'),
base64 = require('../lib/base64'),
Avatar = require('../lib/avatar'),
crypto = require('crypto'),
secret = 'tuer-jwt-secret',
jwt = require('jwt-simple'),
EventProxy = require('eventproxy').EventProxy;

function setHeader(res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
}

exports.callback = function(req,res,next){

};

exports.login = function(req,res,next){
    var proxy = new EventProxy(),
    accounts = req.body.email.trim(),
    pwd = req.body.pwd.trim(),
    render = function(data) {
      var errorMap = {
        '001': '帐号不存在',
        '002': '帐号密码不正确'
      };
      setHeader(res);
      if (errorMap.hasOwnProperty(data)) {
        res.json({'error': errorMap[data]});
      } else {
	delete data['pwd'];
	delete data['tokens'];
	var token = jwt.encode({
	  id:data._id,
	  exp: (60 * 1000 * 60 * 24 * 7) + Date.now()
	},secret);
        res.json({'data': {token:token,data:data}});
      }
    };

    proxy.assign('findLoginuser', render);

    if (accounts && pwd) {
      var md5 = crypto.createHash("md5");
      md5.update(pwd);
      pwd = md5.digest("hex");
      tuerBase.findOne({
        accounts: accounts
      },
      'users', function(err, user) {
        if (err || ! user) {
          proxy.trigger('findLoginuser', '001');
        } else {
          if (user['pwd'] === pwd) {
            proxy.trigger('findLoginuser', user);
          } else {
            proxy.trigger('findLoginuser', '002');
          }
        }
      });
    } else {
      proxy.trigger('findLoginuser', '001');
    }
};
