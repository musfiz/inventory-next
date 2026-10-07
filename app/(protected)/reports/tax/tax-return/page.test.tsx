/**
 * Renders the Tax Return page against a captured API payload so the screen is
 * checked against what the backend actually returns (RPT-TAX-001).
 *
 * The payload is a verbatim `GET /api/v1/reports/tax/tax-return` response built
 * from a rolled-back fixture for one tenant:
 *
 * - Output VAT Payable (2110): 5,000 opening from February, +12,000 collected in
 *   March and a 2,000 refund, so the period nets 10,000 and 15,000 carries out;
 * - Input VAT Receivable (1140): 3,000 of input tax paid in March. Because every
 *   figure is credit-positive this is a *negative* net liability — input tax
 *   reduces what is owed rather than adding to it, and the screen has to say so;
 * - Supplementary Duty Payable (2111): 1,500 charged, filed on its own return, so
 *   it must not be folded into the VAT figure.
 *
 * The VAT period therefore nets 10,000 − 3,000 = 7,000, SD adds 1,500, and
 * `net_tax_due` is 8,500 payable with 16,500 carried forward.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TaxReturnPage from './page';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any>; exports: any[] } = { params: {}, exports: [] };

vi.mock('@/services/reportService', () => ({
  default: {
    taxReturn: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async (_cat: string, name: string, format: string, params: any) => {
      captured.exports.push({ name, format, params });
      return new Blob(['x']);
    }),
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
    <input
      data-testid={`date-${value ?? 'empty'}`}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/lib/notifications', () => ({
  notify: { error: vi.fn(), warning: vi.fn() },
}));

// ── Captured API payload ─────────────────────────────────────────────────────

const BASE_ROW = {
  is_active: true,
  opening_balance: 0,
  period_debit: 0,
  period_credit: 0,
  tax_collected: 0,
  tax_refunded: 0,
  tax_paid: 0,
  net_liability: 0,
  closing_balance: 0,
  entry_count: 0,
  last_entry_date: null as string | null,
};

const OUTPUT_VAT = {
  ...BASE_ROW,
  account_id: 'acc-vat-out',
  code: '2110',
  name: 'Output VAT Payable',
  tax_type: 'vat' as const,
  side: 'output' as const,
  opening_balance: 5000,
  period_credit: 12000,
  period_debit: 2000,
  tax_collected: 12000,
  tax_refunded: 2000,
  net_liability: 10000,
  closing_balance: 15000,
  entry_count: 3,
  last_entry_date: '2026-03-31',
};

const INPUT_VAT = {
  ...BASE_ROW,
  account_id: 'acc-vat-in',
  code: '1140',
  name: 'Input VAT Receivable',
  tax_type: 'vat' as const,
  side: 'input' as const,
  period_debit: 3000,
  tax_paid: 3000,
  // Negative: input tax reduces the amount due.
  net_liability: -3000,
  closing_balance: -3000,
  entry_count: 1,
  last_entry_date: '2026-03-15',
};

const SD = {
  ...BASE_ROW,
  account_id: 'acc-sd',
  code: '2111',
  name: 'Supplementary Duty Payable',
  tax_type: 'supplementary_duty' as const,
  side: 'output' as const,
  period_credit: 1500,
  tax_collected: 1500,
  net_liability: 1500,
  closing_balance: 1500,
  entry_count: 1,
  last_entry_date: '2026-03-20',
};

const PAYLOAD = {
  data: [INPUT_VAT, OUTPUT_VAT, SD],
  summary: {
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    tax_account_count: 3,
    total_tax_collected: 13500,
    total_tax_paid: 3000,
    total_tax_refunded: 2000,
    net_tax_due: 8500,
    direction: 'payable' as const,
    opening_payable: 5000,
    closing_payable: 16500,
    opening_recoverable: 0,
    closing_recoverable: 3000,
    net_position: 13500,
    has_activity: true,
    by_tax_type: [
      {
        key: 'vat' as const,
        label: 'VAT',
        account_count: 2,
        collected: 12000,
        paid: 3000,
        refunded: 2000,
        net_liability: 7000,
        amount: 7000,
      },
      {
        key: 'supplementary_duty' as const,
        label: 'Supplementary Duty',
        account_count: 1,
        collected: 1500,
        paid: 0,
        refunded: 0,
        net_liability: 1500,
        amount: 1500,
      },
      {
        key: 'income_tax' as const,
        label: 'Income Tax',
        account_count: 0,
        collected: 0,
        paid: 0,
        refunded: 0,
        net_liability: 0,
        amount: 0,
      },
      {
        key: 'withholding' as const,
        label: 'Tax Withholding',
        account_count: 0,
        collected: 0,
        paid: 0,
        refunded: 0,
        net_liability: 0,
        amount: 0,
      },
      {
        key: 'other' as const,
        label: 'Other Tax',
        account_count: 0,
        collected: 0,
        paid: 0,
        refunded: 0,
        net_liability: 0,
        amount: 0,
      },
    ],
  },
  columns: [],
  filters_applied: [],
  generated_at: '2026-03-31T10:00:00+00:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = () => fireEvent.click(screen.getByRole('button', { name: /generate|apply/i }));

const generateAndWait = async () => {
  generate();
  await waitFor(() => expect(screen.getByText('2110')).toBeTruthy());
};

/**
 * The summary card labelled `label`.
 *
 * Addresses the card by its own truncated heading rather than by a unique value,
 * because several cards legitimately share a value (three tax types can all be
 * nil) and a tax name like "VAT" also appears as a badge on the table rows. Only
 * the card heading carries the `truncate` class.
 */
