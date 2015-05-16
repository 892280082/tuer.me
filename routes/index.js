var tuerBase = require('../model/base'),
    Avatar = require('../lib/avatar'),
    util = require('../lib/util'),
    pag = require('../lib/pag').pag,
    escape = require('jade').runtime.escape,
    config = require('../lib/config'),
  xss = require('xss'),
    EventProxy = require('eventproxy').EventProxy;

var index = function(req,res,next){
    var version = req.query.version;
    var newversion = version === 'new';
    var view = newversion ? 'newindex' : 'index';
    var islogin = !!req.session.is_login;
    var proxy = new EventProxy(),
        //render = function(feeds,usersCount,privacyCount,diariesCount,diaries,todoCount,hotusers,hotdiarys){
        render = function(feeds,usersCount,privacyCount,diariesCount,diaries,todoCount,hotusers,noteCount){

            req.session.title = "首页 - 总有一些不经意的时光，需要被镌刻";
            req.session.template = "index";

        diaries.forEach(function(item) {
          util.setTime(item);
          item.img = util.getpics(150, 1, item.filelist);
          item.avatarUrl = Avatar.getUrl(item.avatar);
        //写一个提取html富文本中第一张图片的函数，然后赋值给item.img
        var img = util.getImgs(item.content)[0];
        item.img = img ? img+'?w=150&h=150' : item.img;
        item.wav = util.getWavs(item.content)[0];
        item.content = xss(item.content,{whiteList:{},stripIgnoreTag:true});
          item.content = item.content.length > 150 ? item.content.slice(0, 150) + '...': item.content;
        });

            feeds.forEach(function(item){
               item.avatarUrl = Avatar.getUrl(item.avatar);
            });

            hotusers.forEach(function(item){
                item.avatarUrl = newversion ? Avatar.getArtUrl(item.avatar) : Avatar.getUrl(item.avatar) ;
            });
            /*
            hotdiarys.forEach(function(item){
                item.content = item.content.length > 10 ? item.content.slice(0,10)+'...' : item.content;
            });
            */
            if(islogin){
                var firends = [];
                for(var i=0;i<req.session.userdata.firends.length;i++){
                   firends.push(req.session.userdata.firends[i].toString()); 
                    }
      tuerBase.getCount({
        privacy: 0,
        userid: {
          '$in':firends
        }
      },
      'diary', function(err, count) {
        if (err) {
          res.redirect('500');
        } else {
            console.log(count);
            res.render(view,{
                config:config,
                session:req.session,
                feeds:feeds,
                noteCount:noteCount,
                diaries:diaries,
                //hotdiarys:hotdiarys,
                hotusers:hotusers,
                countDownTime:config.countDownTime(),
                pag:new pag({
                    cur:1,
                    space:25,
                    total:count,
                    url:'/followed/diaries'
                }).init(),
                usersCount:usersCount,
                privacyCount:privacyCount,
                diariesCount:diariesCount,
                todoCount:todoCount
            });
        }
  });
            }else{
                
            res.render(view,{
                config:config,
                session:req.session,
                feeds:feeds,
                noteCount:noteCount,
                diaries:diaries,
                //hotdiarys:hotdiarys,
                hotusers:hotusers,
                countDownTime:config.countDownTime(),
                pag:new pag({
                    cur:1,
                    space:25,
                    total:diariesCount,
                    url:'/diaries'
                }).init(),
                usersCount:usersCount,
                privacyCount:privacyCount,
                diariesCount:diariesCount,
                todoCount:todoCount
            });
                }
        };

    //proxy.assign('feeds','usersCount','privacyCount','diariesCount','diaries','todoCount','hotusers','hotdiarys',render);
    proxy.assign('feeds','usersCount','privacyCount','diariesCount','diaries','todoCount','hotusers','noteCount',render);

  if(islogin){

  tuerBase.findById(req.session.userdata._id.toString(), 'users', function(err, user) {
    if (err) {
      res.redirect('500');
    } else {
      user.firends.push(req.session.userdata._id.toString());
      tuerBase.findDiaryByUsers(user.firends, false, 0, 25, function(err, lists) {
        if (err) {
          res.redirect('500');
        } else {
          proxy.trigger('diaries', lists);
        }
      });
    }
  });
  }else{

  tuerBase.findDiarySlice(0, 25, function(err, lists) {
    if (err) {
      res.redirect('500');
    } else {
      proxy.trigger('diaries', lists);
    }
  });
    }
    tuerBase.findFeeds({},0,10,function(err,feeds){
        if(err){
            res.redirect('500');
        }else{
            proxy.trigger('feeds',feeds); 
        }
    });

    tuerBase.getCount({},'users',function(err,usersCount){
        if(err){
            res.redirect('500');
        }else {
            proxy.trigger('usersCount',usersCount); 
        }
    });

    tuerBase.getCount({privacy:'1'},'diary',function(err,privacyCount){
        if(err){
            res.redirect('500');
        }else {
            proxy.trigger('privacyCount',privacyCount);
        }
    });

    tuerBase.getCount({privacy:0},'diary',function(err,diariesCount){
        if(err){
            res.redirect('500');
        }else{
            proxy.trigger('diariesCount',diariesCount);
        }
    });

    tuerBase.getCount({},'todos',function(err,todoCount){
        if(err){
            res.redirect('500');
        }else{
            proxy.trigger('todoCount',todoCount);
        }
    });
    var hotUsers = newversion ? 165 : 15;
    tuerBase.getHotUser(hotUsers,function(err,users){
        if(err){
            res.redirect('500');
        }else{
            proxy.trigger('hotusers',users);
        }
    });
    
    tuerBase.getCount({},'notebooks',function(err,noteCount){
       if(err){
        res.redirect('500');    
       }else{
        proxy.trigger('noteCount',noteCount);    
       }
    });
    /*
    tuerBase.getHotDiary(10,function(err,diarys){
        if(err){
            res.redirect('500');
        }else{
            proxy.trigger('hotdiarys',diarys);
        }
    });
    */
};

function oldpics(req,res){
    req.session.title = '恢复图片';
    req.session.template = 'oldpics';
    
    res.render('oldpics',{
        config:config,
        session:req.session
    });
}

exports.index= index;
exports.oldpics= oldpics;
