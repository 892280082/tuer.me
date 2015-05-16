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

var detail = function(req, res, next) {
  var id = req.params.id,
  space = 100,
  page = isNaN(req.query.page) ? 0: req.query.page - 1,
  proxy = new EventProxy(),
  render = function(user, isSelf, diary, comments) {

    if (req.session.is_login) tuerBase.removeDiaryTips(req.session.userdata._id, diary._id);
    if ((diary.privacy == 1 && ! req.session.userdata) || (diary.privacy == 1 && user._id.toString() != req.session.userdata._id.toString())) {
      res.redirect('404');
      return;
    }

    util.setTime(diary);
    diary.img = util.getpics(150, 1, diary.filelist);
    diary.bigimg = util.getpics(500, 1, diary.filelist);
    diary.content = diary.content.replace(/\r\n/g, '<br>');

    user.avatarUrl = Avatar.getUrl(user.avatar);
    comments.forEach(function(item) {
      util.setTime(item);
      item.avatarUrl = Avatar.getUrl(item.avatar);
      item.content = util.drawUrl(escape(item.content).replace(/\r\n/g, '<br>'));
      if (req.session.is_login && item.userid !== req.session.userdata._id.toString()) item.reply = true;
      if (req.session.is_login && (diary.userid == req.session.userdata._id.toString() || item.userid == req.session.userdata._id.toString())) item.del = true;
    });

    req.session.title = user.nick + '的日记 ' + '<<' + (diary.title || diary.bookname) + '>>';
    req.session.error = req.flash('error');
    req.session.template = 'diarydetail';
        //res.send(user.nick + user.id + user.avatarUrl);
        
    res.render('diary/diarydetail', {
      config: config,
      session: req.session,
      user: user,
      isSelf: isSelf,
      diary: diary,
      pag: new pag({
        cur: page + 1,
        space: space,
        total: diary.commentcount,
        split: '=',
        url: '/diary/' + diary._id + '?page'
      }).init(),
      comments: comments
    });
        
  };

  proxy.assign('user', 'isSelf', 'diary', 'comments', render);

  if (!id) {
    res.redirect('404');
  } else {
    tuerBase.findDiaryById(id, function(err, diary) {
      if (err || ! diary) {
        next();
      } else {
        proxy.trigger('diary', diary);

        var uid = diary.userid;

        tuerBase.findUser(uid, function(err, user) {
          if (err) {
            res.redirect('500');
          } else {
            proxy.trigger('user', user);
            var isSelf = req.session.is_login ? req.session.userdata._id.toString() == user._id: false;
            proxy.trigger('isSelf', isSelf);
          }
        });

        tuerBase.findCommentSlice(diary._id.toString(), page * space, page * space + space, function(err, comments) {
          if (err) {
            res.redirect('500');
          } else {
            proxy.trigger('comments', comments);
          }
        });
      }
    });
  }
};

var list = function(req, res) {
  var page = req.params.page,
  space = 15,
  proxy = new EventProxy();
  if (page && isNaN(page)) {
    res.redirect('404');
    return;
  } else if (page == undefined || page == 1) {
    page = 0;
  } else {
    page = page - 1;
  }

  var split = page * space,
  render = function(Diaries, DiarysCount) {

    req.session.template = 'diaries';
    req.session.title = '全部日记';

    Diaries.forEach(function(item) {
      util.setTime(item);
      item.img = util.getpics(150, 1, item.filelist);
      item.avatarUrl = Avatar.getUrl(item.avatar);
      var img = util.getImgs(item.content)[0];
      item.img = img ? img+'?w=150&h=150' : item.img;
      item.wav = util.getWavs(item.content)[0];
      item.content = xss(item.content,{whiteList:{
      },stripIgnoreTag:true});
      item.content = item.content.length > 150 ? item.content.slice(0, 150) + '...': item.content;
    });

    res.render('diary/diaries', {
      config: config,
      session: req.session,
      diaries: Diaries,
      pag: new pag({
        cur: page + 1,
        space: space,
        total: DiarysCount,
        url: '/diaries'
      }).init()
    });

  };

  proxy.assign('Diaries', 'DiarysCount', render);

  tuerBase.findDiarySlice(split, split + space, function(err, lists) {
    if (err) {
      res.redirect('500');
    } else {
      proxy.trigger('Diaries', lists);
    }
  });

  tuerBase.getCount({
    privacy: 0
  },
  'diary', function(err, count) {
    if (err) {
      res.redirect('500');
    } else {
      proxy.trigger('DiarysCount', count);
    }
  });
};

