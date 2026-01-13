// app/api/applicant/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Lazy Supabase initialization
async function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  const { createClient } = await import('@supabase/supabase-js')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// Ensure "profile" bucket exists
async function ensureProfileBucketExists(supabaseAdmin: any) {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
  if (error) throw new Error('Storage error: ' + error.message)
  const profileBucket = buckets?.find((b: any) => b.name === 'profile')
  if (!profileBucket) throw new Error('Bucket "profile" not found in Supabase Storage')
  return true
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Upload API called')

    // Lazy init
    const supabaseAdmin = await getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase environment variables missing' }, { status: 500 })
    }

    // 1️⃣ Authenticate user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    console.log('✅ User authenticated:', user.id)

    // 2️⃣ Check bucket
    await ensureProfileBucketExists(supabaseAdmin)

    // 3️⃣ Get file
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // 4️⃣ Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type.toLowerCase())) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

    // 5️⃣ Prepare file path
    const userId = user.id
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `avatar_${timestamp}.${ext}`
    const filePath = `${userId}/${fileName}`

    // 6️⃣ Delete old avatars
    try {
      const { data: existingFiles } = await supabaseAdmin.storage.from('profile').list(userId)
      if (existingFiles?.length) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
        const { error: deleteError } = await supabaseAdmin.storage.from('profile').remove(filesToDelete)
        if (deleteError) console.warn('⚠️ Could not delete old files:', deleteError.message)
      }
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup skipped:', cleanupError)
    }

    // 7️⃣ Upload new file
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage.from('profile').upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type
    })
    if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })

    // 8️⃣ Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('profile').getPublicUrl(filePath)
    const avatarUrl = urlData.publicUrl

    // 9️⃣ Update profile
    const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).single()
    if (!existingProfile) {
      await supabaseAdmin.from('profiles').insert({
        id: userId,
        email: user.email,
        role: 'applicant',
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } else {
      await supabaseAdmin.from('profiles').update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }).eq('id', userId)
    }

    // 10️⃣ Return success
    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully'
    })

  } catch (err: any) {
    console.error('💥 Upload API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    }
  })
}
