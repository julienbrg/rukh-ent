import { Badge, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { logout, Me } from '../api';

export function Home({ me, onLogout }: { me: Me; onLogout: () => void }) {
  return (
    <Stack gap="4">
      <HStack justify="space-between">
        <Heading>Assistants</Heading>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout().then(onLogout)}
        >
          Log out
        </Button>
      </HStack>
      <HStack>
        <Badge>{me.role}</Badge>
        {me.schools.map((uai) => (
          <Badge key={uai} variant="outline">
            {uai}
          </Badge>
        ))}
        {me.classes.map((name) => (
          <Badge key={name} variant="subtle">
            {name}
          </Badge>
        ))}
      </HStack>
      <Text color="fg.muted">No assistants yet.</Text>
    </Stack>
  );
}