var followedDiaries = function(req, res) {

  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }

  var page = req.params.page,
  space = 15,
  proxy = new EventProxy();
  if (page && isNaN(page)) {
    res.redirect('404');
    return;
  } else if (page == undefined || page == 1) {
    page = 0;
  } else {
    page = page - 1;
  }

  var split = page * space,
  render = function(Diaries, DiarysCount) {

    req.session.template = 'followedDiaries';
    req.session.title = req.session.userdata.nick + '关注的日记';

    Diaries.forEach(function(item) {
      util.setTime(item);
      item.img = util.getpics(150, 1, item.filelist);
      var img = util.getImgs(item.content)[0];
      item.img = img ? img+'?w=150&h=150' : item.img;
      item.wav = util.getWavs(item.content)[0];
      item.avatarUrl = Avatar.getUrl(item.avatar);
      item.content = xss(item.content,{whiteList:{
	},stripIgnoreTag:true});
      item.content = item.content.length > 150 ? item.content.slice(0, 150) + '...': item.content;
    });

    res.render('diary/diaries', {
      config: config,
      session: req.session,
      diaries: Diaries,
      pag: new pag({
        cur: page + 1,
        space: space,
        total: DiarysCount,
        url: '/followed/diaries'
      }).init()
    });

  };

  proxy.assign('Diaries', 'DiarysCount', render);

  tuerBase.findById(req.session.userdata._id.toString(), 'users', function(err, user) {
    if (err) {
      res.redirect('500');
    } else {
      tuerBase.findDiaryByUsers(user.firends, false, split, split + space, function(err, lists) {
        if (err) {
          res.redirect('500');
        } else {
          proxy.trigger('Diaries', lists);
        }
      });
console.log(user.firends);
      tuerBase.getCount({
        privacy: 0,
        userid: {
          '$in': user.firends
        }
      },
      'diary', function(err, count) {
        if (err) {
          res.redirect('500');
        } else {
            console.log(count);
          proxy.trigger('DiarysCount', count);
        }
      });
    }
  });
};

var getqiniutoken = function(req,res){
  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }
  var uid = req.session.userdata._id;
  var extname = req.query.extname;
  extname = extname.replace('image/','');
  tuerBase.findUser(uid, function(err, user) {
    if (err) {
            console.log(err);
      res.redirect('500');
    } else {
      var qiniuHost = 'http://tuer.qiniudn.com/@';
      var date = new Date();
      var currentToken = token('9G2Ym4i4dP08jgCl82o2wo0qk4bLrsd6Zn2GyxWO','4Z0ydknVSCmQrCfPhuKtdo3KO0CYxbVDZcYPra1k',{
        scope:'tuer',
        savekey:'/userupload/'+ date.getYear()+date.getMonth() + '/'+ uuid.v1() + '.'+extname,
        deadline:parseInt((Date.now() + (60 * 60 * 1000)) / 1000,10),
        returnBody:JSON.stringify({
          "url":qiniuHost + "$(key)",
          "uid":user.id
        }),
        returnUrl:'http://www.tuer.me/qiniucallback',
        mimeLimit:'image/*',
        fsizeLimit:1024*1024
      }); 
      res.json({token:currentToken});
    }
  });
};

var qiniucallback = function(req,res){
  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }
  var ret = req.query.upload_ret;
  var error = req.query.error;
  if(!error){
    //保存用户和图片的关联
    ret = JSON.parse(base64.decode(ret));
    tuerBase.save({uid:ret.uid,url:ret.url},'images',function(err,data){});
    res.send('<script>window.top.uploadSucces('+JSON.stringify(ret)+')</script>');
  }else{
    res.send('<script>window.top.uploadSucces('+JSON.stringify({error:error})+')</script>');
  }
};

