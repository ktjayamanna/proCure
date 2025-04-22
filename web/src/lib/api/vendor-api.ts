// Vendor API service
import { API_BASE_URL } from '../config';

// Types
export interface VendorContract {
  vendor_name: string;
  product_url: string;
  organization_id: string;
  annual_spend?: number;
  contract_type?: string;
  contract_status?: string;
  payment_type?: string;
  num_seats?: number;
  notes?: string;
  expire_at?: string; // ISO date string format
  created_at?: string; // ISO date string format
}

export interface VendorContractResponse {
  success: boolean;
  contract_id: number;
  vendor_name: string;
  product_url: string;
  message: string;
  created: boolean;
}

/**
 * Add a vendor contract
 * @param contractData The contract data to add
 * @returns Response with contract ID and status
 */
export const addVendorContract = async (contractData: VendorContract): Promise<VendorContractResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vendor/contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contractData),
      credentials: 'include' // Important for cookies
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to add vendor contract: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding vendor contract:', error);
    throw error;
  }
};
