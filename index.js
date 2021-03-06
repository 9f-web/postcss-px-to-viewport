'use strict';

var postcss = require('postcss');
var objectAssign = require('object-assign');

var defaults = {
  unitToConvert: 'px',
  viewportWidth: 320,
  viewportHeight: 568, // not now used; TODO: need for different units and math for different properties
  unitPrecision: 5,
  viewportUnit: 'vw',
  fontViewportUnit: 'vw',  // vmin is more suitable.
  selectorBlackList: [],
  minPixelValue: 1,
  mediaQuery: false
};

module.exports = postcss.plugin('postcss-px-to-viewport', function (options) {

  var opts = objectAssign({}, defaults, options);
  var pxReplace = createPxReplace(opts.viewportWidth, opts.minPixelValue, opts.unitPrecision, opts.viewportUnit);

  // excluding regex trick: http://www.rexegg.com/regex-best-trick.html
  // Not anything inside double quotes
  // Not anything inside single quotes
  // Not anything inside url()
  // Any digit followed by px
  // !singlequotes|!doublequotes|!url()|pixelunit
  var pxRegex = new RegExp('"[^"]+"|\'[^\']+\'|url\\([^\\)]+\\)|(\\d*\\.?\\d+)' + opts.unitToConvert, 'ig')

  return function (css) {

    css.walkDecls(function (decl, i) {
      // This should be the fastest test and will remove most declarations
      if (options.exclude) { // 添加对exclude选项的处理
        if (Object.prototype.toString.call(options.exclude) !== '[object RegExp]') {
          throw new Error('options.exclude should be RegExp!')
        }
        if (decl.source.input.file.match(options.exclude) !== null) return;
      }
      
      if (decl.value.indexOf(opts.unitToConvert) === -1) return;

      if (blacklistedSelector(opts.selectorBlackList, decl.parent.selector)) return;

      var unit = getUnit(decl.prop, opts)

      decl.value = decl.value.replace(pxRegex, createPxReplace(opts.viewportWidth, opts.minPixelValue, opts.unitPrecision, unit));
    });

    if (opts.mediaQuery) {
      css.walkAtRules('media', function (rule) {
        if (rule.params.indexOf(opts.unitToConvert) === -1) return;
        rule.params = rule.params.replace(pxRegex, pxReplace);
      });
    }

  };
});

function getUnit(prop, opts) {
  return prop.indexOf('font') === -1 ? opts.viewportUnit : opts.fontViewportUnit;
}

function createPxReplace(viewportSize, minPixelValue, unitPrecision, viewportUnit) {
  return function (m, $1) {
    if (!$1) return m;
    var pixels = parseFloat($1);
    if (pixels <= minPixelValue) return m;
    return toFixed((pixels / viewportSize * 100), unitPrecision) + viewportUnit;
  };
}

function toFixed(number, precision) {
  var multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return Math.round(wholeNumber / 10) * 10 / multiplier;
}

function blacklistedSelector(blacklist, selector) {
  if (typeof selector !== 'string') return;
  return blacklist.some(function (regex) {
    if (typeof regex === 'string') return selector.indexOf(regex) !== -1;
    return selector.match(regex);
  });
}
