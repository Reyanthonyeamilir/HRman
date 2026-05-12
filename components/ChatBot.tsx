"use client"

import * as React from "react"
import { supabase } from "@/lib/applicant"
import Image from "next/image"
import { Send, X, Minimize2, Maximize2, User, Users, AlertTriangle, Shield, Search, Loader2, Smartphone, Laptop, Tablet, BellRing, MessageSquare, Clock, CheckCircle, Bot, UserCog } from "lucide-react"

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
  isHumanRequest?: boolean
  humanRequestStatus?: 'pending' | 'accepted' | 'resolved'
  visitorId?: string
  deviceInfo?: string
  chatMode?: 'ai' | 'human'
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
  hasPendingRequest?: boolean
  visitorId?: string
  deviceInfo?: string
  chatMode?: 'ai' | 'human'
}

const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

const getVisitorId = (): string => {
  if (typeof window !== 'undefined') {
    let visitorId = localStorage.getItem('visitor_id')
    if (!visitorId) {
      visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('visitor_id', visitorId)
    }
    return visitorId
  }
  return 'visitor_' + Date.now()
}

const getDeviceInfo = (): string => {
  if (typeof window === 'undefined') return 'Unknown Device'
  
  const ua = navigator.userAgent
  let deviceType = 'Desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'Tablet'
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    deviceType = 'Mobile'
  }
  
  let browser = 'Unknown'
  if (ua.indexOf('Chrome') > -1) browser = 'Chrome'
  else if (ua.indexOf('Firefox') > -1) browser = 'Firefox'
  else if (ua.indexOf('Safari') > -1) browser = 'Safari'
  else if (ua.indexOf('Edge') > -1) browser = 'Edge'
  else if (ua.indexOf('Opera') > -1) browser = 'Opera'
  
  let os = 'Unknown'
  if (ua.indexOf('Windows') > -1) os = 'Windows'
  else if (ua.indexOf('Mac') > -1) os = 'macOS'
  else if (ua.indexOf('Linux') > -1) os = 'Linux'
  else if (ua.indexOf('Android') > -1) os = 'Android'
  else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS'
  
  return `${deviceType} · ${browser} on ${os}`
}

