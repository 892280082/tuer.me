/**
 * base.js for model
 */

var Db = require('mongodb').Db;
var xss = require('xss');
var Connection = require('mongodb').Connection;
var config = require('../lib/config');
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var EventProxy = require('eventproxy').EventProxy;
var util = require('../lib/util');

var tuerBase = function(host, port) {
  this.db = new Db(config.dbname, new Server(host, port, {
    auto_reconnect: true
  },
  {}));
  this.db.open(function() {
	console.log('db open');
  });
};

tuerBase.prototype.getCollection = function(collection, callback) {
  var self = this;
  self.db.collection(collection, function(err, db) {
    if (err) callback(err);
    else callback(null, db);
  });
};

tuerBase.prototype.findBySlice = function(selector, collection, start, end, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      db.find(selector).sort({
        _id: - 1
      }).skip(start).limit(end - start).toArray(function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype.findBySortSlice = function(selector, sort, collection, start, end, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      var cursor = db.find(selector).skip(start).limit(end - start).sort(sort);
      cursor.toArray(function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype.findBySort = function(selector, sort, collection, limit, callback) {
  this.findBySortSlice(selector, sort, collection, 0, limit, callback);
};

tuerBase.prototype.findBy = function(selector, collection, limit, callback) {
  this.findBySort(selector, {
    _id: - 1
  },
  collection, limit, callback);
};

tuerBase.prototype.findAll = function(collection, limit, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      db.find().limit(limit).sort({
        _id: - 1
      }).toArray(function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype.findAllDiary = function(limit, callback) {
  this.findDiaryBy({
    privacy: {$ne:'1'}
  },
  0, limit, callback);
};

tuerBase.prototype.findCommentSlice = function(id, start, end, callback) {
  var self = this;
  this.getCollection('comment', function(err, db) {
    if (err) calllback(err);
    else {
      var cursor = db.find({
        'related_id': id
      }).sort({
        _id: 1
      }).skip(start).limit(end - start);
      cursor.toArray(function(err, comments) {
        if (err) callback(err);
        else {
          if (comments.length) {
            self.getCollection('users', function(err, dbs) {
              if (err) callback(err);
              else {
                var map = {},
                ids = [];
                comments.forEach(function(comment, index) {
                  if (map[comment.userid]) {
                    map[comment.userid].push(index);
                  } else {
                    map[comment.userid] = [index];
                    ids.push(comment.userid);
                  }
                });
                ids.forEach(function(id, index) {
                  ids[index] = ObjectID.createFromHexString(id);
                });
                dbs.find({
                  _id: {
                    $in: ids
                  }
                }).toArray(function(err, users) {
                  if (err) callback(err);
                  else {
                    if (users.length) {
                      users.forEach(function(user, index) {
                        map[user._id].forEach(function(i) {
                          comments[i]['userpage'] = !! user['pageurl'] ? user['pageurl'] : user.id;
                          comments[i]['nick'] = user['nick'];
                          comments[i]['avatar'] = user['avatar'];
                          comments[i]['profile'] = user['profile'];
                        });
                      });
                    }
                    callback(null, comments);
                  }
                });
              }
            });
          } else {
            callback(null, comments);
          }
        }
      });
    }
  });
};

tuerBase.prototype.removeById = function(id, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      db.remove({
        _id: ObjectID.createFromHexString(id)
      },
      {
        safe: true
      },
      function(err, numberOfRemovedDocs) {
        if (err) callback(err);
        else callback(null, numberOfRemovedDocs);
      });
    }
  });
};

tuerBase.prototype.removeBy = function(source, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      db.remove(source, {
        safe: true
      },
      function(err, numberOfRemovedDocs) {
        if (err) callback(err);
        else callback(null, numberOfRemovedDocs);
      });
    }
  });
};

