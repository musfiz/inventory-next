'use client';

import { useState, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  FileText,
  Download,
  Printer,
  Search,
  Calendar,
  Filter,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import CustomDatePicker from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils/date';
import { notify } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier?: { name: string; company_name?: string };
  warehouse?: { name: string };
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  payment_status?: string;
  total_amount: number;
  paid_amount?: number;
  items?: any[];
}

interface ReportSummary {
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  totalItems: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseReportPage() {
  const reportRef = useRef<HTMLDivElement>(null);

  // ── State ───────────────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [summary, setSummary] = useState<ReportSummary>({
    totalOrders: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
    totalItems: 0,
  });

  // ── Constants ───────────────────────────────────────────────────────────────
  const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'partial', label: 'Partial' },
    { value: 'received', label: 'Received' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // ── Functions ───────────────────────────────────────────────────────────────

  const fetchPurchases = async () => {
    if (!fromDate || !toDate) {
      notify.error('Please select both from and to dates');
      return;
    }

    setIsLoading(true);
    try {
      const params: any = {
        from_date: fromDate,
        to_date: toDate,
        per_page: 1000,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await purchaseOrderService.getPurchaseOrders(params);
      const data = response?.data || [];

      // Fetch items for each purchase order
      const purchasesWithItems = await Promise.all(
        data.map(async (po: any) => {
          try {
            const items = await purchaseOrderService.getPurchaseOrderItems(po.id);
            return { ...po, items: items || [] };
          } catch {
            return { ...po, items: [] };
          }
        })
      );

      setPurchases(purchasesWithItems);

      // Calculate summary
      const totalAmount = purchasesWithItems.reduce(
        (sum, po) => sum + (parseFloat(po.total_amount) || 0),
        0
      );
      const totalPaid = purchasesWithItems.reduce(
        (sum, po) => sum + (parseFloat(po.paid_amount) || 0),
        0
      );
      const totalItems = purchasesWithItems.reduce(
        (sum, po) => sum + (po.items?.length || 0),
        0
      );

      setSummary({
        totalOrders: purchasesWithItems.length,
        totalAmount,
        totalPaid,
        totalDue: totalAmount - totalPaid,
        totalItems,
      });

      notify.success(`Found ${purchasesWithItems.length} purchase orders`);
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to fetch purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (purchases.length === 0) {
      notify.error('No data to export');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Purchase List Report', pageWidth / 2, 15, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`, pageWidth / 2, 22, { align: 'center' });
      pdf.text(`Generated: ${formatDate(new Date().toISOString())}`, pageWidth / 2, 28, { align: 'center' });

      // Summary Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary:', 14, 38);

      pdf.setFont('helvetica', 'normal');
      let yPos = 44;
      pdf.text(`Total Orders: ${summary.totalOrders}`, 14, yPos);
      pdf.text(`Total Items: ${summary.totalItems}`, 70, yPos);
      pdf.text(`Total Amount: ৳${summary.totalAmount.toFixed(2)}`, 126, yPos);
      pdf.text(`Total Paid: ৳${summary.totalPaid.toFixed(2)}`, 182, yPos);
      yPos += 6;
      pdf.text(`Total Due: ৳${summary.totalDue.toFixed(2)}`, 182, yPos);

      // Line separator
      yPos += 4;
      pdf.setLineWidth(0.5);
      pdf.line(14, yPos, pageWidth - 14, yPos);

      // Table Header
      yPos += 8;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(59, 130, 246); // Blue background
      pdf.setTextColor(255, 255, 255); // White text
      pdf.rect(14, yPos - 5, pageWidth - 28, 7, 'F');

      pdf.text('PO Number', 16, yPos);
      pdf.text('Date', 48, yPos);
      pdf.text('Supplier', 78, yPos);
      pdf.text('Warehouse', 128, yPos);
      pdf.text('Status', 168, yPos);
      pdf.text('Amount', 198, yPos);
      pdf.text('Paid', 228, yPos);
      pdf.text('Due', 258, yPos);

      // Reset text color
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');

      // Table Rows
      yPos += 8;
      purchases.forEach((po, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;

          // Repeat header on new page
          pdf.setFont('helvetica', 'bold');
          pdf.setFillColor(59, 130, 246);
          pdf.setTextColor(255, 255, 255);
          pdf.rect(14, yPos - 5, pageWidth - 28, 7, 'F');

          pdf.text('PO Number', 16, yPos);
          pdf.text('Date', 48, yPos);
          pdf.text('Supplier', 78, yPos);
          pdf.text('Warehouse', 128, yPos);
          pdf.text('Status', 168, yPos);
          pdf.text('Amount', 198, yPos);
          pdf.text('Paid', 228, yPos);
          pdf.text('Due', 258, yPos);

          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
          yPos += 8;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(14, yPos - 5, pageWidth - 28, 6, 'F');
        }

        const supplierName = po.supplier?.name || po.supplier?.company_name || 'N/A';
        const warehouseName = po.warehouse?.name || 'N/A';
        const amount = parseFloat(po.total_amount) || 0;
        const paid = parseFloat(po.paid_amount || '0');
        const due = amount - paid;

        pdf.text(po.po_number || 'N/A', 16, yPos);
        pdf.text(formatDate(po.order_date), 48, yPos);
        pdf.text(supplierName.substring(0, 25), 78, yPos);
        pdf.text(warehouseName.substring(0, 20), 128, yPos);
        pdf.text(po.status || 'N/A', 168, yPos);
        pdf.text(`৳${amount.toFixed(2)}`, 198, yPos);
        pdf.text(`৳${paid.toFixed(2)}`, 228, yPos);
        pdf.text(`৳${due.toFixed(2)}`, 258, yPos);

        yPos += 6;
      });

      // Footer
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `Purchase_Report_${fromDate}_to_${toDate}.pdf`;
      pdf.save(fileName);

      notify.success('PDF generated successfully');
    } catch (error: any) {
      notify.error('Failed to generate PDF');
      console.error(error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const printReport = () => {
    if (purchases.length === 0) {
      notify.error('No data to print');
      return;
    }
    window.print();
  };

  // ── Table Columns ───────────────────────────────────────────────────────────

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'po_number',
      header: 'PO Number',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {row.original.po_number}
        </span>
      ),
    },
    {
      accessorKey: 'order_date',
      header: 'Order Date',
      cell: ({ row }) => formatDate(row.original.order_date),
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => {
        const supplier = row.original.supplier;
        return supplier?.name || supplier?.company_name || 'N/A';
      },
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => row.original.warehouse?.name || 'N/A',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'pending';
        const colors: Record<string, string> = {
          draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
          pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
          approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
          ordered: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
          partial: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
          received: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.pending}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => {
        const payment = row.original.payment_status || 'pending';
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
          partial: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
          paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${colors[payment] || colors.pending}`}>
            {payment.charAt(0).toUpperCase() + payment.slice(1)}
          </span>
        );
      },
    },
    {
      accessorKey: 'total_amount',
      header: 'Total Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          ৳{parseFloat(row.original.total_amount).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'paid_amount',
      header: 'Paid',
      cell: ({ row }) => {
        const paid = parseFloat(row.original.paid_amount || '0');
        return (
          <span className="text-green-600 dark:text-green-400 font-medium">
            ৳{paid.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: 'due',
      header: 'Due',
      cell: ({ row }) => {
        const total = parseFloat(row.original.total_amount);
        const paid = parseFloat(row.original.paid_amount || '0');
        const due = total - paid;
        return (
          <span className={`font-medium ${due > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
            ৳{due.toFixed(2)}
          </span>
        );
      },
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Purchase List Report
            </h1>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              From Date <span className="text-red-500">*</span>
            </label>
            <CustomDatePicker
              value={fromDate}
              onChange={setFromDate}
              className="w-full"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              To Date <span className="text-red-500">*</span>
            </label>
            <CustomDatePicker
              value={toDate}
              onChange={setToDate}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Search PO Number
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={fetchPurchases}
            disabled={isLoading || !fromDate || !toDate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            {isLoading ? 'Loading...' : 'Search Report'}
          </button>

          {purchases.length > 0 && (
            <>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
              </button>

              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {purchases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {summary.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {summary.totalItems}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  ৳{summary.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  ৳{summary.totalPaid.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Due</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  ৳{summary.totalDue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {purchases.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <DataTable
            columns={columns}
            data={purchases}
            searchable={false}
            pagination={true}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12">
          <div className="flex flex-col items-center justify-center text-gray-400">
            <FileText className="w-16 h-16 mb-3" />
            <p className="text-sm font-medium">No Report Generated</p>
            <p className="text-xs mt-1">Select date range and click "Generate Report"</p>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>

      {/* Hidden Print Area */}
      <div className="hidden print:block print-area">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Purchase List Report</h1>
          <p className="text-center text-sm mb-4">
            Period: {formatDate(fromDate)} to {formatDate(toDate)}
          </p>

          <div className="mb-6 grid grid-cols-5 gap-4 text-sm">
            <div>
              <strong>Total Orders:</strong> {summary.totalOrders}
            </div>
            <div>
              <strong>Total Items:</strong> {summary.totalItems}
            </div>
            <div>
              <strong>Total Amount:</strong> ৳{summary.totalAmount.toFixed(2)}
            </div>
            <div>
              <strong>Total Paid:</strong> ৳{summary.totalPaid.toFixed(2)}
            </div>
            <div>
              <strong>Total Due:</strong> ৳{summary.totalDue.toFixed(2)}
            </div>
          </div>

          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left text-xs">PO Number</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-xs">Date</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-xs">Supplier</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-xs">Warehouse</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-xs">Status</th>
                <th className="border border-gray-300 px-2 py-1 text-right text-xs">Amount</th>
                <th className="border border-gray-300 px-2 py-1 text-right text-xs">Paid</th>
                <th className="border border-gray-300 px-2 py-1 text-right text-xs">Due</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((po) => {
                const total = parseFloat(po.total_amount);
                const paid = parseFloat(po.paid_amount || '0');
                const due = total - paid;
                return (
                  <tr key={po.id}>
                    <td className="border border-gray-300 px-2 py-1 text-xs">{po.po_number}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs">{formatDate(po.order_date)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs">
                      {po.supplier?.name || po.supplier?.company_name || 'N/A'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-xs">{po.warehouse?.name || 'N/A'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs">{po.status}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs text-right">৳{total.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs text-right">৳{paid.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs text-right">৳{due.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
