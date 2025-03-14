const Utils = require('../utils/utils')

// Request throttler - manages request frequency to prevent rate limiting
class RequestThrottler {
  constructor(minDelay, maxDelay, logFunction) {
    this.minDelay = minDelay
    this.maxDelay = maxDelay
    this.log = logFunction
    this.lastRequestTime = 0
  }
  
  async throttleRequest(requestFn, ...args) {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    // Calculate wait time
    let waitTime = 0
    if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minDelay) {
      waitTime = Utils.getRandomDelay(
        this.minDelay - timeSinceLastRequest,
        this.maxDelay - timeSinceLastRequest
      )
      
      if (waitTime > 0) {
        this.log(`Throttle control: Waiting ${waitTime/1000} seconds before continuing...`)
        await Utils.sleep(waitTime)
      }
    }
    
    // Execute request
    this.lastRequestTime = Date.now()
    const result = await requestFn(...args)
    return result
  }
  
  reset() {
    this.lastRequestTime = 0
  }
}

module.exports = RequestThrottler 