tuerBase.prototype.updateById = function(id, data, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      var source = self._getIdSource(id);
      db.update(source, data, {
        safe: true
      },
      function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype.update = function(source, data, collection, callback, upsert) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      var options = {
        safe: true
      };
      if (upsert) options['upsert'] = true;
      db.update(source, data, options, function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype.findOne = function(source, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      db.findOne(source, function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype._getIdSource = function(id) {
  var search = {};
  if (id.length === 24) {
    search = {
      _id: ObjectID.createFromHexString(id.toString())
    };
  } else if ((/^[0-9]*$/).test(id) && id.toString().length < 24) {
    search = {
      id: parseInt(id, 10)
    };
  } else if (typeof id === 'object') {
    search = {
      _id: ObjectID.createFromHexString(id.toString())
    };
  } else {
    search = {
      pageurl: id
    };
  }
  return search;
};

tuerBase.prototype.findUser = function(id, callback) {
  var self = this,
  search = self._getIdSource(id);
  self.findOne(search, 'users', function(err, data) {
    if (err) callback(err);
    else {
      if (data) callback(null, data);
      else callback('找不到相关数据');
    }
  });
};

tuerBase.prototype.findById = function(id, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      var search = self._getIdSource(id);
      db.findOne(search, function(err, data) {
        if (err) callback(err);
        else {
          if (data) callback(null, data);
          else callback('找不到相关数据');
        }
      });
    }
  });
};

tuerBase.prototype.findFollows = function(userid, limit, callback) {
  var self = this;
  this.getCollection('users', function(err, db) {
    if (err) callback(err);
    else {
      db.find({
        'firends': {
          '$in': [ObjectID.createFromHexString(userid.toString())]
        }
      }).toArray(function(err, list) {
        if (err) callback(err);
        else callback(null, list.slice(0, limit || list.length), list.length);
      });
    }
  });
};

tuerBase.prototype.save = function(data, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      data['created_at'] = new Date();
      db.insert(data, function(err, data) {
        if (err) callback(err);
        else callback(null, data);
      });
    }
  });
};

tuerBase.prototype.getNotesCount = function(notebooks, callback) {
  var self = this;
  var proxy = new EventProxy(),
  finish = function() {
    for (var i in arguments) {
      notebooks[i]['size'] = arguments[i];
    }
    callback(null, notebooks);
  },
  arg = [];

  if (notebooks.length) {

    notebooks.forEach(function(book, index) {
      arg.push(index.toString());
    });
    arg.push(finish);
    proxy.assign.apply(proxy, arg);
    notebooks.forEach(function(book, index) {
      self.getCount({
        notebook: book._id.toString()
      },
      'diary', function(err, count) {
        if (err) callback(err);
        else {
          proxy.trigger(index.toString(), count);
        }
      });
    });
  } else {
    callback(null, notebooks);
  }
};

tuerBase.prototype.getCount = function(source, collection, callback) {
  var self = this;
  this.getCollection(collection, function(err, db) {
    if (err) callback(err);
    else {
      var cursor = db.find(source);
      cursor.count(function(err, count) {
        if (err) callback(err);
        else callback(null, count);
      });
    }
  });
};

tuerBase.prototype.findDiaryCount = function(id, isSelf, callback) {
  var self = this;
  this.getCollection('diary', function(err, db) {
    if (err) callback(err);
    else {
      var searchdata = {
        userid: id.toString()
      };
      if (!isSelf) searchdata['privacy'] = {$ne:'1'};
      var cursor = db.find(searchdata);
      cursor.count(function(err, count) {
        if (err) callback(err);
        else callback(null, count);
      });
    }
  });
};

tuerBase.prototype.findDiaryByUserId = function(id, isSelf, start, end, callback) {
  var self = this;
  this.findDiaryByUsers([id], isSelf, start, end, callback);
};

tuerBase.prototype.findDiaryByUsers = function(ids, isSelf, start, end, callback) {
  var self = this;
  ids.forEach(function(id, index) {
    ids[index] = id.toString();
  });
  var searchdata = {
    userid: {
      '$in': ids
    }
  };
  if (!isSelf) searchdata['privacy'] = {$ne:'1'};
  self.findDiaryBy(searchdata, start, end, callback);
};

