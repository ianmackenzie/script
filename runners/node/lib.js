'use strict'

let majorVersion = 1
let minorVersion = 0

let vm = require('vm')
let fs = require('fs')
let path = require('path')
let child_process = require('child_process')

function listEntities (request, responsePort, statsPredicate) {
  try {
    let directory = request.value
    let results = fs.readdirSync(directory).filter(function (entity) {
      return statsPredicate(fs.statSync(path.resolve(directory, entity)))
    })
    responsePort.send(results)
  } catch (error) {
    responsePort.send({code: error.code, message: error.message})
  }
}

module.exports = function (path, args) {
  // Load compiled Elm code
  let source = fs.readFileSync(path)
  // Set up browser-like context in which to run compiled Elm code
  global.XMLHttpRequest = require('xhr2')
  global.setTimeout = require('timers').setTimeout
  // Run Elm code to create the 'Elm' object
  vm.runInThisContext(source, path)

  // Create Elm worker and get its request/response ports
  let script = global['Elm'].Main.worker(args)
  let requestPort = script.ports.requestPort
  let responsePort = script.ports.responsePort

  // Listen for requests, send responses when required
  requestPort.subscribe(function (request) {
    switch (request.name) {
      case 'requiredVersion':
        let requiredMajorVersion = request.value[0]
        let requiredMinorVersion = request.value[1]
        let describeCurrentVersion = ' (current elm-run version: ' + majorVersion + '.' + minorVersion + ')'
        if (requiredMajorVersion !== majorVersion) {
          console.log('Version mismatch: script requires elm-run major version ' + requiredMajorVersion + describeCurrentVersion)
          if (requiredMajorVersion > majorVersion) {
            console.log('Please update to a newer version of elm-run')
          } else {
            console.log('Please update script to use a newer version of the kintail/script package')
          }
          process.exit(1)
        } else if (requiredMinorVersion > minorVersion) {
          let requiredVersionString = requiredMajorVersion + '.' + requiredMinorVersion
          console.log('Version mismatch: script requires elm-run version at least ' + requiredVersionString + describeCurrentVersion)
          console.log('Please update to a newer version of elm-run')
          process.exit(1)
        } else {
          responsePort.send(null)
        }
        break
      case 'print':
        console.log(request.value)
        responsePort.send(null)
        break
      case 'exit':
        process.exit(request.value)
      case 'readFile':
        try {
          let filename = request.value
          let contents = fs.readFileSync(filename, 'utf8')
          responsePort.send(contents)
        } catch (error) {
          responsePort.send({code: error.code, message: error.message})
        }
        break
      case 'writeFile':
        try {
          let filename = request.value.filename
          let contents = request.value.contents
          fs.writeFileSync(filename, contents, 'utf8')
          responsePort.send(null)
        } catch (error) {
          responsePort.send({code: error.code, message: error.message})
        }
        break
      case 'getEnvironmentVariable':
        responsePort.send(process.env[request.value] || null)
        break
      case 'listFiles':
        listEntities(request, responsePort, stats => stats.isFile())
        break
      case 'listSubdirectories':
        listEntities(request, responsePort, stats => stats.isDirectory())
        break
      case 'execute':
        try {
          let command = request.value.command
          let args = request.value.arguments
          let options = {encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024}
          let output = child_process.execSync(command + ' ' + args.join(' '), options)
          responsePort.send(output)
        } catch (error) {
          if (error.status !== null) {
            responsePort.send({error: 'exited', code: error.status})
          } else if (error.signal !== null) {
            responsePort.send({error: 'terminated'})
          } else {
            responsePort.send({error: 'failed', message: error.message})
          }
        }
        break
      default:
        console.log('Internal error - unexpected request: ' + request)
        console.log('Try updating to newer versions of elm-run and the kintail/script package')
        process.exit(1)
    }
  })
}