import { NextRequest, NextResponse } from 'next/server';

interface SaaSPurchaseRow {
  saas_name: string;
  url: string;
  owner_email: string;
}

interface RequestBody {
  organizationId: string;
  purchases: SaaSPurchaseRow[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RequestBody = await request.json();
    
    // Validate request
    if (!body.organizationId) {
      return NextResponse.json(
        { success: false, message: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.purchases || !Array.isArray(body.purchases) || body.purchases.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No purchase data provided' },
        { status: 400 }
      );
    }

    // In a real implementation, this would connect to the database
    // For now, we'll simulate a successful response
    
    // Validate each purchase
    const validPurchases = body.purchases.filter(purchase => 
      purchase.saas_name && purchase.url && purchase.owner_email
    );
    
    // Simulate API call to backend
    // In a real implementation, you would make a fetch call to your backend API
    // or use a database client to insert the data directly
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'SaaS purchases added successfully',
      processed: validPurchases.length,
    });
    
  } catch (error) {
    console.error('Error processing SaaS purchases:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error processing request',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
}
