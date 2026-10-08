import { Container, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';
import { fetchMe, Me } from './api';
import { Home } from './pages/Home';
import { Login } from './pages/Login';

export function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetchMe().then(setMe, () => setMe(null));
  }, []);

  if (me === undefined) return <Spinner m="8" />;
  if (!me) return <Login />;

  return (
    <Container maxW="3xl" py="8">
      <Routes>
        <Route
          path="*"
          element={<Home me={me} onLogout={() => setMe(null)} />}
        />
      </Routes>
    </Container>
  );
}
