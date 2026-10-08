import { Center, Heading } from '@chakra-ui/react';
import { Me } from '../api';

export function Welcome({ me }: { me: Me }) {
  return (
    <Center minH="100vh">
      <Heading size="4xl">Welcome, {me.profile}!</Heading>
    </Center>
  );
}
