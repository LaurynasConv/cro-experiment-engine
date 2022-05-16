/* eslint-disable */
function trigger() {
  var experiment = '{{expPath}}';
  var socketScript = document.createElement('script');
  var style = document.createElement('style');
  var injectJs = function(js) {
    try {
      eval('(function() {'+js+'})()');
    } catch (err) {
      console.error('Error occured in the Experience script');
      console.error(err);
    }
  };

  window.__con_dev = window.__con_dev || {};
  window.__con_dev[experiment] = window.__con_dev[experiment] || { injected: true };

  if (window.__con_dev[experiment].code) {
    injectJs(window.__con_dev[experiment].code);
  } else {
    socketScript.src = 'http://localhost:4000/libs/socket.io/3.1.1/socket.io.js';
    socketScript.addEventListener('load', function() {
      var socket = __con_dev.io('http://localhost:4000', {
        query: { id: experiment },
      });

      socket.on('js', function(js) {
        console.log({ js: js });

        try {
          window.__con_dev[experiment].code = js;
          injectJs(js);
        } catch (err) {
          console.error('Error occured in the Experience script');
          console.error(err);
        }
      });

      socket.on('css', function(css) {
        console.log({ css: css });

        style.innerHTML = css;
      });
    });

    document.head.appendChild(style);
    document.head.appendChild(socketScript);
  }
}

trigger();