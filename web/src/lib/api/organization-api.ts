// Organization API service
import { API_BASE_URL } from '../config';

// Types
export interface Organization {
  organization_id: string;
  domain_name: string;    // Domain name (e.g., example.com)
  company_name?: string;  // Full company name (e.g., Example Corporation)
}

export interface ContractUsageData {
  vendor_name: string;
  active_users: number;
  total_seats: number;
}

export interface ContractUsageResponse {
  organization_id: string;
  company_name?: string;
  contracts: ContractUsageData[];
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
 * Get contract usage statistics for an organization
 * @param organizationId The organization ID to analyze
 * @returns Contract usage statistics
 */
export const getContractUsage = async (organizationId: string): Promise<ContractUsageResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/contract-usage`, {
      credentials: 'include' // Important for cookies
    });

    if (!response.ok) {
      throw new Error(`Failed to get contract usage: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching contract usage:', error);
    throw error;
  }
};
