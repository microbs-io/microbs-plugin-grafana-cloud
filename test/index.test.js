/*
 * index.test.js
 */
 
// Standard packages
const path = require('path')

// Main packages
const { utils } = require('@microbs.io/core')

const VALID_PLUGIN_TYPES = [
  'kubernetes', 'observability', 'alerts'
]

describe('microbs plugin standards', () => {

  test('package.json exists', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json).toBeTruthy()
  })

  test('package.json declares a valid "name"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json.name).toMatch(/^\@microbs\.io\/plugin\-[a-z0-9\-]+$/)
  })

  test('package.json declares "main"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json.main).toBeTruthy()
  })

  test('package.json declares "license"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json.license).toBeTruthy()
  })

  test('package.json declares "version"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json.version).toBeTruthy()
  })

  test('package.json aligns "name" and "repository.url"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    const name = json.name.split('@microbs.io/')[1]
    expect(json.repository.url).toBe(`https://github.com/microbs-io/microbs-${name}.git`)
  })
  
  test('package.json declares "microbs" in "keywords"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json.keywords.includes('microbs')).toBe(true)
  })
  
  test('package.json declares "plugin" in "keywords"', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    expect(json.keywords.includes('plugin')).toBe(true)
  })
  
  test('package.json declares a valid plugin type in "keywords" ', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package.json'))
    var valid = false
    for (var i in VALID_PLUGIN_TYPES) {
      const type = VALID_PLUGIN_TYPES[i]
      if (json.keywords.includes(type)) {
        // Exactly one valid plugin type must be declared "keywords"
        if (!valid) {
          valid = true
        } else {
          valid = false
          break
        }
      }
    }
    expect(valid).toBe(true)
  })

  test('package-lock.json exists', () => {
    const json = utils.loadJson(path.join(process.cwd(), 'package-lock.json'))
    expect(json).toBeTruthy()
  })

  test('package.json and package-lock.json have same version', () => {
    const pkg = utils.loadJson(path.join(process.cwd(), 'package.json'))
    const pkgLock = utils.loadJson(path.join(process.cwd(), 'package-lock.json'))
    expect(pkg.version).toBe(pkgLock.version)
  })
})
