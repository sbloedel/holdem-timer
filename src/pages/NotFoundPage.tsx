import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Back to the timer</Link>
    </section>
  );
}
