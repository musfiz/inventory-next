/**
 * Renders the POS Session Summary page against a payload captured from the live
 * API (PosSessionSummaryReport, RPT-POS-004), so the screen is checked against
 * what the backend actually returns.
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatCurrency } from '@/lib/utils/format';
import PosSessionSummaryPage from './page';

const captured: { params: Record<string, any> } = { params: {} };

/**
 * The single mock the page calls. Failure cases use `mockImplementationOnce`
 * rather than replacing it, so no test can leak its stub into the next one.
 */
const posSessionSummaryMock = vi.fn(async (params: Record<string, any>) => {
  captured.params = params;
  return PAYLOAD as any;
});

vi.mock('@/services/reportService', () => ({
  default: {
    posSessionSummary: (params: Record<string, any>) => posSessionSummaryMock(params),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/services', () => ({
  posRegisterService: { dropdown: vi.fn(async () => [{ id: 'reg-1', name: 'Front Counter' }]) },
  commonService: {
    getWarehousesByTenant: vi.fn(async () => [{ id: 'wh-1', name: 'Shop Warehouse' }]),
  },
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ isSuperAdmin: false, hasPermission: () => true }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (sel: (s: any) => any) => sel({ user: { tenant_id: 'tenant-1' } }),
}));

vi.mock('@/components/ui/tenant-select', () => ({ default: () => <div data-testid="tenant-select" /> }));

vi.mock('@/components/ui/date-picker', () => ({
  default: ({ value }: any) => <input data-testid="date-picker" value={value ?? ''} readOnly />,
}));

vi.mock('@/components/ui/custom-select', () => ({
  default: ({ placeholder, onChange }: any) => (
    <button
      data-testid={placeholder === 'All warehouses' ? 'warehouse-select' : 'register-select'}
      onClick={() => onChange({ value: 'wh-1', label: 'Shop Warehouse' })}
    >
      {placeholder ?? 'select'}
    </button>
  ),
}));

vi.mock('@/lib/notifications', () => ({ notify: { error: vi.fn(), warning: vi.fn() } }));

// ── Captured payload ────────────────────────────────────────────────────────

const PAYLOAD = {
  data: [
    {
      id: 's-3',
      session_number: 'SESS-003',
      cashier_name: 'Asha',
      register_name: 'Front Counter',
      warehouse_name: 'Shop Warehouse',
      status: 'open',
      start_time: '2026-10-05 11:00:00',
      end_time: null,
      duration_hours: 0,
      overlap_hours: 0,
      order_count: 0,
      registered_order_count: 14,
      registered_sales: 0,
      units_sold: 0,
      total_sales: 0,
      total_refunds: 0,
      total_discount: 200,
      total_tax: 0,
      avg_order_value: 0,
      cash_sales: 0,
      card_sales: 900,
      mobile_sales: 940,
      credit_sales: 760,
      opening_balance: 0,
      cash_in: 0,
      cash_out: 0,
      expected_cash: 0,
      actual_cash: null,
      cash_variance: null,
      variance_status: 'Not counted',
    },
    {
      id: 's-2',
      session_number: 'SESS-002',
      cashier_name: 'Asha',
      register_name: 'Back Counter',
      warehouse_name: 'Shop Warehouse',
      status: 'closed',
      start_time: '2026-10-05 09:00:00',
      end_time: '2026-10-05 15:00:00',
      duration_hours: 6,
      overlap_hours: 6,
      order_count: 4,
      registered_order_count: 14,
      registered_sales: 3000,
      units_sold: 6,
      total_sales: 300,
      total_refunds: 50,
      total_discount: 100,
      total_tax: 30,
      avg_order_value: 75,
      cash_sales: 3000,
      card_sales: 900,
      mobile_sales: 640,
      credit_sales: 760,
      opening_balance: 200,
      cash_in: 0,
      cash_out: 0,
      expected_cash: 3200,
      actual_cash: 2860,
      cash_variance: -340,
      variance_status: 'Short',
    },
    {
      id: 's-1',
      session_number: 'SESS-001',
      cashier_name: 'Asha',
      register_name: 'Front Counter',
      warehouse_name: 'Shop Warehouse',
      status: 'closed',
      start_time: '2026-10-04 09:00:00',
      end_time: '2026-10-04 17:00:00',
      duration_hours: 8,
      overlap_hours: 8,
      order_count: 2,
      registered_order_count: 14,
      registered_sales: 5000,
      units_sold: 4,
      total_sales: 100,
      total_refunds: 0,
      total_discount: 200,
      total_tax: 0,
      avg_order_value: 50,
      cash_sales: 4320,
      card_sales: 0,
      mobile_sales: 300,
      credit_sales: 0,
      opening_balance: 500,
      cash_in: 0,
      cash_out: 100,
      expected_cash: 4720,
      actual_cash: 4780,
      cash_variance: 60,
      variance_status: 'Over',
    },
  ],
  summary: {
    start_date: '2026-10-01',
    end_date: '2026-10-31',
    session_count: 3,
    open_session_count: 1,
    closed_session_count: 2,
    order_count: 6,
    total_sales: 400,
    total_refunds: 50,
    total_discount: 500,
    total_tax: 30,
    total_units: 10,
    avg_order_value: 66.67,
    avg_session_sales: 133.33,
    net_sales: 350,
    total_cash_sales: 7320,
    total_card_sales: 900,
    total_mobile_sales: 940,
    total_credit_sales: 760,
    counted_session_count: 2,
    expected_cash_total: 7920,
    actual_cash_total: 7640,
    cash_variance_total: -280,
    expected_cash_all_sessions: 7920,
    over_sessions: 1,
    short_sessions: 1,
    balanced_sessions: 0,
  },
  columns: [{ key: 'session_number', label: 'Session #', type: 'text', align: 'left', totals: false }],
  filters_applied: ['Period: 01 Oct 2026 – 31 Oct 2026'],
  generated_at: '2026-10-05T10:15:22+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = async () => {
  render(<PosSessionSummaryPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() => expect(screen.getByText('SESS-003')).toBeInTheDocument());
};

