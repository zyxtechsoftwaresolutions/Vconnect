// Utility functions for data export

export const exportToExcel = async (data: any[], filename: string) => {
  try {
    // Create CSV format data
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export to Excel failed:', error);
    throw new Error('Failed to export data to Excel format');
  }
};

export const exportToPDF = async (data: any[], filename: string, title: string) => {
  try {
    // Simple PDF generation using HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Popup blocked');

    const headers = Object.keys(data[0] || {});
    const tableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .timestamp { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="timestamp">
            Generated on: ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(tableHTML);
    printWindow.document.close();
    
    // Auto print after content loads
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    };
  } catch (error) {
    console.error('Export to PDF failed:', error);
    throw new Error('Failed to export data to PDF format');
  }
};

export const generateReceipt = (data: any, type: 'fee' | 'fine' = 'fee') => {
  try {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) throw new Error('Popup blocked');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; max-width: 600px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .receipt-no { text-align: right; margin-bottom: 20px; font-weight: bold; }
            .details { margin-bottom: 20px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .amount { font-size: 18px; font-weight: bold; color: #2563eb; }
            .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
            .signature { margin-top: 40px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>VIET - Visakha Institute of Engineering & Technology</h2>
            <p>Payment Receipt</p>
          </div>
          
          <div class="receipt-no">
            Receipt No: RCP${Date.now()}
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span>Student Name:</span>
              <span>${data.studentName || data.name || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span>Register ID:</span>
              <span>${data.registerId || data.id || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span>Payment Type:</span>
              <span>${type === 'fee' ? 'Tuition Fee' : 'Library Fine'}</span>
            </div>
            <div class="detail-row">
              <span>Amount:</span>
              <span class="amount">₹${data.amount || data.fine || 0}</span>
            </div>
            <div class="detail-row">
              <span>Payment Date:</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span>Payment Method:</span>
              <span>Online</span>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Thank you for your payment!</strong></p>
            <p>This is a computer-generated receipt.</p>
          </div>
          
          <div class="signature">
            <p>_________________</p>
            <p>Authorized Signature</p>
          </div>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    
    receiptWindow.onload = () => {
      receiptWindow.print();
    };
  } catch (error) {
    console.error('Generate receipt failed:', error);
    throw new Error('Failed to generate receipt');
  }
};