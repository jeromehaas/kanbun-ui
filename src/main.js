// IMPORTS
import { createApp } from 'vue';
import App from './app/app.vue';
import './styles/tailwind.css';
import 'vue-sonner/style.css';
import './styles/main.scss';

// SETUP APP
const app = createApp(App);

// MOUNT
app.mount('#app');
