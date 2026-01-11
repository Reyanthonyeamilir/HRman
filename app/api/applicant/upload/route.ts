// app/api/applicant/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!')
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Environment variables loaded')

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to ensure bucket exists
async function ensureProfileBucketExists() {
  try {
    console.log('🔍 Checking if profile bucket exists...')
    
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      throw new Error(`Storage error: ${listError.message}`)
    }
    
    console.log('📦 Available buckets:', buckets?.map(b => b.name) || 'None')
    
    const profileBucket = buckets?.find(b => b.name === 'profile')
    
    if (!profileBucket) {
      console.error('❌ "profile" bucket not found!')
      console.error('   Please create it in Supabase Dashboard:')
      console.error('   1. Go to Storage')
      console.error('   2. Click "New Bucket"')
      console.error('   3. Name: "profile" (lowercase)')
      console.error('   4. Set to Public')
      console.error('   5. Click "Create Bucket"')
      
      throw new Error(
        'Storage bucket "profile" not found. ' +
        'Please create it in Supabase Dashboard → Storage.'
      )
    }
    
    console.log('✅ "profile" bucket exists')
    return true
    
  } catch (error: any) {
    console.error('❌ Bucket check failed:', error.message)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('📨 POST /api/applicant/upload - Starting upload process')
  
  try {
    // ------------------------------------
    // 1. AUTHENTICATION
    // ------------------------------------
    console.log('🔐 Step 1: Authentication')
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header')
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message || 'No user')
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email)
    
    // ------------------------------------
    // 2. CHECK BUCKET EXISTS
    // ------------------------------------
    console.log('🪣 Step 2: Checking storage bucket')
    await ensureProfileBucketExists()
    
    // ------------------------------------
    // 3. GET FILE FROM FORM DATA
    // ------------------------------------
    console.log('📄 Step 3: Processing form data')
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      console.error('❌ No file in request')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    console.log('✅ File received:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)}KB`
    })
    
    // ------------------------------------
    // 4. VALIDATE FILE
    // ------------------------------------
    console.log('✓ Step 4: Validating file')
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      console.error('❌ Invalid file type:', file.type)
      return NextResponse.json(
        { error: `Invalid image type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', `${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      )
    }
    
    console.log('✅ File validation passed')
    
    // ------------------------------------
    // 5. PREPARE FILE PATH
    // ------------------------------------
    console.log('📂 Step 5: Preparing file path')
    const userId = user.id
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `avatar_${timestamp}.${ext}`
    const filePath = `${userId}/${fileName}`
    
    console.log('📁 Upload path:', filePath)
    
    // ------------------------------------
    // 6. CLEAN UP OLD AVATARS
    // ------------------------------------
    console.log('🗑️ Step 6: Cleaning old avatars')
    try {
      const { data: existingFiles } = await supabaseAdmin.storage
        .from('profile')
        .list(userId)
      
      if (existingFiles && existingFiles.length > 0) {
        console.log('🗑️ Found old files:', existingFiles.map(f => f.name))
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
        
        const { error: deleteError } = await supabaseAdmin.storage
          .from('profile')
          .remove(filesToDelete)
        
        if (deleteError) {
          console.warn('⚠️ Could not delete old files:', deleteError.message)
        } else {
          console.log('✅ Old avatars deleted')
        }
      }
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup skipped:', cleanupError)
    }
    
    // ------------------------------------
    // 7. UPLOAD NEW FILE
    // ------------------------------------
    console.log('⬆️ Step 7: Uploading file')
    const buffer = Buffer.from(await file.arrayBuffer())
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('profile')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ File uploaded successfully')
    
    // ------------------------------------
    // 8. GET PUBLIC URL
    // ------------------------------------
    console.log('🔗 Step 8: Getting public URL')
    const { data: urlData } = supabaseAdmin.storage
      .from('profile')
      .getPublicUrl(filePath)
    
    const avatarUrl = urlData.publicUrl
    console.log('🔗 Generated URL:', avatarUrl)
    
    // ------------------------------------
    // 9. UPDATE PROFILE IN DATABASE
    // ------------------------------------
    console.log('💾 Step 9: Updating profiles table')
    
    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (checkError || !existingProfile) {
      console.error('❌ Profile not found for user:', userId)
      
      // Create profile if it doesn't exist
      console.log('🆕 Creating new profile entry')
      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: user.email,
          role: 'applicant',
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      
      if (createError) {
        console.error('❌ Failed to create profile:', createError)
        return NextResponse.json(
          { 
            error: 'Profile creation failed',
            details: createError.message,
            avatar_url: avatarUrl
          },
          { status: 500 }
        )
      }
      console.log('✅ Created new profile')
    } else {
      // Update existing profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (updateError) {
        console.error('❌ Profile update failed:', updateError)
        return NextResponse.json(
          { 
            error: 'Database update failed',
            details: updateError.message,
            avatar_url: avatarUrl
          },
          { status: 500 }
        )
      }
      console.log('✅ Profile updated')
    }
    
    // ------------------------------------
    // 10. RETURN SUCCESS
    // ------------------------------------
    console.log('🎉 Step 10: Upload complete!')
    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully'
    })
    
  } catch (err: any) {
    console.error('💥 UNEXPECTED ERROR:', err.message)
    console.error('Stack:', err.stack)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    }
  })
}