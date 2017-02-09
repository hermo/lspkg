#!/usr/bin/env node

const glob = require('glob')
const semver = require('semver')
const cliWidth = require('cli-width')
const path = require('path')
const voca = require('voca')
const chalk = require('chalk')

const base = path.join(process.cwd())
const cliW = cliWidth()

const hasRelevantData = pkg => ['name', 'version', 'description'].reduce((acc, key) => acc && pkg.hasOwnProperty(key), true)

function processPackages (files) {
  const pkgs = files
        .map(require)
        .filter(hasRelevantData)
        .reduce((acc, pkg) => {
          const existing = acc.get(pkg.name)
          if (existing && semver.compare(pkg.version, existing.version) <= 0) return acc
          return acc.set(pkg.name, pkg)
        }, new Map())

  const maxNameLen = [...pkgs.keys()].reduce((max, key, n) => key && key.length > max ? key.length : max, 0)

  const fmtEntry = (name, descr = 'No description') => {
    const spacer = '  '
    const namePad = ' '.repeat(maxNameLen - name.length)
    let out = chalk.bold(name) + namePad + spacer

    const maxDescrW = cliW - maxNameLen - spacer.length
    const descrPad = ' '.repeat(maxNameLen + spacer.length)

    out += voca.wordWrap(descr, {
      width: maxDescrW,
      indent: descrPad,
      cut: true
    }).trimLeft()

    return out
  }

  [...pkgs].forEach(([name, pkg], n) => {
    const row = fmtEntry(name, pkg.description)
    console.log(n % 2 === 0 ? chalk.yellow(row) : row)
  })
}

glob(base + '/**/package.json', (err, files) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  processPackages(files)
})
