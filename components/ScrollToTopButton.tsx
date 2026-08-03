'use client'

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <>
      {isVisible && (
        <button
          type="button"
          onClick={handleClick}
          aria-label="맨 위로 이동"
          className="fixed bottom-8 right-6 sm:bottom-10 sm:right-8 w-12 h-12 bg-sky-500 hover:bg-sky-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center z-40 active:scale-95"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  )
}
