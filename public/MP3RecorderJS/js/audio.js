$(function(){
   var issupport = true;
     try {
        // webkit shim
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        navigator.getUserMedia = ( navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);
        window.URL = window.URL || window.webkitURL;
      
        var audio_context = new AudioContext;
      } catch (e) {
   	var issupport = false;
      }

   if(issupport){
     var $recorder;
     $('#audioWrap').html('<span style="color:green;">录一段语音日记吧<span> <a id="openAudio" href="#">准备录制</a>').show();	
     $('#openAudio').toggle(function(){
       $('#audioContent').show();
       $(this).text('收起');
     },function(){
       $(this).text('准备录制');
       $('#audioContent').hide();
     });
     var t;
     var wav;
     var islock;
     $('#stop').attr('disabled','true');
     $('#audioUp').attr('disabled','true');
     function startTime(){
      $('audio#p_audio').remove();
      wav = null;
      var c = 0;
      $('#timecut').text(c+'/30');
      $('#timecut').show();
      $('#record').attr('disabled','true');
      $('#stop').removeAttr('disabled');
      $('#audioUp').attr('disabled','true');
      t = setInterval(function(){
        c++;
        if(c > 30){
	   stopTime();
	   return;
	}
        $('#timecut').text(c+'/30');
      },1000);
     }
     function stopTime(){
        $recorder = $('#timecut').parent();
        recorderObject = $recorder.data('recorderObject');
        recorderObject.stop();
        recorderObject.exportWAV(function(base64_wav_data) {
          var url = 'data:audio/wav;base64,' + base64_wav_data;
          var au  = document.createElement('audio');
          au.controls = true;
          au.src = url;
	  au.id = 'p_audio';
          $recorder.append(au);
          recorderObject.logStatus('');
          wav = base64_wav_data;
  	});
	clearInterval(t);
        stop();
     }
     function stop(){
        $('#record').removeAttr('disabled');
        $('#stop').attr('disabled','true');
        $('#audioUp').removeAttr('disabled');
        $('#timecut').html('').hide();
     }
     $('#record').click(function(){
        $this = $(this);
        $recorder = $this.parent();
        navigator.getUserMedia({audio: true}, function(stream) {
          var recorderObject = new MP3Recorder(audio_context, stream, { statusContainer: $('#status'), statusMethod: 'replace' });
          $recorder.data('recorderObject', recorderObject);
          recorderObject.start();
          startTime();
        }, function(e) { });
     });
     $('#stop').click(function(){
	stopTime();
     });
     $('#audioUp').click(function(){
         if(wav && !islock){
         islock = true;
         $recorder = $('#timecut').parent();
         recorderObject = $recorder.data('recorderObject');
         recorderObject.logStatus('上传中...');
         $('audio#p_audio').remove();
	 $.ajax({
		type:'post',
		url:'/say/wav',
		data:{data:wav},
		dataType:'json',
		success:function(data){
		   islock = false;
         	   $('#record').removeAttr('disabled');
         	   $('#stop').attr('disabled','true');
          	   $('#audioUp').attr('disabled',true);
         	   recorderObject.logStatus('上传完毕');
		   QEditor.action(editor,'insertHtml','<p><img src="http://img.tuer.me/sound.png" width="20" height="20" data-url="'+data.url+'" node-type="audio"/></p>');
		   saveLocal();
		}
  	});
	}
     });
   }
      
});
