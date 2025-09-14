function escapeCsvCell(cell: any): string {
    const cellStr = cell === null || cell === undefined ? '' : String(cell);
    if (cellStr.includes('"') || cellStr.includes(',')) {
      return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
  }
  
  export function exportToCsv(filename: string, headers: string[], rows: any[][]): void {
    if (typeof window === 'undefined') return;
  
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += headers.map(escapeCsvCell).join(',') + '\r\n';
    
    rows.forEach(rowArray => {
      const row = rowArray.map(escapeCsvCell).join(',');
      csvContent += row + '\r\n';
    });
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
  
    link.click();
  
    document.body.removeChild(link);
  }
  