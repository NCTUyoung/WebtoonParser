import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import App from './App.vue'
import './styles/global.scss'

const app = createApp(App)

app.use(ElementPlus, {
  locale: zhTw,
})

app.mount('#app') 