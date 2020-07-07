#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const files = process.argv.slice(2)
const { Parser } = require('..')
const parser = new Parser()
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const result = parser.parseFile(file)
  fs.writeFileSync(path.join(path.dirname(file), path.parse(file).name + '.js'), result.js, 'utf8')
  fs.writeFileSync(path.join(path.dirname(file), path.parse(file).name + '.css'), result.css, 'utf8')
}
