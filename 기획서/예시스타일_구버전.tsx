import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Star, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  Check, 
  LogOut, 
  User, 
  Lock, 
  Mail,
  Home
} from 'lucide-react';

/* ============================================================================
 * 1. 딜리버리픽 메인 로고 & 일러스트 (SVG Component)
 * ============================================================================ */
export function DeliveryPickLogo() {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center select-none">
      {/* 로고 일러스트 (SVG) */}
      <svg
        className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-md mb-3 transition-transform hover:scale-105"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 파스텔 하늘색 원형 배경 */}
        <circle cx="100" cy="100" r="90" fill="#E0F2FE" />
        <circle cx="100" cy="100" r="72" fill="#BAE6FD" opacity="0.4" />

        {/* 배달 덮개 (클로쉐) 아이콘 */}
        <path
          d="M50 125C50 90 70 70 100 70C130 70 150 90 150 125H50Z"
          fill="#0284C7"
        />
        {/* 클로쉐 받침 및 손잡이 */}
        <rect x="42" y="125" width="116" height="10" rx="5" fill="#0369A1" />
        <circle cx="100" cy="62" r="8" fill="#0369A1" />

        {/* 중앙 맛집 하트 핀 포인트 */}
        <path
          d="M100 88C95 83 88 86 88 91C88 96 100 104 100 104C100 104 112 96 112 91C112 86 105 83 100 88Z"
          fill="#F43F5E"
        />
      </svg>

      {/* 대형 브랜드 타이틀 */}
      <h1 className="font-serif text-4xl sm:text-5xl font-black text-sky-600 tracking-tight drop-shadow-sm">
        🛵 딜리버리픽
      </h1>
      
      {/* 영문 서브 타이틀 */}
      <p className="font-serif text-xs sm:text-sm text-sky-700/70 mt-1 font-semibold tracking-wider uppercase">
        Delivery Pick
      </p>
    </div>
  );
}

/* ============================================================================
 * 2. 메인화면 (로그인 / 회원가입) - 2단 와이어프레임 컴포넌트
 * ============================================================================ */
