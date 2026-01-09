import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Redux:
import { Provider } from 'react-redux';
import { store } from './app/store';

// Suppress Chrome extension errors
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      args[0]?.includes?.('Could not establish connection') ||
      args[0]?.includes?.('Receiving end does not exist')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

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