tuerBase.prototype.findDiaryById = function(id, callback) {
  var self = this;
  this.getCollection('diary', function(err, db) {
    if (err) callback(err);
    else {
      var search = self._getIdSource(id);
      self.findDiaryBy(search, 0, 1, function(err, diarys) {
        if (err) callback(err);
        else {
          if (diarys[0]) callback(null, diarys[0]);
          else callback('找不到相关数据');
        }
      });
    }
  });
};

tuerBase.prototype.batchAddUser = function(batchdata, userkey, callback) {
  var self = this;
  self.getCollection('users', function(err, db) {
    if (err) callback(err);
    else {
      var map = [],
      ids = {};
      batchdata.forEach(function(item, index) {
        if (ids[item[userkey]]) {
          ids[item[userkey]].push(index);
        } else {
          ids[item[userkey]] = [index];
          map.push(item[userkey]);
        }
      });
      map.forEach(function(id, index) {
        map[index] = ObjectID.createFromHexString(id);
      });
      db.find({
        _id: {
          $in: map
        }
      }).toArray(function(err, users) {
        if (err) callback(err);
        else {
          users.forEach(function(data, index) {
            ids[data._id].forEach(function(i) {
              batchdata[i]['pageurl'] = !! data['pageurl'] ? data['pageurl'] : data.id;
              batchdata[i]['avatar'] = data['avatar'];
              batchdata[i]['created_user'] = data['nick'];
            });
          });
          callback(null, batchdata);
        }
      });
    }
  });

};

tuerBase.prototype.batchDiary = function(cursor, callback) {
  var self = this;
  cursor.toArray(function(err, diarys) {
    if (err) callback(err);
    else {
      self.batchAddUser(diarys, 'userid', function(err, diarys) {
        if (err) callback(err);
        else {
          self.getCollection('notebooks', function(err, db) {
            if (err) callback(err);
            else {
              var bookids = {},
              bookmap = [];
              diarys.forEach(function(diary, index) {
                                var weather = diary.weather,
                                    mood = diary.mood;
                if (weather){
                                    if(isNaN(weather) || !config.weather[weather]) diary.weather = weather;
                                    else diary.weather = config.weather[weather]['value'];
                                }
                if (mood){
                                    if(isNaN(mood) || !config.mood[mood]) diary.mood = mood;
                                    else diary.mood = config.mood[mood]['value'];
                                }
                if (bookids[diary.notebook]) {
                  bookids[diary.notebook].push(index);
                } else {
                  bookids[diary.notebook] = [index];
                  bookmap.push(diary.notebook);
                }
              });
              bookmap.forEach(function(id, index) {
                bookmap[index] = ObjectID.createFromHexString(id);
              });
              db.find({
                _id: {
                  $in: bookmap
                }
              }).toArray(function(err, notebooks) {
                if (err) callback(err);
                else {
                  notebooks.forEach(function(data, index) {
                    bookids[data._id].forEach(function(i) {
                      diarys[i]['bookname'] = data['name'];
                      diarys[i]['bookid'] = data['id'];
                    });
                  });
                  callback(null, diarys);
                }
              });
            }
          });
        }
      });
    }
  });
};

