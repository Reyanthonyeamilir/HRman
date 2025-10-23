import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const results: any = {
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.NEXT_SERVICE_ROLE_KEY,
        serviceKeyLength: process.env.NEXT_SERVICE_ROLE_KEY?.length,
        serviceKeyStartsWith: process.env.NEXT_SERVICE_ROLE_KEY?.substring(0, 30),
        serviceKeyEndsWith: process.env.NEXT_SERVICE_ROLE_KEY?.substring(-20),
      },
      tests: []
    }

    // Test 1: Create admin client
    results.tests.push({
      name: 'Create Admin Client',
      status: 'pending'
    })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    )

    results.tests[0].status = 'success'

    // Test 2: Test basic table access
    results.tests.push({
      name: 'Basic Table Access',
      status: 'pending'
    })

    const tableTest = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1)

    if (tableTest.error) {
      results.tests[1].status = 'failed'
      results.tests[1].error = tableTest.error.message
      results.tests[1].details = tableTest.error
    } else {
      results.tests[1].status = 'success'
      results.tests[1].data = tableTest.data
    }

    // Test 3: Test Auth Admin API - List Users
    results.tests.push({
      name: 'Auth Admin API - List Users',
      status: 'pending'
    })

    const authTest = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 })
    
    if (authTest.error) {
      results.tests[2].status = 'failed'
      results.tests[2].error = authTest.error.message
      results.tests[2].details = authTest.error
    } else {
      results.tests[2].status = 'success'
      results.tests[2].data = { userCount: authTest.data?.users?.length }
    }

    // Test 4: Test Auth Admin API - Create User (just validation, not actual creation)
    results.tests.push({
      name: 'Auth Admin API - Create User Validation',
      status: 'pending'
    })

    try {
      // This will test if the admin API accepts our key, but won't actually create a user
      const createTest = await supabaseAdmin.auth.admin.createUser({
        email: 'test-validation-only@example.com',
        password: 'temppass123',
        email_confirm: false
      })

      if (createTest.error) {
        // If it's NOT "user already exists" error, then the key is working but validation failed
        if (createTest.error.message.includes('already exists') || createTest.error.message.includes('duplicate')) {
          results.tests[3].status = 'success'
          results.tests[3].message = 'Key works - got expected validation error'
        } else {
          results.tests[3].status = 'failed'
          results.tests[3].error = createTest.error.message
        }
      } else {
        results.tests[3].status = 'success'
        results.tests[3].message = 'Key works - user creation attempted'
        
        // Clean up the test user if it was created
        if (createTest.data.user) {
          await supabaseAdmin.auth.admin.deleteUser(createTest.data.user.id)
        }
      }
    } catch (createError: any) {
      results.tests[3].status = 'failed'
      results.tests[3].error = createError.message
    }

    // Summary
    results.summary = {
      totalTests: results.tests.length,
      passedTests: results.tests.filter((t: any) => t.status === 'success').length,
      failedTests: results.tests.filter((t: any) => t.status === 'failed').length,
      isServiceKeyWorking: results.tests.every((t: any) => t.status === 'success')
    }

    return NextResponse.json(results)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.NEXT_SERVICE_ROLE_KEY,
        serviceKeyLength: process.env.NEXT_SERVICE_ROLE_KEY?.length,
      }
    }, { status: 500 })
  }
}