export function MainAuthScreen({ 
  onLoginSuccess, 
  onSwitchToSignup 
}: { 
  onLoginSuccess: (user: { email: string; nickname: string }) => void;
  onSwitchToSignup: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
      }
      onLoginSuccess({ email, nickname: nickname || email.split('@')[0] });
    } else {
      if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
      alert('회원가입이 완료되었습니다!');
      onLoginSuccess({ email, nickname: nickname || '맛있는야식꾼' });
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/60 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* 최상단 브랜드 로고 */}
      <header className="mb-8 text-center">
        <h1 className="font-serif text-5xl sm:text-6xl font-extrabold text-sky-600 tracking-tight">
          딜리버리픽
        </h1>
        <p className="font-serif text-sky-700 mt-2 text-base sm:text-lg">
          실패 없는 나만의 배달 맛집 수첩
        </p>
      </header>

      {/* 메인 2단 카드 영역 */}
      <main className="bg-white rounded-3xl shadow-xl border border-sky-100 overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2">
        
        {/* [좌측] 음식 일러스트 / 메인 이미지 영역 */}
        <section className="bg-gradient-to-br from-sky-100/70 via-sky-50 to-white p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sky-100">
          <DeliveryPickLogo />
          <div className="text-center mt-4">
            <p className="font-serif text-lg font-bold text-slate-700 leading-snug">
              맛있는 음식은 삶의 질을 높입니다.
            </p>
            <p className="font-serif text-sm text-slate-500 mt-1">
              당신만의 맛집을 기록하고 공유하세요.
            </p>
          </div>
        </section>

        {/* [우측] 로그인 / 회원가입 폼 영역 */}
        <section className="p-8 sm:p-10 flex flex-col justify-center bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 이메일 입력 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                required
                placeholder="example@delivery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400 text-sm"
              />
            </div>

            {/* 회원가입 모드일 때만 닉네임 필드 노출 */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  닉네임
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 맛있는야식꾼"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400 text-sm"
                />
              </div>
            )}

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 text-sm"
              />
            </div>

            {/* 회원가입 모드일 때만 비밀번호 확인 필드 노출 */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 text-sm"
                />
              </div>
            )}

            {/* [로그인] / [회원가입] 버튼 트윈 배치 */}
            <div className="pt-4 grid grid-cols-2 gap-3">
              <button
                type={mode === 'login' ? 'submit' : 'button'}
                onClick={() => setMode('login')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition shadow-sm ${
                  mode === 'login'
                    ? 'bg-sky-500 hover:bg-sky-600 text-white ring-2 ring-sky-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                로그인
              </button>

              <button
                type={mode === 'signup' ? 'submit' : 'button'}
                onClick={() => {
                  if (mode === 'signup') {
                    // submit 처리
                  } else {
                    onSwitchToSignup();
                  }
                }}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition shadow-sm ${
                  mode === 'signup'
                    ? 'bg-sky-500 hover:bg-sky-600 text-white ring-2 ring-sky-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                회원가입
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

/* ============================================================================
 * 3. 회원가입 전용 페이지 React (Next.js) 컴포넌트
 * ============================================================================ */
export function SignUpPage({ 
  onSignUpSuccess, 
  onGoToLogin 
}: { 
  onSignUpSuccess: (user: { email: string; nickname: string }) => void;
  onGoToLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      return;
    }

    if (!agreed) {
      alert('개인정보 처리방침 동의가 필요합니다.');
      return;
    }

    setLoading(true);

    try {
      /* Supabase 연동 시:
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });
      */
      alert('회원가입이 완료되었습니다!');
      onSignUpSuccess({ email, nickname: nickname || '야식 마스터' });
    } catch (error: any) {
      alert(error.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/70 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 sm:p-10 w-full max-w-md my-auto">
        
        {/* 헤더 영역 */}
        <header className="text-center mb-8">
          <h1 className="font-serif text-3xl font-extrabold text-sky-600 tracking-tight">
            회원가입 <span className="text-xl text-sky-400 font-normal">(Sign Up)</span>
          </h1>
          <p className="font-serif text-sm text-slate-600 mt-2 font-medium">
            🍽️ DeliveryPick에 오신 것을 환영합니다!
          </p>
        </header>

        {/* 회원가입 폼 */}
        <form onSubmit={handleSignUp} className="space-y-5">
          
          {/* 1. 이메일 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* 2. 닉네임 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              닉네임
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="사용하실 닉네임을 입력하세요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* 3. 비밀번호 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800"
            />
          </div>

          {/* 4. 비밀번호 확인 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              비밀번호 확인
            </label>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="********"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800"
            />
          </div>

          {/* 5. 개인정보 처리방침 동의 체크박스 */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="privacy-policy"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-400 cursor-pointer"
            />
            <label htmlFor="privacy-policy" className="text-xs text-slate-600 cursor-pointer select-none">
              개인정보 처리방침에 동의합니다.
            </label>
          </div>

          {/* 회원가입 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold rounded-xl transition shadow-md shadow-sky-100 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? '가입 처리 중...' : '회원가입'}
          </button>

          {/* 하단 로그인 이동 링크 */}
          <div className="text-center pt-3 text-xs text-slate-500">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="font-bold text-sky-600 hover:text-sky-700 underline underline-offset-4 ml-1"
            >
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. 메인 딜리버리픽 서비스 앱 (목록 / 상세 / 등록 / 수정 통합 구현)
 * ============================================================================ */
export default function DeliveryPickApp() {
  // 인증 및 뷰 상태 관리
  const [user, setUser] = useState<{ email: string; nickname: string } | null>({
    email: 'user@example.com',
    nickname: '맛있는야식꾼'
  });
  const [view, setView] = useState<'main_auth' | 'signup' | 'list' | 'detail' | 'create' | 'edit'>('list');

  // 검색 및 카테고리 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // 샘플 데이터
  const [items, setItems] = useState([
    {
      id: '1',
      name: 'BBQ 치킨 강남점',
      category: '치킨',
      app_name: '배달의민족',
      min_order: 15000,
      rating: 5,
      memo: '황금올리브 추천! 양념소스 추가 필수. 배달이 매우 빠름.',
    },
    {
      id: '2',
      name: '마산 아구찜',
      category: '한식',
      app_name: '쿠팡이츠',
      min_order: 25000,
      rating: 4,
      memo: '매운맛 2단계 추천. 볶음밥용 양념 남겨두기.',
    },
  ]);

  const [selectedItem, setSelectedItem] = useState(items[0]);

  // 등록 및 수정 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    category: '치킨',
    app_name: '배달의민족',
    min_order: 15000,
    rating: 5,
    memo: '',
  });

  // 맛집 신규 등록 핸들러
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('식당명을 입력해 주세요.');
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      ...formData,
      min_order: Number(formData.min_order),
    };
    setItems([newItem, ...items]);
    setSelectedItem(newItem);
    setView('detail');
    alert('새 맛집이 등록되었습니다!');
  };

  // 맛집 정보 수정 핸들러
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const updatedItems = items.map((item) =>
      item.id === selectedItem.id
        ? { ...item, ...formData, min_order: Number(formData.min_order) }
        : item
    );
    setItems(updatedItems);
    const updatedItem = { ...selectedItem, ...formData, min_order: Number(formData.min_order) };
    setSelectedItem(updatedItem);
    setView('detail');
    alert('맛집 정보가 수정되었습니다.');
  };

  // 맛집 삭제 핸들러
  const handleDelete = (id: string) => {
    if (confirm('정말로 이 맛집을 삭제하시겠습니까?')) {
      const filtered = items.filter((item) => item.id !== id);
      setItems(filtered);
      setView('list');
      alert('삭제되었습니다.');
    }
  };

  // 검색 및 카테고리 필터링된 항목 목록
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.memo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 로그아웃 상태일 때 Auth 화면 노출
  if (!user && view === 'signup') {
    return (
      <SignUpPage
        onSignUpSuccess={(newUser) => {
          setUser(newUser);
          setView('list');
        }}
        onGoToLogin={() => setView('main_auth')}
      />
    );
  }

  if (!user || view === 'main_auth') {
    return (
      <MainAuthScreen
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setView('list');
        }}
        onSwitchToSignup={() => setView('signup')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
      {/* GNB (상단 헤더) */}
      <header className="bg-sky-100/80 backdrop-blur-md border-b border-sky-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 
            className="text-2xl font-bold text-sky-900 tracking-wide cursor-pointer flex items-center gap-2"
            onClick={() => setView('list')}
          >
            <span>🛵</span> 딜리버리픽
          </h1>
          
          <div className="flex items-center gap-3">
            {/* 로그인 유저 프로필 표시 */}
            <span className="text-xs font-sans text-sky-800 bg-sky-200/60 px-3 py-1.5 rounded-full font-medium hidden sm:inline-block">
              👤 {user.nickname}님의 배달노트
            </span>

            {view === 'list' && (
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    category: '치킨',
                    app_name: '배달의민족',
                    min_order: 15000,
                    rating: 5,
                    memo: '',
                  });
                  setView('create');
                }}
                className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-sans transition shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 맛집 등록
              </button>
            )}

            <button
              onClick={() => {
                setUser(null);
                setView('main_auth');
              }}
              title="로그아웃"
              className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-200/50 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-4xl mx-auto p-6">
        
        {/* ====================================================================
         * 1. [목록 화면] - 검색, 필터, 카드 리스트
         * ==================================================================== */}
        {view === 'list' && (
          <div className="space-y-6">
            {/* 검색창 및 카테고리 필터 */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-sky-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-sky-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="식당명 또는 메뉴 검색..."
                  className="w-full pl-10 pr-4 py-2.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 font-sans text-sm"
                />
              </div>
              <div className="flex gap-2 text-xs font-sans overflow-x-auto pb-1">
                {['전체', '치킨', '한식', '피자', '중식', '일식', '야식'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-sky-500 text-white font-medium shadow-sm'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 카드 목록 */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-sky-100 text-slate-500 font-sans text-sm">
                등록된 맛집이 없습니다. 새 맛집을 등록해 보세요!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setView('detail');
                    }}
                    className="bg-white p-5 rounded-2xl border border-sky-100 hover:border-sky-300 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-sans px-2.5 py-1 bg-sky-100 text-sky-800 rounded-md font-medium">
                          {item.category}
                        </span>
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < item.rating ? 'fill-current' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-sans line-clamp-1 mb-3">
                        {item.memo}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-sans text-slate-600">
                      <span>앱: <strong className="text-sky-700">{item.app_name}</strong></span>
                      <span>최소주문: <strong className="text-slate-800">{item.min_order.toLocaleString()}원</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * 2. [상세 화면] - 맛집 정보, 한줄평, 수정/삭제 액션
         * ==================================================================== */}
        {view === 'detail' && selectedItem && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 max-w-xl mx-auto space-y-6">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
            </button>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-sans px-2.5 py-1 bg-sky-100 text-sky-800 rounded-md font-medium">
                  {selectedItem.category}
                </span>
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < selectedItem.rating ? 'fill-current' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{selectedItem.name}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-sky-50/50 p-4 rounded-xl text-sm font-sans">
              <div>
                <span className="text-slate-500 text-xs block">주요 배달앱</span>
                <span className="font-semibold text-sky-900">{selectedItem.app_name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">최소주문금액</span>
                <span className="font-semibold text-slate-800">{selectedItem.min_order.toLocaleString()}원</span>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs text-slate-500 font-sans">추천 메뉴 및 한줄평</h4>
              <p className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed text-sm">
                {selectedItem.memo}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 font-sans">
              <button 
                onClick={() => {
                  setFormData({
                    name: selectedItem.name,
                    category: selectedItem.category,
                    app_name: selectedItem.app_name,
                    min_order: selectedItem.min_order,
                    rating: selectedItem.rating,
                    memo: selectedItem.memo,
                  });
                  setView('edit');
                }}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-sky-200 text-sky-700 rounded-xl hover:bg-sky-50 text-sm transition font-medium"
              >
                <Edit3 className="w-4 h-4" /> 수정
              </button>
              <button 
                onClick={() => handleDelete(selectedItem.id)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 text-sm transition font-medium"
              >
                <Trash2 className="w-4 h-4" /> 삭제
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
         * 3. [등록 화면] - 새 맛집 등록 폼
         * ==================================================================== */}
        {view === 'create' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 max-w-xl mx-auto space-y-6">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
            </button>

            <h2 className="text-xl font-bold text-slate-800">새 맛집 등록</h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-sans text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">식당명 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: BBQ 치킨 강남점"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    <option>치킨</option>
                    <option>한식</option>
                    <option>피자</option>
                    <option>중식</option>
                    <option>일식</option>
                    <option>야식</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">주요 이용 배달앱</label>
                  <select
                    value={formData.app_name}
                    onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    <option>배달의민족</option>
                    <option>쿠팡이츠</option>
                    <option>요기요</option>
                    <option>기타</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">최소주문금액 (원)</label>
                <input
                  type="number"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: Number(e.target.value) })}
                  placeholder="15000"
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">평점 (1~5점)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1 text-amber-400 hover:scale-110 transition"
                    >
                      <Star className={`w-6 h-6 ${star <= formData.rating ? 'fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">추천 메뉴 및 한줄평</label>
                <textarea
                  rows={3}
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="추천하는 메뉴나 팁을 자유롭게 적어주세요."
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none font-serif"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-sm mt-2"
              >
                <Check className="w-4 h-4" /> 맛집 저장하기
              </button>
            </form>
          </div>
        )}

        {/* ====================================================================
         * 4. [수정 화면] - 맛집 정보 수정 폼
         * ==================================================================== */}
        {view === 'edit' && selectedItem && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 max-w-xl mx-auto space-y-6">
            <button
              onClick={() => setView('detail')}
              className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> 취소하고 돌아가기
            </button>

            <h2 className="text-xl font-bold text-slate-800">맛집 정보 수정</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 font-sans text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">식당명 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    <option>치킨</option>
                    <option>한식</option>
                    <option>피자</option>
                    <option>중식</option>
                    <option>일식</option>
                    <option>야식</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">주요 이용 배달앱</label>
                  <select
                    value={formData.app_name}
                    onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    <option>배달의민족</option>
                    <option>쿠팡이츠</option>
                    <option>요기요</option>
                    <option>기타</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">최소주문금액 (원)</label>
                <input
                  type="number"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">평점 (1~5점)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1 text-amber-400 hover:scale-110 transition"
                    >
                      <Star className={`w-6 h-6 ${star <= formData.rating ? 'fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">추천 메뉴 및 한줄평</label>
                <textarea
                  rows={3}
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none font-serif"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-sm mt-2"
              >
                <Check className="w-4 h-4" /> 수정 내용 저장하기
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
