'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  GraduationCap, 
  Award, 
  Code, 
  BookOpen, 
  Briefcase,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Step = {
  title: string
  description: string
  icon: any
  required: boolean
  requiredFields: string[]
  beforeApply: string
}

export default function ApplicantInstructionsPage() {
  const router = useRouter()

  const steps: Step[] = [
    {
      title: 'Complete Your Profile',
      description: 'Fill in your personal information, contact details, and background information',
      icon: User,
      required: true,
      requiredFields: ['First Name', 'Last Name', 'Phone Number', 'Address', 'Date of Birth'],
      beforeApply: 'MUST BE COMPLETED BEFORE APPLYING'
    },
    {
      title: 'Add Educational Background',
      description: 'Enter your academic qualifications, degrees, and institutions attended',
      icon: GraduationCap,
      required: true,
      requiredFields: ['Institution Name', 'Degree Level', 'Degree Name', 'Year Graduated'],
      beforeApply: 'MUST BE COMPLETED BEFORE APPLYING'
    },
    {
      title: 'Add Eligibility/Licenses',
      description: 'List your professional licenses, certifications, and eligibility documents',
      icon: Award,
      required: true,
      requiredFields: ['Eligibility Name', 'License Number', 'Date Issued'],
      beforeApply: 'MUST BE COMPLETED BEFORE APPLYING'
    },
    {
      title: 'Add Work Experience',
      description: 'Detail your professional work history and previous employment',
      icon: Briefcase,
      required: true,
      requiredFields: ['Job Title', 'Company', 'Start Date', 'Description'],
      beforeApply: 'MUST BE COMPLETED BEFORE APPLYING'
    },
    {
      title: 'Add Your Skills',
      description: 'Specify your technical and professional skills with proficiency levels',
      icon: Code,
      required: false,
      requiredFields: ['Skill Name', 'Proficiency Level'],
      beforeApply: 'Recommended but optional'
    },
    {
      title: 'Add Trainings/Seminars',
      description: 'Include relevant workshops, seminars, and training programs attended',
      icon: BookOpen,
      required: false,
      requiredFields: ['Training Name', 'Institution', 'Start Date'],
      beforeApply: 'Recommended but optional'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6">
            <FileText className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Application Instructions
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Follow these instructions to ensure your application is complete and ready for submission.
          </p>
        </div>

        {/* Critical Warning Banner */}
        <div className="mb-10 p-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg text-white">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 flex-shrink-0" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">⚠️ IMPORTANT NOTICE</h2>
              <div className="space-y-1">
                <p className="font-semibold">BEFORE YOU CAN APPLY FOR ANY JOB:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You must complete ALL required sections (marked with *)</li>
                  <li>Incomplete applications will be <span className="font-bold underline">AUTOMATICALLY MARKED AS "SHORTLISTED"</span></li>
                  <li>Applications marked as "Shortlisted" will <span className="font-bold">NOT PROCEED</span> to the review stage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column: Before You Apply */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Before You Apply for a Job
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800">✅ You must complete:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-green-700">
                    <li>Profile Information (Personal Details)</li>
                    <li>Educational Background</li>
                    <li>Eligibility/Licenses</li>
                    <li>Work Experience</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-800">📝 Recommended to complete:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-blue-700">
                    <li>Skills Section</li>
                    <li>Trainings/Seminars</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-800">⏰ Estimated Time:</p>
                  <p className="text-amber-700 mt-2">
                    Complete all required sections in approximately 30-60 minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Consequences Section */}
            <div className="bg-white p-6 rounded-xl border-2 border-red-200 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                If You Don't Complete Required Sections
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700">1. Automatic "Shortlisted" Status</p>
                    <p className="text-gray-600">Your application will be marked as "Shortlisted" immediately</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700">2. Cannot Proceed to Review</p>
                    <p className="text-gray-600">HR will not review your application</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700">3. No Job Interview</p>
                    <p className="text-gray-600">You will not be considered for any interview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: How to Complete Steps */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border-2 border-indigo-200 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                How to Complete Each Section
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="font-semibold text-indigo-800 mb-2">📍 Access Profile Sections:</p>
                  <ol className="list-decimal list-inside space-y-2 text-indigo-700">
                    <li>Go to your Profile page from the sidebar</li>
                    <li>Scroll through the profile form</li>
                    <li>Find each section (Education, Skills, etc.)</li>
                    <li>Click "Add New" or edit existing entries</li>
                  </ol>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="font-semibold text-purple-800 mb-2">📋 What to Prepare:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-700">
                    <li>Personal identification documents</li>
                    <li>Academic records and diplomas</li>
                    <li>Professional licenses and certificates</li>
                    <li>Employment history details</li>
                    <li>Skills and training certificates</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-300">
                  <p className="font-bold text-gray-900 mb-2">Quick Start:</p>
                  <Button 
                    onClick={() => router.push('/applicant/profile')}
                    className="w-full gap-3 py-6 text-lg"
                  >
                    Go to Profile Page
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Required Application Sections
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              
              return (
                <div 
                  key={index}
                  className={`
                    border-2 rounded-xl p-5 transition-all duration-300 hover:shadow-xl
                    ${step.required 
                      ? 'border-red-200 bg-gradient-to-br from-white to-red-50 hover:border-red-300' 
                      : 'border-blue-200 bg-gradient-to-br from-white to-blue-50 hover:border-blue-300'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${step.required ? 'bg-red-100' : 'bg-blue-100'}
                      `}>
                        <Icon className={`
                          h-6 w-6
                          ${step.required ? 'text-red-600' : 'text-blue-600'}
                        `} />
                      </div>
                      {step.required && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                          * REQUIRED
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-300">
                      {index + 1}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {step.description}
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Required Information:</p>
                      <div className="space-y-1">
                        {step.requiredFields.map((field, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span className="text-sm text-gray-600">{field}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${step.required ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <p className={`text-sm font-bold ${step.required ? 'text-red-700' : 'text-blue-700'}`}>
                        {step.beforeApply}
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => router.push('/applicant/profile')}
                      variant={step.required ? "default" : "outline"}
                      className={`w-full gap-2 ${step.required ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      {step.required ? 'Complete Required Section' : 'Add Optional Section'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Final Instructions */}
        <div className="bg-white rounded-xl border-2 border-green-300 p-8 shadow-lg">
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">
              Ready to Apply?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">1</div>
                <h3 className="font-bold text-green-800">Complete All Required Sections</h3>
                <p className="text-sm text-green-700">Profile, Education, Eligibility, Work Experience</p>
              </div>
              <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">2</div>
                <h3 className="font-bold text-blue-800">Review Your Information</h3>
                <p className="text-sm text-blue-700">Check for accuracy and completeness</p>
              </div>
              <div className="space-y-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">3</div>
                <h3 className="font-bold text-purple-800">Apply for Jobs</h3>
                <p className="text-sm text-purple-700">Browse and submit applications</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => router.push('/applicant/profile')}
                className="gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                Go to Profile Page
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => router.push('/applicant')}
                className="gap-3 border-2"
              >
                Return to Dashboard
              </Button>
            </div>
            
            <div className="pt-6 border-t border-gray-200">
              <p className="text-gray-600">
                Remember: <span className="font-bold text-red-600">Complete all required sections before applying.</span><br />
                Incomplete applications will be marked as "Shortlisted" and will not proceed.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-3">
          <div className="text-gray-500">
            <p className="font-medium">
              Need help? Contact NORSU HR at{' '}
              <a href="mailto:hr@norsu.edu.ph" className="text-blue-600 hover:underline">
                hr@norsu.edu.ph
              </a>
            </p>
          </div>
          <p className="text-sm text-gray-400">
            These instructions are mandatory for all job applicants. Follow them carefully.
          </p>
        </div>
      </div>
    </div>
  )
}