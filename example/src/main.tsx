import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import {loadAuthServiceWorker} from 'auth-worker';
import {OAUTH2_CONFIG} from './config';
const publicUrl = import.meta.env.VITE_PUBLIC_URL;

await loadAuthServiceWorker(OAUTH2_CONFIG.config, {
  workerPath: publicUrl + '/service-worker.global.js',
  debug: true,
}).catch(console.error);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App/>);
