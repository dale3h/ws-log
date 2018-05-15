(($) => {
  var autoScroll = true;
  var autoScrollDisabled = false;
  var reconnect = true;
  var ws;

  var wsUrl = window.location.origin.replace(/^http/, 'ws');

  function setStatus(status) {
    $('.status').html(status);
  }

  function addLine(line) {
    var $line = $('<div class="log-line highlight"></div>').html(line);
    $('.log code').append($line);

    setTimeout(() => $line.removeClass('highlight'), 1);

    maybeAutoScroll();
  }

  function maybeAutoScroll() {
    if (Commands.enabled('disable-autoscroll')) {
      var $log = $('.log');
      $log.scrollTop($log[0].scrollHeight);
    }
  }

  function updateAutoScroll() {
    var autoScrollEnabled = autoScroll && !autoScrollDisabled;

    if (Commands.enabled('enable-autoscroll') && autoScrollEnabled) {
      Commands.disable('enable-autoscroll').enable('disable-autoscroll');
      maybeAutoScroll();
    } else if (Commands.enabled('disable-autoscroll') && !autoScrollEnabled) {
      Commands.disable('disable-autoscroll').enable('enable-autoscroll');
    }
  }

  function openWs(url) {
    setStatus('Connecting');
    ws = new WebSocket(url);
    window._ws = ws;

    ws.onopen = () => {
      retry.stop();
      setStatus('Connected');

      Commands.disable('connect').enable('disconnect');

      // @todo We're getting closer! The first few lines are still not colored properly
      ws.sendFrame({
        type: 'getConfig',
        data: {
          key: 'filters'
        }
      });

      ws.sendFrame({
        type: 'getLines'
      });
    };

    ws.onclose = () => {
      setStatus('Disconnected');

      if (reconnect) {
        retry.start();
      }

      Commands.disable('disconnect').enable('connect');
    };

    ws.onerror = () => setStatus('Error');
    ws.onmessage = (event) => {
      try {
        var frame = JSON.parse(event.data);
      } catch (err) {
        console.log('Cannot parse JSON:', err);
      }

      if (frame.type === 'log') {
        var line = frame.data.line;
        var lineHash = stylize.hash(line);

        if (!$('.h' + lineHash).length) {
          addLine(stylize.parse(line));
        }
      } else if (frame.type === 'result' && frame.success && frame.result.key === 'filters') {
        if (typeof frame.result.value !== 'undefined' && frame.result.value.length) {
          stylize.map = frame.result.value;
        }
      } else {
        console.log('unhandled message:', frame);
      }
    };

    ws.sendFrame = (frame) => {
      frame.timestamp = Date.now();

      if (typeof frame.id === 'undefined') {
        frame.id = frame.timestamp;
      }

      if (typeof frame.type !== 'undefined' && frame.type === 'result') {
        if (typeof frame.error !== 'undefined') {
          frame.success = false;
        } else {
          frame.success = true;
        }
      }

      if (typeof frame.error !== 'undefined') {
        error(frame.error.message);
      }

      ws.send(JSON.stringify(frame))
    };

    ws.parseFrame = (frame) => {
      try {
        frame = JSON.parse(frame);
      } catch (err) {
        ws.sendFrame({
          type: 'result',
          error: {
            message: err.message,
          },
        });
        return false;
      }

      if (typeof frame.type === 'undefined') {
        ws.sendFrame({
          id: typeof frame.id !== 'undefined' ? frame.id : undefined,
          type: 'result',
          error: {
            message: "Frame type must be set",
          },
        });
        return false;
      }

      if (typeof frame.timestamp === 'undefined') {
        frame.timestamp = Date.now();
      }

      if (typeof frame.id === 'undefined') {
        frame.id = frame.timestamp;
      }

      return frame;
    };
  }

  var stylize = new Stylize();

  var retry = new Retry();
  retry.addEventListener('retry', () => openWs(wsUrl));
  retry.addEventListener('tick', () => setStatus('Retry in ' + retry.seconds + 's...'));
  retry.retry();

  // Hotkeys for log console
  var Commands = window.Commands = new CommandSet();

  Commands.add('Connect', 'c', (cmd, e) => {
    reconnect = true;
    openWs(wsUrl);
  }).disable();

  Commands.add('Disconnect', 'd', (cmd, e) => {
    reconnect = false;
    ws.close();
  });

  Commands.add('Manage Filters', 'f', (cmd, e) => {
    console.log("%s is not yet implemented.", cmd.name);
  });

  Commands.add('Enable Autoscroll', 's', (cmd, e) => {
    autoScroll = true;
    autoScrollDisabled = false;
    updateAutoScroll();
  }).disable();

  Commands.add('Disable Autoscroll', 's', (cmd, e) => {
    autoScroll = false;
    autoScrollDisabled = false;
    updateAutoScroll();
  });

  Commands.add('Clear Console', '^k', (cmd, e) => {
    $('.log code').html('');
  });

  // Detect some scrolling stuff
  $('.log').scroll(function() {
    var $log = $('.log');
    autoScrollDisabled = !($log[0].scrollHeight - 5 <= $log[0].offsetHeight + $log[0].scrollTop);
    updateAutoScroll();
  });
})(jQuery);
