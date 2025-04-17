import { SaaSPurchaseRow } from './csv-parser';

export interface SaaSPurchaseRequest {
  organizationId: string;
  purchases: SaaSPurchaseRow[];
}

export interface SaaSPurchaseResponse {
  success: boolean;
  message: string;
  processed?: number;
  errors?: string[];
}

/**
 * Send SaaS purchase data to the backend
 */
export const addSaaSPurchases = async (data: SaaSPurchaseRequest): Promise<SaaSPurchaseResponse> => {
  try {
    const response = await fetch('/api/saas-purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to add SaaS purchases',
        errors: errorData.errors || ['Unknown error occurred'],
      };
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || 'SaaS purchases added successfully',
      processed: result.processed,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error connecting to the server',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
};
