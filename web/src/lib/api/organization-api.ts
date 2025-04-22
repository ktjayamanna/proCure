// Organization API service
import { API_BASE_URL } from '../config';

// Types
export interface Organization {
  organization_id: string;
  domain_name: string;    // Domain name (e.g., example.com)
  company_name?: string;  // Full company name (e.g., Example Corporation)
}

export interface VendorUsageData {
  vendor_name: string;
  active_users: number;
  total_seats: number;
}

export interface VendorUsageResponse {
  organization_id: string;
  company_name?: string;
  vendors: VendorUsageData[];
}

/**
 * Get organization name by ID
 * @param organizationId The organization ID to look up
 * @returns Organization data with name and ID
 */
export const getOrganizationName = async (organizationId: string): Promise<Organization> => {
  try {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/name`, {
      credentials: 'include' // Important for cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to get organization name: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching organization name:', error);
    throw error;
  }
};

/**
 * Get vendor usage statistics for an organization
 * @param organizationId The organization ID to analyze
 * @returns Vendor usage statistics
 */
export const getVendorUsage = async (organizationId: string): Promise<VendorUsageResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/vendor-usage`, {
      credentials: 'include' // Important for cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to get vendor usage: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching vendor usage:', error);
    throw error;
  }
};
