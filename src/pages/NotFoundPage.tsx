import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo';

export function NotFoundPage() {
  // No canonical here on purpose: an error page that points at the home page
  // is exactly what makes Google report "Duplicate without user-selected
  // canonical" for every unknown path.
  useSeo({
    title: 'Page not found - Holdem Timer',
    description: "The page you're looking for doesn't exist on Holdem Timer.",
    noindex: true,
  });

  return (
    <section>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Back to the timer</Link>
    </section>
  );
}