tuerBase.prototype.findFeeds = function(source, start, end, callback) {
  var self = this;
  self._findFeed(source, start, end, function(err, data) {
    if (err) callback(err);
    else {
      //分类，再同时查找todo和diary,notebook,register，再合并返回
      function addType(data, type) {
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          item['feed_type'] = type;
          if (type == 'diary') {
            item.img = util.getpics(150, 1, item.filelist);
            var img = util.getImgs(item.content)[0];
            item.img = img ? img+'?w=150&h=150' : item.img;
            item.content = xss(item.content,{whiteList:{},stripIgnoreTag:true});
            item.content = item.content.length > 150 ? item.content.slice(0, 150) + '...': item.content;
            item.avatar = item.avatar;
          }
        }
      }
      var proxy = new EventProxy(),
      finish = function(todos, diarys, notebooks, registers,says) {
        var feeds = [];
        addType(todos, 'todo');
        addType(diarys, 'diary');
        addType(notebooks, 'notebook');
        addType(registers, 'register');
        addType(says, 'say');
        feeds = feeds.concat(todos, diarys, notebooks, registers,says).sort(function(a, b) {
          return b.created_at - a.created_at;
        });
        feeds.forEach(function(item) {
          util.setTime(item);
        });
        callback(null, feeds);
      };
      proxy.assign('todos', 'diarys', 'notebooks', 'registers','says', finish);
      var todos = [],
      diarys = [],
      notebooks = [],
      says = [],
      registers = [];
      for (var i = 0; i < data.length; i++) {
        var type = data[i]['type'],
        id = ObjectID.createFromHexString(data[i].id);
        if (type == 'todo') todos.push(id);
        if (type == 'diary') diarys.push(id);
        if (type == 'notebook') notebooks.push(id);
        if (type == 'register') registers.push(id);
        if (type == 'say') says.push(id);
      }

      if (todos.length) {
        self.findBySortSlice({
          _id: {
            $in: todos
          }
        },
        {
          created_at: - 1
        },
        'todos', 0, todos.length, function(err, todolist) {
          if (err) callback(err);
          else {
            self.batchAddUser(todolist, 'userid', function(err, todolist) {
              if (err) callback(err);
              else proxy.trigger('todos', todolist);
            });
          }
        });
      } else {
        proxy.trigger('todos', todos);
      }

      if (diarys.length) {
        self.getCollection('diary', function(err, db) {
          if (err) callback(err);
          else {
            var cursor = db.find({
              _id: {
                $in: diarys
              }
            }).skip(0).limit(diarys.length).sort({
              created_at: - 1
            });
            self.batchDiary(cursor, function(err, diarylist) {
              if (err) callback(err);
              else proxy.trigger('diarys', diarylist);
            });
          }
        });
      } else {
        proxy.trigger('diarys', diarys);
      }

      if (notebooks.length) {
        self.findBySortSlice({
          _id: {
            $in: notebooks
          }
        },
        {
          created_at: - 1
        },
        'notebooks', 0, notebooks.length, function(err, notebooklist) {
          if (err) callback(err);
          else {
            self.batchAddUser(notebooklist, 'owner', function(err, notebooklist) {
              if (err) callback(err);
              else proxy.trigger('notebooks', notebooklist);
            });
          }
        });
      } else {
        proxy.trigger('notebooks', notebooks);
      }
      if (registers.length) {
        self.findBySortSlice({
          _id: {
            $in: registers
          }
        },
        {
          created_at: - 1
        },
        'users', 0, registers.length, function(err, userlist) {
          if (err) callback(err);
          else {
            proxy.trigger('registers', userlist);
          }
        });
      } else {
        proxy.trigger('registers', registers);
      }
      if(says.length){
        self.findBySortSlice({
          _id: {
            $in: says
          }
        },
        {
          created_at: - 1
        },
        'say', 0, says.length, function(err, list) {
          if (err) callback(err);
          else {
            self.batchAddUser(list,'userid',function(err,list){
               if(err) callback(err); 
               else proxy.trigger('says', list);
            });
          }
        });
      }else{
        proxy.trigger('says', says);
      }
    }
  });
};

