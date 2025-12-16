import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';

console.log('main.ts: Starting app initialization');

const target = document.getElementById('app');

if (!target) {
    console.error('Failed to find root element #app');
    throw new Error('Failed to find root element #app');
}

console.log('main.ts: Found target element', target);

const app = mount(App, {
    target
});

console.log('main.ts: App mounted successfully', app);

export default app;


