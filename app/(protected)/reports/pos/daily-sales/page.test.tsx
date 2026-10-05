/**
 * Renders the POS Daily Sales page against a captured API payload so the
 * screen is checked against what the backend actually returns (RPT-POS-003),
 * not against a hand-written fixture that can drift from it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PosDailySalesPage from './page';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    posDailySales: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/services', () => ({
  posRegisterService: {
    dropdown: vi.fn(async () => [
      { id: 'reg-1', name: 'Front Counter' },
      { id: 'reg-2', name: 'Back Counter' },
    ]),
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
  default: ({ value, onChange, disabled }: any) => (
    <input
      data-testid="date-picker"
      aria-label={disabled ? 'disabled-date' : 'date'}
      value={value ?? ''}
      readOnly
    />
  ),
}));

vi.mock('@/components/ui/custom-select', () => ({
  default: ({ loadOptions, placeholder, onChange }: any) => (
    <button data-testid="custom-select" onClick={() => onChange({ value: 'reg-1', label: 'Front Counter' })}>
      {placeholder ?? 'select'}
    </button>
  ),
}));

vi.mock('@/lib/notifications', () => ({
  notify: { error: vi.fn(), warning: vi.fn() },
}));

// ── Captured API payload ─────────────────────────────────────────────────────
// Field names and figures are exactly what PosDailySalesReport returned in a
// live check against the local database.

const PAYLOAD = {
  data: [
    {
      pos_order_id: 'o-2',
      session_id: 's-1',
      register_id: 'reg-1',
      invoice_number: 'INV-0002',
      order_ts: '2026-10-05 11:40:00',
      order_date: '2026-10-05',
      order_time: '11:40:00',
      customer_name: null,
      customer_phone: '01700000001',
      cashier_name: 'Cashier Electric Store',
      register_name: 'Front Counter',
      session_number: 'SESS-1',
      line_count: 2,
      units_sold: 4,
      sub_total: 100,
      order_discount: 0,
      line_discount: 10,
      total_discount: 10,
      tax_amount: 0,
      grand_total: 100,
      paid_amount: 100,
      amount_due: 0,
      returned_amount: 0,
      line_revenue: 90,
      line_cost: 80,
      gross_profit: 10,
      payment_method: 'bkash',
      payment_status: 'paid',
    },
    {
      pos_order_id: 'o-1',
      session_id: 's-1',
      register_id: 'reg-1',
      invoice_number: 'INV-0001',
      order_ts: '2026-10-05 09:15:00',
      order_date: '2026-10-05',
      order_time: '09:15:00',
      customer_name: 'Customer 1',
      customer_phone: '01700000000',
      cashier_name: 'Cashier Electric Store',
      register_name: 'Front Counter',
      session_number: 'SESS-1',
      line_count: 2,
      units_sold: 4,
      sub_total: 300,
      order_discount: 20,
      line_discount: 10,
      total_discount: 30,
      tax_amount: 30,
      grand_total: 300,
      paid_amount: 200,
      amount_due: 50,
      returned_amount: 50,
      line_revenue: 290,
      line_cost: 120,
      gross_profit: 170,
      payment_method: 'cash',
      payment_status: 'partial',
    },
  ],
  summary: {
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    order_count: 2,
    total_sales: 400,
    total_subtotal: 400,
    total_discount: 40,
    total_tax: 30,
    total_units: 8,
    avg_order_value: 200,
    avg_units_per_order: 4,
    total_paid: 300,
    total_due: 50,
    total_returned: 50,
    net_sales: 350,
    line_revenue: 380,
    gross_profit: 180,
    gross_margin_pct: 47.4,
    discount_rate_pct: 10,
    tax_rate_pct: 8.1,
    unpaid_order_count: 1,
  },
  columns: [
    { key: 'invoice_number', label: 'Invoice #', type: 'text', align: 'left', totals: false },
    { key: 'grand_total', label: 'Total', type: 'money', align: 'right', totals: true },
    { key: 'paid_amount', label: 'Paid', type: 'money', align: 'right', totals: true },
  ],
  filters_applied: ['Date: 05 Oct 2026'],
  generated_at: '2026-10-05T10:15:22+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = async () => {
  render(<PosDailySalesPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() => expect(screen.getByText('INV-0002')).toBeInTheDocument());
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PosDailySalesPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<PosDailySalesPage />);
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument();
  });

  it('sends a single `date` by default, not a range', async () => {
    await generate();
    // A day register is scoped to one day unless the user asks for a range.
    expect(captured.params.date).toBeTruthy();
    expect(captured.params.start_date).toBeUndefined();
    expect(captured.params.end_date).toBeUndefined();
  });

  it('sends the resolved tenant so the report is not scoped to the caller', async () => {
    await generate();
    expect(captured.params.tenant_id).toBe('tenant-1');
  });

  it('renders rows using the new field names, not the legacy shape', async () => {
    await generate();

    expect(screen.getByText('INV-0001')).toBeInTheDocument();
    expect(screen.getByText('INV-0002')).toBeInTheDocument();
    expect(screen.getByText('Customer 1')).toBeInTheDocument();
    // Both rows share the register, so it appears once per row.
    expect(screen.getAllByText('Front Counter')).toHaveLength(2);

    // The header cells come from the new column set.
    expect(screen.getByRole('columnheader', { name: /Invoice #/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Total$/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Due$/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Returned/ })).toBeInTheDocument();

    // Legacy `posSummary` keys must not be what the table reads.
    expect(screen.queryByRole('columnheader', { name: /Order #/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Grand Total/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^Items$/ })).not.toBeInTheDocument();
  });

  it('shows a due amount and a returned amount as money, not raw numbers', async () => {
    await generate();

    // INV-0001: amount_due 50, returned_amount 50 — formatted as currency.
    expect(screen.getAllByText(formatCurrency(50)).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the summary cards from the report summary', async () => {
    await generate();

    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Discounts')).toBeInTheDocument();
    expect(screen.getByText('Paid / Due')).toBeInTheDocument();

    // "Tax" is both a card label and a table column header.
    expect(screen.getAllByText('Tax').length).toBeGreaterThan(0);

    // Net sales is the sub-value on the takings card.
    expect(screen.getByText(/net of returns/)).toBeInTheDocument();

    // Card values are the summary's figures. Each also appears in the totals
    // footer, so they are matched as "present" rather than "unique".
    expect(screen.getAllByText(formatCurrency(180)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(400)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatNumber(2)).length).toBeGreaterThan(0);
  });

  it('flags an unpaid day on the Paid / Due card', async () => {
    await generate();
    // total_due 50 across 1 unpaid order.
    expect(screen.getByText(/across 1 unpaid order/)).toBeInTheDocument();
  });

  it('renders the totals footer from the summary', async () => {
    await generate();
    expect(screen.getByText('Totals')).toBeInTheDocument();
  });

  it('shows the report period and generated-at stamp in the header', async () => {
    await generate();
    expect(screen.getByText(/5 October 2026/)).toBeInTheDocument();
    expect(screen.getByText(/generated/)).toBeInTheDocument();
  });

  it('passes the register filter through as register_id', async () => {
    render(<PosDailySalesPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByText('INV-0002')).toBeInTheDocument());

    captured.params = {};
    fireEvent.click(screen.getByTestId('custom-select'));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(captured.params.register_id).toBe('reg-1'));
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.posDailySales = vi.fn(async () => {
      throw { response: { data: { message: 'The payment method must be one of: cash, card.' } } };
    }) as any;

    render(<PosDailySalesPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(screen.getByText('The payment method must be one of: cash, card.')).toBeInTheDocument(),
    );
  });
});