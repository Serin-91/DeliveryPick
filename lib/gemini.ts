const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  ''

export interface ReceiptOCRResult {
  is_verified: boolean
  app_name: '배달의민족' | '쿠팡이츠' | '요기요' | '기타'
  store_name: string
  address?: string
  category?: string
  min_order?: number
  order_number: string // Prefix 조합용 (예: B12345678)
  menus: { name: string; price: number; is_representative: boolean }[]
  total_price: number
  order_time?: string
  is_late_night?: boolean
}

/**
 * 영수증 / 배달 앱 주문내역 캡처 이미지를 Gemini Vision으로 분석 (OCR)
 */
export async function parseReceiptWithGemini(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ReceiptOCRResult | null> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API Key가 설정되지 않았습니다.')
    return null
  }

  const prompt = `
이 이미지는 배달 앱(배달의민족, 쿠팡이츠, 요기요 등)의 주문 완료 내역 화면 또는 배달 영수증 이미지입니다.
다음 항목을 정밀하게 추출하여 오직 JSON 형식으로만 응답해 주세요. (마크다운 포맷이나 추가 텍스트 금지)

{
  "is_verified": boolean (배달 앱 주문 영수증이 맞는지 여부),
  "app_name": "배달의민족" | "쿠팡이츠" | "요기요" | "기타",
  "store_name": "가게 이름",
  "address": "가게 또는 배달지 주소 (없으면 null)",
  "category": "추정 음식 카테고리 (치킨, 한식, 분식, 족발·보쌈, 피자·양식, 버거, 샌드위치, 샐러드, 중식, 일식, 멕시칸, 아시안, 도시락, 카페·디저트, 야식, 기타 중 1개)",
  "order_number": "영수증 속 주문번호 (문자+숫자 포함). 만약 주문번호가 없다면 'STORE_DATE_PRICE' 조합 문자열 생성",
  "menus": [
    {"name": "메뉴 이름", "price": 메뉴가격(숫자), "is_representative": true/false (첫 번째 핵심 메인메뉴만 true)}
  ],
  "total_price": 총결제금액(숫자),
  "order_time": "주문일시 (예: 2026-08-04 23:15)",
  "is_late_night": boolean (주문 시간이 밤 10시~새벽 4시 사이이면 true)
}
`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      console.error('Gemini OCR API HTTP error:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const result: ReceiptOCRResult = JSON.parse(text)
    return result
  } catch (error) {
    console.error('Gemini OCR Parsing Error:', error)
    return null
  }
}
