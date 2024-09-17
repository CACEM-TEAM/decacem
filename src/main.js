import { createApp } from 'vue';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './style.css';
import 'element-plus/dist/index.css';
import ElementPlus from 'element-plus'; 
import App from './App.vue';
import { setupCalendar, Calendar, DatePicker } from 'v-calendar';

const app = createApp(App);

app.use(ElementPlus); 
app.use(setupCalendar, {})
app.component('VCalendar', Calendar);
app.component('VDatePicker', DatePicker);
app.mount('#app');
