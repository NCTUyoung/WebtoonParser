/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'com.webtoon.scraper',
  productName: 'Webtoon爬蟲工具',
  directories: {
    output: 'dist'
  },
  files: [
    'out/**/*',
    'dist/**/*',
    'package.json'
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Webtoon爬蟲工具'
  },
  mac: {
    target: ['dmg'],
    icon: 'build/icon.icns'
  },
  linux: {
    target: ['AppImage'],
    icon: 'build/icon.png'
  }
}

module.exports = config 