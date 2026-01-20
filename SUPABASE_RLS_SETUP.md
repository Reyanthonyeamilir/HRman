# Supabase RLS Policy Setup Guide

## Problem
Your `applications` table has Row Level Security (RLS) policies that block the API from inserting records.

## Error
```
new row violates row-level security policy
```

## Solution

### Option 1: RECOMMENDED - Fix RLS Policies (Secure)

Go to Supabase Dashboard → Authentication → Policies

#### For `applications` table:

1. **DISABLE RLS temporarily** (to test):
   - Go to Supabase Dashboard
   - Click on `applications` table
   - Click "Authentication" button at top
   - Toggle OFF "Enable RLS"
   - Click "Yes" to confirm

2. **Test the upload** - it should work now

3. **Enable RLS again and create proper policies**:
   - Toggle RLS back ON
   - Click "+ Create Policy"
   - Create new policy:
     - **Name**: "Applicants can insert own applications"
     - **Type**: INSERT
     - **Target role**: authenticated
     - **Expression**:
       ```sql
       auth.uid() = applicant_id
       ```
   
   - Create another policy:
     - **Name**: "HR can read all applications"
     - **Type**: SELECT
     - **Target role**: authenticated
     - **Expression**:
       ```sql
       (SELECT role FROM profiles WHERE id = auth.uid()) = 'hr' OR 
       (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' OR
       auth.uid() = applicant_id
       ```

### Option 2: Disable RLS (Simple - for development)

If you're in development and trust server-side operations:

1. Go to Supabase Dashboard
2. Click `applications` table
3. Click "Authentication"
4. Toggle OFF "Enable RLS"

This allows the API to insert without restrictions.

---

## Verify Fix

After making changes:

1. **Rebuild locally**:
   ```bash
   npm run build
   ```

2. **Test upload on mobile/desktop** - should work now

3. If error persists, check Supabase logs:
   - Go to Supabase Dashboard
   - Logs → Recent logs
   - Look for RLS policy errors

---

## Environment Variables Needed

Make sure Netlify has these set:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc... (this bypasses RLS for server operations)
```

---

## After RLS Fix

The upload flow will:
1. ✅ Authenticate user with Bearer token
2. ✅ Bypass RLS with SERVICE_ROLE_KEY
3. ✅ Insert application record
4. ✅ Create HR notifications
5. ✅ Log task action

Then test on:
- Android mobile
- iPhone mobile
- Desktop Chrome
- Desktop Safari
