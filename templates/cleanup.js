window.__con_dev.observers?.forEach(observer => observer.disconnect());
window.__con_dev.timeouts?.forEach(timeout => clearTimeout(timeout));
window.__con_dev.intervals?.forEach(interval => clearInterval(interval));
window.__con_dev.elements?.forEach(element => element.parentElement?.removeChild(element));
window.__con_dev.windowListeners?.forEach(({ type, listener }) => window.removeEventListener(type, listener));
window.__con_dev.documentListeners?.forEach(({ type, listener }) => document.removeEventListener(type, listener));

window.__con_dev.observers = [];
window.__con_dev.timeouts = [];
window.__con_dev.intervals = [];
window.__con_dev.elements = [];
window.__con_dev.windowListeners = [];
window.__con_dev.documentListeners = [];

const __MutationObserver = function MutationObserver(callback) {
  const observer = new window.MutationObserver(callback);
  window.__con_dev.observers.push(observer);
  return observer;
};

const __setTimeout = function setTimeout(callback, delay) {
  const timeout = window.setTimeout.apply(this, arguments);
  window.__con_dev.timeouts.push(timeout);
  return timeout;
};

const __setInterval = function setInterval(callback, delay) {
  const interval = window.setInterval.apply(this, arguments);
  window.__con_dev.intervals.push(interval);
  return interval;
};

const __createElement = function createElement(tagName, options) {
  const element = document.createElement(tagName, options);
  window.__con_dev.elements.push(element);
  return element;
};

const __windowAddEventListener = function addEventListener(type, listener, options) {
  const _listener = function() {
    listener.apply(this, arguments);
  };
  window.__con_dev.windowListeners.push({ listener: _listener, type });
  window.addEventListener(type, _listener, options);
};

const __documentAddEventListener = function addEventListener(type, listener, options) {
  const _listener = function() {
    listener.apply(this, arguments);
  };
  window.__con_dev.documentListeners.push({ listener: _listener, type });
  document.addEventListener(type, _listener, options);
};