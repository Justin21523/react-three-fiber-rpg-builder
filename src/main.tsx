import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// No React.StrictMode — its dev double-mount disposes/recreates the WebGL context (one Canvas = one
// context is what we want).
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
