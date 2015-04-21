var config = require('../../lib/config'),
tuerBase = require('../../model/base'),
EventProxy = require('eventproxy').EventProxy;

exports.index = function(req, res) {
console.log('m');
	if (req.session.is_login) {
		res.redirect('/profile/' + req.session.userdata.id);
	} else {
        var next_url = req.query.next ? req.query.next : '/diaries';

		req.session.error = req.flash('error');
		res.render('wap/index', {
			title: '首页',
            next_url:next_url,
            config:config,
			session: req.session
		});
	}
};

