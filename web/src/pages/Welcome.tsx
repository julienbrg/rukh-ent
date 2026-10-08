import { Button, Center, Heading, Stack } from '@chakra-ui/react';
import { logout, Me } from '../api';

export function Welcome({ me, onLogout }: { me: Me; onLogout: () => void }) {
  return (
    <Center minH="100vh">
      <Stack gap="8" align="center">
        <Heading size="4xl">Welcome, {me.profile}!</Heading>
        <Button onClick={() => logout().then(onLogout)}>Log out</Button>
      </Stack>
    </Center>
  );
}
