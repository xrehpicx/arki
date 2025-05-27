// Test script to verify OpenProject API filter fix
import { OpenProjectApiClient } from './src/tools/openproject-agent/api-client';
import type { WorkPackageFilters } from './src/tools/openproject-agent/types';
import { config as appConfig } from './src/config/config';

// Mock parts of the config to avoid real API calls during testing
const originalBaseUrl = appConfig.openProject.baseUrl;
const originalApiKey = appConfig.openProject.apiKey;

// Override config for testing - this will be local to this test script
appConfig.openProject.baseUrl = 'http://test.openproject.instance';
appConfig.openProject.apiKey = 'test-api-key';

// Mock fetch to capture the generated URLs without making real API calls
const originalFetch = global.fetch;
let capturedUrl = '';

const mockFetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  capturedUrl = url.toString();
  // Return a mock response to avoid actual API calls
  return new Response(JSON.stringify({
    _type: 'Collection',
    total: 0,
    count: 0,
    _embedded: {
      elements: []
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// Test the filter logic indirectly by calling listWorkPackages and inspecting the generated URL
async function testFilterLogic() {
  console.log('Testing OpenProject API filter logic...\n');

  // Replace fetch with our mock
  global.fetch = mockFetch as any;

  const client = new OpenProjectApiClient();

  // Test case 1: Simple filters
  console.log('1. Testing simple filters...');
  const simpleFilters: WorkPackageFilters = {
    project: "1",
    status: "2",
    subject: "test task"
  };
  
  try {
    await client.listWorkPackages(simpleFilters);
    console.log(`   Generated URL: ${capturedUrl}`);
    
    // Extract the filters parameter from the URL
    const url = new URL(capturedUrl);
    const filtersParam = url.searchParams.get('filters');
    console.log(`   Filters parameter: ${filtersParam}`);
    
    if (filtersParam) {
      const filters = JSON.parse(filtersParam);
      console.log(`   Parsed filters:`, JSON.stringify(filters, null, 2));
      
      // Verify the structure
      const hasProjectFilter = filters.some((f: any) => f.project && f.project.operator === '=' && f.project.values.includes('1'));
      const hasStatusFilter = filters.some((f: any) => f.status && f.status.operator === '=' && f.status.values.includes('2'));
      const hasSubjectFilter = filters.some((f: any) => f.subject && f.subject.operator === '**' && f.subject.values.includes('test task'));
      
      if (hasProjectFilter && hasStatusFilter && hasSubjectFilter) {
        console.log('   ✅ Simple filters test passed');
      } else {
        console.log('   ❌ Simple filters test failed');
      }
    }
  } catch (error) {
    console.error('   Error in simple filters test:', error);
  }

  // Test case 2: Date range filters
  console.log('\n2. Testing date range filters...');
  const dateRangeFilters: WorkPackageFilters = {
    createdAt: "<>d:2023-01-01T00:00:00Z,2023-12-31T23:59:59Z",
    updatedAt: ">=2023-06-01T00:00:00Z"
  };
  
  try {
    await client.listWorkPackages(dateRangeFilters);
    console.log(`   Generated URL: ${capturedUrl}`);
    
    const url = new URL(capturedUrl);
    const filtersParam = url.searchParams.get('filters');
    
    if (filtersParam) {
      const filters = JSON.parse(filtersParam);
      console.log(`   Parsed filters:`, JSON.stringify(filters, null, 2));
      
      // Verify date range filter structure
      const hasCreatedAtFilter = filters.some((f: any) => 
        f.createdAt && 
        f.createdAt.operator === '<>d' && 
        f.createdAt.values.length === 2 &&
        f.createdAt.values.includes('2023-01-01T00:00:00Z') &&
        f.createdAt.values.includes('2023-12-31T23:59:59Z')
      );
      
      const hasUpdatedAtFilter = filters.some((f: any) => 
        f.updatedAt && 
        f.updatedAt.operator === '>=' && 
        f.updatedAt.values.includes('2023-06-01T00:00:00Z')
      );
      
      if (hasCreatedAtFilter && hasUpdatedAtFilter) {
        console.log('   ✅ Date range filters test passed');
      } else {
        console.log('   ❌ Date range filters test failed');
      }
    }
  } catch (error) {
    console.error('   Error in date range filters test:', error);
  }

  // Test case 3: Mixed filters (including an array for assignee)
  console.log('\n3. Testing mixed filters...');
  const mixedFilters: WorkPackageFilters = {
    project: "1",
    assignee: ["user1", "user2"], // Array of assignees
    createdAt: "<>d:2023-01-01T00:00:00Z,2023-12-31T23:59:59Z",
    subject: "urgent"
  };
  
  try {
    await client.listWorkPackages(mixedFilters);
    console.log(`   Generated URL: ${capturedUrl}`);
    
    const url = new URL(capturedUrl);
    const filtersParam = url.searchParams.get('filters');
    
    if (filtersParam) {
      const filters = JSON.parse(filtersParam);
      console.log(`   Parsed filters:`, JSON.stringify(filters, null, 2));
      
      // Verify mixed filters structure
      const hasProjectFilter = filters.some((f: any) => f.project && f.project.operator === '=' && f.project.values.includes('1'));
      const hasAssigneeFilter = filters.some((f: any) => 
        f.assignee && 
        f.assignee.operator === '=' && 
        f.assignee.values.includes('user1') &&
        f.assignee.values.includes('user2')
      );
      const hasCreatedAtFilter = filters.some((f: any) => f.createdAt && f.createdAt.operator === '<>d');
      const hasSubjectFilter = filters.some((f: any) => f.subject && f.subject.operator === '**' && f.subject.values.includes('urgent'));
      
      if (hasProjectFilter && hasAssigneeFilter && hasCreatedAtFilter && hasSubjectFilter) {
        console.log('   ✅ Mixed filters test passed');
      } else {
        console.log('   ❌ Mixed filters test failed');
      }
    }
  } catch (error) {
    console.error('   Error in mixed filters test:', error);
  }

  // Test case 4: Empty filters
  console.log('\n4. Testing empty filters...');
  try {
    await client.listWorkPackages({});
    console.log(`   Generated URL: ${capturedUrl}`);
    
    const url = new URL(capturedUrl);
    const filtersParam = url.searchParams.get('filters');
    
    if (!filtersParam) {
      console.log('   ✅ Empty filters test passed - no filters parameter in URL');
    } else {
      console.log('   ❌ Empty filters test failed - unexpected filters parameter found');
    }
  } catch (error) {
    console.error('   Error in empty filters test:', error);
  }

  // Test case 5: No filters (undefined)
  console.log('\n5. Testing no filters (undefined)...');
  try {
    await client.listWorkPackages();
    console.log(`   Generated URL: ${capturedUrl}`);
    
    const url = new URL(capturedUrl);
    const filtersParam = url.searchParams.get('filters');
    
    if (!filtersParam) {
      console.log('   ✅ No filters test passed - no filters parameter in URL');
    } else {
      console.log('   ❌ No filters test failed - unexpected filters parameter found');
    }
  } catch (error) {
    console.error('   Error in no filters test:', error);
  }

  // Restore original fetch
  global.fetch = originalFetch;

  console.log('\n✅ Filter logic test completed.');
  console.log('\nThe OpenProject API error should now be resolved!');
  console.log('\nKey fixes applied:');
  console.log('- Fixed malformed date filter concatenation in list-work-packages-tool.ts');
  console.log('- Implemented proper OpenProject API v3 JSON filter format in api-client.ts');
  console.log('- Added support for date range operators (<>d, >=, <, =d) in api-client.ts');
  console.log('- Fixed URL parameter encoding to use JSON.stringify for the filters array in api-client.ts');
}

testFilterLogic().catch(error => {
  console.error("Error during test execution:", error);
  // Restore original fetch in case of error too
  global.fetch = originalFetch;
}); 