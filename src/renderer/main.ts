import './styles/index.css';
import { installDomExtensions } from './helpers/dom';
import { App } from './core/App';

// Install Obsidian-style HTMLElement prototype extensions
installDomExtensions();

// Initialize the application
const rootEl = document.getElementById('app');
if (!rootEl) {
  throw new Error('Root element #app not found');
}

const app = new App(rootEl as HTMLElement);
app.load();
