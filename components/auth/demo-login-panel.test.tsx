import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DemoLoginPanel from './demo-login-panel';

const users = [
  { id: 'u1', name: 'Demo Admin', email: 'admin@demo.test', user_type: 'tenant_admin', tenant: { name: 'Demo Co' } },
  { id: 'u2', name: 'Demo Cashier', email: 'cashier@demo.test', user_type: 'tenant_user' },
];

describe('DemoLoginPanel', () => {
  it('renders demo buttons when users are provided', () => {
    render(<DemoLoginPanel users={users} onDemoLogin={async () => {}} />);

    expect(screen.getByText('Try the demo')).toBeInTheDocument();
    expect(screen.getByText('Demo Admin')).toBeInTheDocument();
    expect(screen.getByText('Demo Cashier')).toBeInTheDocument();
  });

  it('renders nothing when users list is empty', () => {
    const { container } = render(<DemoLoginPanel users={[]} onDemoLogin={async () => {}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onDemoLogin with the right user_id and shows loading', async () => {
    let resolveLogin!: () => void;
    const onDemoLogin = vi.fn(() => new Promise<void>(res => (resolveLogin = res)));

    render(<DemoLoginPanel users={users} onDemoLogin={onDemoLogin} />);

    fireEvent.click(screen.getByText('Demo Admin'));

    await waitFor(() => expect(onDemoLogin).toHaveBeenCalledWith('u1'));

    // Buttons disabled while one is logging in
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();

    resolveLogin();
    await waitFor(() => expect(screen.getByText('Demo Admin')).not.toBeDisabled());
  });
});
