#!/bin/bash

user=$(whoami)
#echo $user
#cd
if [ "$#" -eq  "0" ];  then
	echo "No arugments supplied"
	exit 1
else
	echo Argument is $1
	mkdir -p  scrollback-$1/logs/nginx
	echo scrollback-$1/logs/nginx
	sleep 1
	touch scrollback-$1/logs/nginx/access.log
	echo scrollback-$1/logs/nginx/access.log
	sleep 1
	touch scrollback-$1/logs/nginx/error.log
	echo scrollback-$1/logs/nginx/error.log
	sleep 1
	sudo mkdir -p /var/run/scrollback-$1
	echo 'mkdir -p' /var/run/scrollback-$1
	sleep 1	
#	sudo touch /var/run/scrollback-$1/$1.pid
#	echo  'touch' /var/run/scrollback-$1/$1.pid
#	sleep 1
	sudo chown -R $user /var/run/scrollback-$1
	echo  'chown -R' $user /var/run/scrollback-$1
	sleep 1	
	sudo cp $1.conf /etc/init/$1.conf
	echo 'cp' $1.conf /etc/init/$1.conf

	sudo cp $1.nginx.conf /etc/nginx/sites-enabled/scrollback-$1
	echo 'cp' $1.nginx.conf /etc/nginx/sites-enabled/scrollback-$1
fi

