import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate PDF from an HTML element
 * @param element - The HTML element to convert to PDF
 * @param filename - The name of the PDF file to download
 * @param options - Optional configuration
 */
export async function generatePDF(
  element: HTMLElement,
  filename: string,
  options?: {
    scale?: number;
    format?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
  }
): Promise<void> {
  const {
    scale = 2,
    format = 'a4',
    orientation = 'portrait',
  } = options || {};

  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    // Initialize PDF with specified format
    const pdf = new jsPDF(
      orientation === 'portrait' ? 'p' : 'l',
      'mm',
      format
    );

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions to fit PDF width
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add additional pages if content is longer than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Print the current page using the browser's print dialog
 */
export function printPage(): void {
  window.print();
}

/**
 * Format currency value
 * @param value - The numeric value to format
 * @param currency - Currency symbol (default: '')
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatCurrency(
  value: number | string,
  currency: string = '',
  decimals: number = 2
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';

  const formatted = num.toFixed(decimals);
  return currency ? `${currency}${formatted}` : formatted;
}

/**
 * Calculate percentage amount
 * @param base - Base amount
 * @param percentage - Percentage value
 */
export function calculatePercentage(base: number, percentage: number): number {
  return (base * percentage) / 100;
}