const card = (label: string): HTMLElement => {
  const heading = screen
    .getAllByText(label)
    .find(node => node.className?.includes?.('truncate'));

  if (!heading) throw new Error(`No summary card labelled "${label}".`);

  return heading.closest('.rounded-md') as HTMLElement;
};

beforeEach(() => {
  captured.params = {};
  captured.exports = [];
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TaxReturnPage', () => {
  it('does not call the API until the user generates the report', () => {
    render(<TaxReturnPage />);
    expect(captured.params).toEqual({});
    expect(screen.queryByText('2110')).toBeNull();
  });

  it('shows the net liability, the gross split and the carried-forward figure', async () => {
    render(<TaxReturnPage />);
    await generateAndWait();

    // The verdict leads: what actually goes on the return.
    const dueCard = card('Net Tax Due');
    expect(within(dueCard).getByText(formatCurrency(8500))).toBeTruthy();
    expect(within(dueCard).getByText('payable to the authority')).toBeTruthy();

    // Collected and paid are the two halves a filing form asks for separately.
    const collectedCard = card('Tax Collected');
    expect(within(collectedCard).getByText(formatCurrency(13500))).toBeTruthy();
    expect(within(collectedCard).getByText('output tax charged out')).toBeTruthy();

    const paidCard = card('Tax Paid');
    expect(within(paidCard).getByText(formatCurrency(3000))).toBeTruthy();
    expect(within(paidCard).getByText('input tax reclaimable')).toBeTruthy();

    // The period total reconciles with the Balance Sheet's tax accounts, so the
    // figure carried into the next period is the one that matters.
    const forwardCard = card('Carried Forward');
    expect(within(forwardCard).getByText(formatCurrency(13500))).toBeTruthy();
    expect(within(forwardCard).getByText('net of recoverable input tax')).toBeTruthy();
  });

  it('renders every tax account row with its own figures', async () => {
    render(<TaxReturnPage />);
    await generateAndWait();

    const table = screen.getByRole('table');

    // Output VAT: 12,000 collected less a 2,000 refund nets 10,000.
    const vatRow = within(table).getByText('2110').closest('tr')!;
    expect(within(vatRow).getByText(formatCurrency(10000))).toBeTruthy();
    expect(within(vatRow).getByText('Output')).toBeTruthy();

    // Input VAT is shown as a parenthesised negative, not a red minus figure:
    // reclaimable tax is money coming back, not a loss.
    const inputRow = within(table).getByText('1140').closest('tr')!;
    expect(within(inputRow).getByText(`(${formatCurrency(3000)})`)).toBeTruthy();
    expect(within(inputRow).getByText('Input')).toBeTruthy();

    // SD is filed on its own return, so it gets its own row.
    const sdRow = within(table).getByText('2111').closest('tr')!;
    expect(within(sdRow).getByText('Supplementary Duty')).toBeTruthy();
  });

  it('reports each tax type separately and shows nil types rather than hiding them', async () => {
    render(<TaxReturnPage />);
    await generateAndWait();

    // VAT nets 10,000 − 3,000 = 7,000; SD is 1,500. Neither figure is the total,
    // and folding SD into VAT would misstate a return that files them separately.
    const vatCard = card('VAT');
    expect(within(vatCard).getByText(formatCurrency(7000))).toBeTruthy();
    expect(within(vatCard).getByText('2 accounts · owed')).toBeTruthy();

    const sdCard = card('Supplementary Duty');
    expect(within(sdCard).getByText(formatCurrency(1500))).toBeTruthy();
    expect(within(sdCard).getByText('1 accounts · owed')).toBeTruthy();

    // A return that omits Income Tax because none was charged is not the same
    // document as one that files a nil line, so it still has to appear.
    const incomeTaxCard = card('Income Tax');
    expect(within(incomeTaxCard).getByText(formatCurrency(0))).toBeTruthy();
    expect(within(incomeTaxCard).getByText('0 accounts · nil for this period')).toBeTruthy();
  });

  it('sends the full filter set and scopes to the signed-in tenant', async () => {
    render(<TaxReturnPage />);

    fireEvent.change(screen.getByPlaceholderText('Account code or name'), {
      target: { value: 'vat' },
    });
    fireEvent.change(screen.getByDisplayValue('All Taxes'), { target: { value: 'vat' } });
    fireEvent.change(screen.getByDisplayValue('Both Sides'), { target: { value: 'input' } });
    await generateAndWait();

    expect(captured.params).toMatchObject({
      tax_type: 'vat',
      side: 'input',
      search: 'vat',
      only_with_activity: 0,
      tenant_id: 'tenant-1',
    });
    expect(captured.params.start_date).toBeTruthy();
    expect(captured.params.end_date).toBeTruthy();
  });

  it('refuses to run with an end date before the start date', async () => {
    render(<TaxReturnPage />);

    const [start, end] = screen.getAllByRole('textbox', { type: undefined }).filter(
      el => (el as HTMLInputElement).value?.startsWith('20'),
    ) as HTMLInputElement[];
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();

    fireEvent.change(start, { target: { value: '2026-03-31' } });
    fireEvent.change(end, { target: { value: '2026-03-01' } });
    generate();

    // Caught before the round trip — there is nothing useful to ask the API.
    expect(captured.params).toEqual({});
    expect(screen.getByText('Start date cannot be after end date.')).toBeTruthy();
  });

  it('drills into a single tax when its summary card is clicked, and back out again', async () => {
    render(<TaxReturnPage />);
    await generateAndWait();

    // "Supplementary Duty" appears both as a summary card and as a row badge;
    // the card is a div with role="button" because it filters.
    const sdCardButton = () => card('Supplementary Duty');

    fireEvent.click(sdCardButton());
    await waitFor(() => expect(captured.params.tax_type).toBe('supplementary_duty'));

    // Clicking the same tax again clears the filter.
    fireEvent.click(sdCardButton());
    await waitFor(() => expect(captured.params.tax_type).toBeUndefined());
  });

  it('exports through the server pipeline with the same filters the screen shows', async () => {
    render(<TaxReturnPage />);
    await generateAndWait();

    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(captured.exports).toHaveLength(1));
    expect(captured.exports[0]).toMatchObject({ name: 'tax-return', format: 'excel' });
    expect(captured.exports[0].params).toMatchObject({ only_with_activity: 0 });
  });

  it('files a nil return rather than showing an error when no tax account moved', async () => {
    const reportService = (await import('@/services/reportService')).default;
    vi.mocked(reportService.taxReturn).mockResolvedValueOnce({
      ...PAYLOAD,
      data: [],
      summary: {
        ...PAYLOAD.summary,
        tax_account_count: 0,
        total_tax_collected: 0,
        total_tax_paid: 0,
        total_tax_refunded: 0,
        net_tax_due: 0,
        direction: 'nil',
        closing_payable: 0,
        closing_recoverable: 0,
        net_position: 0,
        has_activity: false,
      },
    });

    render(<TaxReturnPage />);
    generate();

    // A nil period is a real filing, not an error and not an empty screen: the
    // cards still print, and the ladder still names every tax it covers.
    await waitFor(() => expect(screen.getByText('nothing due for this period')).toBeTruthy());
    expect(screen.queryByText('Error')).toBeNull();
    expect(card('Income Tax')).toBeTruthy();
    expect(
      within(card('Income Tax')).getByText('0 accounts · nil for this period'),
    ).toBeTruthy();
    expect(within(card('Tax Accounts')).getByText('no movement this period')).toBeTruthy();
    expect(screen.queryByText('2110')).toBeNull();
  });
});