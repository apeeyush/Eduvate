// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or vendor/assets/javascripts of plugins, if any, can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/sstephenson/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require turbolinks

// Loads all Bootstrap javascripts
//= require bootstrap

//= require_tree .

(function(window){

  var WORKER_PATH = 'recorderWorker.js';

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
   
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.getBuffers = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffers' })
    }

    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }

    this.exportMonoWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportMonoWAV',
        type: type
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };

  Recorder.setupDownload = function(blob, filename){
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("save");
    link.href = url;
    link.download = filename || 'output.wav';
  }

  window.Recorder = Recorder;

})(window);


function WebSpeechRecognition() {
  var r = this;
  r.continuous = false;
  r.lang = '';
  r.maxAlternatives = 1;
  r.status_array = status_array_en;
  r.image_array = image_array_mic;
  var recognizing = false;
  var ignore_onend;

  // Return false if speech recognition is unavailable. (Typically occurs
  // when using a browser that does not support it.)
  r.supported = function() {
    return !!r.recognition;
  };

  // Sets the object which will receive status as text messages.
  r.statusText = function(id) {
    r.status_elem = r.getElem(id);
    r.refreshState();
  };

  // Sets the object which will receive status as images.
  r.statusImage = function(id) {
    r.image_elem = r.getElem(id);
    r.refreshState();
  };

  // Sets the object which will receive final text results.
  r.finalResults = function(id) {
    r.final_results = r.getElem(id);
  };

  // Sets the object which will receive interim text results.
  r.interimResults = function(id) {
    r.interim_results = r.getElem(id);
  };

  // Return true if recognition is in progress.
  r.inProgress = function() {
    return recognizing;
  };

  // Start recognition.
  r.start = function() {
    recognizing = true;
    ignore_onend = false;
    r.final_transcript = '';
    r.setText(r.final_results, '');
    r.setText(r.interim_results, '');
    r.recognition.continuous = r.continuous;
    r.recognition.interimResults = !!r.interim_results;
    r.recognition.maxAlternatives = r.maxAlternatives;
    if (r.lang != '') {
      r.recognition.lang = r.lang;
    }
    r.recognition.start();
    r.onState('allow');
  };

  // Stop recognition.
  r.stop = function() {
    recognizing = false;
    r.recognition.stop();
  };

  // Toggle recognition between Start and Stop states.
  r.toggleStartStop = function() {
    if (reco.inProgress()) {
      reco.stop();
    } else {
      reco.start();
    }
  };



//
// All functions below are rarely called directly by the web page.
//

  r.onState = function(key) {
    r.onStatusChange(key);
    r.onImageChange(key);
    r.currentState = key;
  };

  r.refreshState = function() {
    r.onState(r.currentState);
  };

  // Set status field to text corresponding to key.  See status_array for valid
  // values of key.  An invalid value of key will hide the status message.
  r.onStatusChange = function(key) {
    if (!!r.status_elem) {
      var s = r.status_array[key];
      if (s) {
        r.setText(r.status_elem, s);
        r.status_elem.style.visibility = 'visible';
      } else {
        r.status_elem.style.visibility = 'hidden';
      }
    }
  };

  // Set button image corresponding to key. See image_array for valid values of
  // key.  An invalid value of key will show the image in its 'disable' state.
  r.onImageChange = function(key) {
    if (!!r.image_elem) {
      var f = r.image_array[key];
      if (!f) {
        f = r.image_array['disable'];
      }
      r.image_elem.src = f;
    }
  };

  r.setText = function(elem, text) {
    if (elem) {
      if (elem.nodeName == 'INPUT') {
        elem.value = text;
      } else {
      elem.innerHTML = r.linebreak(text);
      }
    }
  };

  // id is a DOM element or a string containing id or null.
  // Returns DOM element or null.
  r.getElem = function(id) {
    if (typeof(id) == 'string') {
      return document.getElementById(id);
    }
    return id;
  };

  var two_line = /\n\n/g;
  var one_line = /\n/g;
  r.linebreak = function(s) {
    return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
  };

  var first_char = /\S/;
  r.capitalize = function(s) {
    return s.replace(first_char, function(m) { return m.toUpperCase(); });
  };

  if (!('webkitSpeechRecognition' in window)) {
    r.onState('upgrade');
  } else {
    r.recognition = new webkitSpeechRecognition();
    r.final_transcript = '';
    r.interim_transcript = '';
    r.onState('ready');
    r.onEnd = null;

    r.recognition.onstart = function() {
      recognizing = true;
      r.onState('active');
    };

    r.recognition.onerror = function(event) {
      if (event.error == 'no-speech' ||
          event.error == 'audio-capture' ||
          event.error == 'not-allowed') {
        r.onState(event.error);
        ignore_onend = true;
      }
    };

    r.recognition.onend = function() {
      recognizing = false;
      if (ignore_onend) {
        return;
      }
      if (r.final_transcript == '') {
        r.onState('ready');
        return;
      }
      r.onState('complete');
      if (!!r.onEnd) {
        r.onEnd();
      }
    };

    r.recognition.onresult = function(event) {
      r.interim_transcript = '';
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          r.final_transcript += event.results[i][0].transcript;
        } else {
          r.interim_transcript += event.results[i][0].transcript;
        }
      }
      r.final_transcript = r.capitalize(r.final_transcript);
      r.setText(r.final_results, r.final_transcript);
      r.setText(r.interim_results, r.interim_transcript);
      if (!!r.onResult) {
        r.onResult();
      }
    };
  }
}

// Informational text that is displayed for each status condition.
// {key : display_text, key : display_text, ...}
var status_array_en = {
  'ready' : 'Click on the play button and begin speaking.',
  'active' : 'Speak now.',
  'no-speech' : 'No speech was detected. You may need to adjust your ' +
      '<a href="//support.google.com/chrome/bin/answer.py?hl=en&amp;answer=1407892">' +
      ' microphone settings</a>.',
  'audio-capture' :
      'No microphone was found. Ensure that a microphone is installed and that ' +
      '<a href="//support.google.com/chrome/bin/answer.py?hl=en&amp;answer=1407892">' +
      ' microphone settings</a> are configured correctly.',
  'allow' : 'Click the "Allow" button above to enable your microphone.',
  'not-allowed' : 'Permission to use microphone is denied. To change, go to ' +
      'chrome://settings/contentExceptions#media-stream',
  'upgrade' : 'Web Speech API is not supported by this browser.  Upgrade to ' +
      '<a href="//www.google.com/chrome">Chrome</a>.'
};

// Button images for various status conditions.
var image_array_mic = {
  'ready' : 'mic.gif',
  'complete' : 'mic.gif',
  'active' : 'mic-animate.gif',
  'no-speech' : 'mic.gif',
  'disable' : 'mic-slash.gif'
};