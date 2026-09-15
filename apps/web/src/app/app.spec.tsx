import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './home';
import { ThemeProvider } from '../lib/theme';
import { getReadiness } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({ getReadiness: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.mocked(getReadiness).mockResolvedValue({ status: 'ok' });
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('starter shell', () => {
  function renderHome() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Home />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  }

  it('shows loading and then the validated ready state', async () => {
    renderHome();

    expect(screen.getByText('Checking the API…')).toBeInTheDocument();
    expect(await screen.findByText('Ready')).toBeInTheDocument();
  });

  it('shows malformed and unavailable responses as unavailable', async () => {
    vi.mocked(getReadiness).mockRejectedValueOnce(new Error('invalid payload'));
    vi.mocked(getReadiness).mockRejectedValueOnce(new Error('problem details'));
    renderHome();

    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(getReadiness).toHaveBeenCalledTimes(2);
  });

  it('retries automatically and supports a manual retry', async () => {
    vi.mocked(getReadiness)
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('still offline'))
      .mockResolvedValueOnce({ status: 'ok' });
    renderHome();

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(getReadiness).toHaveBeenCalledTimes(2);
    await userEvent.click(retry);
    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(getReadiness).toHaveBeenCalledTimes(3);
  });

  it('persists explicit theme overrides across remounts', async () => {
    const first = renderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));

    await waitFor(() => {
      expect(localStorage.getItem('starter-theme')).toBe('dark');
      expect(document.documentElement).toHaveClass('dark');
    });

    first.unmount();
    renderHome();
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('follows the system theme by default', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderHome();
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
