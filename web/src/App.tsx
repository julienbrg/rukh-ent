import { Container, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';
import { fetchMe, Me } from './api';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Welcome } from './pages/Welcome';

export function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetchMe().then(setMe, () => setMe(null));
  }, []);

  if (me === undefined) return <Spinner m="8" />;
  if (!me) return <Login />;

  return (
    <Routes>
      <Route
        path="/assistants"
        element={
          <Container maxW="3xl" py="8">
            <Home me={me} onLogout={() => setMe(null)} />
          </Container>
        }
      />
      <Route path="*" element={<Welcome me={me} />} />
    </Routes>
  );
}
