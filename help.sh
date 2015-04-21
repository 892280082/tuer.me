#!/bin/sh
cd '/home/tuer2.0/'
cur_dir=$(pwd)
#重启服务
cd $cur_dir
#备份数据库
date_now=`date +%Y%m%d%H%M`
backmongodbFile=tuer$date_now.tar.gz
cd $cur_dir/backup/
/usr/bin/mongodump -h 127.0.0.1 -d node-mongo-tuer -o my_mongodb_dump/
rm *.tar.gz
tar czf $backmongodbFile my_mongodb_dump/
rm my_mongodb_dump -rf
#/etc/init.d/tuer restart
#/usr/bin/python /usr/bin/dropbox.py stop
#/usr/bin/python /usr/bin/dropbox.py start
