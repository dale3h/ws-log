class Retry extends EventTarget {
  constructor(intervals) {
    super();
    this._intervals = intervals || [3, 5, 10, 30, 60, 300, 600];
    this._timer = null;
    this.reset();
  }

  get running() {
    return !!this._timer;
  }

  get seconds() {
    return Math.max(0, Math.ceil((this._next - Date.now()) / 1000));
  }

  get interval() {
    return this._retries[0];
  }

  set interval(interval) {
    this.intervals = interval;
  }

  get intervals() {
    return this._intervals;
  }

  set intervals(intervals) {
    if (typeof intervals === 'number') {
      intervals = [intervals];
    }

    this._intervals = intervals;
  }

  reset() {
    this._retries = this._intervals.slice();
    this._seconds = 0;
    this._next = 0;
    return this;
  }

  fire(event) {
    this.dispatchEvent(new Event(event));
    return this;
  }

  start(reset = true) {
    this.fire('start');

    if (this.running) {
      return this;
    }

    if (reset) {
      this.reset();
    }

    this._next = Date.now() + (this.interval * 1000);

    this._timer = setInterval(() => {
      if (Date.now() >= this._next) {
        return this.retry();
      }

      if (this.seconds != this._seconds) {
        this._seconds = this.seconds;
        this.fire('tick');
      }
    }, 100);

    return this;
  }

  stop() {
    if (this.running) {
      clearInterval(this._timer);
      this._timer = null;
    }

    return this.fire('stop');
  }

  restart() {
    return this.stop().start();
  }

  retry() {
    this.fire('retry');

    if (this._retries.length > 1) {
      this._retries.shift();
    }

    this._next = Date.now() + (this.interval * 1000);

    return this;
  }
}