var write = function(req, res) {

  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }

  var uid = req.session.userdata._id,
  proxy = new EventProxy(),
  render = function(user, books) {
    var date = new Date();
    //生成页面当前token,有效期1小时

    req.session.title = '写日记';
    req.session.template = 'write';
    req.session.error = req.flash('error');

    res.render('diary/write', {
      config: config,
      session: req.session,
      action: '/diary/save',
      user: user,
      books: books,
      mood: config.mood,
      weather: config.weather,
      diary: {}
    });

  };

  proxy.assign('user', 'books', render);
  tuerBase.findUser(uid, function(err, user) {
    if (err) {
            console.log(err);
      res.redirect('500');
    } else {
      proxy.trigger('user', user);
      tuerBase.findBy({
        owner: {
          '$in': [uid.toString(), - 1]
        }
      },
      'notebooks', user.notebook + 1, function(err, books) {
        if (err) {
                    console.log(err);
          res.redirect('500');
        } else {
          proxy.trigger('books', books);
        }
      });
    }
  });
};
var writenew = function(req, res) {

  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }

  var uid = req.session.userdata._id,
  proxy = new EventProxy(),
  render = function(user, books) {
    var date = new Date();
    //生成页面当前token,有效期1小时

    req.session.title = '写日记';
    req.session.template = 'write';
    req.session.error = req.flash('error');

    res.render('diary/writenew', {
      config: config,
      session: req.session,
      action: '/diary/save',
      user: user,
      books: books,
      mood: config.mood,
      weather: config.weather,
      diary: {}
    });

  };

  proxy.assign('user', 'books', render);
  tuerBase.findUser(uid, function(err, user) {
    if (err) {
            console.log(err);
      res.redirect('500');
    } else {
      proxy.trigger('user', user);
      tuerBase.findBy({
        owner: {
          '$in': [uid.toString(), - 1]
        }
      },
      'notebooks', user.notebook + 1, function(err, books) {
        if (err) {
                    console.log(err);
          res.redirect('500');
        } else {
          proxy.trigger('books', books);
        }
      });
    }
  });
};

var save = function(req, res) {
  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }
  var bookid = req.body.bookid,
  content = req.body.content,
  location = req.body.location,
  weather = req.body.weather,
  mood = req.body.mood,
  privacy = req.body.privacy || 0,
  forbid = req.body.forbid || 0,
  /*
  uploadPic = req.files.uploadPic,
  temp_path = uploadPic.path,
  type = function() {
    var _type;
    try {
      _type = '.' + uploadPic.type.split('/')[1];
    } catch(e) {
      return ".undef";
    }
    return _type;
  } (),
  filename = path.basename(temp_path),
  picname = filename + type,
  target_path = rootdir + '/public/images/' + picname,
  */
  proxy = new EventProxy(),
  saveNote = function(removeTemp, pic_path) {
    //var filelist = {};
    //if (pic_path) filelist['pic_path'] = picname;
    content = xss(content,{whiteList:{
      p:[], 
      a:['href','target'],
      img:['src','data-url','data-type','width','height'],
      b:[],
      i:[],
      u:[],
      strike:[],
      blockquote:[],
      pre:[],
      hr:[]
    },stripIgnoreTag:true});
    console.log(content);
    var savedata = {
      content: content,
      notebook: bookid,
      userid: req.session.userdata._id,
    //  filelist: filelist,
      mood: mood,
      weather: weather,
      privacy: privacy,
      forbid: forbid,
      commentcount: 0
    };
    if (weather) savedata['weather'] = weather;
    if (mood) savedata['mood'] = mood;
    if (location) savedata['location'] = location;
    tuerBase.getIds('diary', function(err, obj) {
      if (err) {
        req.flash('error', err);
        res.redirect('back');
      } else {
        savedata['id'] = obj.id;
        tuerBase.save(savedata, 'diary', function(err, data) {
          if (err) {
            req.flash('error', err);
            res.redirect('back');
          } else {
            tuerBase.updateById(req.session.userdata._id, {
              '$inc': {
                diarycount: 1
              }
            },
            'users', function(err) {
              if (err) {
                req.flash('error', err);
                res.redirect('back');
              } else {
                                tuerBase.addFeed({
                                    type:'diary',
                                    uid:savedata.userid.toString(),
                                    id:data[0]['_id'].toString()
                                },function(err){
                                    if(err) throw err;
                                    res.end('<script>if(localStorage){localStorage.removeItem("editorContent");} location.href="http://www.tuer.me"</script>');
                                });
              }
            });
          }
        });
      }
    });
  };
  //proxy.assign('removeTemp', 'pic_path', saveNote);

  //增加校验
  if ((!bookid || ! content) || ((privacy !== 0 && privacy != 1) || (forbid !== 0 && forbid != 1))) {
    req.flash('error', '非法操作');
    //util.remove_temp(proxy, 'removeTemp', temp_path);
    res.redirect('back');
    return;
  }

  if (location.trim().length > 10) {
    req.flash('error', '地点最多10个字');
    //util.remove_temp(proxy, 'removeTemp', temp_path);
    res.redirect('back');
    return;
  }

  if (content.trim().length > 22000) {
    req.flash('error', '日记字数最多22000字');
    //util.remove_temp(proxy, 'removeTemp', temp_path);
    res.redirect('back');
    return;
  }
  saveNote();
  /*
  if (uploadPic.size) {
    if (!type.match(/jpg|png|jpeg|gif/gi)) {
      req.flash('error', '只能上传图片文件');
      res.redirect('back');
      util.remove_temp(proxy, 'removeTemp', temp_path);
      return;
    }
    if (uploadPic.size > 20971520) {
      req.flash('error', '图片大小不能超过2MB');
      res.redirect('back');
      util.remove_temp(proxy, 'removeTemp', temp_path);
      return;
    }
    fs.rename(temp_path, target_path, function(err) {
      if (err) {
        req.flash('error', err);
        res.redirect('back');
      } else {
        proxy.trigger('removeTemp');
        util.bacthImages(target_path, function(err) {
          if (err) {
            req.flash('error', err);
            res.redirect('back');
          } else {
            proxy.trigger('pic_path', true);
          }
        });
      }
    });
  } else {
    util.remove_temp(proxy, 'removeTemp', temp_path);
    proxy.trigger('pic_path', false);
  }
  */
};

