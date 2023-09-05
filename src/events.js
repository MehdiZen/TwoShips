import {remove} from './utils.js';

const _listeners = new WeakMap();

export var on = (target, type, listener) => {
  const listeners = _listeners.get(target) || {};
  _listeners.set(target, listeners);
  listeners[type] = listeners[type] || [];
  listeners[type].push(listener);
  return target;
};

export var off = (target, type, listener) => {
  if (!type) {
    _listeners.delete(target);
  } else {
    const listeners = _listeners.get(target);
    if (listeners?.[type]) {
      remove(listeners[type], listener);
    }
  }
  return target;
};

export var trigger = (target, type, event) => {
  _listeners.get(target)?.[type]?.map((listener) => listener(event));
  return target;
};
