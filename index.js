require('oneapm');
var tuer = require('./app');
/*
Log = require('log'),
fs = require('fs'),
logpath = __dirname+'/error.log',
old = fs.readFileSync(logpath,'utf-8'),
stream = fs.createWriteStream(logpath),
log = new Log('error',stream);
process.on('uncaughtException',function(err){
    stream.write(old,'utf-8',function(){
        log.error(err); 
    });    
});
*/
tuer.start({
    rootdir:__dirname,
    port:3000,
    mport:3030,
    cookiepath:'tuer.me',
    host:'www.tuer.me',
    jshost:'js.tuer.me',
    csshost:'css.tuer.me',
    imagehost:'img.tuer.me',
    dbname:'node-mongo-tuer',
    dbhost:'127.0.0.1',
    dbport:27017,
    mhost:'m.tuer.me'
});
