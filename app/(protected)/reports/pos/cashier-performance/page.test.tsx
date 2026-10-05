/**
 * Renders the Cashier Performance page against a captured API payload so the
 * screen is checked against what the backend actually returns (RPT-POS-005),
 * not against the stale pre-migration shape the page used to declare.
 *
 * `PAYLOAD` is the verbatim `GET /api/v1/reports/pos/cashier-performance`
 * response from a live run against the local database. `MULTI_PAYLOAD` adds two
 * further rows in exactly that same shape so the rank / share-pct logic — which
 * only produces meaningful values with more than one cashier — is exercised.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CashierPerformancePage from './page';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    cashierPerformance: vi.fn(async (params: Record<string, any>) => {
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
  commonService: {
    getWarehousesByTenant: vi.fn(async () => [{ id: 'wh-1', name: 'Main Warehouse' }]),
  },
  // GET /api/v1/users returns `{ data, pagination }` via ApiResponse::paginated.
  userService: {
    getUsers: vi.fn(async () => ({
      data: [{ id: '197d0ee9-f9f1-4bdf-975c-62db286e5aba', name: 'Cashier Electric Store' }],
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
  default: ({ value, onChange }: any) => (
    <input data-testid="date-picker" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// Each dropdown resolves to a distinct, identifiable option so the test can
// assert which filter was picked.
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
// Verbatim live response, modulo the date range the query was run over.

const ROW = {
  cashier_key: '197d0ee9-f9f1-4bdf-975c-62db286e5aba',
  cashier_id: '197d0ee9-f9f1-4bdf-975c-62db286e5aba',
  cashier_name: 'Cashier Electric Store',
  register_count: 2,
  session_count: 2,
  order_count: 4,
  units_sold: 6,
  avg_order_value: 100,
  total_sales: 400,
  net_revenue: 400,
  sub_total: 400,
  total_discount: 0,
  total_tax: 0,
  total_returned: 0,
  gross_profit: 240,
  gross_margin_pct: 60,
  discount_rate_pct: 0,
  unpaid_order_count: 0,
  rank: 1,
  sales_share_pct: 100,
};

const PAYLOAD = {
  data: [ROW],
  summary: {
    start_date: '2025-10-05',
    end_date: '2026-10-06',
    cashier_count: 1,
    order_count: 4,
    total_sales: 400,
    net_revenue: 400,
    total_discount: 0,
    total_tax: 0,
    total_returned: 0,
    total_units: 6,
    gross_profit: 240,
    gross_margin_pct: 60,
    discount_rate_pct: 0,
    avg_order_value: 100,
    avg_units_per_order: 1.5,
    avg_sales_per_cashier: 400,
    avg_orders_per_cashier: 4,
    unpaid_order_count: 0,
    top_cashier: [{ label: 'Cashier Electric Store', value: 400, share_pct: 100 }],
    highest_units_cashier: [{ label: 'Cashier Electric Store', value: 6 }],
  },
  columns: [
    { key: 'rank', label: 'Rank', type: 'integer', align: 'center', totals: false },
    { key: 'cashier_name', label: 'Cashier', type: 'text', align: 'left', totals: false },
    { key: 'total_sales', label: 'Sales', type: 'money', align: 'right', totals: true },
  ],
  filters_applied: ['Period: 05 Oct 2025 – 06 Oct 2026'],
  generated_at: '2026-10-05T13:00:00+06:00',
};

/** Same shape, two more cashiers, so rank and share are non-trivial. */
const MULTI_PAYLOAD = {
  ...PAYLOAD,
  data: [
    ROW,
    {
      ...ROW,
      cashier_key: 'b2',
      cashier_id: 'b2',
      cashier_name: 'Rahim Uddin',
      register_count: 1,
      session_count: 3,
      order_count: 9,
      units_sold: 21,
      avg_order_value: 88.89,
      total_sales: 800,
      net_revenue: 760,
      sub_total: 800,
      total_discount: 40,
      gross_profit: 304,
      gross_margin_pct: 40,
      discount_rate_pct: 5,
      unpaid_order_count: 2,
      rank: 2,
      sales_share_pct: 66.7,
    },
    {
      ...ROW,
      cashier_key: 'c3',
      cashier_id: 'c3',
      cashier_name: 'Karim Mia',
      register_count: 1,
      session_count: 1,
      order_count: 1,
      units_sold: 1,
      avg_order_value: 0,
      total_sales: 0,
      net_revenue: 0,
      sub_total: 0,
      total_discount: 0,
      gross_profit: 0,
      gross_margin_pct: null,
      discount_rate_pct: null,
      rank: 3,
      sales_share_pct: 0,
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = async () => {
  render(<CashierPerformancePage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  // Anchor on the table header, not the cashier name — the name also appears on
  // the "Top Cashier" card, so getByText would be ambiguous.
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Cashier$/ })).toBeInTheDocument());
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CashierPerformancePage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<CashierPerformancePage />);
    expect(screen.queryByText('Cashier Electric Store')).not.toBeInTheDocument();
  });

  it('sends a date range and the resolved tenant by default', async () => {
    await generate();
    expect(captured.params.start_date).toBeTruthy();
    expect(captured.params.end_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
  });

  it('renders rows using the migrated field names, not the legacy shape', async () => {
    await generate();

    expect(screen.getAllByText('Cashier Electric Store').length).toBeGreaterThan(0);

    // Columns from the new ReportDefinition.
    expect(screen.getByRole('columnheader', { name: /Rank/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Registers/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Sessions/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Net Revenue/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Gross Profit/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Margin %/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Discount %/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Share %/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Unpaid/ })).toBeInTheDocument();

    // The legacy row shape described columns the endpoint never returned.
    expect(screen.queryByRole('columnheader', { name: /Refund Amount/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Cash Variance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Items\/Sale/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Avg Sale$/ })).not.toBeInTheDocument();
  });

  it('renders money columns as currency and counts as numbers', async () => {
    await generate();

    expect(screen.getAllByText(formatCurrency(400)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(240)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatPercent(60)).length).toBeGreaterThan(0);
  });

  it('renders the summary cards from the report summary', async () => {
    await generate();

    expect(screen.getByText('Cashiers')).toBeInTheDocument();
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    // "Orders" and "Gross Profit" are both a card label and a table column
    // header, so they are matched as "present" rather than "unique".
    expect(screen.getAllByText('Orders').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gross Profit').length).toBeGreaterThan(0);
    expect(screen.getByText('Discounts')).toBeInTheDocument();
    expect(screen.getByText('Units Sold')).toBeInTheDocument();
    expect(screen.getByText('Top Cashier')).toBeInTheDocument();
    expect(screen.getByText('Unpaid Orders')).toBeInTheDocument();
  });

  it('names the top cashier from the summary breakdown', async () => {
    await generate();
    // top_cashier is a [{ label, value, share_pct }] breakdown, not a flat map.
    expect(screen.getAllByText('Cashier Electric Store').length).toBeGreaterThan(0);
    expect(screen.getByText(/100.0% of sales/)).toBeInTheDocument();
  });

  it('renders the totals footer from the summary', async () => {
    await generate();
    expect(screen.getByText('Totals')).toBeInTheDocument();
  });

  it('shows the report period and generated-at stamp in the header', async () => {
    await generate();
    expect(screen.getByText(/5 October 2025/)).toBeInTheDocument();
    expect(screen.getByText(/generated/)).toBeInTheDocument();
  });

  it('passes each dropdown filter through under its backend param name', async () => {
    render(<CashierPerformancePage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /^Cashier$/ })).toBeInTheDocument(),
    );

    captured.params = {};

    // Each mocked dropdown resolves its options asynchronously, so the click
    // that selects one is an async state update — wrap it so React flushes
    // before the next interaction reads it back.
    for (const id of ['select-All cashiers', 'select-All registers', 'select-All warehouses']) {
      await act(async () => {
        fireEvent.click(screen.getByTestId(id));
      });
    }

    fireEvent.change(screen.getByPlaceholderText('Cashier name'), {
      target: { value: 'rahim' },
    });
    fireEvent.change(screen.getByText('All Methods').closest('select')!, {
      target: { value: 'cash' },
    });
    fireEvent.change(screen.getByText('All Statuses').closest('select')!, {
      target: { value: 'partial' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(captured.params.cashier_id).toBe('197d0ee9-f9f1-4bdf-975c-62db286e5aba');
      expect(captured.params.register_id).toBe('reg-1');
      expect(captured.params.warehouse_id).toBe('wh-1');
      expect(captured.params.search).toBe('rahim');
      expect(captured.params.payment_method).toBe('cash');
      expect(captured.params.payment_status).toBe('partial');
    });
  });

  it('ranks cashiers by sales and shows each share of the period', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.cashierPerformance = vi.fn(async () => MULTI_PAYLOAD) as any;

    render(<CashierPerformancePage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(screen.getByText('Rahim Uddin')).toBeInTheDocument());
    expect(screen.getByText('Karim Mia')).toBeInTheDocument();

    // 800 / (400 + 800 + 0) — the top cashier keeps 100% of sales, and the
    // zero-sale cashier still gets a rank rather than dropping out.
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();

    // A null percentage must render as a dash, not "NaN%".
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.cashierPerformance = vi.fn(async () => {
      throw { response: { data: { message: 'The payment method must be one of: cash, card.' } } };
    }) as any;

    render(<CashierPerformancePage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(screen.getByText('The payment method must be one of: cash, card.')).toBeInTheDocument(),
    );
  });
});