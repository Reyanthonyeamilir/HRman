"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  // Carousel images data
  const carouselImages = [
    {
      src: "/images/norsu2-796533.jpg",
      alt: "NORSU Campus Building"
    },
    {
      src: "/images/yow2.jpg", 
      alt: "NORSU Students"
    },
    {
      src: "/images/yow3.jpg",
      alt: "NORSU Campus"
    },
    {
      src: "/images/yow4.jpg",
      alt: "NORSU Event"
    }
  ]

  const nextSlide = React.useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1))
    setTimeout(() => setIsTransitioning(false), 500)
  }, [carouselImages.length, isTransitioning])

  const prevSlide = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1))
    setTimeout(() => setIsTransitioning(false), 500)
  }

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 500)
  }

  // Auto slide every 5 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)
    return () => clearInterval(timer)
  }, [nextSlide])

  return (
    <>
      {/* BACKGROUND IMAGE SECTION */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
        <div className="absolute inset-0">
          <Image
            src="/images/yow3.jpg"
            alt="NORSU Campus"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={80}
            style={{
              objectPosition: 'center 30%'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1b3b]/90 via-[#0b1b3b]/70 to-[#0b1b3b]/90 md:from-[#0b1b3b]/80 md:via-[#0b1b3b]/50 md:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b] via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%221%22/%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>
        
        {/* Animated floating elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#2563eb]/20 rounded-full mix-blend-screen filter blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1e3a8a]/10 rounded-full mix-blend-screen filter blur-3xl animate-float"></div>
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4">
          <div className="flex min-h-[50vh] items-center py-16 md:min-h-[60vh] md:py-24">
            <div className="w-full max-w-2xl">
              {/* Badge with animation */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20 animate-fade-in-up">
                <div className="h-2 w-2 rounded-full bg-[#2563eb] animate-pulse"></div>
                <span className="text-sm font-semibold uppercase tracking-widest text-white">
                  Human Resource Management
                </span>
              </div>

              {/* Main Heading with staggered animation */}
              <div className="overflow-hidden">
                <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl animate-slide-in-up">
                  Negros Oriental
                  <span className="block bg-gradient-to-r from-white to-[#c7d7ff] bg-clip-text text-transparent animate-gradient">
                    State University
                  </span>
                </h1>
              </div>

              {/* Description */}
              <div className="overflow-hidden">
                <p className="mb-8 text-lg leading-relaxed text-[#c7d7ff] md:text-xl md:max-w-xl animate-fade-in-up delay-100">
                  Providing comprehensive HR support for faculty and staff—from recruitment and onboarding to development,
                  wellness, and employee services.
                </p>
              </div>

              {/* Buttons with hover animation */}
              <div className="flex flex-wrap gap-4 animate-fade-in-up delay-200">
                <Link 
                  href="/vacancies" 
                  className="group inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-medium text-[#0b1b3b] transition-all hover:bg-white/90 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <span className="relative">
                    Explore Vacancies
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2563eb] transition-all group-hover:w-full"></span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-12 md:h-20 text-white animate-wave"
          >
            <path 
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
              opacity=".25" 
              fill="currentColor"
            ></path>
            <path 
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
              opacity=".5" 
              fill="currentColor"
            ></path>
            <path 
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>

      {/* IMAGE CAROUSEL SECTION */}
      <section className="py-16 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl mb-4">
              NORSU Campus Life
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Discover the vibrant campus environment and facilities at Negros Oriental State University
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative max-w-4xl mx-auto animate-slide-up">
            {/* Carousel */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl group">
              <div 
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselImages.map((image, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <div className="relative h-80 md:h-96 w-full overflow-hidden">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                        <p className="text-white text-lg font-semibold bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 inline-block">
                          {image.alt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons with hover effects */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-3 shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-3 shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>

            {/* Enhanced Indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="relative group/indicator"
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <div className="relative">
                    <div className={`w-8 h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-[#2f67ff]' 
                        : 'bg-slate-300 group-hover/indicator:bg-slate-400'
                    }`} />
                    {index === currentSlide && (
                      <div className="absolute -top-1 -left-1 w-10 h-4 rounded-full bg-[#2f67ff]/20 animate-ping"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BAND SECTION with animation */}
      <section className="bg-[#2f67ff] py-12 text-[#eaf0ff] overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm transform hover:scale-[1.02] transition-transform duration-500 animate-fade-in-up">
            <div className="p-8 md:p-12">
              <p className="mb-4 text-2xl font-semibold md:text-3xl animate-slide-in-up">
                Comprehensive HR Support for University Talent
              </p>
              <p className="mb-6 text-lg animate-slide-in-up delay-100">
                Proactive services for recruitment, benefits, employee relations, and professional development. Dedicated
                to building a thriving academic community.
              </p>
              <div className="flex flex-wrap gap-4 animate-fade-in-up delay-200">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                  <span>Recruitment & Onboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse delay-150"></div>
                  <span>Professional Development</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse delay-300"></div>
                  <span>Employee Wellness</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add these styles to your global CSS */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes wave {
          0% { transform: translateX(0); }
          50% { transform: translateX(-30px); }
          100% { transform: translateX(0); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.7s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-wave {
          animation: wave 20s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .delay-100 {
          animation-delay: 100ms;
        }
        .delay-200 {
          animation-delay: 200ms;
        }
        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </>
  )
}