/**
 * Renders the POS Payment Breakdown page against a captured API payload so the
 * screen is checked against what the backend actually returns (RPT-POS-006),
 * not against the stale pre-migration shape the page used to declare.
 *
 * PAYLOAD is a verbatim `GET /api/v1/reports/pos/payment-breakdown` response,
 * captured against the local database with a rolled-back fixture of six POS
 * payments: three settled (cash 100, bKash 300, card 250), one failed cash
 * attempt (9999), one refunded card settlement (50) and one pending Nagad
 * payment (75). All nine methods come back, the five unused ones zero-filled.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import PaymentBreakdownPage from './page';
import { formatCurrency } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    paymentBreakdown: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/services', () => ({
  posRegisterService: {
    dropdown: vi.fn(async () => [{ id: 'reg-1', name: 'Front Counter' }]),
  },
  posSessionService: {
    list: vi.fn(async () => ({
      data: [{ id: 'ses-1', session_number: 'SESS-0001' }],
      pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    })),
  },
  // GET /api/v1/users returns `{ data, pagination }` via ApiResponse::paginated.
  userService: {
    getUsers: vi.fn(async () => ({
      data: [{ id: 'u-1', name: 'Cashier Electric Store' }],
      pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    })),
  },
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    isSuperAdmin: false,
    hasPermission: () => true,
  }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (sel: (s: any) => any) => sel({ user: { tenant_id: 'tenant-1' } }),
}));

vi.mock('@/components/ui/tenant-select', () => ({
  default: () => <div data-testid="tenant-select" />,
}));

vi.mock('@/components/ui/date-picker', () => ({
  default: ({ value }: any) => <input data-testid="date-picker" value={value ?? ''} readOnly />,
}));

// Each mocked dropdown resolves its options asynchronously and hands back a
// distinct, identifiable option, so a test can assert which filter was picked.
vi.mock('@/components/ui/custom-select', () => ({
  default: ({ loadOptions, placeholder, onChange }: any) => (
    <button
      data-testid={`select-${placeholder ?? 'x'}`}
      onClick={async () => {
        const opts = await loadOptions('');
        onChange(opts[0] ?? null);
      }}
    >
      {placeholder ?? 'select'}
    </button>
  ),
}));

vi.mock('@/lib/notifications', () => ({
  notify: { error: vi.fn(), warning: vi.fn() },
}));

// ── Captured API payload ─────────────────────────────────────────────────────

/** The five methods that took nothing — returned zero-filled, not omitted. */
const ZERO_ROW = {
  transaction_count: 0,
  received_count: 0,
  received: 0,
  refunded: 0,
  net_amount: 0,
  pending: 0,
  failed_count: 0,
  avg_transaction: 0,
  largest_transaction: 0,
  share_pct: 0,
};

const PAYLOAD = {
  data: [
    { payment_method: 'bkash', ...ZERO_ROW, received: 300, net_amount: 300, avg_transaction: 300, largest_transaction: 300, share_pct: 46.2, transaction_count: 1, received_count: 1 },
    { payment_method: 'card', ...ZERO_ROW, transaction_count: 2, received_count: 1, received: 250, refunded: 50, net_amount: 200, avg_transaction: 250, largest_transaction: 250, share_pct: 38.5 },
    { payment_method: 'cash', ...ZERO_ROW, transaction_count: 2, received_count: 1, received: 100, net_amount: 100, avg_transaction: 100, largest_transaction: 100, failed_count: 1, share_pct: 15.4 },
    { payment_method: 'bank_transfer', ...ZERO_ROW },
    { payment_method: 'check', ...ZERO_ROW },
    { payment_method: 'credit', ...ZERO_ROW },
    { payment_method: 'nagad', ...ZERO_ROW, transaction_count: 1, pending: 75 },
    { payment_method: 'other', ...ZERO_ROW },
    { payment_method: 'rocket', ...ZERO_ROW },
  ],
  summary: {
    start_date: '2025-10-05',
    end_date: '2026-10-06',
    method_count: 9,
    active_method_count: 4,
    transaction_count: 6,
    received_count: 3,
    total_received: 650,
    total_refunded: 50,
    net_amount: 600,
    total_pending: 75,
    avg_transaction: 216.67,
    cash_received: 100,
    cash_share_pct: 15.4,
    digital_received: 550,
    digital_share_pct: 84.6,
    top_method: [{ label: 'bkash', value: 300, share_pct: 46.2 }],
  },
  columns: [
    { key: 'payment_method', label: 'Payment Method', type: 'text', align: 'left', totals: false },
    { key: 'received', label: 'Received', type: 'money', align: 'right', totals: true },
    { key: 'net_amount', label: 'Net', type: 'money', align: 'right', totals: true },
  ],
  filters_applied: ['Period: 05 Oct 2025 – 06 Oct 2026'],
  generated_at: '2026-10-05T13:30:00+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = async () => {
  render(<PaymentBreakdownPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  // Anchor on the table header: method names also appear on the Top Method card.
  await waitFor(() =>
    expect(screen.getByRole('columnheader', { name: /Payment Method/ })).toBeInTheDocument(),
  );
};

const clickSelect = async (testId: string) => {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId));
  });
};

