const { parse, compileTemplate, compileStyle } = require('@vue/component-compiler-utils')
const templateCompiler = require('vue-template-compiler')

const path = require('path')
const fs = require('fs')
const hash = require('hash-sum')

class Parser {
  constructor (options) {
    this._options = options
  }

  parseFile (file) {
    const source = fs.readFileSync(file, 'utf8')
    return this.parse(source, file)
  }

  parse (source, file) {
    const sfcDesc = this._parseBlock(source, file)
    const tpl = this._compileTemplate(sfcDesc.template, file)

    const hasFunctional = sfcDesc.template && sfcDesc.template.attrs.functional
    const hasScoped = sfcDesc.styles.some(s => s.scoped)

    const id = file ? hash(file + '\n' + source) : hash(require('./uuid4.js').generate() + '\n' + source)

    const js = this._generateJavaScript(sfcDesc.script.content, tpl, hasFunctional, hasScoped, id)
    const css = this._generateCSS(sfcDesc.styles, file, id)

    return {
      css,
      js
    }
  }

  _parseBlock (source, filename) {
    return parse({
      compiler: templateCompiler,
      filename: filename && path.basename(filename),
      source,
      needMap: false
    })
  }

  _compileTemplate (template, filename) {
    const tpl = compileTemplate({
      compiler: templateCompiler,
      filename,
      source: template.content,
      isProduction: true,
      preprocessLang: template.lang
    })
    if (tpl.errors.length) {
      throw new Error(tpl.errors[0])
    }
    return tpl
  }

  _append (templateResult, hasFunctional, hasScoped, id, exportVar) {
    return `!function (e) {
var o = typeof e === 'function' ? e.options : e;
${templateResult.code.replace(/var render =/g, `o.render =`)
    .replace(/var staticRenderFns =/g, `o.staticRenderFns =`)
    .replace(/render\._withStripped =/g, `o.render._withStripped =`)}
o._compiled = true;
${hasFunctional ? `o.functional = true;` : ''}
${hasScoped ? `o._scopeId = 'data-v-${id}';` : ''}
}(${exportVar});`
  }

  _generateJavaScript (content, templateResult, hasFunctional, hasScoped, id) {
    let code = ''
    const v = `__scriptExports_${id}`

    if (/export\s*default\s*/.test(content)) {
      code = `${content.replace(/export\s*default\s*/g, `var ${v} = `)}
${this._append(templateResult, hasFunctional, hasScoped, id, v)}
export default ${v};`
    } else if (/((module\.)?exports(\.default|\['default'\]|\["default"\])?)\s*=/.test(content)) {
      const moduleExports = content.match(/((module\.)?exports(\.default|\['default'\]|\["default"\])?)\s*=/)[1]
      code = `${content}
${this._append(templateResult, hasFunctional, hasScoped, id, moduleExports)}`
    } else if (/(var|let|const)\s*(vue2js_.+?)\s*=/.test(content)) {
      const moduleExports = content.match(/(var|let|const)\s*(vue2js_.+?)\s*=/)[2]
      if (!moduleExports) {
        throw new Error('Regex match error.')
      }
      code = `${content}
${this._append(templateResult, hasFunctional, hasScoped, id, moduleExports)}`
    } else {
      throw new Error('Must use default export.')
    }

    return code
  }
  _generateCSS (styles, filename, id) {
    return styles.map(s => {
      const r = compileStyle({
        source: s.content,
        scoped: !!s.scoped,
        filename,
        id: `data-v-${id}`,
        trim: true,
        preprocessLang: s.lang
      })
      if (r.errors.length > 0) {
        throw new Error(styles.errors[0])
      }
      return r
    }).map(s => s.code).join(require('os').EOL)
  }
}

exports.Parser = Parser
