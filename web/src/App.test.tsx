import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Me } from './api';

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
});