/**
 * The table row for a payment method, scoped to the table.
 *
 * Method names also appear as <option> labels in the Payment Method filter, so
 * a plain getByText('Cash') is ambiguous — this picks the cell element only.
 */
const rowFor = (method: string) => {
  const cell = within(screen.getByRole('table'))
    .getAllByText(method)
    .find((el) => el.closest('td'));
  expect(cell, `no table row found for "${method}"`).toBeTruthy();
  return cell!.closest('tr') as HTMLElement;
};

/**
 * The rendered text of one named column within a row.
 *
 * Needed because several columns in a row can hold the same figure — cash
 * reads ৳100.00 under Received, Avg Txn and Largest alike — so a text query
 * alone cannot say *which* column a value belongs to.
 */
const cellTextFor = (row: HTMLElement, header: string) => {
  const headers = within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((h) => h.textContent?.trim() ?? '');
  const idx = headers.findIndex((h) => h === header);
  expect(idx, `no column header named "${header}"`).toBeGreaterThanOrEqual(0);
  const cells = within(row).getAllByRole('cell');
  return (cells[idx]?.textContent ?? '').trim();
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentBreakdownPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<PaymentBreakdownPage />);
    expect(screen.queryByRole('columnheader', { name: /Payment Method/ })).not.toBeInTheDocument();
  });

  it('sends a date range and the resolved tenant by default', async () => {
    await generate();
    expect(captured.params.start_date).toBeTruthy();
    expect(captured.params.end_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
  });

  it('renders rows using the migrated field names, not the legacy shape', async () => {
    await generate();

    // Columns from the new ReportDefinition.
    expect(screen.getByRole('columnheader', { name: /Attempts/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Failed/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Received/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Refunded/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Net$/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Pending/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Avg Txn/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Largest/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Share %/ })).toBeInTheDocument();

    // The legacy row shape described columns the endpoint never returned.
    expect(screen.queryByRole('columnheader', { name: /Total Amount/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Processing Fees/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Net Amount/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /% of Total/ })).not.toBeInTheDocument();
  });

  it('shows all nine methods, with unused ones flagged as having no activity', async () => {
    await generate();

    // The backend zero-fills the spine; a method that took nothing must still
    // appear, and must be distinguishable from one that did.
    // "Bkash" is also the Top Method card's value, hence getAllByText.
    expect(screen.getAllByText('Bkash').length).toBeGreaterThan(0);
    expect(rowFor('Bank Transfer')).toBeInTheDocument();
    expect(rowFor('Rocket')).toBeInTheDocument();

    // Six of the nine settled no money: bank_transfer, check, credit, other,
    // rocket — and nagad, whose only payment is pending.
    expect(screen.getAllByText('No activity').length).toBe(6);
  });

  it('divides the average by settled transactions, not by every attempt', async () => {
    await generate();

    // Cash: received 100 across 2 attempts, but only 1 settled. The row's own
    // average is 100/1 = 100, not 100/2 = 50 — a failed attempt took no money.
    // Cash: received 100 across 2 attempts, but only 1 settled. The row's own
    // average is 100/1 = 100, not 100/2 = 50 — a failed attempt took no money.
    const cashRow = rowFor('Cash');
    expect(cellTextFor(cashRow, 'Avg Txn')).toBe(formatCurrency(100));
    // Its Largest is the settled 100 too, never the 9999 failure.
    expect(cellTextFor(cashRow, 'Largest')).toBe(formatCurrency(100));
    expect(cellTextFor(cashRow, 'Attempts')).toBe('2');
    expect(cellTextFor(cashRow, 'Failed')).toBe('1');

    // The period average comes from the summary: 650 received / 3 settled.
    // It shows on the card and again in the totals row.
    expect(screen.getAllByText(formatCurrency(216.67)).length).toBeGreaterThan(0);
  });

  it('never reports a failed or pending attempt as the largest transaction', async () => {
    await generate();

    // The cash fixture includes a FAILED 9999 attempt and there is a PENDING
    // Nagad 75. Neither may surface as a "Largest" figure.
    expect(screen.queryByText(formatCurrency(9999))).not.toBeInTheDocument();

    // Nagad's only payment is the pending 75, which is reported under Pending
    // and must not be promoted to Largest, since nothing was ever received.
    const nagadRow = rowFor('Nagad');
    expect(cellTextFor(nagadRow, 'Pending')).toBe(formatCurrency(75));
    expect(cellTextFor(nagadRow, 'Largest')).toBe('—');
    expect(cellTextFor(nagadRow, 'Avg Txn')).toBe('—');
  });

  it('flags unsettled money on the Pending card', async () => {
    await generate();
    // total_pending 75.
    expect(screen.getByText(/taken but not yet settled/)).toBeInTheDocument();
  });

  it('separates cash from digital takings and keeps their shares adding to 100', async () => {
    await generate();

    expect(screen.getByText(/15\.4% of takings/)).toBeInTheDocument();
    expect(screen.getByText(/84\.6% of takings/)).toBeInTheDocument();
  });

  it('names the top method from the summary breakdown', async () => {
    await generate();
    // top_method is a [{ label, value, share_pct }] breakdown, not a flat map,
    // so the card reads "৳300.00 net · 46.2% of takings".
    expect(screen.getByText(/46\.2% of takings/)).toBeInTheDocument();
  });

  it('renders the summary cards from the report summary', async () => {
    await generate();

    expect(screen.getByText('Total Received')).toBeInTheDocument();
    expect(screen.getByText('Net After Refunds')).toBeInTheDocument();
    expect(screen.getByText('Cash Received')).toBeInTheDocument();
    expect(screen.getByText('Digital Received')).toBeInTheDocument();
    expect(screen.getByText('Refunded Out')).toBeInTheDocument();
    // "Pending" is a card label, a column header and a totals cell.
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(screen.getByText('Avg Transaction')).toBeInTheDocument();
    expect(screen.getByText('Top Method')).toBeInTheDocument();
  });

  it('renders the totals footer from the summary', async () => {
    await generate();
    expect(screen.getByText('Totals')).toBeInTheDocument();
    // Net is 650 received − 50 refunded = 600.
    expect(screen.getAllByText(formatCurrency(600)).length).toBeGreaterThan(0);
  });

  it('shows the report period and generated-at stamp in the header', async () => {
    await generate();
    expect(screen.getByText(/5 October 2025/)).toBeInTheDocument();
    expect(screen.getByText(/generated/)).toBeInTheDocument();
  });

  it('passes each filter through under its backend param name', async () => {
    render(<PaymentBreakdownPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /Payment Method/ })).toBeInTheDocument(),
    );

    captured.params = {};

    await clickSelect('select-All cashiers');
    await clickSelect('select-All registers');
    await clickSelect('select-All sessions');

    fireEvent.change(screen.getByText('All Methods').closest('select')!, {
      target: { value: 'bkash' },
    });
    fireEvent.change(screen.getByText('All Statuses').closest('select')!, {
      target: { value: 'completed' },
    });
    fireEvent.change(screen.getByText('Sales & Refunds').closest('select')!, {
      target: { value: 'pos' },
    });
    fireEvent.change(screen.getByPlaceholderText(/bkash/), { target: { value: 'card' } });

    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(captured.params.cashier_id).toBe('u-1');
      expect(captured.params.register_id).toBe('reg-1');
      expect(captured.params.session_id).toBe('ses-1');
      expect(captured.params.payment_method).toBe('bkash');
      expect(captured.params.status).toBe('completed');
      expect(captured.params.reference_type).toBe('pos');
      expect(captured.params.search).toBe('card');
    });
  });

  it('clears the data and filters on reset', async () => {
    await generate();
    expect(screen.getByRole('columnheader', { name: /Payment Method/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: /Payment Method/ })).not.toBeInTheDocument(),
    );
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.paymentBreakdown = vi.fn(async () => {
      throw { response: { data: { message: 'The payment method must be one of: cash, card.' } } };
    }) as any;

    render(<PaymentBreakdownPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(screen.getByText('The payment method must be one of: cash, card.')).toBeInTheDocument(),
    );
  });
});