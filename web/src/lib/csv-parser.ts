import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface SaaSPurchaseRow {
  saas_name: string;
  url: string;
  owner_email: string;
}

export interface ParsedData {
  data: SaaSPurchaseRow[];
  errors: string[];
}

/**
 * Parse CSV file content
 */
export const parseCSV = (fileContent: string): ParsedData => {
  const result = Papa.parse<any>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const data: SaaSPurchaseRow[] = [];

  // Validate and transform data
  result.data.forEach((row, index) => {
    // Check if row has required fields
    if (!row.saas_name || !row.url || !row.owner_email) {
      errors.push(`Row ${index + 1}: Missing required fields (saas_name, url, or owner_email)`);
      return;
    }

    // Add to valid data
    data.push({
      saas_name: row.saas_name,
      url: row.url,
      owner_email: row.owner_email,
    });
  });

  // Add parsing errors if any
  if (result.errors && result.errors.length > 0) {
    result.errors.forEach(error => {
      errors.push(`Parsing error at row ${error.row}: ${error.message}`);
    });
  }

  return { data, errors };
};

/**
 * Parse Excel file content
 */
export const parseExcel = (arrayBuffer: ArrayBuffer): ParsedData => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
  
  const errors: string[] = [];
  const data: SaaSPurchaseRow[] = [];

  // Validate and transform data
  jsonData.forEach((row, index) => {
    // Check if row has required fields
    if (!row.saas_name || !row.url || !row.owner_email) {
      errors.push(`Row ${index + 1}: Missing required fields (saas_name, url, or owner_email)`);
      return;
    }

    // Add to valid data
    data.push({
      saas_name: row.saas_name,
      url: row.url,
      owner_email: row.owner_email,
    });
  });

  return { data, errors };
};

/**
 * Parse file based on its type
 */
export const parseFile = async (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        
        if (!result) {
          return resolve({ data: [], errors: ['Failed to read file'] });
        }
        
        // Handle CSV files
        if (file.type === 'text/csv') {
          const csvContent = result as string;
          return resolve(parseCSV(csvContent));
        }
        
        // Handle Excel files
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
            file.type === 'application/vnd.ms-excel') {
          const arrayBuffer = result as ArrayBuffer;
          return resolve(parseExcel(arrayBuffer));
        }
        
        // Unsupported file type
        resolve({ data: [], errors: ['Unsupported file type. Please upload a CSV or Excel file.'] });
      } catch (error) {
        resolve({ data: [], errors: [`Error parsing file: ${error instanceof Error ? error.message : String(error)}`] });
      }
    };
    
    reader.onerror = () => {
      resolve({ data: [], errors: ['Error reading file'] });
    };
    
    // Read file based on type
    if (file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};