export function ChatBot() {
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
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [newRequestNotification, setNewRequestNotification] = React.useState(false)
  const [currentChatMode, setCurrentChatMode] = React.useState<'ai' | 'human'>('ai')
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const replyInputRef = React.useRef<HTMLTextAreaElement>(null)
  
  const visitorId = React.useMemo(() => getVisitorId(), [])
  const deviceInfo = React.useMemo(() => getDeviceInfo(), [])

  const isSuperAdmin = () => currentUser?.role === 'super_admin'
  const isApplicant = () => currentUser?.role === 'applicant'
  const isHR = () => currentUser?.role === 'hr'
  
  const canReplyToUser = () => {
    if (!isSuperAdmin() || !selectedUser) return false
    return selectedUser.hasPendingRequest === true
  }

  const checkAuthStatus = async () => {
    try {
      setLoadingUser(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, email, first_name, last_name')
          .eq('id', user.id)
          .single()
        setCurrentUser(profile)
      } else {
        setIsLoggedIn(false)
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Error:', error)
      setIsLoggedIn(false)
      setCurrentUser(null)
    } finally {
      setLoadingUser(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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

  const loadUserMessages = async (identifier: string) => {
    try {
      console.log('Loading messages for identifier:', identifier)
      
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (identifier && identifier.includes('@')) {
        query = query.eq('user_email', identifier)
      } else {
        query = query.eq('visitor_id', identifier)
      }
      
      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        console.log(`Found ${data.length} messages`)
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'admin',
          content: msg.content,
          created_at: new Date(msg.created_at),
          adminName: msg.admin_name,
          userId: msg.user_id,
          userEmail: msg.user_email,
          userName: msg.user_name,
          isGuest: msg.is_guest,
          isHumanRequest: msg.is_human_request,
          humanRequestStatus: msg.human_request_status,
          visitorId: msg.visitor_id,
          deviceInfo: msg.device_info,
          chatMode: msg.chat_mode || 'ai'
        }))
        setMessages(formattedMessages)
        
        // Restore chat mode from last user message
        const lastUserMessage = [...formattedMessages].reverse().find(m => m.role === 'user')
        if (lastUserMessage) {
          const lastMsg = lastUserMessage.content.toLowerCase().trim()
          if (lastMsg === 'talk to human') {
            setCurrentChatMode('human')
          } else if (lastMsg === 'talk to chatbot' || lastMsg === 'back to ai' || lastMsg === 'switch to ai') {
            setCurrentChatMode('ai')
          }
        }
      } else {
        console.log('No existing messages, showing welcome')
        const welcomeMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `Hello! 👋 I'm your NORSU HR assistant. I can help you with job vacancies, application requirements, and the application process.\n\n📱 **Device:** ${deviceInfo}\n🆔 **Visitor ID:** ${visitorId.slice(-8)}\n\n💡 **Need help from a real person?** Type "talk to human" and an admin will assist you!\n\n⚠️ **Note:** Once you request human help, I will stop responding until you type "talk to chatbot" to switch back to me.\n\nPlease log in to apply for jobs or track your applications.`,
          created_at: new Date()
        }
        setMessages([welcomeMessage])
        await saveMessage(welcomeMessage, identifier)
        setCurrentChatMode('ai')
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadAllUsers = async () => {
    if (!isSuperAdmin()) return
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const userMap = new Map<string, ChatUser>()
      
      data?.forEach((msg: any) => {
        let key = ''
        let isGuestUser = msg.is_guest || !msg.user_email
        
        if (!isGuestUser && msg.user_email) {
          key = msg.user_email
        } else if (msg.visitor_id) {
          key = msg.visitor_id
        } else {
          key = msg.user_email || 'unknown'
        }
        
        const hasPending = msg.is_human_request === true && msg.human_request_status === 'pending'
        
        if (!userMap.has(key)) {
          let displayName = msg.user_name || 'User'
          if (isGuestUser) {
            const deviceType = msg.device_info?.split('·')[0] || 'Unknown'
            displayName = `Visitor (${deviceType})`
          }
          
          userMap.set(key, {
            user_id: msg.user_id,
            user_email: msg.user_email || key,
            user_name: displayName,
            is_guest: isGuestUser,
            last_message: msg.content,
            last_message_time: msg.created_at,
            message_count: 1,
            hasPendingRequest: hasPending,
            visitorId: msg.visitor_id,
            deviceInfo: msg.device_info,
            chatMode: msg.chat_mode || 'ai'
          })
        } else {
          const existing = userMap.get(key)!
          existing.message_count++
          if (new Date(msg.created_at) > new Date(existing.last_message_time)) {
            existing.last_message = msg.content
            existing.last_message_time = msg.created_at
          }
          if (hasPending) {
            existing.hasPendingRequest = true
          }
        }
      })

      const usersList = Array.from(userMap.values())
      
      usersList.sort((a, b) => {
        if (a.hasPendingRequest && !b.hasPendingRequest) return -1
        if (!a.hasPendingRequest && b.hasPendingRequest) return 1
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      })
      
      setUsers(usersList)
      
      const pendingCount = usersList.filter(u => u.hasPendingRequest).length
      if (pendingCount > 0) {
        setNewRequestNotification(true)
        console.log(`📢 ${pendingCount} pending requests!`)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveMessage = async (message: Message, targetIdentifier?: string) => {
    try {
      let userEmail = targetIdentifier || currentUser?.email
      let isGuestUser = !currentUser
      
      if (message.role === 'admin' && targetIdentifier) {
        if (targetIdentifier.includes('@')) {
          userEmail = targetIdentifier
        } else {
          userEmail = `guest_${targetIdentifier}`
        }
        isGuestUser = !targetIdentifier.includes('@')
      } else if (isGuestUser && !userEmail) {
        userEmail = `guest_${visitorId}`
      }
      
      const userName = message.userName || (message.role === 'admin' 
        ? message.adminName 
        : currentUser?.first_name 
          ? `${currentUser?.first_name} ${currentUser?.last_name || ''}`.trim()
          : currentUser?.email?.split('@')[0] || (isGuestUser ? `Visitor` : 'User'))

      const messageToSave: any = {
        user_email: userEmail,
        user_name: userName,
        role: message.role,
        content: message.content,
        is_guest: isGuestUser,
        created_at: message.created_at.toISOString(),
        chat_mode: message.chatMode || currentChatMode || 'ai'
      }

      if (currentUser?.id && message.role !== 'admin') {
        messageToSave.user_id = currentUser.id
      }
      
      if (message.adminName) {
        messageToSave.admin_name = message.adminName
      }
      
      if (message.deviceInfo) {
        messageToSave.device_info = message.deviceInfo
      } else if (deviceInfo) {
        messageToSave.device_info = deviceInfo
      }
      
      if (message.visitorId) {
        messageToSave.visitor_id = message.visitorId
      } else if (visitorId) {
        messageToSave.visitor_id = visitorId
      }
      
      if (message.isHumanRequest) {
        messageToSave.is_human_request = true
        messageToSave.human_request_status = message.humanRequestStatus || 'pending'
      }

      console.log(`Saving ${message.role} message to:`, userEmail)
      const { error } = await supabase
        .from('chat_messages')
        .insert([messageToSave])

      if (error) {
        console.error('Error saving message:', error)
      } else {
        console.log('✅ Message saved!')
      }
      
      if (isSuperAdmin()) {
        setTimeout(() => loadAllUsers(), 500)
      }
    } catch (error) {
      console.error('Exception in saveMessage:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    let userIdentifier: string
    let targetName: string | null = null
    
    if (selectedUser) {
      userIdentifier = selectedUser.user_email || selectedUser.visitorId || visitorId
      targetName = selectedUser.user_name
    } else {
      userIdentifier = currentUser?.email || visitorId
      targetName = null
    }

    const userInput = inputMessage.toLowerCase().trim()
    const isHumanRequest = !selectedUser && userInput === 'talk to human'
    const isBackToAI = !selectedUser && (userInput === 'talk to chatbot' || userInput === 'back to ai' || userInput === 'switch to ai')
    
    // Update chat mode based on user input
    let newChatMode = currentChatMode
    if (isHumanRequest) {
      newChatMode = 'human'
      setCurrentChatMode('human')
    } else if (isBackToAI) {
      newChatMode = 'ai'
      setCurrentChatMode('ai')
    }

    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: inputMessage,
      created_at: new Date(),
      userId: currentUser?.id,
      userEmail: currentUser?.email || visitorId,
      userName: targetName || (currentUser?.first_name 
        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
        : currentUser?.email?.split('@')[0] || 'Visitor'),
      isGuest: !currentUser,
      visitorId: visitorId,
      deviceInfo: deviceInfo,
      isHumanRequest: isHumanRequest,
      humanRequestStatus: isHumanRequest ? 'pending' : undefined,
      chatMode: newChatMode
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    await saveMessage(userMessage, userIdentifier)

    try {
      // Only prevent AI from responding - but user can still type messages
      if (newChatMode === 'human' && !isBackToAI) {
        // Don't send AI response, but don't block user from typing
        // Just notify that AI is waiting
        const waitingMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `👋 **Human Assistance Mode Active**

I'm currently in human assistance mode and won't respond to your messages.

**Current Status:** Waiting for admin response
**Your Device:** ${deviceInfo}

💡 **To switch back to me (AI Assistant):** Type "talk to chatbot"

Keep typing your messages - the admin will see them and respond!`,
          created_at: new Date(),
          chatMode: 'human'
        }
        setMessages(prev => [...prev, waitingMessage])
        await saveMessage(waitingMessage, userIdentifier)
      } 
      else if (isBackToAI) {
        const aiWelcomeMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `🤖 **Back to AI Assistant Mode!**

I'm here to help you again with your NORSU-related questions.

**What would you like to know?**
• "What jobs are available?"
• "What documents do I need?"
• "How do I complete my profile?"

💡 **Need human help again?** Type "talk to human" to request admin assistance.`,
          created_at: new Date(),
          chatMode: 'ai'
        }
        setMessages(prev => [...prev, aiWelcomeMessage])
        await saveMessage(aiWelcomeMessage, userIdentifier)
      }
      else {
        // Normal AI response (only when in AI mode and not switching)
        const response = await generateResponse(inputMessage)
        const assistantMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: response,
          created_at: new Date(),
          chatMode: 'ai'
        }
        setMessages(prev => [...prev, assistantMessage])
        await saveMessage(assistantMessage, userIdentifier)
      }
    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminReply = async () => {
    if (!canReplyToUser()) {
      alert("⚠️ You can only reply to visitors who have an ACTIVE pending request. They need to type 'talk to human' again to request further assistance.")
      return
    }
    
    if (!adminReply.trim() || !selectedUser) return

    const targetIdentifier = selectedUser.user_email || selectedUser.visitorId
    if (!targetIdentifier) return

    const adminMessage: Message = {
      id: generateUniqueId(),
      role: 'admin',
      content: adminReply,
      created_at: new Date(),
      adminName: currentUser?.first_name 
        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
        : currentUser?.email?.split('@')[0] || 'Admin',
      userId: selectedUser.user_id || undefined,
      userEmail: selectedUser.user_email,
      userName: selectedUser.user_name,
      visitorId: selectedUser.visitorId,
      deviceInfo: selectedUser.deviceInfo,
      chatMode: 'human'
    }

    await saveMessage(adminMessage, targetIdentifier)
    setMessages(prev => [...prev, adminMessage])
    setAdminReply('')
    
    // Mark ALL pending requests as resolved for this user
    if (selectedUser.user_email && !selectedUser.is_guest) {
      await supabase
        .from('chat_messages')
        .update({ human_request_status: 'resolved' })
        .eq('user_email', selectedUser.user_email)
        .eq('is_human_request', true)
        .eq('human_request_status', 'pending')
    } else if (selectedUser.visitorId) {
      await supabase
        .from('chat_messages')
        .update({ human_request_status: 'resolved' })
        .eq('visitor_id', selectedUser.visitorId)
        .eq('is_human_request', true)
        .eq('human_request_status', 'pending')
    }
    
    setSelectedUser(prev => prev ? { ...prev, hasPendingRequest: false } : null)
    
    setTimeout(() => {
      if (isSuperAdmin()) {
        loadAllUsers()
      }
    }, 500)
  }

  React.useEffect(() => {
    checkAuthStatus()
    fetchJobData()
  }, [])

  React.useEffect(() => {
    const loadChat = async () => {
      if (!isSuperAdmin()) {
        const identifier = currentUser?.email || visitorId
        await loadUserMessages(identifier)
      }
    }
    
    if (!loadingUser) {
      loadChat()
    }
  }, [currentUser, loadingUser, visitorId])

  React.useEffect(() => {
    if (currentUser && isSuperAdmin()) {
      loadAllUsers()
    }
  }, [currentUser])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  React.useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  React.useEffect(() => {
    if (isSuperAdmin()) {
      const interval = setInterval(() => {
        loadAllUsers()
        if (selectedUser) {
          const identifier = selectedUser.user_email || selectedUser.visitorId
          if (identifier) {
            loadUserMessages(identifier)
          }
        }
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isSuperAdmin(), selectedUser])

  React.useEffect(() => {
    if (!isSuperAdmin() && (currentUser?.email || visitorId)) {
      const identifier = currentUser?.email || visitorId
      const filter = identifier.includes('@') 
        ? `user_email=eq.${identifier}`
        : `visitor_id=eq.${identifier}`
      
      const channel = supabase
        .channel('chat_updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: filter
          },
          (payload) => {
            console.log('New message received!', payload)
            const newMsg = payload.new as any
            if (newMsg.role !== 'user') {
              const message: Message = {
                id: newMsg.id,
                role: newMsg.role,
                content: newMsg.content,
                created_at: new Date(newMsg.created_at),
                adminName: newMsg.admin_name,
                userName: newMsg.user_name,
                isHumanRequest: newMsg.is_human_request,
                humanRequestStatus: newMsg.human_request_status,
                chatMode: newMsg.chat_mode
              }
              setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev
                return [...prev, message]
              })
              scrollToBottom()
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser, visitorId, isSuperAdmin])

  const callGroqAPI = async (question: string): Promise<string> => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant for NORSU (Negros Oriental State University). Be professional, helpful, and concise. Keep responses under 150 words.`
            },
            {
              role: 'user',
              content: question
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I'm having trouble processing that request. Please try again.";
    } catch (error) {
      console.error('Groq API Error:', error);
      return "I'm experiencing technical difficulties. Please try again in a moment.";
    }
  };

  const isJobRelatedQuestion = (question: string): boolean => {
    const q = question.toLowerCase().trim();
    const jobKeywords = [
      'job', 'vacanc', 'position', 'openings', 'hiring', 'apply', 'application',
      'requirement', 'document', 'resume', 'cv', 'interview', 'exam', 'test',
      'salary', 'benefit', 'hr', 'recruit', 'profile', 'education', 'experience',
      'license', 'eligibility', 'skill', 'training', 'status', 'shortlisted'
    ];
    return jobKeywords.some(keyword => q.includes(keyword));
  };

  const generateResponse = async (question: string) => {
    const q = question.toLowerCase().trim()
    
    const isJobRelated = isJobRelatedQuestion(q);
    
    if (!isJobRelated) {
      return await callGroqAPI(question);
    }
    
    const hasIntent = (patterns: string[]) => patterns.some(pattern => q.includes(pattern))
    
    if (hasIntent(['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
      return `Hello! 👋 I'm your NORSU HR Assistant.

I can help you with:
📋 **Job Vacancies** - Current openings
📝 **Application Requirements** - Documents needed
📍 **Profile Completion** - Step-by-step guide
📊 **Application Status** - Track your progress

💡 **Need human help?** Type "talk to human" to request admin assistance!
⚠️ **Note:** Once you request human help, I will stop responding until you type "talk to chatbot" to switch back.

What would you like to know today?`
    }

    if (hasIntent(['thank', 'thanks', 'appreciate', 'grateful'])) {
      return `You're very welcome! 😊 I'm glad I could help.

💡 **Need human help?** Type "talk to human" to request admin assistance!
💡 **Switch back to AI:** Type "talk to chatbot" if you're in human mode.

Is there anything else you'd like to know?`
    }

    if (hasIntent(['requirement', 'need to prepare', 'documents', 'what do i need', 'what are the requirements'])) {
      return `📋 **Application Requirements Checklist**

**MUST BE COMPLETED BEFORE APPLYING:**

✅ Profile Information (First Name, Last Name, Phone, Address, Birth Date)
✅ Educational Background (School, Degree, Year Graduated)
✅ Work Experience (Job Title, Company, Dates)
✅ Licenses/Certifications (PRC License, CSC Eligibility)

⚠️ **WARNING:** Incomplete applications will be auto-shortlisted and NOT reviewed!

Need help? Type "talk to human" for assistance.`
    }

    if (hasIntent(['vacanc', 'job', 'position', 'available', 'openings', 'jobs', 'hiring'])) {
      if (!jobData) await fetchJobData()
      
      if (jobData?.activeJobs === 0) {
        return `📋 **Current Job Vacancies**

There are currently **no active job vacancies** at NORSU.

Check back regularly for new opportunities!`
      }

      let response = `📋 **Current Job Vacancies at NORSU**

**${jobData?.activeJobs} active position(s) available**

`

      if (jobData?.recentJobs && jobData.recentJobs.length > 0) {
        jobData.recentJobs.forEach((job, index) => {
          response += `${index + 1}. **${job.job_title}**\n`
          response += `   • Department: ${job.department || 'Not specified'}\n`
          response += `   • Location: ${job.location || 'Main Campus'}\n\n`
        })
      }
      
      response += `Visit the Vacancies page to apply!`
      return response
    }

    return `🤖 **I'm here to help with your NORSU application!**

💡 **Need human help?** Type "talk to human" to request admin assistance!
⚠️ **Note:** Once you request human help, I will stop responding until you type "talk to chatbot" to switch back.

**Try asking me:**
• "What jobs are available?"
• "What documents do I need?"
• "How do I complete my profile?"
• "talk to human" (for admin help)`
  }

  const filteredUsers = users.filter(user => 
    (user.user_email && user.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.user_name && user.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.deviceInfo && user.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.visitorId && user.visitorId.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loadingUser) {
    return null
  }
  
  if (isHR()) {
    return null
  }

  // Regular user button
  if (!isSuperAdmin() && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-4 sm:right-6 z-[9999] group"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping"></div>
          <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-110 transition-transform active:scale-95">
            <Image 
              src="/images/norsu.png" 
              alt="NORSU" 
              width={28} 
              height={28}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
          </div>
          {jobData?.activeJobs && jobData.activeJobs > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-600 text-white text-[10px] font-bold border-2 border-white">
                {jobData.activeJobs > 9 ? '9+' : jobData.activeJobs}
              </span>
            </span>
          )}
        </div>
      </button>
    )
  }

  // Regular user chat window - INPUT IS ALWAYS ENABLED
  if (!isSuperAdmin() && isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px]">
        <div className={`flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
          isMinimized ? 'h-12' : 'h-[480px] sm:h-[520px]'
        }`}>
          <div 
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm">
                <Image 
                  src="/images/norsu.png" 
                  alt="NORSU" 
                  width={20} 
                  height={20}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold">NORSU HR Assistant</h3>
                <p className="text-[8px] sm:text-[10px] text-white/80">
                  {isLoggedIn ? `Online • ${jobData?.activeJobs || 0} jobs` : `Guest Mode`}
                  {currentChatMode === 'human' && ` • 👤 Human Mode (AI paused)`}
                  {currentChatMode === 'ai' && ` • 🤖 AI Mode`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="p-1.5 hover:bg-white/20 rounded-md">
                {isMinimized ? <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false) }} className="p-1.5 hover:bg-white/20 rounded-md">
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                {currentChatMode === 'human' && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 mb-2 text-xs text-yellow-800 flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    <span>⚠️ You are in <strong>Human Assistance Mode</strong>. I (AI) won't respond to your messages, but you can still type and the admin will see them. Type <strong>"talk to chatbot"</strong> to switch back to AI.</span>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-blue-100' : 
                        msg.role === 'admin' ? 'bg-orange-500' : 'bg-purple-600'
                      }`}>
                        {msg.role === 'user' ? <User className="w-3 h-3 text-blue-600" /> :
                         msg.role === 'admin' ? <Shield className="w-3 h-3 text-white" /> :
                         msg.chatMode === 'human' ? <UserCog className="w-3 h-3 text-white" /> :
                         <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-0.5">
                           <Image 
                             src="/images/norsu.png" 
                             alt="NORSU" 
                             width={16} 
                             height={16}
                             className="w-full h-full object-contain"
                           />
                         </div>}
                      </div>
                      <div className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' :
                        msg.role === 'admin' ? 'bg-orange-500 text-white' : 
                        msg.chatMode === 'human' ? 'bg-yellow-500 text-white' : 'bg-white border border-gray-200'
                      }`}>
                        {msg.role === 'admin' && msg.adminName && (
                          <div className="text-[10px] font-semibold mb-0.5">{msg.adminName} (Admin)</div>
                        )}
                        {msg.role === 'assistant' && msg.chatMode === 'human' && (
                          <div className="text-[10px] font-semibold mb-0.5 flex items-center gap-1">
                            <UserCog className="w-3 h-3" /> Human Mode (AI Paused)
                          </div>
                        )}
                        {msg.isHumanRequest && msg.humanRequestStatus === 'pending' && (
                          <div className="text-[10px] font-semibold mb-1 text-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Human Assistance Requested - Admin will respond
                          </div>
                        )}
                        {msg.isHumanRequest && msg.humanRequestStatus === 'resolved' && (
                          <div className="text-[10px] font-semibold mb-1 text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Admin has responded to your request
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
                  {currentChatMode === 'ai' ? (
                    <>
                      <button onClick={() => setInputMessage("Requirements?")} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">Requirements</button>
                      <button onClick={() => setInputMessage("Jobs available?")} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">Jobs</button>
                      <button onClick={() => setInputMessage("Contact HR")} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">Contact</button>
                      <button onClick={() => setInputMessage("talk to human")} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🔴 Talk to Human</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setInputMessage("talk to chatbot")} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">🤖 Talk to Chatbot</button>
                      <div className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">💬 Keep typing - admin will see</div>
                    </>
                  )}
                  {!isLoggedIn && (
                    <button onClick={() => window.location.href = '/login'} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Log in
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={currentChatMode === 'ai' ? "Ask me anything..." : "Type your message for admin... (AI won't respond)"}
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
                <p className="text-[8px] text-gray-400 text-center mt-2">
                  {currentChatMode === 'ai' 
                    ? "💬 Type 'talk to human' for admin help • AI will pause"
                    : "👤 Human mode active • Type 'talk to chatbot' to return to AI"
                  }
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Super admin button
  if (isSuperAdmin() && !isOpen) {
    const pendingRequests = users.filter(u => u.hasPendingRequest).length
    
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          loadAllUsers()
          setNewRequestNotification(false)
        }}
        className="fixed bottom-4 right-4 sm:bottom-4 sm:right-6 z-[9999] group"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping"></div>
          <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-110 transition-transform active:scale-95">
            <Image 
              src="/images/norsu.png" 
              alt="NORSU" 
              width={28} 
              height={28}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            {newRequestNotification && (
              <BellRing className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-bounce" />
            )}
          </div>
          {pendingRequests > 0 && (
            <>
              <span className="absolute -top-1 -right-1 flex h-6 w-6">
                <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-6 w-6 bg-yellow-500 text-white text-[11px] font-bold border-2 border-white">
                  {pendingRequests > 9 ? '9+' : pendingRequests}
                </span>
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </>
          )}
        </div>
      </button>
    )
  }

  // Super admin chat window
  if (isSuperAdmin() && isOpen) {
    const pendingCount = users.filter(u => u.hasPendingRequest).length
    
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px]">
        <div className={`flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
          isMinimized ? 'h-12' : 'h-[500px] sm:h-[550px]'
        }`}>
          <div 
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm">
                <Image 
                  src="/images/norsu.png" 
                  alt="NORSU" 
                  width={20} 
                  height={20}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-semibold">Admin Dashboard</h3>
                <p className="text-[8px] sm:text-[10px] text-white/80">
                  {users.length} total • {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
                </p>
              </div>
              {pendingCount > 0 && (
                <div className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  {pendingCount} New!
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserList(!showUserList)
                  if (!showUserList) loadAllUsers()
                  setNewRequestNotification(false)
                }}
                className="p-1.5 hover:bg-white/20 rounded-md relative"
              >
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span>
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="p-1.5 hover:bg-white/20 rounded-md">
                {isMinimized ? <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false) }} className="p-1.5 hover:bg-white/20 rounded-md">
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
                <div className={`flex-1 flex flex-col ${showUserList ? 'border-r border-gray-200' : ''}`}>
                  {selectedUser && (
                    <div className={`px-3 py-2 border-b ${selectedUser.hasPendingRequest ? 'bg-yellow-50 border-yellow-200' : 'bg-purple-50 border-purple-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold">{selectedUser.user_name}</span>
                          {selectedUser.hasPendingRequest && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full animate-pulse font-bold">
                              🔴 NEEDS REPLY
                            </span>
                          )}
                          {!selectedUser.hasPendingRequest && selectedUser.is_guest && (
                            <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">
                              No active request
                            </span>
                          )}
                          {selectedUser.is_guest && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                              Visitor
                            </span>
                          )}
                          {selectedUser.chatMode === 'human' && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                              Human Mode
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedUser(null)
                            setMessages([])
                          }}
                          className="text-xs text-purple-600 hover:text-purple-700"
                        >
                          Exit
                        </button>
                      </div>
                      {selectedUser.deviceInfo && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-500">
                          {selectedUser.deviceInfo.includes('Mobile') ? <Smartphone className="w-3 h-3" /> : 
                           selectedUser.deviceInfo.includes('Tablet') ? <Tablet className="w-3 h-3" /> : 
                           <Laptop className="w-3 h-3" />}
                          <span>{selectedUser.deviceInfo}</span>
                          <span className="mx-1">•</span>
                          <span>{selectedUser.visitorId ? `ID: ${selectedUser.visitorId.slice(-8)}` : selectedUser.user_email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                    {messages.length === 0 && !selectedUser && (
                      <div className="text-center text-gray-500 text-xs py-8">
                        Select a visitor from the list to view their chat
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-blue-100' : 
                            msg.role === 'admin' ? 'bg-purple-500' : 
                            msg.chatMode === 'human' ? 'bg-yellow-500' : 'bg-gray-600'
                          }`}>
                            {msg.role === 'user' ? <User className="w-3 h-3 text-blue-600" /> :
                             msg.role === 'admin' ? <Shield className="w-3 h-3 text-white" /> :
                             msg.chatMode === 'human' ? <UserCog className="w-3 h-3 text-white" /> :
                             <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-0.5">
                               <Image 
                                 src="/images/norsu.png" 
                                 alt="NORSU" 
                                 width={16} 
                                 height={16}
                                 className="w-full h-full object-contain"
                               />
                             </div>}
                          </div>
                          <div className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm ${
                            msg.role === 'user' ? 'bg-blue-600 text-white' :
                            msg.role === 'admin' ? 'bg-purple-500 text-white' : 
                            msg.chatMode === 'human' ? 'bg-yellow-500 text-white' : 'bg-white border border-gray-200'
                          }`}>
                            {msg.role === 'admin' && msg.adminName && (
                              <div className="text-[10px] font-semibold mb-0.5">{msg.adminName} (Admin)</div>
                            )}
                            {msg.role === 'assistant' && msg.chatMode === 'human' && (
                              <div className="text-[10px] font-semibold mb-0.5">⚠️ Human Mode (AI disabled - user can still type)</div>
                            )}
                            {msg.isHumanRequest && msg.humanRequestStatus === 'pending' && (
                              <div className="text-[10px] font-semibold mb-1 text-red-600 bg-red-50 p-1 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                🔴 HUMAN ASSISTANCE REQUESTED - REPLY REQUIRED 🔴
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[8px] opacity-70">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {msg.deviceInfo && (
                                <p className="text-[8px] opacity-50">{msg.deviceInfo}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 bg-white border-t border-gray-200">
                    {selectedUser ? (
                      <>
                        {selectedUser.hasPendingRequest ? (
                          <>
                            <div className="mb-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                              <p className="text-[11px] text-yellow-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                This user has an ACTIVE request for human assistance. You can reply now.
                              </p>
                            </div>
                            <textarea
                              ref={replyInputRef}
                              value={adminReply}
                              onChange={(e) => setAdminReply(e.target.value)}
                              placeholder={`Reply to ${selectedUser.user_name} as human admin...`}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  e.preventDefault()
                                  handleAdminReply()
                                }
                              }}
                            />
                            <button
                              onClick={handleAdminReply}
                              disabled={!adminReply.trim()}
                              className="mt-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Reply as Human Admin
                            </button>
                            <p className="text-[10px] text-gray-400 text-center mt-2">
                              Press Ctrl+Enter to send
                            </p>
                          </>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                            <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">Cannot reply to this user</p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Admin can only reply when user has an ACTIVE "talk to human" request
                            </p>
                            {!selectedUser.hasPendingRequest && selectedUser.is_guest && (
                              <p className="text-[10px] text-blue-500 mt-2">
                                💡 User must type "talk to human" again to request further assistance
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-2">
                        Select a visitor to help them
                      </p>
                    )}
                  </div>
                </div>

                {showUserList && (
                  <div className="w-full sm:w-64 bg-gray-50 flex flex-col border-t sm:border-t-0 sm:border-l border-gray-200">
                    <div className="p-2 border-b bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold">Visitors ({users.length})</span>
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
                    <div className="flex-1 overflow-y-auto max-h-[200px] sm:max-h-none">
                      {loading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="text-center text-gray-500 text-xs py-4">No visitors yet</div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div
                            key={user.user_email || user.visitorId}
                            onClick={() => {
                              setSelectedUser(user)
                              setShowUserList(false)
                              const identifier = user.user_email || user.visitorId
                              if (identifier) loadUserMessages(identifier)
                            }}
                            className={`p-2 cursor-pointer hover:bg-gray-100 ${
                              (selectedUser?.user_email === user.user_email || selectedUser?.visitorId === user.visitorId) ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                            } ${user.hasPendingRequest ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              {user.hasPendingRequest && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                              {user.deviceInfo?.includes('Mobile') ? <Smartphone className="w-3 h-3 text-gray-500" /> : 
                               user.deviceInfo?.includes('Tablet') ? <Tablet className="w-3 h-3 text-gray-500" /> : 
                               <Laptop className="w-3 h-3 text-gray-500" />}
                              <span className="text-xs font-medium truncate flex-1">
                                {user.user_name}
                                {user.hasPendingRequest && " ✨"}
                              </span>
                              {user.is_guest && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded">Visitor</span>}
                              {user.chatMode === 'human' && <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1 rounded">Human Mode</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {user.hasPendingRequest && (
                                <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold animate-pulse">
                                  NEEDS REPLY
                                </span>
                              )}
                              {!user.hasPendingRequest && user.is_guest && (
                                <span className="text-[8px] bg-gray-100 text-gray-500 px-1 rounded">
                                  No request
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">
                              {user.deviceInfo || (user.user_email?.includes('@') ? user.user_email : `ID: ${user.visitorId?.slice(-8)}`)}
                            </p>
                            <p className="text-[8px] text-gray-400 mt-0.5">{user.message_count} messages</p>
                          </div>
                        ))
                      )}
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