describe('PosSessionSummaryPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    posSessionSummaryMock.mockImplementation(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD as any;
    });
  });

  it('shows the empty state before a report is generated', () => {
    render(<PosSessionSummaryPage />);
    expect(screen.queryByText('SESS-001')).not.toBeInTheDocument();
  });

  it('renders one row per shift, not a single session detail panel', async () => {
    await generate();

    expect(screen.getByText('SESS-001')).toBeInTheDocument();
    expect(screen.getByText('SESS-002')).toBeInTheDocument();
    expect(screen.getByText('SESS-003')).toBeInTheDocument();
  });

  it('uses the new column set, not the old label/value summary table', async () => {
    await generate();

    expect(screen.getByRole('columnheader', { name: /Session #/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Expected$/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Counted$/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Variance$/ })).toBeInTheDocument();

    // The legacy page rendered a two-column Item/Amount table instead.
    expect(screen.queryByRole('columnheader', { name: /^Item$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^Amount$/ })).not.toBeInTheDocument();
  });

  it('shows the warehouse reached through the register', async () => {
    await generate();
    expect(screen.getAllByText('Shop Warehouse')).toHaveLength(3);
  });

  it('labels a short drawer and an over drawer differently', async () => {
    await generate();

    // counted − expected: 2860 − 3200 short, 4780 − 4720 over.
    expect(screen.getByText(`${formatCurrency(-340)} short`)).toBeInTheDocument();
    expect(screen.getByText(`${formatCurrency(60)} over`)).toBeInTheDocument();
  });

  it('leaves counted cash and variance blank for an open shift', async () => {
    await generate();

    // The open row's counted cash and variance are null, so those two cells must
// read as "—" rather than as a ৳0.00 that would imply an empty drawer.
    const openRow = screen.getByText('SESS-003').closest('tr')!;
    // "Open" labels both the status badge and the un-closed end-time cell.
    expect(within(openRow).getAllByText('Open')).toHaveLength(2);

    const cells = within(openRow).getAllByRole('cell');
    // Column order puts Counted second-to-last and Variance last.
    expect(cells[cells.length - 2]).toHaveTextContent('—');
    expect(cells[cells.length - 1]).toHaveTextContent('—');
  });

  it('warns when no session has been closed yet', async () => {
    posSessionSummaryMock.mockImplementationOnce(async () => ({
      ...PAYLOAD,
      data: [{ ...PAYLOAD.data[0], order_count: 0 }],
      summary: {
        ...PAYLOAD.summary,
        counted_session_count: 0,
        cash_variance_total: 0,
        expected_cash_total: 0,
        actual_cash_total: 0,
      },
    }) as any);

    render(<PosSessionSummaryPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(screen.getByText(/None of these sessions have been closed yet/)).toBeInTheDocument(),
    );
    // The card reads "Not counted" rather than a misleading zero variance.
    expect(screen.getByText('Not counted')).toBeInTheDocument();
  });

  it('renders the reconciliation summary cards', async () => {
    await generate();

    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Net Sales')).toBeInTheDocument();
    expect(screen.getByText('Cash Variance')).toBeInTheDocument();
    expect(screen.getByText('Expected Cash')).toBeInTheDocument();
    expect(screen.getByText('By Method')).toBeInTheDocument();

    // 1 short, 1 over across 2 counted sessions.
    expect(screen.getByText(/1 short, 1 over/)).toBeInTheDocument();
  });

  it('renders the totals footer', async () => {
    await generate();
    expect(screen.getByText('Totals')).toBeInTheDocument();
  });

  it('sends the date range, tenant and optional filters', async () => {
    await generate();

    expect(captured.params.start_date).toBeTruthy();
    expect(captured.params.end_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
    // No status chosen, so nothing is sent rather than an empty string.
    expect(captured.params.status).toBeUndefined();
    expect(captured.params.variance_only).toBeUndefined();
  });

  it('passes warehouse_id through, the filter the legacy backend 500ed on', async () => {
    render(<PosSessionSummaryPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByText('SESS-003')).toBeInTheDocument());

    captured.params = {};
    fireEvent.click(screen.getByTestId('warehouse-select'));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(captured.params.warehouse_id).toBe('wh-1'));
  });

  it('sends variance_only when the option is ticked', async () => {
    await generate();

    captured.params = {};
    fireEvent.click(screen.getByLabelText('Cash variance only'));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(captured.params.variance_only).toBe(1));
  });

  it('surfaces a backend validation message', async () => {
    posSessionSummaryMock.mockImplementationOnce(async () => {
      throw { response: { data: { message: 'The status must be one of: open, closed, paused, suspended.' } } };
    });

    render(<PosSessionSummaryPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(
        screen.getByText('The status must be one of: open, closed, paused, suspended.'),
      ).toBeInTheDocument(),
    );
  });
});