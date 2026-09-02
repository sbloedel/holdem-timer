import { Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

/**
 * Shared page shell (header/nav/footer). Nested routes render into
 * `<Outlet />`. Add shared navigation here as more routes are introduced.
 */
export function Layout() {
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
