const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const schedule = require('node-schedule');
const { EventEmitter } = require('events');

describe('定时功能测试', function() {
  this.timeout(10000); // 设置超时时间为10秒
  
  let mockIpcMain;
  let mockBrowserWindow;
  let mockWebContents;
  let scheduleJobs;
  let scheduleStub;
  let clock;
  let mockJob;
  
  before(function() {
    // 创建模拟对象
    mockIpcMain = new EventEmitter();
    mockIpcMain.on = sinon.spy(mockIpcMain, 'on');
    mockIpcMain.handle = sinon.spy();
    
    mockWebContents = {
      send: sinon.spy()
    };
    
    mockBrowserWindow = {
      webContents: mockWebContents
    };
    
    // 创建一个模拟的job对象
    mockJob = {
      rule: null,
      callback: null,
      nextInvocation: () => new Date(Date.now() + 60000), // 假设下次执行是1分钟后
      cancel: sinon.spy()
    };
    
    // 模拟schedule.scheduleJob函数
    scheduleJobs = new Map();
    scheduleStub = sinon.stub(schedule, 'scheduleJob').callsFake((rule, callback) => {
      mockJob.rule = rule;
      mockJob.callback = callback;
      scheduleJobs.set('main', mockJob);
      return mockJob;
    });
    
    // 使用sinon的fake timers来控制时间
    clock = sinon.useFakeTimers();
  });
  
  after(function() {
    // 恢复所有存根和模拟
    scheduleStub.restore();
    clock.restore();
  });
  
  it('应该能够正确设置定时任务', function() {
    // 模拟主进程中的定时任务处理逻辑
    mockIpcMain.on('start-schedule', (event, settings) => {
      const { day, hour, minute, timezone } = settings;
      const dayMap = {
        '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '日': 0
      };
    
      const rule = new schedule.RecurrenceRule();
      rule.dayOfWeek = dayMap[day];
      rule.hour = parseInt(hour);
      rule.minute = parseInt(minute);
      rule.tz = timezone;
    
      const job = schedule.scheduleJob(rule, () => {
        mockBrowserWindow.webContents.send('schedule-trigger');
      });
    
      scheduleJobs.set('main', job);
      event.reply('log-message', `Schedule task started: Every ${day} ${hour}:${minute} (${timezone})`);
    });
    
    // 模拟事件对象
    const event = {
      reply: sinon.spy()
    };
    
    // 触发start-schedule事件
    const settings = {
      day: '五',
      hour: '18',
      minute: '00',
      timezone: 'Asia/Taipei'
    };
    
    mockIpcMain.emit('start-schedule', event, settings);
    
    // 验证scheduleJob是否被调用
    expect(scheduleStub.calledOnce).to.be.true;
    
    // 验证参数是否正确
    const call = scheduleStub.getCall(0);
    const rule = call.args[0];
    expect(rule.dayOfWeek).to.equal(5); // 星期五
    expect(rule.hour).to.equal(18);
    expect(rule.minute).to.equal(0);
    expect(rule.tz).to.equal('Asia/Taipei');
    
    // 验证日志消息是否正确
    expect(event.reply.calledWith('log-message', 'Schedule task started: Every 五 18:00 (Asia/Taipei)')).to.be.true;
  });
  
  it('应该能够在定时时间到达时触发事件', function() {
    // 获取当前的job
    const job = scheduleJobs.get('main');
    expect(job).to.exist;
    
    // 手动触发回调函数，模拟定时时间到达
    job.callback();
    
    // 验证是否发送了schedule-trigger事件
    expect(mockWebContents.send.calledWith('schedule-trigger')).to.be.true;
  });
  
  it('应该能够取消定时任务', function() {
    // 确保在测试开始时job存在于Map中
    expect(scheduleJobs.has('main')).to.be.true;
    expect(scheduleJobs.get('main')).to.equal(mockJob);
    
    // 模拟主进程中的取消定时任务逻辑
    mockIpcMain.on('stop-schedule', (event) => {
      const job = scheduleJobs.get('main');
      if (job) {
        job.cancel();
        scheduleJobs.delete('main');
        event.reply('log-message', 'Schedule task stopped');
      }
    });
    
    // 模拟事件对象
    const event = {
      reply: sinon.spy()
    };
    
    // 触发stop-schedule事件
    mockIpcMain.emit('stop-schedule', event);
    
    // 验证job.cancel是否被调用
    expect(mockJob.cancel.calledOnce).to.be.true;
    
    // 验证日志消息是否正确
    expect(event.reply.calledWith('log-message', 'Schedule task stopped')).to.be.true;
    
    // 验证job是否已从Map中删除
    expect(scheduleJobs.has('main')).to.be.false;
  });
}); 