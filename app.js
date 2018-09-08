#!/usr/bin/env electron

var path = require('path')
var electron = require('electron')

// GPU acceleration for my old laptop
electron.app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true')

electron.app.once('ready', createWindow)

function createWindow () {
  electron.globalShortcut.register('Esc', function () {
    process.exit(0)
  })

  var INDEX = 'file://' + path.resolve(__dirname, './index.html')
  var winOpts = {
    title: 'CHAIN SWORD',
    width: 640,
    height: 576,
    fullscreen: true,
  }
  var win = new electron.BrowserWindow(winOpts)
  win.once('ready-to-show', function () {
    win.setMenu(null)
    win.show()
    if (process.argv[2] === 'debug') win.webContents.openDevTools()
  })
  win.loadURL(INDEX)
}
