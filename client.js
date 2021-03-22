/* eslint-disable */
(function trigger() {
  var socketScript = document.createElement('script');
  var style = document.createElement('style');

  socketScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/3.1.1/socket.io.js';
  socketScript.addEventListener('load', function() {
    var socket = io('http://localhost:4000', {
      query: { id: 'path/to/experiment' }, // Change this to the experiment path
    });

    socket.on('js', function(js) {
      console.log({ js: js });

      try {
        eval('(function() {'+js+'})()');
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
})();
