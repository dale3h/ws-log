class Stylize {
  constructor(styleMap) {
    if (typeof styleMap === 'undefined' || !styleMap.length) {
      if (typeof window._stylizeDefaultStyleMap !== 'undefined' && window._stylizeDefaultStyleMap.length) {
        styleMap = window._stylizeDefaultStyleMap;
      } else {
        styleMap = [
          {keyword: 'ERROR', style: 'color: red; font-weight: bold;'},
          {keyword: 'WARN', style: 'color: yellow;'},
          {keyword: 'INFO', style: 'color: limegreen;'},
          {keyword: 'DEBUG', style: 'color: cyan;'},
          {keyword: 'TRACE', style: 'color: blue;'},
        ];
      }
    }

    this._map = styleMap;
  }

  get map() {
    return this._map;
  }

  set map(styleMap) {
    this._map = styleMap;
  }

  esc(string) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#x60;',
      '=': '&#x3D;',
      '/': '&#x2F;',
    };

    return String(string).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
  }

  hash(string) {
    var hash = 0;

    if (string.length === 0) {
      return hash;
    }

    for (var i = 0; i < string.length; i++) {
      var chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }

    return hash;
  }

  set(keyword, style) {
    // @todo Check if it exists, and update it
    this._map.push({
      keyword: keyword,
      style: style,
    });
  }

  parse(line) {
    for (let i = 0; i < this._map.length; i++) {
      let {keyword, style} = this._map[i];
      let match, re;

      if (match = keyword.match(new RegExp('^/(.+?)/([gimy]*)$'))) {
        re = new RegExp(match[1], match[2]);
      } else {
        re = new RegExp(keyword);
      }

      if (re.test(line)) {
        line = '<span class="stylized k' + this.hash(keyword) + ' h' + this.hash(line) + '" style="' + style + '">' + this.esc(line) + '</span>';
        break;
      }

      // Does this actually work for preventing memory leaks?
      keyword = style = match = re = null;
    }

    return line;
  }
}
