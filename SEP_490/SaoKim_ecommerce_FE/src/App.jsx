import { useEffect, useState } from 'react';
import { getHealth } from './api/http';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth().then(setData).catch(e => setError(e.message));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Test API Connection</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
