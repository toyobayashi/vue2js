#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const file = process.argv.slice(2)[0]
const { Parser } = require('..')
const result = new Parser().parse(file)
fs.writeFileSync(path.join(path.dirname(file), path.parse(file).name + '.js'), result.js, 'utf8')
fs.writeFileSync(path.join(path.dirname(file), path.parse(file).name + '.css'), result.css, 'utf8')
