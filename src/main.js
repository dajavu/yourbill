import Vue from 'vue'
import App from './App.vue'

import VCharts from 'v-charts'
import 'element-ui/lib/theme-chalk/index.css';
import {  Message,MessageBox,Button} from 'element-ui' 
Vue.use(Button)
Vue.use(VCharts)
Vue.prototype.$msgbox = MessageBox;
Vue.prototype.$message = Message;
Vue.prototype.$prompt = MessageBox.prompt;

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