var edit = function(req, res) {

  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }

  var id = req.params.id,
  uid = req.session.userdata._id,
  proxy = new EventProxy(),
  render = function(user, books, diary) {
    if (user._id.toString() !== uid.toString()) {
      res.redirect('404');
      return;
    }

    req.session.title = '编辑日记';
    req.session.template = 'write';
    req.session.error = req.flash('error');

    diary.img = util.getpics(80, 1, diary.filelist);

    res.render('diary/write', {
      config: config,
      session: req.session,
      action: '/diary/update',
      user: user,
      books: books,
      mood: config.mood,
      weather: config.weather,
      diary: diary
    });
  };

  proxy.assign('user', 'books', 'diary', render);

  tuerBase.findUser(uid, function(err, user) {
    if (err) {
      res.redirect('500');
    } else {
      proxy.trigger('user', user);
      tuerBase.findBy({
        owner: {
          '$in': [uid.toString(), - 1]
        }
      },
      'notebooks', user.notebook + 1, function(err, books) {
        if (err) {
          res.redirect('500');
        } else {
          proxy.trigger('books', books);
        }
      });
      tuerBase.findDiaryById(id, function(err, diary) {
        if (err) {
          res.redirect('500');
        } else if (!diary) {
          res.redirect('404');
        } else {
          proxy.trigger('diary', diary);
        }
      });
    }
  });

};

