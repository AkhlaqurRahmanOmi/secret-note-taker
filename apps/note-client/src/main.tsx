import '@fontsource-variable/schibsted-grotesk';
import { StrictMode } from 'react';
import { MotionConfig } from 'motion/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { AuthProvider } from './auth';
import { ToastProvider } from './toast';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <BrowserRouter>
      {/* Honour the OS "reduce motion" setting everywhere. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
