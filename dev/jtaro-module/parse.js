/*! JTaro-Module parse.js v0.2.1 ~ (c) 2017 Author:BarZu Git:https://github.com/chjtx/JTaro-Module/ */
/**
 * JTaro Module
 * 将含以下规则的import/export解释成ES5可执行代码
 * import
 * 1) import { a, b, c } from './util.js'
 * 2) import { abc as a } from './util.js'
 * 3) import a from './util.js'
 * 4) import './util.js'
 * 5) import * as a from './util.js'
 * export
 * 1) export var a = 'xxx'
 * 2) export { a, b, c }
 * 3) export function a () {}
 * 4) export default a
 * 5) export { abc as a }
 */

function getImports (text) {
  return text.match(/^[\t ]*import\s+.*/mg)
}

function getExports (text) {
  return text.match(/^[\t ]*export\s+.*/mg)
}

function removeComment (text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '')
}

function resolvePath (p, d) {
  d = d.substr(0, d.lastIndexOf('/'))
  p = p.replace(/(\.\.\/)|(\.\/)/g, function (match, up) {
    if (up) {
      d = d.substr(0, d.lastIndexOf('/'))
    }
    return ''
  })
  return d + '/' + p
}

function parseImport (arr, name, plugins) {
  var newArr = []
  var regNormal = /import +['"](.+)['"]/
  var regBracket = /import +\{([^}]+)\} +from +['"](.+)['"]/
  var regDefault = /import +([^ {}]+) +from +['"](.+)['"]/
  var regAll = /import +\* +as +([^ ]+) +from +['"](.+)['"]/
  var varArr = []
  var temp
  var variables

  // 参照 https://github.com/rollup/rollup/wiki/Plugins#creating-plugins 的resolveId描述
  function resolveId (a) {
    var b = null
    for (var i = 0, l = plugins.resIds.length; i < l; i++) {
      b = plugins.resIds[i](a, plugins.id)
      // 只要有一个resolveId函数匹配立即终止
      if (b) break
    }
    // 如果b有值，返回从当前文件到指定文件的相对路径
    // return b ? getRelativePath(plugins.id, b) : a
    return b || a
  }

  for (var i = 0, l = arr.length; i < l; i++) {
    let path = ''
    // import '**.js'
    if (regNormal.test(arr[i])) {
      path = 'JTaroLoader.import(\'' + resolveId(regNormal.exec(arr[i])[1]) + '\', g)'
    }
    // import { ... } from '**.js'
    if (regBracket.test(arr[i])) {
      temp = regBracket.exec(arr[i])
      variables = temp[1].trim().split(/ *, */)
      variables.forEach(i => {
        var a = i.split(/ +as +/)
        varArr.push({
          alias: a[1] || a[0],
          name: resolvePath(resolveId(temp[2]), name),
          variable: '.' + a[0]
        })
      })
      path = 'JTaroLoader.import(\'' + resolveId(temp[2]) + '\', g)'
    }
    // import default from '**.js'
    if (regDefault.test(arr[i])) {
      temp = regDefault.exec(arr[i])
      varArr.push({
        alias: temp[1],
        name: resolvePath(resolveId(temp[2]), name),
        variable: '.default'
      })
      path = 'JTaroLoader.import(\'' + resolveId(temp[2]) + '\', g)'
    }
    // import * as a from '**.js'
    if (regAll.test(arr[i])) {
      temp = regAll.exec(arr[i])
      varArr.push({
        alias: temp[1],
        name: resolvePath(resolveId(temp[2]), name),
        variable: ''
      })
      path = 'JTaroLoader.import(\'' + resolveId(temp[2]) + '\', g)'
    }
    if (path === '') {
      arr[i] = ''
    } else {
      newArr.push(path)
    }
  }
  return {
    imports: newArr,
    exports: varArr
  }
}

function joinImports (exports) {
  if (!exports.length) {
    return ''
  }
  var s = ', [\n    '
  exports.forEach((item, index) => {
    s += 'JTaroModules[\'' + item.name + '\']' + item.variable
    if (index !== exports.length - 1) {
      s += ',\n    '
    }
  })
  return s + '\n  ]'
}

function joinVariables (exports) {
  var s = ''
  exports.forEach((item, index) => {
    s += item.alias
    if (index !== exports.length - 1) {
      s += ', '
    }
  })
  return s
}

function mixHeader (loaders, name) {
  return '(function (f) {\n  JTaroAssets[\'' + name + '\'] = 1\n' +
    '  var g = function () { f.apply(null' + joinImports(loaders.exports) + ')}\n  ' +
    loaders.imports.join('\n  ') +
    '\n})(function (' + joinVariables(loaders.exports) + ') {\n\n'
}

function removeImport (a, f) {
  for (var i = 0, l = a.length; i < l; i++) {
    f = f.replace(new RegExp(a[i].replace('*', '\\*') + '([\r\n]+|$)'), '')
  }
  return f
}

function parseBracket (v, name) {
  var a = v.split(/ *, */)
  var str = ''
  a.forEach((item, index) => {
    var b = item.split(/ *as */)
    if (b[1]) {
      str += 'JTaroModules[\'' + name + '\'].' + b[1] + ' = ' + b[0]
    } else {
      str += 'JTaroModules[\'' + name + '\'].' + b[0] + ' = ' + b[0]
    }
    if (index !== a.length - 1) {
      str += '\n'
    }
  })
  return str
}

function parseExport (e, name) {
  var regDefault = /^[\t ]*export +default/
  var regFunction = /^[\t ]*export +function +([^ ]+)/
  var regVar = /^[\t ]*export +var +([^ ]+)/
  var regBracket = /^[\t ]*export +\{([^}]+)\}/
  var variable

  // export default ...
  if (regDefault.test(e)) {
    return e.replace(regDefault, 'JTaroModules[\'' + name + '\'].default =')
  }
  // export function ...
  if (regFunction.test(e)) {
    return e.replace(regFunction, 'JTaroModules[\'' + name + '\'].' + regFunction.exec(e)[1] + ' = function')
  }
  // export var ...
  if (regVar.test(e)) {
    return e.replace(regVar, 'JTaroModules[\'' + name + '\'].' + regVar.exec(e)[1])
  }
  // export { ... }
  if (regBracket.test(e)) {
    variable = regBracket.exec(e)[1].trim()
    return e.replace(regBracket, parseBracket(variable, name))
  }

  return e
}

function getExportMaps (exps, name) {
  var maps = []
  exps.forEach(i => {
    maps.push({
      source: i,
      replace: parseExport(i, name)
    })
  })
  return maps
}

function takePlugins (c) {
  var p = c.plugins || []
  var resIds = []
  var trsFms = []
  var opts = []
  p.forEach(function (i) {
    if (typeof i.resolveId === 'function') resIds.push(i.resolveId)
    if (typeof i.transform === 'function') trsFms.push(i.transform)
    if (typeof i.options === 'function') opts.push(i.options)
  })
  // 先执行一轮rollup的options
  opts.forEach(function (o) {
    o(c)
  })
  return {
    id: c.id,
    entry: c.entry,
    resIds: resIds,
    trsFms: trsFms
  }
}

// 执行rollup插件的transform函数
function doTransform (f, p) {
  var t
  for (var i = 0, l = p.trsFms.length; i < l; i++) {
    t = p.trsFms[i](f, p.id)
    if (t && t.code) f = t.code
  }
  return f
}

module.exports = function (file, name, config) {
  var plgs = takePlugins(config)

  // 去掉多行注释的副本
  var copy = removeComment(file)
  // 提取import
  var imports = getImports(copy)

  var loaders = []
  var header = ''
  var exportMaps

  if (imports) {
    // 转换成JTaroLoader.import
    loaders = parseImport(imports, name, plgs)
    // 头部
    header = mixHeader(loaders, name)
    // 去掉已转换的import
    file = header + removeImport(imports, file) + '\n})'
  }

  // 提取export
  var exports = getExports(copy)

  if (exports) {
    exportMaps = getExportMaps(exports, name)
    exportMaps.forEach((item, index) => {
      if (index === 0) {
        file = file.replace(item.source, 'JTaroModules[\'' + name + '\'] = {}\n' + item.replace)
      } else {
        file = file.replace(item.source, item.replace)
      }
    })
  }

  return doTransform(file, plgs)
}