tuerBase.prototype.findFeedsByTypes = function(source,types, start, end, callback) {
  var self = this;
  source = source || {};
  source.type = {
    "$in":types.map(function(i){ return i.slice(0,-1);})
  };
console.log(source);
  self._findFeed(source, start, end, function(err, data) {
    if (err) callback(err);
    else {
      //分类，再同时查找todo和diary,notebook,register，再合并返回
      function addType(data, type) {
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          item['feed_type'] = type;
          if (type == 'diary') {
            item.img = util.getpics(150, 1, item.filelist);
            var img = util.getImgs(item.content)[0];
            item.img = img ? img+'?w=150&h=150' : item.img;
            item.content = xss(item.content,{whiteList:{},stripIgnoreTag:true});
            item.content = item.content.length > 150 ? item.content.slice(0, 150) + '...': item.content;
            item.avatar = item.avatar;
          }
        }
      }
      var proxy = new EventProxy(),
      finish = function() {
        var feeds = [],args = [];
	for(var i=0;i<arguments.length;i++){
	  if(typeof arguments[i] === 'function') continue;
       	  addType(arguments[i].slice(0,-1), types[i]);
	  args.push(arguments[i]);
	}
	args = [].concat.apply(Array.prototype,args);
        feeds = feeds.concat(args).sort(function(a, b) {
          return b.created_at - a.created_at;
        });
        feeds.forEach(function(item) {
          util.setTime(item);
        });
        callback(null, feeds);
      };

      proxy.assign.apply(proxy,types.concat([finish]));

      var todos = [],
      diarys = [],
      notebooks = [],
      says = [],
      registers = [];
      for (var i = 0; i < data.length; i++) {
        var type = data[i]['type'],
        id = ObjectID.createFromHexString(data[i].id);
        if (type == 'todo') todos.push(id);
        if (type == 'diary') diarys.push(id);
        if (type == 'notebook') notebooks.push(id);
        if (type == 'register') registers.push(id);
        if (type == 'say') says.push(id);
      }
      var hasTodos = types.indexOf('todos') > -1;
      var hasDiarys = types.indexOf('diarys') > -1;
      var hasNoteBooks = types.indexOf('notebooks') > -1;
      var hasRegisters = types.indexOf('registers') > -1;
      var hasSays = types.indexOf('says') > -1;

      if (todos.length && hasTodos) {
        self.findBySortSlice({
          _id: {
            $in: todos
          }
        },
        {
          created_at: - 1
        },
        'todos', 0, todos.length, function(err, todolist) {
          if (err) callback(err);
          else {
            self.batchAddUser(todolist, 'userid', function(err, todolist) {
              if (err) callback(err);
              else proxy.trigger('todos', todolist);
            });
          }
        });
      } else if(hasTodos) {
        proxy.trigger('todos', todos);
      }

      if (diarys.length && hasDiarys) {
        self.getCollection('diary', function(err, db) {
          if (err) callback(err);
          else {
            var cursor = db.find({
              _id: {
                $in: diarys
              }
            }).skip(0).limit(diarys.length).sort({
              created_at: - 1
            });
            self.batchDiary(cursor, function(err, diarylist) {
              if (err) callback(err);
              else proxy.trigger('diarys', diarylist);
            });
          }
        });
      } else if(hasDiarys) {
        proxy.trigger('diarys', diarys);
      }

      if (notebooks.length && hasNoteBooks) {
        self.findBySortSlice({
          _id: {
            $in: notebooks
          }
        },
        {
          created_at: - 1
        },
        'notebooks', 0, notebooks.length, function(err, notebooklist) {
          if (err) callback(err);
          else {
            self.batchAddUser(notebooklist, 'owner', function(err, notebooklist) {
              if (err) callback(err);
              else proxy.trigger('notebooks', notebooklist);
            });
          }
        });
      } else if(hasNoteBooks){
        proxy.trigger('notebooks', notebooks);
      }
      if (registers.length && hasRegisters) {
        self.findBySortSlice({
          _id: {
            $in: registers
          }
        },
        {
          created_at: - 1
        },
        'users', 0, registers.length, function(err, userlist) {
          if (err) callback(err);
          else {
            proxy.trigger('registers', userlist);
          }
        });
      } else if(hasRegisters){
        proxy.trigger('registers', registers);
      }
      if(says.length && hasSays){
        self.findBySortSlice({
          _id: {
            $in: says
          }
        },
        {
          created_at: - 1
        },
        'say', 0, says.length, function(err, list) {
          if (err) callback(err);
          else {
            self.batchAddUser(list,'userid',function(err,list){
               if(err) callback(err); 
               else proxy.trigger('says', list);
            });
          }
        });
      }else if(hasSays){
        proxy.trigger('says', says);
      }
    }
  });
};

