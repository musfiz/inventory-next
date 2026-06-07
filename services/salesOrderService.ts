import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface SalesOrder {
  id: number;
  uuid?: string;
  order_number: string;
  invoice_number?: string;
  customer_id?: number;
  customer?: any;
  warehouse_id?: number;
  warehouse?: any;
  order_date?: string;
  due_date?: string | null;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  sub_total?: number;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  tax_amount?: number;
  shipping_charge?: number;
  grand_total?: number;
  paid_amount?: number;
  // F-7 FIX: backend returns these on the SO row (see the
  // PosOrder::getDueAmountAttribute() and the equivalent on
  // SalesOrder). Surfacing them here lets the SO list / detail
  // page render an "Outstanding" column and the partial-return
  // badge.
  returned_amount?: number;
  due_amount?: number;
  // SO detail endpoint now also returns the unified Payment
  // history. Used by the SO details page to render the
  // "Payments" section + receipt links.
  payments?: Array<{
    id: number;
    receipt_number?: string;
    payment_method?: string;
    amount?: number;
    status?: string;
    payment_date?: string;
    notes?: string;
  }>;
  shipping_method?: string;
  shipping_address?: string;
  notes?: string;
}

class SalesOrderService {
  async getSalesOrders(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/sales-order', { params });
    return response.data;
  }

  async getSalesOrderItems(salesOrderId: string) {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/sales-order/${salesOrderId}/items`
    );
    return response.data.data;
  }

  /**
   * Fetch the full sales-order detail by UUID.
   *
   * This is the single server-side request used by BOTH the SO
   * details modal (page.tsx → loadItems) and the print menu
   * (SalesOrderPrintMenu → ensureFullOrder). The list endpoint
   * (`GET /api/v1/sales-order`) returns lightweight rows without
   * `items`, `payments`, or `returns` — we need a second request
   * keyed by the row's UUID to hydrate the full document.
   *
   * The backend `GET /api/v1/sales-order/{id}` route accepts BOTH
   * the integer PK and the UUID. We always pass the UUID here so:
   *   - the int id is never leaked through the URL
   *   - the URL is stable for a given business document
   *   - both the details page and the print menu hit the same
   *     canonical route
   *
   * The backend eager-loads:
   *   - tenant, customer, warehouse
   *   - items.product, items.variation
   *   - returns.items
   *   - payments (where reference_type='sales')
   *
   * Use this for: SO details modal, A4 print invoice, thermal
   * (POS) print invoice. Do NOT use the list endpoint for any
   * of these — it does not include the items / payments arrays.
   */
  async getSalesOrder(uuid: string) {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/sales-order/${uuid}`
    );
    return response.data.data;
  }

  /**
   * Print-specific alias for `getSalesOrder`. Both the details
   * modal and the print menu hit the same backend endpoint keyed
   * by UUID — this method exists so the print menu can call
   * something with an obvious name while still going through the
   * same shared server-side request.
   */
  async getSalesOrderForPrint(uuid: string) {
    return this.getSalesOrder(uuid);
  }

  async storeSalesOrder(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/sales-order/store', data);
    return response.data.data;
  }

  async deleteSalesOrder(id: string) {
    // F-1 FIX: use DELETE (RESTful) instead of GET for the destructive
    // op. The backend's `GET .../delete/{id}` route is being
    // deprecated; the new canonical route is `DELETE /{id}`. Falls
    // back to the legacy GET only if the backend has not yet shipped
    // the new route.
    try {
      await apiClient.delete(`/api/v1/sales-order/${id}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        await apiClient.get(`/api/v1/sales-order/delete/${id}`);
      } else {
        throw err;
      }
    }
  }

  async updateSalesOrder(id: string, data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/sales-order/${id}/update`, data);
    return response.data.data;
  }

  async updateSalesOrderFromDetails(id: string, data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/sales-order/${id}/update/details`, data);
    return response.data.data;
  }

  /**
   * Record a partial / due payment against a Sales Order.
   *
   * Bug-fix: the SO Details modal previously edited `paid_amount`
   * directly via `updateSalesOrderFromDetails`, which updated the
   * SO row in place but did NOT create a Payment record. The
   * audit trail was broken — the Payment History list never
   * showed the partial payment, and no journal entry was posted.
   *
   * This new endpoint is the canonical "record a due payment
   * against a SO" flow. It:
   *  - Creates a `Payment` row with `reference_type='sales'`
   *  - Increments the SO's `paid_amount` and re-derives
   *    `payment_status`
   *  - Posts an auto-journal entry (DR cash/bank, CR AR 1110)
   *  - Re-syncs the customer outstanding balance
   *
   * Use this for any partial / due payment against a SO. Do NOT
   * edit `paid_amount` directly on the SO row.
   */
  async recordPayment(id: string, data: {
    amount: number;
    payment_method: string;
    payment_date?: string;
    notes?: string;
    tendered_amount?: number;
    change_amount?: number;
    card_last_four?: string;
    processing_fee?: number;
    transaction_reference?: string;
    mobile_number?: string;
    mobile_transaction_id?: string;
    bank_name?: string;
    bank_account?: string;
    check_number?: string;
    check_date?: string;
  }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/v1/sales-order/${id}/record-payment`, data);
    return response.data;
  }
}

export default new SalesOrderService();
