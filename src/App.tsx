import { BrowserRouter, useRoutes } from 'react-router-dom';
import { routes } from './routes/routes';

function AppRoutes() {
  return useRoutes(routes);
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
