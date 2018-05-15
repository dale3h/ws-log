class Command {
  constructor(parent, name, hotkey, handler, jQuery = window.jQuery) {
    this._parent = parent;
    this._name = name;
    this._hotkey = hotkey;
    this._handler = handler;
    this._jQuery = jQuery;

    if (!!navigator.platform.match(/Mac/i)) {
      this._hotkey = this._hotkey.replace('^', '⌘');
    }

    this.element.appendTo(this.parent.container);
    this.bind();
  }

  get parent() {
    return this._parent;
  }

  get slug() {
    return this.name.toLowerCase().replace(/ +/g, '-').replace(/[^a-z0-9\-_]/g, '');
  }

  get name() {
    return this._name;
  }

  get hotkey() {
    return this._hotkey.toUpperCase();
  }

  get handler() {
    return this._handler;
  }

  get enabled() {
    return this.element.is(':visible');
  }

  get binding() {
    if (typeof this._binding === 'undefined') {
      this._binding = (e) => {
        this.element.trigger('click');
        return false;
      };
    }

    return this._binding;
  }

  get element() {
    let $ = this._jQuery;

    if (typeof this._element === 'undefined') {
      this._element = $('<span class="command ' + this.slug + '"><span class="hotkey">' + this.hotkey + '</span>' + this.name + '</span>');
      this._element.click((e) => {
        if (this.enabled) {
          this.handler(this, e);
          return false;
        }
      });
      this._element._appendTo = this._element.appendTo;
      this._element.appendTo = (target) => {
        this._element._appendTo(target);

        let fgColor = this._element.parent().css('background-color');
        let bgColor = this._element.parent().css('color');

        this._element.find('.hotkey')
          .css('color', fgColor)
          .css('background-color', bgColor);
      };
    }

    return this._element;
  }

  bind() {
    this._jQuery(document).bind('keydown', this.hotkey.toLowerCase().replace('^', 'ctrl+').replace('⌘', 'meta+'), this.binding);
    return this;
  }

  unbind() {
    this._jQuery(document).unbind('keydown', this.binding);
    return this;
  }

  enable() {
    this.bind();
    this.element.show();
    return this;
  }

  disable() {
    this.unbind();
    this.element.hide();
    return this;
  }
}

class CommandSet {
  constructor(container = '.commands', jQuery = window.jQuery) {
    this._commands = {};
    this._jQuery = jQuery;

    if (typeof container === 'string') {
      container = this._jQuery(container);
    }

    this._container = container;
  }

  get container() {
    return this._container;
  }

  get commands() {
    return this._commands;
  }

  get(cmd) {
    return cmd instanceof Command ? cmd : this._commands[cmd];
  }

  add(name, hotkey, handler) {
    let cmd = new Command(this, name, hotkey, handler);
    return this._commands[cmd.slug] = cmd;
  }

  enable(cmd) {
    try {
      this.get(cmd).enable();
    } catch (err) {
      return false;
    }
    return this;
  }

  disable(cmd) {
    try {
      this.get(cmd).disable();
    } catch (err) {
      return false;
    }
    return this;
  }

  enabled(cmd) {
    try {
      return this.get(cmd).enabled;
    } catch (err) {
      return false;
    }
  }
}
