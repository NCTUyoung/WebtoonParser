const fs = require('fs')

// File system helper class for handling file operations
class FileHelper {
  static fileExists(filePath) {
    return fs.existsSync(filePath)
  }
  
  static isDirectory(dirPath) {
    if (!this.fileExists(dirPath)) return false
    return fs.lstatSync(dirPath).isDirectory()
  }
  
  static createDirectory(dirPath) {
    if (!this.fileExists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      return true
    }
    return false
  }
  
  static isFileReadWritable(filePath) {
    try {
      const fd = fs.openSync(filePath, 'r+')
      fs.closeSync(fd)
      return true
    } catch (error) {
      return false
    }
  }
  
  static writeFile(filePath, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
  
  static deleteFile(filePath) {
    if (this.fileExists(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }
  
  static renameFile(oldPath, newPath) {
    if (this.fileExists(oldPath)) {
      fs.renameSync(oldPath, newPath)
      return true
    }
    return false
  }
}

module.exports = FileHelper 