import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '딜리버리픽',
  description: '실패 없는 나만의 배달 맛집 수첩',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="font-serif">{children}</body>
    </html>
  )
}
