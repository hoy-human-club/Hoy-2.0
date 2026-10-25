import React from 'react';
import ReactDOM from 'react-dom/client';
import './design/tokens.css';
import './styles/global.css';
import './styles/motion.css';
import { installFrameSession } from './app/frameSession';
import { installDepth } from './design/depth';
import { App } from './app/App';
import { enterCleanHub } from './app/cleanHubEntry';

// Before React renders: a preview iframe runs under the session its hash asks for
// (src/app/frameSession.ts) instead of the tester's own. The providers read those keys in their
// useState initialisers, so this has to happen first.
if (!enterCleanHub()) {
installFrameSession();
installDepth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
}