tuerBase.prototype._findFeed = function(source, start, end, callback) {
  var self = this;
  this.getCollection('feed', function(err, db) {
    if (err) callback(err);
    else {
	delete source['type'];
      var cursor = db.find(source);
	console.log(source);
      cursor.sort({
        created_at: - 1
      }).skip(start).limit(end - start).toArray(function(err, data) {
        if (err) callback(err);
        else {
          callback(null, data);
        }
      });
    }
  });
};

tuerBase.prototype.addFeed = function(data, callback) {
  var self = this;
  self.save(data, 'feed', callback);
};

tuerBase.prototype.removeFeed = function(id, callback) {
  var self = this;
  self.removeBy({
    id: id
  },
  'feed', callback);
};

tuerBase.prototype.findDiaryBy = function(source, start, end, callback) {
  var self = this;
  this.getCollection('diary', function(err, db) {
    if (err) callback(err);
    else {
      var cursor = db.find(source);
      cursor.sort({
        _id: - 1
      }).skip(start).limit(end - start);
      self.batchDiary(cursor, callback);
    }
  });
};

tuerBase.prototype.findDiarySlice = function(start, end, callback) {
  var self = this;
  self.findDiaryBy({
    privacy: {
            $ne:'1'
        }
  },
  start, end, callback);
};

tuerBase.prototype.addFriendsTips = function(userid, addid) {
  var self = this;
  this.getCollection('tips', function(err, db) {
    if (err) throw err;
    else {
      db.find({
        related_id: userid,
        type: 'friend',
        addid: addid
      }).toArray(function(err, list) {
        if (err) throw err;
        else {
          if (!list.length) {
            self.save({
              related_id: userid,
              type: 'friend',
              addid: addid
            },
            'tips', function(err, ret) {
              if (err) throw err;
            });
          }
        }
      });
    }
  });
};

tuerBase.prototype.addDiaryTips = function(userid, diaryid) {
  var self = this;
  this.save({
    related_id: userid,
    type: 'diary',
    diaryid: diaryid
  },
  'tips', function(err, ret) {
    if (err) throw err;
  });
};

tuerBase.prototype.removeDiaryTips = function(userid, diaryid) {
  var self = this;
  this.getCollection('tips', function(err, db) {
    if (err) throw err;
    else {
      db.find({
        related_id: userid.toString(),
        diaryid: diaryid.toString(),
        type: 'diary'
      }).toArray(function(err, list) {
        if (err) throw err;
        else {
          list.forEach(function(item) {
            db.remove({
              _id: item._id
            });
          });
        }
      });
    }
  });
};

tuerBase.prototype.removeFriendsTips = function(userid, addid) {
  var self = this;
  this.getCollection('tips', function(err, db) {
    if (err) throw err;
    else {
      db.find({
        related_id: userid.toString(),
        addid: addid.toString(),
        type: 'friend'
      }).toArray(function(err, list) {
        if (list.length) {
          list.forEach(function(item) {
            db.remove({
              _id: item._id
            });
          });
        }
      });
    }
  });
};

tuerBase.prototype.findFriendsByUserId = function(userid, callback) {
  var self = this;
  this.getCollection('tips', function(err, db) {
    if (err) callback(err);
    else {
      db.find({
        type: 'friend',
        related_id: userid
      }).toArray(function(err, data) {
        if (err) callback(err);
        else {
          var friendids = [];
          data.forEach(function(item) {
            friendids.push(item.addid);
          });
          friendids = util.ov(friendids);
          friendids.forEach(function(item, index) {
            var id = ObjectID.createFromHexString(item);
            friendids[index] = id;
          });
          self.findBy({
            _id: {
              '$in': friendids
            }
          },
          'users', friendids.length, function(err, data) {
            if (err) callback(err);
            else callback(null, data);
          });
        }
      });
    }
  });
};

