#!/usr/bin/env node

const glob = require('glob')
const semver = require('semver')
const cliWidth = require('cli-width')
const voca = require('voca')
const chalk = require('chalk')
const Promise = require('bluebird')
const Gauge = require('gauge')

const gauge = new Gauge({ updateInterval: 50 })
const cliW = cliWidth()

const hasRelevantData = pkg => ['name', 'version', 'description'].every(pkg.hasOwnProperty.bind(pkg))
const readFile = Promise.promisify(require('fs').readFile)

const parentRe = /.+\/(.+)\/package.json/
const getPackageParent = path => {
  const match = path.match(parentRe)
  return match ? match[1] : path
}

const loadPackage = file => readFile(file)
  .then(JSON.parse)
  .catch(() => ({}))

function processPackages (files) {
  gauge.show('parsing', 0.9)
  const pkgsP = Promise.map(files, loadPackage)
        .filter(hasRelevantData)
        .reduce((acc, pkg) => {
          const existing = acc.get(pkg.name)
          if (existing && semver.compare(pkg.version, existing.version) <= 0) return acc
          return acc.set(pkg.name, pkg)
        }, new Map())

  pkgsP.then(pkgs => {
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
  })
}

let progress = 0
const incr = 1 / 1000

glob('**/package.json', {
  nodir: true,
  nosort: true,
  nobrace: true,
  noext: true
}, (err, files) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  processPackages(files)
}).on('match', file => {
  gauge.show({
    section: 'globbing',
    subsection: getPackageParent(file),
    completed: progress += incr
  })
})
