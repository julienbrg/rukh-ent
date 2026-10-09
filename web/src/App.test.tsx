import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Assistant, Me } from './api';

const teacher: Me = {
  userId: 'u1',
  profile: 'Teacher',
  role: 'teacher',
  schools: ['0750001A'],
  classes: ['3A'],
  allowedModels: [],
};

const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
}

function renderApp(path = '/') {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('shows a spinner while /me is loading', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = renderApp();
    expect(container.querySelector('.chakra-spinner')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/me', expect.anything());
  });

  it('shows the Login page when /me returns 401', async () => {
    fetchMock.mockReturnValue(respond(401));
    renderApp();
    expect(
      await screen.findByRole('link', { name: 'Log in with the ENT' }),
    ).toHaveAttribute('href', '/auth/login');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['refused', 'Your ENT profile is not recognised.'],
    ['state', 'The login expired or was interrupted. Please try again.'],
  ])('shows the ?error=%s message', async (error, message) => {
    fetchMock.mockReturnValue(respond(401));
    renderApp(`/?error=${error}`);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('shows Welcome with the profile when there is a session', async () => {
    fetchMock.mockReturnValue(respond(200, teacher));
    renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Teacher!' }),
    ).toBeInTheDocument();
  });

  it('logs out and returns to Login', async () => {
    fetchMock
      .mockReturnValueOnce(respond(200, teacher))
      .mockReturnValueOnce(respond(204));
    renderApp();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Log out' }),
    );
    expect(
      await screen.findByRole('link', { name: 'Log in with the ENT' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
  });

  describe('/assistants', () => {
    const assistant = (overrides: Partial<Assistant>): Assistant => ({
      name: 'hdf-0750001a-maths-abc123',
      ownerId: 'u1',
      uai: '0750001A',
      classes: [],
      published: true,
      model: 'mistral',
      description: '',
      createdAt: '',
      updatedAt: '',
      ...overrides,
    });

    function serve(context: () => Promise<Response>) {
      fetchMock.mockImplementation((url) =>
        url === '/me' ? respond(200, teacher) : context(),
      );
    }

    it('lists the visible assistants', async () => {
      serve(() =>
        respond(200, [
          assistant({ name: 'draft-one', published: false, classes: ['3A'] }),
          assistant({ name: 'school-one', description: 'For everyone' }),
        ]),
      );
      renderApp('/assistants');
      expect(await screen.findByText('draft-one')).toBeInTheDocument();
      expect(screen.getByText('school-one')).toBeInTheDocument();
      expect(screen.getByText('For everyone')).toBeInTheDocument();
      expect(screen.getAllByText('Draft')).toHaveLength(1);
      expect(screen.getByText('3A', { selector: 'p' })).toBeInTheDocument();
      expect(screen.getByText('Whole school')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith('/context', expect.anything());
    });

    it('says when there are none', async () => {
      serve(() => respond(200, []));
      renderApp('/assistants');
      expect(await screen.findByText('No assistants yet.')).toBeInTheDocument();
    });

    it('says when loading fails', async () => {
      serve(() => respond(500));
      renderApp('/assistants');
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not load the assistants.',
      );
    });
  });
});
