# Supabase RLS Policy Fix - CRITICAL

## 🔴 Problem
Your `applications` table RLS policies are blocking uploads with error:
```
new row violates row-level security policy
```

## ✅ Solution (Choose ONE)

---

## 🚀 QUICKEST FIX (30 seconds) - OPTION A: Disable RLS

**For development/testing only:**

1. Go to https://app.supabase.com → Select your project
2. Go to **SQL Editor** (or use this: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new)
3. Copy and paste this SQL:
```sql
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
```
4. Click **Execute** (Run button)
5. ✅ Done! Try upload again

**Now test locally:**
```bash
npm run dev
# Go to http://localhost:3000/applicant/requirements
# Try uploading a PDF on mobile or desktop
```

---

## 🔒 SECURE FIX (2 minutes) - OPTION B: Proper RLS Policies

**For production - allows users to upload their own apps, HR to manage all:**

1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new
2. Copy entire content from `supabase_rls_fix.sql` file in this repo
3. Paste into SQL Editor
4. Click **Execute**
5. ✅ Done! Try upload again

---

## 🧪 Test the Fix

### Local Testing (before pushing to GitHub):

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:3000/applicant/requirements
   ```

3. **Try uploading:**
   - Select a job position
   - Pick a PDF file (test.pdf)
   - Add optional notes
   - Click "Submit Application"
   - Watch progress bar: 40% → 50% → ... → 100%
   - Should see ✅ success message

4. **Check Supabase:**
   - Go to https://app.supabase.com
   - Select your project → Table Editor
   - Click `applications` table
   - Should see your new application row ✅

---

## 🚨 If Error Still Appears

1. **Check RLS is actually disabled/fixed:**
   ```sql
   -- Run this to see current RLS status
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'applications';
   ```
   Should show: `rowsecurity = false` OR policies should exist

2. **Check Supabase logs for errors:**
   - Go to Supabase Dashboard
   - Logs → Recent logs
   - Look for error details

3. **Verify env variables locally:**
   - Check `.env.local` has correct Supabase credentials
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set

---

## 📋 Environment Variables Needed

In `.env.local` (for local testing):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

In Netlify Dashboard (for production):
- Same 3 variables as above

---

## ✅ After RLS Fix - Full Upload Flow

1. User selects PDF on mobile/desktop ✅
2. Frontend detects device type ✅
3. Sends file to API route with auth token ✅
4. API verifies user is authenticated ✅
5. **API uses SERVICE_ROLE_KEY to bypass RLS** ✅
6. Uploads to `applications` storage bucket ✅
7. Inserts record to `applications` table ✅
8. Creates HR notifications ✅
9. Returns success with ID ✅
10. Frontend shows 100% progress & success message ✅

---

## 📱 Test on All Devices

After fix verified locally:

- [ ] Desktop Chrome - http://localhost:3000
- [ ] Desktop Firefox - http://localhost:3000
- [ ] Android Phone - http://YOUR_IP:3000 (e.g., http://192.168.1.100:3000)
- [ ] iPhone - http://YOUR_IP:3000

---

## 🚀 After Local Testing - Push to GitHub

Once uploads work locally:

```bash
# Verify all is working
npm run build

# Commit the RLS fix documentation
git add .
git commit -m "Docs: Add RLS policy fix guide"

# Push to GitHub (auto-deploys to Netlify)
git push origin main
```

Then in Netlify:
- Set same 3 Supabase env variables
- Deploys auto-trigger
- Test on production URL
