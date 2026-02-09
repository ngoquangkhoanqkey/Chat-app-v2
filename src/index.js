import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Redux:
import { Provider } from 'react-redux';
import { store } from './app/store';

// Suppress specific Chrome extension console error noise globally
(() => {
  const originalError = console.error;
  if (!console.__suppressChromeExtErrors) {
    Object.defineProperty(console, '__suppressChromeExtErrors', {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false,
    });
    console.error = (...args) => {
      const first = args[0];
      const msg = typeof first === 'string' ? first : (first && first.message) || '';
      if (
        msg.includes('Unchecked runtime.lastError') ||
        msg.includes('Could not establish connection') ||
        msg.includes('Receiving end does not exist')
      ) {
        return;
      }
      originalError.apply(console, args);
    };
  }
})();

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
