var tuerBase = require('../model/base'),
base64 = require('../lib/base64'),
fs = require('fs'),
uuid = require('node-uuid'),
path = require('path'),
util = require('../lib/util'),
token = require('../lib/token'),
Avatar = require('../lib/avatar'),
xss = require('xss'),
pag = require('../lib/pag').pag,
config = require('../lib/config'),
rootdir = config.rootdir,
escape = require('jade').runtime.escape,
EventProxy = require('eventproxy').EventProxy;

var save = function(req,res){
  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }
  var body = req.body,
  content = body.content;
  if(content.length > 24){
    res.redirect('500');
    return;
  }
  tuerBase.save({
    content:content,
    userid:req.session.userdata._id.toString()
  },'say',function(err,data){
     if(err){
        res.redirect('500');
     }else{
        tuerBase.addFeed({
            type:'say',
            uid:req.session.userdata._id.toString(),
            id:data[0]['_id'].toString()
        },function(err){
            if(err) throw err;
            res.redirect('home');
        });
     }
  });
};

var remove = function(req,res){
  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }
  var body = req.body,id = body.id,uid = req.session.userdata._id.toString();
  tuerBase.findById(id,'say',function(err,say){
    if(err){
	res.redirect('500');
    }else{
	if(say.userid === uid){
	  tuerBase.removeById(id,'say',function(err,say){
		if(err) res.redirect('500');
		else{
		  tuerBase.removeFeed(id,function(err){
			if(err) throw err;
    			res.redirect('back');
		  });
		}
	  });
        }else{
	 res.redirect('500');
	}
    }
  });
};

exports.save = save;
exports.remove = remove;