var update = function(req, res) {

  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }

  var proxy = new EventProxy(),
  bookid = req.body.bookid,
  location = req.body.location,
  content = req.body.content,
  mood = req.body.mood,
  weather = req.body.weather,
  diaryid = req.body.id,
  privacy = req.body.privacy || 0,
  forbid = req.body.forbid || 0;
  /*
  if (req.files.hasOwnProperty('uploadPic')) {
    var uploadPic = req.files.uploadPic,
    temp_path = uploadPic.path,
    type = function() {
      var _type;
      try {
        _type = '.' + uploadPic.type.split('/')[1];
      } catch(e) {
        return ".undef";
      }
      return _type;
    } (),
    filename = path.basename(temp_path),
    picname = filename + type,
    target_path = rootdir + '/public/images/' + picname;
  }
  */
  updateNote = function(diary) {

    if (req.session.userdata._id.toString() != diary.userid) {
      res.redirect('404');
      return;
    }
    /*
    var files = pic_path ? {
      'pic_path': picname
    }: diary.filelist;
    */
    content = xss(content,{whiteList:{
      p:[], 
      a:['href','target'],
      img:['src','data-url','data-type','width','height'],
      b:[],
      i:[],
      u:[],
      strike:[],
      blockquote:[],
      pre:[],
      hr:[]
    },stripIgnoreTag:true});
    var updatedata = {
      content: content,
      //filelist: files,
      forbid: forbid,
      privacy: privacy,
      notebook: bookid
    };
    if (weather !== undefined) updatedata['weather'] = weather;
    if (mood !== undefined) updatedata['mood'] = mood;
    if (location !== undefined) updatedata['location'] = location;

    tuerBase.updateById(diaryid, {
      $set: updatedata
    },
    'diary', function(err) {
      if (err) {
        res.redirect('500');
      } else {
        res.redirect('home');
        /*
        if (pic_path) {
          //删除编辑之前的图片
          util.removePic(diary.filelist, function(err) {
            if (err) throw err;
          });
        }
        */
      }
    });
  };
  proxy.assign('diary', updateNote);

  if ((!bookid || ! content) || ((privacy !== 0 && privacy != 1) || (forbid !== 0 && forbid != 1))) {
    req.flash('error', '非法操作');
    //if (temp_path) util.remove_temp(proxy, 'removeTemp', temp_path);
    res.redirect('back');
    return;
  }

  if (location.trim().length > 10) {
    req.flash('error', '地点最多10个字');
    //if (temp_path) util.remove_temp(proxy, 'removeTemp', temp_path);
    res.redirect('back');
    return;
  }

  if (content.trim().length > 22000) {
    req.flash('error', '日记字数最多22000字');
    //if (temp_path) util.remove_temp(proxy, 'removeTemp', temp_path);
    res.redirect('back');
    return;
  }
  /*
  if (req.files.hasOwnProperty('uploadPic')) {
    if (uploadPic.size) {
      if (!type.match(/jpg|png|jpeg|gif/gi)) {
        req.flash('error', '只能上传图片文件');
        res.redirect('back');
        util.remove_temp(proxy, 'removeTemp', temp_path);
        return;
      }
      if (uploadPic.size > 20971520) {
        req.flash('error', '图片大小不能超过2MB');
        res.redirect('back');
        util.remove_temp(proxy, 'removeTemp', temp_path);
        return;
      }
      fs.rename(temp_path, target_path, function(err) {
        if (err) {
          req.flash('error', err);
          res.redirect('back');
        } else {
          proxy.trigger('removeTemp');
          util.bacthImages(target_path, function(err) {
            if (err) {
              req.flash('error', err);
              res.redirect('back');
            } else {
              proxy.trigger('pic_path', true);
            }
          });
        }
      });
    } else {
      if (temp_path) util.remove_temp(proxy, 'removeTemp', temp_path);
      proxy.trigger('pic_path', false);
    }
  } else {
    proxy.trigger('pic_path', false);
    proxy.trigger('removeTemp');
  }
  */

  tuerBase.findById(diaryid, 'diary', function(err, diary) {
    if (err) {
      res.redirect('500');
    } else {
      proxy.trigger('diary', diary);
    }
  });
};

var remove = function(req, res) {
  var id = req.body.id,
  proxy = new EventProxy();
  if (!req.session.is_login) {
    res.redirect('login');
    return;
  }

  var render = function() {
    res.redirect('home');
  };

  proxy.assign('rmdiary', 'rmcomments', 'rmpics', 'rmcounts','rmfeed', render);

  tuerBase.findById(id, 'diary', function(err, diary) {
    if (err) {
      res.redirect('500');
    } else if (req.session.userdata.isadmin || diary.userid == req.session.userdata._id.toString()) {
      var filelist = diary['filelist'] || {};
      tuerBase.removeById(id, 'diary', function(err, ret) {
        if (err) throw err;
        else proxy.trigger('rmdiary');
      });
      util.removePic(filelist, function(err) {
        if (err) throw err;
        else proxy.trigger('rmpics');
      });
      tuerBase.removeBy({
        related_id: id
      },
      'comment', function(err, ret) {
        if (err) throw err;
        else proxy.trigger('rmcomments');
      });
      tuerBase.updateById(diary.userid, {
        '$inc': {
          diarycount: - 1
        }
      },
      'users', function(err) {
        if (err) throw err;
        else proxy.trigger('rmcounts');
      });
            tuerBase.removeFeed(id,function(err){
                if(err) throw err;
                else proxy.trigger('rmfeed');
            });
    } else {
      res.redirect('404');
    }
  });
};

exports.detail = detail;
exports.list = list;
exports.write = write;
exports.writenew = writenew;
exports.save = save;
exports.edit = edit;
exports.update = update;
exports.remove = remove;
exports.followedDiaries = followedDiaries;
exports.getqiniutoken = getqiniutoken;
exports.qiniucallback = qiniucallback;
