interface ElectronAPI {
  startScraping: (url: string) => Promise<any>
  send: (channel: string, data?: any) => void
  invoke: (channel: string, data?: any) => Promise<any>  // 添加 invoke 類型
  on: (channel: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
  platform: string
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
} 

export {}