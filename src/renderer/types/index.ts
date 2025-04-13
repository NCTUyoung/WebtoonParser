export interface LogMessage {
  time: string
  message: string
}

// Add TypeScript interface for window.electron
interface ElectronAPI {
  send: (channel: string, data?: any) => void
  invoke: (channel: string, data?: any) => Promise<any>
  on: (channel: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
  platform: string
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
} 