tuerBase.prototype.findDiaryTipsByUserId = function(userid, callback) {
  var self = this;
  this.getCollection('tips', function(err, db) {
    if (err) callback(err);
    else {
      db.find({
        type: 'diary',
        related_id: userid
      }).toArray(function(err, data) {
        if (err) callback(err);
        else {
          var diaryids = [];
          data.forEach(function(item) {
            diaryids.push(item.diaryid);
          });
          diaryids = util.ov(diaryids);
          diaryids.forEach(function(item, index) {
            var id = ObjectID.createFromHexString(item);
            diaryids[index] = id;
          });
          self.findBy({
            _id: {
              '$in': diaryids
            },
                    privacy: {$ne:'1'}
          },
          'diary', diaryids.length, function(err, data) {
            if (err) callback(err);
            else callback(null, data);
          });
        }
      });
    }
  });
};

tuerBase.prototype.removeFriend = function(userid, removeid, callback) {
  var self = this;
  this.getCollection('users', function(err, db) {
    if (err) callback(err);
    else {
      self.findUser(removeid,function(err, user) {
        if (err) callback(err);
        else {
          if (user) {
            var update = self._getIdSource(userid);
            db.update(update, {
              '$pull': {
                'firends': user._id
              }
            },
            function(err, ret) {
              if (err) callback(err);
              else {
                if (err) callback(err);
                else {
                  callback(null, '删除好友成功');
                                    self.findUser(userid,function(err,data){
                      self.removeFriendsTips(user._id.toString(),data._id.toString());
                                    });
                }
              }
            });
          } else {
            callback('用户不存在');
          }
        }
      });
    }
  });
};

tuerBase.prototype.addFriends = function(userid, addid, callback) {
  var self = this;
  this.getCollection('users', function(err, db) {
    if (err) callback(err);
    else {
      self.findUser(addid,function(err, adduser) {
        if (err) callback(err);
        else {
          if (adduser) {
            self.findUser(userid, function(err, user) {
              if (err) callback(err);
              else {
                if (user) {
                  db.update(self._getIdSource(addid), {
                    '$addToSet': {
                      "firends": user._id
                    }
                  },
                  {
                    safe: true
                  },
                  function(err, ret) {
                    if (err) callback(err);
                    else {
                      callback(null, '添加好友成功');
                      self.addFriendsTips(user._id.toString(), adduser._id.toString());
                    }
                  });
                } else {
                  callback('用户不存在');
                }
              }
            });
          } else {
            callback('用户不存在');
          }
        }
      });
    }
  });
};

tuerBase.prototype.updateDiaryCommentCount = function(callback) {
  var self = this;
  this.getCollection('diary', function(err, db) {
    if (err) {
      callback(err);
    } else {
      db.find().toArray(function(err, list) {
        if (err) {
          callback(err);
        } else {
          callback(null, list);
          list.forEach(function(item, index) {
            self.getCount({
              related_id: item._id.toString()
            },
            'comment', function(err, count) {
              self.update({
                _id: item._id
              },
              {
                '$set': {
                  commentcount: count
                }
              },
              'diary', function(err, ret) {
                if (err) console.log(err);
                else console.log(ret);
              });
            });
          });
        }
      });
    }
  });
};

tuerBase.prototype.getHotUser = function(limit, callback) {
  this.findBySort({},
  {
    //"tocommentcount": - 1,
    "diarycount": - 1,
    "todocount": - 1
  },
  'users', limit, callback);
};

tuerBase.prototype.getHotDiary = function(limit, callback) {
  var self = this;
  this.getCollection('diary', function(err, db) {
    if (err) callback(err);
    else {
      var cursor = db.find({
            privacy: {$ne:'1'}
      });
      cursor.sort({
        commentcount: - 1
      }).limit(limit);
      self.batchDiary(cursor, callback);
    }
  });
};

tuerBase.prototype.getIds = function(collection, callback) {
  var self = this;
  this.getCollection('ids', function(err, db) {
    if (err) callback(err);
    else {
      db.findAndModify({
        "name": collection
      },
      ["name", "asc"], {
        $inc: {
          "id": 1
        }
      },
      {
        'new': true,
        'upsert': true
      },
      callback);
    }
  });
};

module.exports = new tuerBase(config.dbhost, config.dbport);

