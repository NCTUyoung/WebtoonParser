/**
 * Schedule management module
 * Handles creation, management, and execution of scheduled tasks
 */

const { ipcMain } = require('electron')
const schedule = require('node-schedule')
const config = require('../core/config')
const logger = require('../utils/logger')
const windowManager = require('./window-manager')

// Map to store scheduled jobs
const scheduleJobs = new Map()

/**
 * Register schedule-related IPC handlers
 * @param {boolean} isTest - Whether to run in test mode
 */
function registerScheduleHandlers(isTest) {
  ipcMain.on('start-schedule', (event, settings) => {
    const { scheduleType, day, hour, minute, timezone } = settings
    const rule = createScheduleRule(scheduleType, day, hour, minute, timezone)
    
    const now = new Date()
    const scheduledTime = createScheduledTime(hour, minute)
    
    logger.logMessage('Current time: ' + now.toString(), event)
    logger.logMessage('Scheduled time: ' + scheduledTime.toString(), event)
    
    if (scheduleType === 'weekly') {
      logger.logMessage(`Current day of week: ${now.getDay()}, Scheduled day: ${rule.dayOfWeek}`, event)
    }
  
    const shouldTriggerImmediately = shouldRunImmediately(scheduleType, now, scheduledTime, rule, isTest)
    
    if (shouldTriggerImmediately) {
      logger.logMessage('Plan time has passed or is in test mode, execute immediately', event)
      // Immediately trigger, then set scheduled task
      const mainWindow = windowManager.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('schedule-trigger')
      }
    } else {
      logger.logMessage('Waiting for next plan time', event)
    }
  
    const job = schedule.scheduleJob(rule, () => {
      logger.logMessage('Plan task triggered')
      const mainWindow = windowManager.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('schedule-trigger')
      }
    })
  
    scheduleJobs.set('main', job)
    
    // Generate and record plan information
    const scheduleInfo = generateScheduleInfo(scheduleType, day, hour, minute, timezone, job)
    logger.logMessage(scheduleInfo.message, event)
    logger.logMessage(scheduleInfo.nextRunMessage, event)
    
    return { success: true, message: scheduleInfo.message }
  })

  ipcMain.on('stop-schedule', (event) => {
    const job = scheduleJobs.get('main')
    if (job) {
      job.cancel()
      scheduleJobs.delete('main')
      logger.logMessage('Plan task stopped', event)
      event.reply('log-message', 'Plan task stopped')
    }
  })
}

/**
 * Create schedule rule
 * @param {string} scheduleType - Schedule type ('weekly' or 'daily')
 * @param {string} day - Day of week (if weekly type)
 * @param {string} hour - Hour
 * @param {string} minute - Minute
 * @param {string} timezone - Timezone
 * @returns {schedule.RecurrenceRule} Created schedule rule
 */
function createScheduleRule(scheduleType, day, hour, minute, timezone) {
  const rule = new schedule.RecurrenceRule()
  
  // Set different rules based on schedule type
  if (scheduleType === 'weekly') {
    rule.dayOfWeek = config.date.dayOfWeekMap[day]
  }
  
  rule.hour = parseInt(hour)
  rule.minute = parseInt(minute)
  rule.tz = timezone
  
  return rule
}

/**
 * Create plan time object
 * @param {string} hour - Hour
 * @param {string} minute - Minute
 * @returns {Date} Created date object
 */
function createScheduledTime(hour, minute) {
  const scheduledTime = new Date()
  scheduledTime.setHours(parseInt(hour))
  scheduledTime.setMinutes(parseInt(minute))
  scheduledTime.setSeconds(0)
  scheduledTime.setMilliseconds(0)
  return scheduledTime
}

/**
 * Determine whether to run immediately
 * @param {string} scheduleType - Schedule type ('weekly' or 'daily')
 * @param {Date} now - Current time
 * @param {Date} scheduledTime - Plan time
 * @param {schedule.RecurrenceRule} rule - Schedule rule
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {boolean} Whether to run immediately
 */
function shouldRunImmediately(scheduleType, now, scheduledTime, rule, isTest) {
  return (scheduleType === 'daily' && now > scheduledTime) || 
         (scheduleType === 'weekly' && now.getDay() === rule.dayOfWeek && now > scheduledTime) || 
         (isTest && process.env.IMMEDIATE_TRIGGER === 'true')
}

/**
 * Generate plan information for logging
 * @param {string} scheduleType - Schedule type ('weekly' or 'daily')
 * @param {string} day - Day of week (if weekly type)
 * @param {string} hour - Hour
 * @param {string} minute - Minute
 * @param {string} timezone - Timezone
 * @param {schedule.Job} job - Schedule task
 * @returns {Object} Object containing message and next execution message
 */
function generateScheduleInfo(scheduleType, day, hour, minute, timezone, job) {
  let message = ''
  if (scheduleType === 'weekly') {
    message = `Plan task started: Weekly ${day} ${hour}:${minute} (${timezone})`
  } else if (scheduleType === 'daily') {
    message = `Plan task started: Daily ${hour}:${minute} (${timezone})`
  }
  
  const nextRun = job.nextInvocation()
  const nextRunMessage = `Next execution time: ${nextRun}`
  
  return { message, nextRunMessage }
}

/**
 * Get active schedule task Map
 * @returns {Map} Schedule task Map
 */
function getScheduleJobs() {
  return scheduleJobs
}

module.exports = {
  registerScheduleHandlers,
  createScheduleRule,
  createScheduledTime,
  shouldRunImmediately,
  generateScheduleInfo,
  getScheduleJobs
} 