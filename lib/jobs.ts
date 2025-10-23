import { supabase } from './supabaseClient'

export type JobRow = {
  id: string
  created_by: string
  job_title: string
  department: string | null
  location: string | null
  job_description: string | null
  image_path: string | null
  date_posted: string
  status: 'active' | 'closed'
}

// List all jobs
export async function listJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .order('date_posted', { ascending: false })

  if (error) {
    console.error('Error fetching jobs:', error)
    throw error
  }

  return data || []
}

// Create a new job posting
export async function createJobPosting(jobData: {
  job_title: string
  department?: string
  location?: string
  job_description?: string
}): Promise<JobRow> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User must be logged in')

  const { data, error } = await supabase
    .from('job_postings')
    .insert({
      job_title: jobData.job_title,
      department: jobData.department || null,
      location: jobData.location || null,
      job_description: jobData.job_description || null,
      created_by: user.id,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    throw error
  }

  return data
}

// Update an existing job
export async function updateJob(jobId: string, updates: {
  job_title?: string
  department?: string
  location?: string
  job_description?: string
  status?: 'active' | 'closed'
}): Promise<JobRow> {
  const { data, error } = await supabase
    .from('job_postings')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    console.error('Error updating job:', error)
    throw error
  }

  return data
}

// Upload job image to Supabase Storage
export async function uploadJobImage(jobId: string, file: File): Promise<string> {
  try {
    // Ensure bucket exists
    await ensureBucketExists()

    const fileExt = file.name.split('.').pop()
    const fileName = `${jobId}_${Date.now()}.${fileExt}`
    const filePath = `job-images/${fileName}`

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('job-images')
      .getPublicUrl(filePath)

    // Update job with image path
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({ image_path: publicUrl })
      .eq('id', jobId)

    if (updateError) throw updateError

    return publicUrl
  } catch (error) {
    console.error('Error uploading job image:', error)
    throw error
  }
}

// Get signed URL for job image (for preview/display)
export async function getJobImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null

  try {
    // For public buckets, we can just return the public URL
    // If you need signed URLs for private buckets, use this instead:
    // const { data } = await supabase.storage.from('job-images').createSignedUrl(imagePath, 60)
    // return data?.signedUrl || null

    return imagePath
  } catch (error) {
    console.error('Error getting image URL:', error)
    return null
  }
}

// Close a job (set status to closed)
export async function closeJob(jobId: string): Promise<JobRow> {
  const { data, error } = await supabase
    .from('job_postings')
    .update({ status: 'closed' })
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    console.error('Error closing job:', error)
    throw error
  }

  return data
}

// Delete a job (and its image if exists)
export async function deleteJob(jobId: string): Promise<void> {
  // First get the job to check for image
  const { data: job } = await supabase
    .from('job_postings')
    .select('image_path')
    .eq('id', jobId)
    .single()

  // Delete image from storage if exists
  if (job?.image_path) {
    try {
      const imagePath = job.image_path.split('/').pop()
      if (imagePath) {
        await supabase.storage
          .from('job-images')
          .remove([`job-images/${imagePath}`])
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      // Continue with job deletion even if image deletion fails
    }
  }

  // Delete the job
  const { error } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', jobId)

  if (error) throw error
}

// Helper function to ensure storage bucket exists
async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) throw error

    const jobImagesBucket = buckets?.find(bucket => bucket.name === 'job-images')
    
    if (!jobImagesBucket) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket('job-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      })
      if (createError) throw createError
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error)
    throw error
  }
}

// Get job with applications count
export async function getJobWithApplications(jobId: string) {
  const { data, error } = await supabase
    .from('job_postings')
    .select(`
      *,
      applications (
        id
      )
    `)
    .eq('id', jobId)
    .single()

  if (error) {
    console.error('Error fetching job with applications:', error)
    throw error
  }

  return {
    ...data,
    applications_count: data.applications?.length || 0
  }
}

// Get jobs by status
export async function getJobsByStatus(status: 'active' | 'closed'): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('status', status)
    .order('date_posted', { ascending: false })

  if (error) {
    console.error('Error fetching jobs by status:', error)
    throw error
  }

  return data || []
}