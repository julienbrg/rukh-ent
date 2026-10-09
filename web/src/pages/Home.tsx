import {
  Badge,
  Button,
  Card,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Assistant, fetchAssistants, logout, Me } from '../api';

export function Home({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [assistants, setAssistants] = useState<Assistant[] | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchAssistants().then(setAssistants, () => setFailed(true));
  }, []);

  return (
    <Stack gap="4">
      <HStack justify="space-between">
        <Heading>Assistants</Heading>
        <Button size="sm" onClick={() => logout().then(onLogout)}>
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
      {failed ? (
        <Text role="alert" color="fg.error">
          Could not load the assistants.
        </Text>
      ) : !assistants ? (
        <Spinner />
      ) : assistants.length === 0 ? (
        <Text color="fg.muted">No assistants yet.</Text>
      ) : (
        <Stack as="ul" gap="3" listStyleType="none">
          {assistants.map((a) => (
            <Card.Root as="li" key={a.name} size="sm">
              <Card.Body gap="1">
                <HStack>
                  <Text fontWeight="semibold">{a.name}</Text>
                  {!a.published && <Badge colorPalette="orange">Draft</Badge>}
                  <Badge variant="outline">{a.model}</Badge>
                </HStack>
                {a.description && <Text color="fg.muted">{a.description}</Text>}
                <Text fontSize="sm" color="fg.muted">
                  {a.classes.length > 0 ? a.classes.join(', ') : 'Whole school'}
                </Text>
              </Card.Body>
            </Card.Root>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
