define(function(require, exports, module) {
    var replybox = function(replyid,replyname,diaryid){
        return '<form class="form-horizontal reply" method="post" action="/comment/save" id="J_replaybox">'+
                '<textarea data-id="replayContent" class="input" name="content" rows="3"></textarea>'+
                '<div class="reply-btn-box">'+
                '<button class="btn J_replysubmit" type="submit">回复</button>'+
                '<button class="btn J_replycencel" type="button">取消</button>'+
                '</div>'+
                '<input type="hidden" name="replyid" value="'+replyid+'">'+
                '<input type="hidden" name="replyname" value="'+replyname+'">'+
                '<input type="hidden" name="diaryid" value="'+diaryid+'">'+
            '</form>';
    };

	$('a.J_reply').live('click', function() {
            $('#J_replaybox').remove();
            var replyid = $(this).attr('data-replyid'),
            replyname = $(this).attr('data-replyname'),
            diaryid = $(this).attr('data-diaryid');
            $(this).parent().append(replybox(replyid,replyname,diaryid));
            setTimeout(function(){
             var c = $('[data-id=replayContent]').atwho(atconfig);
       		c.caret('pos',47);
      		c.atwho('run');
            },1000);
	    return false;
	});
    
    function submitform(e){
        if(e.ctrlKey && e.keyCode == 13){
            $(this).closest('form').submit();
        }
    }

    $('#J_replaybox textarea,#J_comment_textarea').live('keydown',submitform);

    $('button.J_replycencel').live('click',function(){
        $('#J_replaybox').remove();
        return false;
    });

    $('form[action="/comment/save"]').bind('submit',function(){
       $('#J_comment_submit,.J_replysubmit').attr('disabled',true).addClass('disabled'); 
    });
});

