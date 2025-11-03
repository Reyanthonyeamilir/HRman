"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = React.useState(0)

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
    setCurrentSlide((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1))
  }, [carouselImages.length])

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1))
  }

  // Auto slide every 5 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)
    return () => clearInterval(timer)
  }, [nextSlide]) // Added nextSlide to dependencies

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
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4">
          <div className="flex min-h-[50vh] items-center py-16 md:min-h-[60vh] md:py-24">
            <div className="w-full max-w-2xl">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20">
                <div className="h-2 w-2 rounded-full bg-[#2563eb] animate-pulse"></div>
                <span className="text-sm font-semibold uppercase tracking-widest text-white">
                  Human Resource Management
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Negros Oriental
                <span className="block bg-gradient-to-r from-white to-[#c7d7ff] bg-clip-text text-transparent">
                  State University
                </span>
              </h1>

              {/* Description */}
              <p className="mb-8 text-lg leading-relaxed text-[#c7d7ff] md:text-xl md:max-w-xl">
                Providing comprehensive HR support for faculty and staff—from recruitment and onboarding to development,
                wellness, and employee services.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/vacancies" 
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-medium text-[#0b1b3b] transition-all hover:bg-white/90 hover:shadow-lg"
                >
                  Explore Vacancies
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 flex flex-wrap gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">500+</div>
                  <div className="text-sm text-[#c7d7ff]">Employees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">50+</div>
                  <div className="text-sm text-[#c7d7ff]">Positions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">24/7</div>
                  <div className="text-sm text-[#c7d7ff]">HR Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-12 md:h-20 text-white"
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl mb-4">
              NORSU Campus Life
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Discover the vibrant campus environment and facilities at Negros Oriental State University
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative max-w-4xl mx-auto">
            {/* Carousel */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselImages.map((image, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <div className="relative h-80 md:h-96 w-full">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white text-lg font-semibold bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                          {image.alt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg transition-all hover:scale-110 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg transition-all hover:scale-110 z-10"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>

            {/* Indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-[#2f67ff] scale-125' 
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BAND SECTION */}
      <section className="bg-[#2f67ff] py-12 text-[#eaf0ff]">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm">
            <div className="p-8 md:p-12">
              <p className="mb-4 text-2xl font-semibold md:text-3xl">Comprehensive HR Support for University Talent</p>
              <p className="mb-6 text-lg">
                Proactive services for recruitment, benefits, employee relations, and professional development. Dedicated
                to building a thriving academic community.
              </p>
              <div>
                <Link href="/about" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-medium text-[#2f67ff] transition-all hover:bg-white/90 hover:shadow-lg">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}