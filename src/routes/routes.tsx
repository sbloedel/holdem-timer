import type { RouteObject } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TimerPage } from '../pages/TimerPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Central route configuration. Add new pages here as the app grows,
 * e.g. `{ path: '/settings', element: <SettingsPage /> }`.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <TimerPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
