const { parse, compileTemplate, compileStyle } = require('@vue/component-compiler-utils')
const templateCompiler = require('vue-template-compiler')

const path = require('path')
const fs = require('fs')
const hash = require('hash-sum')

class Parser {
  constructor (options) {
    this._options = options
  }

  parse (file) {
    const source = fs.readFileSync(file, 'utf8')
    const sfcDesc = this._parseBlock(source, file)
    const tpl = this._compileTemplate(sfcDesc.template, file)

    const hasFunctional = sfcDesc.template && sfcDesc.template.attrs.functional
    const hasScoped = sfcDesc.styles.some(s => s.scoped)

    const id = hash(file + '\n' + source)

    const js = this._generateJavaScript(sfcDesc.script.content, tpl, hasFunctional, hasScoped, id, file)
    const css = this._generateCSS(sfcDesc.styles, file, id)

    return {
      css,
      js
    }
  }

  _parseBlock (source, filename) {
    return parse({
      compiler: templateCompiler,
      filename: path.basename(filename),
      source
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

  _append (templateResult, v, hasFunctional, hasScoped, id) {
    const optionVar = `__options_${id}`
    return `var ${optionVar} = typeof ${v} === 'function' ? ${v}.options : ${v};
${templateResult.code.replace(/var render =/g, `${optionVar}.render =`)
    .replace(/var staticRenderFns =/g, `${optionVar}.staticRenderFns =`)
    .replace(/render\._withStripped =/g, `${optionVar}.render._withStripped =`)}
${optionVar}._compiled = true;
${hasFunctional ? `${optionVar}.functional = true;` : ''}
${hasScoped ? `${optionVar}._scopeId = 'data-v-${id}';` : ''}`
  }

  _generateJavaScript (content, templateResult, hasFunctional, hasScoped, id, file) {
    let code = ''
    const v = `__scriptExports_${id}`

    if (/export\s*default\s*/.test(content)) {
      code = `${content.replace(/export\s*default\s*/g, `var ${v} = `)}
${this._append(templateResult, v, hasFunctional, hasScoped, id)}
export default ${v};`
    } else if (/(module\.)?exports(\.default)?\s*=/.test(content)) {
      const moduleExports = content.match(/((module\.)?exports(\.default)?)\s*=/)[1]
      code = `${content}
var ${v} = ${moduleExports};
${this._append(templateResult, v, hasFunctional, hasScoped, id)}`
    } else if (/(var|let|const)\s*(vue2js_.+?)\s*=/.test(content)) {
      const moduleExports = content.match(/(var|let|const)\s*(vue2js_.+?)\s*=/)[2]
      if (!moduleExports) {
        throw new Error('Regex match error.')
      }
      code = `${content}
${this._append(templateResult, moduleExports, hasFunctional, hasScoped, id)}`
    } else {
      throw new Error('Must use default export.')
    }

    return code
  }
  _generateCSS (styles, filename, id) {
    return styles.map(s => {
      const r = compileStyle({
        source: s.content,
        scoped: s.scoped,
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
