// import { NextRequest, NextResponse } from 'next/server'

// export async function POST(request: NextRequest) {
//   try {
//     console.log('📤 Upload API called')
    
//     // Get auth token
//     const authHeader = request.headers.get('Authorization')
//     if (!authHeader?.startsWith('Bearer ')) {
//       console.error('❌ No auth token')
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     // Create Supabase client
//     const { createClient } = await import('@supabase/supabase-js')
    
//     if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
//       console.error('❌ Missing Supabase env vars')
//       return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
//     }

//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
//     )

//     const token = authHeader.replace('Bearer ', '')
    
//     // Verify user
//     const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
//     if (authError || !user) {
//       console.error('❌ Auth error:', authError)
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     console.log('✅ User authenticated:', user.id)

//     // Get file
//     const formData = await request.formData()
//     const file = formData.get('file') as File
    
//     if (!file) {
//       console.error('❌ No file provided')
//       return NextResponse.json({ error: 'No file' }, { status: 400 })
//     }

//     // Validate
//     console.log('File info:', {
//       name: file.name,
//       type: file.type,
//       size: file.size
//     })

//     if (file.size > 5 * 1024 * 1024) {
//       console.error('❌ File too large:', file.size)
//       return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
//     }

//     // Create filename - SIMPLE format
//     const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
//     const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`

//     console.log('📁 Uploading file:', fileName, 'to bucket: profile')

//     // Check bucket first
//     const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
//     if (bucketError) {
//       console.error('❌ Bucket list error:', bucketError)
//       return NextResponse.json({ error: 'Storage error: ' + bucketError.message }, { status: 500 })
//     }

//     const profileBucket = buckets?.find(b => b.id === 'profile')
//     console.log('📦 Bucket status:', profileBucket ? 'Found' : 'Not found', profileBucket)

//     if (!profileBucket) {
//       return NextResponse.json({ 
//         error: 'Bucket "profile" not found. Create it in Supabase Storage.' 
//       }, { status: 500 })
//     }

//     // Upload file
//     console.log('⬆️ Starting upload...')
//     const { data, error } = await supabase.storage
//       .from('profile')
//       .upload(fileName, file, {
//         contentType: file.type,
//         upsert: true, // Overwrite if exists
//         cacheControl: '3600'
//       })

//     if (error) {
//       console.error('❌ Upload error details:', {
//         message: error.message,
//         name: error.name,
//         stack: error.stack
//       })
      
//       return NextResponse.json({ 
//         error: `Upload failed: ${error.message}` 
//       }, { status: 500 })
//     }

//     console.log('✅ Upload successful:', data)

//     // Get public URL
//     const { data: { publicUrl } } = supabase.storage
//       .from('profile')
//       .getPublicUrl(fileName)

//     console.log('🔗 Public URL:', publicUrl)

//     return NextResponse.json({ 
//       success: true,
//       url: publicUrl,
//       fileName: fileName
//     })

//   } catch (error: any) {
//     console.error('💥 Server error:', error)
//     return NextResponse.json({ 
//       error: 'Server error: ' + (error.message || 'Unknown error') 
//     }, { status: 500 })
//   }
// }