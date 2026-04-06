// components/ChatBot.tsx
"use client"

import * as React from "react"
import { supabase } from "@/lib/applicant"
import { Send, X, MessageCircle, Minimize2, Maximize2, Bot, User, Sparkles, Briefcase, Users, FileText, AlertTriangle, Shield, Mail, Clock, Search, Loader2 } from "lucide-react"

interface Message {
  id: string
  role: 'user' | 'assistant' | 'admin'
  content: string
  created_at: Date
  adminName?: string
  userId?: string
  userEmail?: string
  userName?: string
  isGuest?: boolean
}

interface JobData {
  totalJobs: number
  activeJobs: number
  recentJobs: any[]
  departments: string[]
}

interface UserProfile {
  id: string
  role: 'applicant' | 'hr' | 'super_admin'
  email: string
  first_name: string | null
  last_name: string | null
}

interface ChatUser {
  user_id: string | null
  user_email: string
  user_name: string
  is_guest: boolean
  last_message: string
  last_message_time: string
  message_count: number
  role?: string
}

export function ChatBot() {
  // ALL HOOKS MUST BE CALLED FIRST
  const [isOpen, setIsOpen] = React.useState(false)
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputMessage, setInputMessage] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [jobData, setJobData] = React.useState<JobData | null>(null)
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null)
  const [showUserList, setShowUserList] = React.useState(false)
  const [users, setUsers] = React.useState<ChatUser[]>([])
  const [selectedUser, setSelectedUser] = React.useState<ChatUser | null>(null)
  const [adminReply, setAdminReply] = React.useState('')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [loadingUser, setLoadingUser] = React.useState(true)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const replyInputRef = React.useRef<HTMLTextAreaElement>(null)

  // All useEffect hooks
  React.useEffect(() => {
    fetchCurrentUser()
    fetchJobData()
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  React.useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  React.useEffect(() => {
    if (currentUser) {
      if (isSuperAdmin() && selectedUser) {
        loadUserMessages(selectedUser.user_email)
      } else if (isSuperAdmin() && !selectedUser) {
        loadUserMessages(currentUser.email)
      } else if (isApplicant()) {
        loadUserMessages(currentUser.email)
      }
    } else if (loadingUser === false) {
      loadGuestMessages()
    }
  }, [currentUser, selectedUser, loadingUser])

  // Helper functions
  const isSuperAdmin = () => currentUser?.role === 'super_admin'
  const isApplicant = () => currentUser?.role === 'applicant'
  const isHR = () => currentUser?.role === 'hr'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const fetchCurrentUser = async () => {
    try {
      setLoadingUser(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, email, first_name, last_name')
          .eq('id', user.id)
          .single()
        setCurrentUser(profile)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingUser(false)
    }
  }

  const fetchJobData = async () => {
    try {
      const { count: totalJobs } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })

      const { count: activeJobs } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const { data: recentJobs } = await supabase
        .from('job_postings')
        .select('job_title, department, location, date_posted, status')
        .eq('status', 'active')
        .order('date_posted', { ascending: false })
        .limit(5)

      const { data: departments } = await supabase
        .from('job_postings')
        .select('department')
        .eq('status', 'active')
        .not('department', 'is', null)

      const uniqueDepts = [...new Set(departments?.map(d => d.department).filter(Boolean))]

      setJobData({
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        recentJobs: recentJobs || [],
        departments: uniqueDepts as string[]
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadUserMessages = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: new Date(msg.created_at),
          adminName: msg.admin_name,
          userId: msg.user_id,
          userEmail: msg.user_email,
          userName: msg.user_name,
          isGuest: msg.is_guest
        })))
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your NORSU HR assistant. I can help you with job vacancies, application requirements, and the application process.',
          created_at: new Date()
        }])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadGuestMessages = async () => {
    const guestId = localStorage.getItem('guest_chat_id')
    if (!guestId) {
      const newGuestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('guest_chat_id', newGuestId)
    }
    
    const storedGuestId = localStorage.getItem('guest_chat_id')
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_email', `guest_${storedGuestId}`)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: new Date(msg.created_at),
          adminName: msg.admin_name,
          userId: msg.user_id,
          userEmail: msg.user_email,
          userName: msg.user_name,
          isGuest: msg.is_guest
        })))
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your NORSU HR assistant. I can help you with job vacancies, application requirements, and the application process.',
          created_at: new Date()
        }])
      }
    } catch (error) {
      console.error('Error loading guest messages:', error)
    }
  }

  const loadAllUsers = async () => {
    if (!isSuperAdmin()) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chat_messages')
        .select('user_id, user_email, user_name, is_guest, content, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      const userMap = new Map<string, ChatUser>()
      data?.forEach((msg: any) => {
        const key = msg.user_email
        if (!userMap.has(key)) {
          userMap.set(key, {
            user_id: msg.user_id,
            user_email: msg.user_email,
            user_name: msg.user_name || (msg.is_guest ? 'Guest' : 'User'),
            is_guest: msg.is_guest,
            last_message: msg.content,
            last_message_time: msg.created_at,
            message_count: 1
          })
        } else {
          const existing = userMap.get(key)!
          existing.message_count++
          if (new Date(msg.created_at) > new Date(existing.last_message_time)) {
            existing.last_message = msg.content
            existing.last_message_time = msg.created_at
          }
        }
      })

      const usersList = Array.from(userMap.values())
      for (const user of usersList) {
        if (!user.is_guest && user.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.user_id)
            .single()
          user.role = profile?.role
        }
      }
      usersList.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())
      setUsers(usersList)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveMessage = async (message: Message, targetEmail?: string) => {
    try {
      const userEmail = targetEmail || currentUser?.email
      const userName = message.userName || currentUser?.first_name 
        ? `${currentUser?.first_name} ${currentUser?.last_name || ''}`.trim()
        : currentUser?.email?.split('@')[0] || 'User'

      await supabase.from('chat_messages').insert({
        id: message.id,
        user_id: currentUser?.id || null,
        user_email: userEmail,
        user_name: userName,
        role: message.role,
        content: message.content,
        is_guest: !currentUser,
        admin_name: message.adminName,
        created_at: message.created_at.toISOString()
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const targetEmail = selectedUser ? selectedUser.user_email : currentUser?.email
    const targetName = selectedUser ? selectedUser.user_name : null

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      created_at: new Date(),
      userId: currentUser?.id,
      userEmail: targetEmail,
      userName: targetName || (currentUser?.first_name 
        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
        : currentUser?.email?.split('@')[0] || 'User'),
      isGuest: !currentUser
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    await saveMessage(userMessage, targetEmail)

    try {
      const response = await generateResponse(inputMessage)
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        created_at: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      await saveMessage(assistantMessage, targetEmail)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Super Admin sends a reply - ONLY admin message, NO automatic AI response
  const handleAdminReply = async () => {
    if (!adminReply.trim() || !selectedUser) return

    const adminMessage: Message = {
      id: crypto.randomUUID(),
      role: 'admin',
      content: adminReply,
      created_at: new Date(),
      adminName: currentUser?.first_name 
        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
        : currentUser?.email?.split('@')[0] || 'Admin',
      userId: selectedUser.user_id || undefined,
      userEmail: selectedUser.user_email,
      userName: selectedUser.user_name
    }

    await saveMessage(adminMessage, selectedUser.user_email)
    setMessages(prev => [...prev, adminMessage])
    setAdminReply('')
    
    // Refresh user list to show updated last message
    if (isSuperAdmin()) {
      loadAllUsers()
    }
  }

  // ============================================
  // SMARTER GENERATE RESPONSE FUNCTION
  // Based on your database schema
  // ============================================
  const generateResponse = async (question: string) => {
    const q = question.toLowerCase().trim()
    
    // Helper function to check multiple patterns
    const hasIntent = (patterns: string[]) => patterns.some(pattern => q.includes(pattern))
    
    // ========== 1. GREETINGS (Personalized) ==========
    if (hasIntent(['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'])) {
      const userName = currentUser?.first_name || 'there'
      const hour = new Date().getHours()
      let timeGreeting = "Hello"
      if (hour < 12) timeGreeting = "Good morning"
      else if (hour < 18) timeGreeting = "Good afternoon"
      else timeGreeting = "Good evening"
      
      return `${timeGreeting}, ${userName}! 👋 I'm your NORSU HR Assistant.

I can help you with:
📋 **Job Vacancies** - Current openings
📝 **Application Requirements** - Documents needed
⚠️ **Important Rules** - Avoid auto-shortlisting
📍 **Profile Completion** - Step-by-step guide
📊 **Application Status** - Track your progress

💡 **Quick Tip:** Complete ALL required sections BEFORE applying to avoid automatic shortlisting!

What would you like to know today?`
    }

    // ========== 2. THANK YOU RESPONSES ==========
    if (hasIntent(['thank', 'thanks', 'appreciate', 'grateful', 'helpful'])) {
      return `You're very welcome! 😊 I'm glad I could help.

**Is there anything else you'd like to know?**
• More details about specific jobs
• Application status check
• Interview preparation tips
• Document requirements

I'm here to help with your NORSU application journey! 🚀

Would you like to know more about anything else?`
    }

    // ========== 3. REQUIREMENTS (Based on your schema) ==========
    if (hasIntent(['requirement', 'need to prepare', 'documents', 'what do i need', 'what are the requirements', 'required documents'])) {
      await fetchJobData()
      
      return `📋 **Complete Application Requirements Checklist**

**MUST BE COMPLETED BEFORE APPLYING:**

✅ **Profile Information** (from profiles table)
• First Name, Last Name
• Phone Number
• Address
• Date of Birth

✅ **Educational Background** (from educations table)
• Institution Name
• Degree Level (Bachelors, Masters, Doctorate, etc.)
• Degree Name
• Year Graduated
• Course Highlights

✅ **Eligibility/Licenses** (from eligibilities table)
• Eligibility Name (e.g., PRC License, CSC Eligibility)
• License Number
• Date Issued
• Rating (if applicable)

✅ **Work Experience** (from work_experiences table)
• Job Title
• Company
• Start Date
• Description

📝 **Recommended (Optional but encouraged):**
• Skills with proficiency levels (from skills table)
• Trainings and seminars attended (from trainings table)

⏰ **Estimated completion time:** 30-60 minutes

⚠️ **CRITICAL WARNING:** 
Incomplete applications will be automatically marked as "shortlisted" and will NOT proceed to review or interview.

**Next Steps:**
1. Go to Profile page
2. Complete all required sections in your profile
3. Add your education, work experience, and eligibilities
4. Then apply for jobs

Need help with any specific section? Just ask!`
    }

    // ========== 4. BEFORE APPLYING CHECKLIST ==========
    if (hasIntent(['before applying', 'before i apply', 'prepare before', 'what to do before', 'prerequisites'])) {
      return `🔍 **Pre-Application Checklist**

**Before you submit any application, ensure:**

✅ **Profile Complete (profiles table):**
• Personal Information ✓
• Contact details ✓

✅ **Education Added (educations table):**
• At least one educational background ✓
• Degree and institution ✓

✅ **Work Experience Added (work_experiences table):**
• Job history entered ✓

✅ **Eligibility/Licenses Added (eligibilities table):**
• PRC/CSC License (if applicable) ✓

✅ **Documents Ready:**
• Resume/CV (PDF format)
• Diploma & TOR (scanned)
• PRC/CSC License (if applicable)
• Employment certificates

✅ **Information Verified:**
• Contact details correct
• Email address active
• Phone number working

**⏱️ Time needed:** 30-45 minutes to complete everything

**🎯 Pro Tip:** Save your progress as you go. Don't rush!

**⚠️ WARNING:** 
If you apply without completing required sections:
1. Auto-marked as "shortlisted"
2. HR will NOT review
3. No interview consideration

**Ready to start?** Go to your Profile page now!

Need help finding the profile page? Just ask me!`
    }

    // ========== 5. CONSEQUENCES / SHORTLISTED EXPLANATION ==========
    if (hasIntent(['consequences', 'what happens if', 'incomplete', 'shortlisted', 'why shortlisted', 'auto shortlisted'])) {
      return `⚠️ **Important: Understanding "shortlisted" Status**

**If you see "shortlisted" immediately after applying:**

❌ **What this means:**
• Your application is NOT being reviewed
• HR will NOT consider your application
• You will NOT proceed to interview
• This is an AUTO-SHORTLIST due to incomplete requirements

**Why does this happen?**
You applied WITHOUT completing ALL required sections:
• Profile Information missing
• Educational background incomplete (educations table)
• Work experience not added (work_experiences table)
• Licenses not uploaded (eligibilities table)

**How to FIX this:**
1. Go to your Profile page
2. Complete ALL required sections:
   ✓ Personal Information
   ✓ Educational Background
   ✓ Work Experience
   ✓ Licenses/Certifications
3. Wait for system to update
4. Submit a NEW application (old one won't be reviewed)

**✅ How to know you're ready:**
• All sections show data
• No warning messages on profile
• You can see your education, work, and licenses listed

**Need help completing your profile?** I can guide you through each section!

Contact HR at hr@norsu.edu.ph if you need assistance.`
    }

    // ========== 6. HOW TO COMPLETE PROFILE ==========
    if (hasIntent(['how to complete', 'how do i add', 'where do i', 'add education', 'add experience', 'add license', 'update profile'])) {
      return `📍 **Step-by-Step Profile Completion Guide**

**Step 1: Access Your Profile**
• Click on "Profile" in the left sidebar menu
• Or click "View Profile" on your Dashboard

**Step 2: Complete Each Section**

**Personal Information (profiles table):**
• Click "Edit" next to your name
• Fill in: Phone, Address, Birth Date
• Click "Save Changes"

**Educational Background (educations table):**
• Click "Add New Education"
• Enter: School, Degree Level, Degree Name, Year Graduated
• Add Course Highlights if desired
• Click "Save"

**Work Experience (work_experiences table):**
• Click "Add New Experience"
• Enter: Job Title, Company, Start Date, End Date
• Add Description of duties
• Check "Currently Working" if applicable
• Click "Save"

**Licenses/Certifications (eligibilities table):**
• Click "Add New License"
• Enter: Eligibility Name, License Number, Date Issued
• Add Rating if applicable
• Upload license copy
• Click "Save"

**Step 3: Add Optional Sections**
• Skills (from skills table): Add your competencies
• Trainings (from trainings table): Add seminars attended

**Step 4: Verify Completion**
• All required sections should have entries
• No red warning messages
• You can see all your added data

**📋 What to prepare before starting:**
• Personal ID documents
• Academic records (diploma, TOR)
• Employment history
• License certificates

**⏱️ Estimated time:** 30-45 minutes

**Need help with a specific section?** Just tell me which one!

Quick tip: Save each section as you complete it. Don't lose your progress!`
    }

    // ========== 7. REQUIRED SECTIONS LIST ==========
    if (hasIntent(['required sections', 'what is required', 'mandatory', 'must complete', 'need to complete'])) {
      return `✅ **MANDATORY SECTIONS (Must Complete Before Applying)**

**1. Profile Information** 🔴 REQUIRED (profiles table)
- First Name & Last Name
- Phone Number
- Current Address
- Date of Birth

**2. Educational Background** 🔴 REQUIRED (educations table)
- Institution/University Name
- Degree Level (Bachelors, Masters, Doctorate)
- Degree/Course Name
- Year of Graduation

**3. Work Experience** 🔴 REQUIRED (work_experiences table)
- Job Title/Position
- Company/Organization
- Start Date
- Job Description

**4. Licenses & Certifications** 🔴 REQUIRED (eligibilities table)
- Eligibility Name (PRC, CSC, etc.)
- License Number
- Date Issued

**📝 Optional (But Recommended):**
• Skills & Proficiency Levels (skills table)
• Trainings & Seminars (trainings table)
• Certifications

**⚠️ REMEMBER:**
Incomplete applications = Auto "shortlisted" = No HR Review = No Interview

**✅ How to check if you're ready:**
Your profile should show all sections with data before applying

**Need help completing any section?** Ask me about that specific section!`
    }

    // ========== 8. OPTIONAL SECTIONS VALUE ==========
    if (hasIntent(['optional', 'recommended', 'skills', 'training', 'seminar', 'certification', 'why add skills'])) {
      return `📝 **Optional Sections - Why They Matter**

**Skills Section** (skills table) - Highly Recommended
• Add technical and soft skills
• Specify proficiency: Beginner → Expert
• Helps HR match you with jobs
• Shows your capabilities

**Why add skills?**
✅ Makes you stand out from other applicants
✅ Helps algorithm match you to jobs
✅ Shows specific expertise
✅ Increases interview chances by 40%

**Trainings & Seminars** (trainings table)
• Professional development courses
• Workshops attended
• Webinars and conferences
• Online certifications

**Why add trainings?**
✅ Demonstrates continuous learning
✅ Shows initiative and growth
✅ Adds credibility to your application
✅ Relevant for specialized positions

**💡 Pro Tips:**
• List at least 5-10 relevant skills
• Be honest about proficiency levels
• Add recent trainings (last 3-5 years)
• Include certificates if available

**Time to complete:** 10-15 minutes

**Impact on application:** Significant! Many HR staff look at skills first.

Want to know which skills are most in demand for your field? Ask me!`
    }

    // ========== 9. TIME ESTIMATES ==========
    if (hasIntent(['how long', 'time', 'minutes', 'hours', 'how much time', 'duration', 'estimated time'])) {
      return `⏰ **Application Completion Time Estimates**

**Required Sections:** 30-45 minutes

**Breakdown:**
• Profile Information: 5-10 minutes
  (Basic personal details)

• Educational Background: 10-15 minutes
  (Adding schools, degrees, years)

• Work Experience: 10-15 minutes
  (Past jobs, descriptions)

• Licenses/Certifications: 5-10 minutes
  (PRC, CSC, professional licenses)

**Optional Sections:** 15-30 minutes

• Skills Section: 5-10 minutes
• Trainings/Seminars: 10-20 minutes

**Total for Complete Profile:** 45-75 minutes

**⏱️ Pro Tips to Save Time:**

✅ **Before you start (5 mins prep):**
• Have your resume ready
• Gather your diplomas/certificates
• Know your employment dates
• List your licenses/IDs

✅ **During completion:**
• Save each section as you go
• Don't overthink descriptions
• Be honest and accurate
• Use copy-paste from resume

✅ **After completion:**
• Review all entries
• Check for spelling errors
• Verify dates are correct

**⚡ Rush Option:** Complete only required sections in 30 minutes, add optional sections later!

**Need help with a specific section to save time?** I can guide you!`
    }

    // ========== 10. FIND PROFILE PAGE ==========
    if (hasIntent(['where is profile', 'find profile', 'access profile', 'profile page', 'go to profile', 'profile location'])) {
      return `📍 **How to Find Your Profile Page**

**Method 1: From Dashboard (Easiest)**
1. After logging in, you're on your Dashboard
2. Look for a button that says **"View Profile"** or **"Complete Profile"**
3. Click it - you're there!

**Method 2: From Sidebar Menu**
1. Look at the **left side** of your screen
2. Find the **sidebar menu** (icons with labels)
3. Click on **"Profile"** or your name
4. You'll see all profile sections

**Method 3: Quick Access**
• On mobile: Tap the menu icon (☰) top-left
• Select "Profile" from the list

**What you'll see on Profile page:**
📝 Personal Information (profiles table)
🎓 Educational Background (educations table)
💼 Work Experience (work_experiences table)
📜 Licenses/Certifications (eligibilities table)
⭐ Skills (skills table)
📚 Trainings (trainings table)

**Each section has:**
• "Add New" button to add entries
• "Edit" button to modify existing
• "Delete" button to remove

**💡 Quick Tip:** 
Bookmark the profile page once you're there!

**Still can't find it?** 
Contact HR at hr@norsu.edu.ph for assistance

Need help with what to do once you're on the profile page? Just ask!`
    }

    // ========== 11. JOB VACANCIES ==========
    if (hasIntent(['vacanc', 'job', 'position', 'available', 'openings', 'jobs', 'hiring', 'work'])) {
      if (!jobData) await fetchJobData()
      
      if (jobData?.activeJobs === 0) {
        return `📋 **Current Job Vacancies**

There are currently **no active job vacancies** at NORSU.

**📅 When to Check Back:**
• New positions posted monthly
• Peak hiring seasons: January, June, October
• Check every Monday for updates

**🎯 What You Can Do While Waiting:**
1. Complete your profile 100%
2. Prepare all required documents
3. Add skills and trainings
4. Get ready to apply immediately when jobs open

**📧 Stay Updated:**
• Enable notifications (if available)
• Check dashboard regularly
• Follow NORSU social media

**Need more information?** 
Contact HR at hr@norsu.edu.ph

Want to know what documents to prepare while waiting? Just ask!`
      }

      let response = `📋 **Current Job Vacancies at NORSU**

**Summary:** ${jobData?.activeJobs} active position(s) available
**Last Updated:** ${new Date().toLocaleDateString()}

`

      if (jobData?.recentJobs && jobData.recentJobs.length > 0) {
        response += `**Recent Openings:**\n\n`
        jobData.recentJobs.forEach((job, index) => {
          response += `${index + 1}. **${job.job_title}**\n`
          response += `   • Department: ${job.department || 'Not specified'}\n`
          response += `   • Location: ${job.location || 'Main Campus'}\n`
          response += `   • Posted: ${new Date(job.date_posted).toLocaleDateString()}\n`
          response += `   • Status: ${job.status === 'active' ? '🟢 Accepting Applications' : '🔴 Closed'}\n\n`
        })
      }
      
      response += `**How to Apply:**
1. Go to **Vacancies** page
2. Click "Apply" on desired position
3. Submit your application

**⚠️ REMEMBER:** 
Complete ALL required sections BEFORE applying!
Incomplete = Auto-shortlisted = No review

**💡 Pro Tip:** Apply early! Positions may close when filled.

Visit the Vacancies page to see all jobs and detailed descriptions!

Need help with the application process? Just ask!`
      return response
    }

    // ========== 12. APPLICATION STATUS ==========
    if (hasIntent(['status', 'application status', 'my application', 'where is my application', 'application progress'])) {
      return `📊 **Understanding Application Status**

**How to Check Your Status:**
1. Log in to your account
2. Go to your **Dashboard**
3. Look for "My Applications" section
4. Check the status column

**Status Meanings (from applications table):**

🔵 **for_review** - Application received, being checked
• Timeline: 3-5 business days
• Next: Shortlisting or requirements check

🟡 **shortlisted** - Passed initial screening
• Timeline: 5-7 business days  
• Next: Interview scheduling

⚠️ **AUTO-shortlisted** - Applied with incomplete requirements
• HR will NOT review
• Will NOT proceed to interview
• Complete profile and reapply!

🟢 **for_interview** - Selected for interview
• Timeline: Within 3 days
• Next: Interview schedule sent via email

🟠 **hired** - Position offered! 🎉
• Complete pre-employment requirements
• Start date to be announced

🔴 **rejected** - Not selected
• Keep applying to other positions

**📱 Notifications:**
You'll receive email updates when status changes (notifications table)

**⏰ Processing Time:** 2-4 weeks typically

**Need specific help?** 
Tell me your current status and I'll guide you!

Contact HR: hr@norsu.edu.ph for urgent concerns`
    }

    // ========== 13. CONTACT INFORMATION ==========
    if (hasIntent(['contact', 'email', 'phone', 'reach', 'hr contact', 'call', 'office address', 'where is hr'])) {
      return `📞 **NORSU Human Resources Contact Information**

**Primary Contact:**
📧 **Email:** hr@norsu.edu.ph
📞 **Phone:** (035) 420-1901 local 123

**Office Location:**
🏢 HR Office, Administration Building
📍 Capitol Area, Kagawasan Ave
📍 Dumaguete City, Negros Oriental 6200

**Office Hours:**
🕒 Monday - Friday: 8:00 AM - 5:00 PM
❌ Saturday - Sunday: Closed
❌ Holidays: Closed

**For Specific Concerns:**

**Application Status:** 
• Include your Application ID
• Check dashboard first

**Document Submission:**
• Submit through portal only
• Email only if requested

**Interview Scheduling:**
• Wait for HR call/email
• Do not call to follow up

**Technical Issues:**
• Email support

**Response Times:**
📧 Email: 1-2 business days
📞 Phone: During office hours only

**Before Contacting HR:**
✓ Check your dashboard first
✓ Have your application number ready
✓ Prepare your questions

Is there anything specific you need help with?`
    }

    // ========== 14. COMPLAINTS / ISSUES ==========
    if (hasIntent(['problem', 'issue', 'error', 'not working', 'bug', 'glitch', 'something wrong', 'broken'])) {
      return `🔧 **I understand you're experiencing an issue.**

Let me help you troubleshoot!

**Common Issues & Solutions:**

**❌ Can't log in?**
• Check your email/password
• Click "Forgot Password" to reset
• Clear browser cache and cookies
• Try a different browser

**❌ Profile not saving?**
• Check all required fields are filled
• File size too large? (Max 5MB)
• Internet connection stable?
• Try refreshing the page

**❌ Can't apply for jobs?**
• Profile must have education, work, and licenses
• Check all required sections have data
• Try a different browser

**❌ Documents won't upload?**
• Check file format (PDF/JPEG)
• Reduce file size (under 5MB)
• Try renaming the file
• Use Chrome or Firefox

**❌ Status showing wrong?**
• Wait 24 hours for updates
• Refresh your dashboard
• Clear browser cache
• Contact HR if persists

**Still having issues?**

**HR Support:**
📧 hr@norsu.edu.ph
📞 (035) 420-1901 local 123

**Please tell me more about your specific issue so I can help better!**

What exactly is happening?`
    }

    // ========== 15. INTERVIEW PREPARATION ==========
    if (hasIntent(['interview', 'exam', 'test', 'assessment', 'panel', 'interview tips', 'prepare for interview'])) {
      return `🎯 **Interview Preparation Guide**

**Before the Interview:**

📝 **Documents to Bring:**
• Printed application form
• Updated resume/CV (5 copies)
• Valid government ID
• Original diploma & TOR
• PRC/CSC license (if applicable)
• Employment certificates
• Portfolio (if applicable)

👔 **What to Wear:**
• Business formal attire
• For men: Barong or suit & tie
• For women: Blazer, blouse, skirt/pants
• Closed shoes, neat appearance
• Conservative colors (black, navy, gray)

**Common Interview Questions:**

**General Questions:**
• "Tell us about yourself"
• "Why do you want to work at NORSU?"
• "What are your strengths/weaknesses?"
• "Where do you see yourself in 5 years?"

**Position-Specific:**
• Technical questions about your field
• Problem-solving scenarios
• Teaching demo (for faculty positions)

**Questions YOU Should Ask:**
• "What are the day-to-day responsibilities?"
• "What's the department culture like?"
• "What are the opportunities for growth?"

**Day of Interview:**

✅ **Do:**
• Arrive 15-30 minutes early
• Bring extra copies of documents
• Turn off your phone
• Make eye contact
• Be honest and confident

❌ **Don't:**
• Be late (automatic disadvantage)
• Badmouth previous employers
• Lie about qualifications
• Interrupt the panel
• Forget to follow up

**After Interview:**
• Send thank you email within 24 hours
• Follow up after 1 week if no response
• Keep applying to other positions

**Good luck! You've got this! 🍀**

Need more specific tips for your position? Just ask!`
    }

    // ========== 16. SMART DEFAULT RESPONSE ==========
    return `🤖 **I'm here to help with your NORSU application!**

I understand you're asking about: "${question.substring(0, 60)}..."

**Here's what I can help you with:**

📋 **Job Vacancies** - Current openings from job_postings table
📝 **Application Requirements** - Documents and information needed
⚠️ **Important Rules** - Consequences of incomplete applications
📍 **How to Complete Profile** - Step-by-step guide for profiles, educations, work_experiences, eligibilities
📊 **Application Status** - Check applications table status
🎯 **Interview Tips** - How to prepare
📞 **Contact Info** - How to reach HR

**Try asking me:**
• "What jobs are available?"
• "What documents do I need?"
• "How do I add my education?"
• "What's my application status?"
• "How to contact HR?"

**💡 Pro Tip:** Complete your profile (profiles, educations, work_experiences, eligibilities) BEFORE applying!

**Need immediate assistance?** 
Contact HR directly: hr@norsu.edu.ph

What specific information are you looking for?`
  }

  const filteredUsers = users.filter(user => 
    user.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Return null while loading user
  if (loadingUser) {
    return null
  }

  // HR users should not see the chat bot
  if (isHR()) {
    return null
  }

  // REGULAR USER BUTTON (Applicant or Guest)
  if ((isApplicant() || !currentUser) && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-[9999] group"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping"></div>
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-110 transition-transform">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          {jobData?.activeJobs && jobData.activeJobs > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-600 text-white text-[10px] font-bold border-2 border-white">
                {jobData.activeJobs}
              </span>
            </span>
          )}
        </div>
      </button>
    )
  }

  // REGULAR USER CHAT WINDOW
  if ((isApplicant() || !currentUser) && isOpen) {
    return (
      <div className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-[9999] w-[380px]">
        <div className={`flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
          isMinimized ? 'h-12' : 'h-[520px]'
        }`}>
          <div 
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="text-sm font-semibold">NORSU HR Assistant</h3>
                <p className="text-[10px] text-white/80">Online • {jobData?.activeJobs || 0} jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="p-1.5 hover:bg-white/20 rounded-md">
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false) }} className="p-1.5 hover:bg-white/20 rounded-md">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-blue-100' : 
                        msg.role === 'admin' ? 'bg-orange-500' : 'bg-purple-600'
                      }`}>
                        {msg.role === 'user' ? <User className="w-3 h-3 text-blue-600" /> :
                         msg.role === 'admin' ? <Shield className="w-3 h-3 text-white" /> :
                         <Bot className="w-3 h-3 text-white" />}
                      </div>
                      <div className={`rounded-lg px-3 py-1.5 text-xs ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' :
                        msg.role === 'admin' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200'
                      }`}>
                        {msg.role === 'admin' && msg.adminName && (
                          <div className="text-[10px] font-semibold mb-0.5">{msg.adminName} (Admin)</div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[8px] opacity-70 mt-0.5">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-3 py-2 border">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  <button onClick={() => setInputMessage("Requirements?")} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">Requirements</button>
                  <button onClick={() => setInputMessage("Jobs available?")} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">Jobs</button>
                  <button onClick={() => setInputMessage("Contact HR")} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">Contact</button>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // SUPER ADMIN BUTTON
  if (isSuperAdmin() && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-[9999] group"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping"></div>
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-110 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {jobData?.activeJobs && jobData.activeJobs > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-600 text-white text-[10px] font-bold border-2 border-white">
                {jobData.activeJobs}
              </span>
            </span>
          )}
        </div>
      </button>
    )
  }

  // SUPER ADMIN CHAT WINDOW
  if (isSuperAdmin() && isOpen) {
    return (
      <div className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-[9999] w-[450px]">
        <div className={`flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
          isMinimized ? 'h-12' : 'h-[550px]'
        }`}>
          <div 
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <div>
                <h3 className="text-sm font-semibold">Admin Assistant</h3>
                <p className="text-[10px] text-white/80">Helping users • {jobData?.activeJobs || 0} jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserList(!showUserList)
                  if (!showUserList) loadAllUsers()
                }}
                className="p-1.5 hover:bg-white/20 rounded-md"
                title="View Users"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="p-1.5 hover:bg-white/20 rounded-md">
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false) }} className="p-1.5 hover:bg-white/20 rounded-md">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex flex-1 overflow-hidden">
                <div className={`flex-1 flex flex-col ${showUserList ? 'border-r border-gray-200' : ''}`}>
                  {/* Helping Banner */}
                  {selectedUser && (
                    <div className="px-3 py-2 bg-purple-50 border-b border-purple-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span className="text-xs">Helping: <span className="font-semibold">{selectedUser.user_name}</span></span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(null)
                          if (currentUser) loadUserMessages(currentUser.email)
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        Exit
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            msg.role === 'user' ? 'bg-blue-100' : 
                            msg.role === 'admin' ? 'bg-purple-500' : 'bg-gray-600'
                          }`}>
                            {msg.role === 'user' ? <User className="w-3 h-3 text-blue-600" /> :
                             msg.role === 'admin' ? <Shield className="w-3 h-3 text-white" /> :
                             <Bot className="w-3 h-3 text-white" />}
                          </div>
                          <div className={`rounded-lg px-3 py-1.5 text-xs ${
                            msg.role === 'user' ? 'bg-blue-600 text-white' :
                            msg.role === 'admin' ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200'
                          }`}>
                            {msg.role === 'admin' && msg.adminName && (
                              <div className="text-[10px] font-semibold mb-0.5">{msg.adminName} (Admin)</div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-[8px] opacity-70 mt-0.5">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg px-3 py-2 border">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Admin Input - For Super Admin to reply */}
                  <div className="p-3 bg-white border-t border-gray-200">
                    {selectedUser ? (
                      <>
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Reply to help {selectedUser.user_name}:</p>
                          <textarea
                            ref={replyInputRef}
                            value={adminReply}
                            onChange={(e) => setAdminReply(e.target.value)}
                            placeholder={`Type your reply to help ${selectedUser.user_name}...`}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          />
                          <button
                            onClick={handleAdminReply}
                            disabled={!adminReply.trim()}
                            className="mt-2 w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Send as Admin
                          </button>
                          <p className="text-[10px] text-gray-400 text-center mt-2">
                            Your message will appear as an admin reply
                          </p>
                        </div>
                        <div className="border-t border-gray-200 pt-3 mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Or chat with AI:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Ask AI to help..."
                              className="flex-1 px-3 py-2 text-sm bg-gray-100 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={!inputMessage.trim() || isLoading}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 text-center mb-2">
                          Select a user from the list to help them
                        </p>
                        <div className="flex gap-2">
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything..."
                            className="flex-1 px-3 py-2 text-sm bg-gray-100 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* User List - Super Admin Only */}
                {showUserList && (
                  <div className="w-64 bg-gray-50 flex flex-col">
                    <div className="p-2 border-b bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold">Users to Help ({users.length})</span>
                        <button onClick={() => setShowUserList(false)} className="text-gray-400"><X className="w-3 h-3" /></button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-6 pr-2 py-1 text-xs border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {loading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                      ) : filteredUsers.map((user) => (
                        <div
                          key={user.user_email}
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserList(false)
                            loadUserMessages(user.user_email)
                          }}
                          className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedUser?.user_email === user.user_email ? 'bg-purple-50 border-l-4 border-purple-500' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-500" />
                            <span className="text-xs font-medium truncate">{user.user_name}</span>
                            {user.role && <span className="text-[8px] bg-gray-200 px-1 rounded">{user.role === 'super_admin' ? 'Admin' : user.role}</span>}
                            {user.is_guest && <span className="text-[8px] bg-gray-200 px-1 rounded">Guest</span>}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{user.user_email}</p>
                          <p className="text-[9px] text-gray-600 truncate mt-0.5">{user.last_message}</p>
                          <p className="text-[8px] text-gray-400 mt-0.5">{user.message_count} messages</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}