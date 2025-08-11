import { startTransition, useEffect, useState } from 'react';

export default function Hydrated({
  children,
  fallback,
}: {
  children: () => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => setHydrated(true));
  }, []);

  return hydrated && children ? <>{children()}</> : <>{fallback}</>;
}
