// Main entry point for the webtoon parser module
const WebtoonScraper = require('./webtoon-scraper')
const FileHelper = require('../utils/file-helper')
const excelIntegration = require('../excel-integration')
const RequestThrottler = require('./request-throttler')

// Export WebtoonScraper as default for backward compatibility
module.exports = WebtoonScraper

// Also export all classes as properties
module.exports.WebtoonScraper = WebtoonScraper
module.exports.FileHelper = FileHelper
module.exports.excelIntegration = excelIntegration
module.exports.RequestThrottler = RequestThrottler 