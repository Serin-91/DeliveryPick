'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, FileText, Camera, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Heart } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import DeliveryDetailModal from '@/components/DeliveryDetailModal'
import { getDeliveryImageUrl, removeDeliveryImage } from '@/lib/deliveryImage'
import type { Delivery } from '@/lib/types'
import { normalizeDelivery, DELIVERY_SELECT_WITH_MENUS, getReviewGrade } from '@/lib/types'
import { getUserAvatarUrl } from '@/lib/userAvatar'

function MyPageContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'my_reviews' | 'profile' | 'bookmarks'>('profile')
  const [myReviews, setMyReviews] = useState<Delivery[]>([])
  const [bookmarkedItems, setBookmarkedItems] = useState<Delivery[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)

  // 프로필 편집 상태
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingNickname, setSavingNickname] = useState(false)

  // 14일 닉네임 변경 제한 관련
  const [lastNicknameChange, setLastNicknameChange] = useState<string | null>(null)

  // #9: 닉네임 중복확인 상태
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameSuccess, setNicknameSuccess] = useState('')
  const [checkingNickname, setCheckingNickname] = useState(false)
  const [isNicknameVerified, setIsNicknameVerified] = useState(false)
  const [originalNickname, setOriginalNickname] = useState('')

  // #10: 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  // 모달 상태
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'my_reviews') setActiveTab('my_reviews')
    else if (tab === 'bookmarks') setActiveTab('bookmarks')
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      const nick = user.user_metadata?.nickname || user.email?.split('@')[0] || ''
      const currentAvatar = getUserAvatarUrl(user)
      setNickname(nick)
      setOriginalNickname(nick)
      setAvatarUrl(currentAvatar)
      setLastNicknameChange(user.user_metadata?.last_nickname_change || null)
      supabase
        .from('deliveries')
        .update({ user_nickname: nick, user_avatar_url: currentAvatar })
        .eq('user_id', user.id)
        .then(() => undefined)
    }
  }, [user])

  // 데이터 로드 (내 리뷰)
  useEffect(() => {
    if (!user) return
    let active = true

    const fetchData = async () => {
      setLoadingData(true)

      const { data: rData } = await supabase
        .from('deliveries')
        .select(DELIVERY_SELECT_WITH_MENUS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (rData) {
        setMyReviews(rData.map(normalizeDelivery))
      }

      setLoadingData(false)
    }

    fetchData()
    return () => {
      active = false
    }
  }, [user])

  // 데이터 로드 (즐겨찾기)
  useEffect(() => {
    if (!user) return
    let active = true

    const fetchBookmarks = async () => {
      setLoadingBookmarks(true)

      const { data: bData, error: bookmarkError } = await supabase
        .from('bookmarks')
        .select(`delivery_id, deliveries (${DELIVERY_SELECT_WITH_MENUS})`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (bookmarkError) {
        console.error('즐겨찾기 목록 조회 실패:', bookmarkError.message)
      }

      if (bData) {
        const list = bData
          .map((b: any) => b.deliveries)
          .filter(Boolean)
          .map(normalizeDelivery)
        setBookmarkedItems(list)
      }

      setLoadingBookmarks(false)
    }

    fetchBookmarks()
    return () => {
      active = false
    }
  }, [user])

  // 즐겨찾기 해제
  const handleRemoveBookmark = async (deliveryId: string) => {
    if (!user) return
    const removedItem = bookmarkedItems.find((item) => item.id === deliveryId)
    setBookmarkedItems((prev) => prev.filter((item) => item.id !== deliveryId))
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('delivery_id', deliveryId)
    if (error) {
      if (removedItem) setBookmarkedItems((prev) => [removedItem, ...prev])
      alert(`즐겨찾기 해제에 실패했습니다: ${error.message}`)
    } else {
      alert('즐겨찾기에서 해제되었습니다.')
    }
  }

  const openDeliveryDetail = (delivery: Delivery) => {
    setSelectedDelivery(delivery)
    setDetailModalOpen(true)
  }

  // #11: 프로필 사진 카메라 업로드 (Supabase Storage 'avatars' 버킷) + Bucket 에러 메시지 개선
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      alert('프로필 사진은 최대 5MB까지 업로드 가능합니다.')
      return
    }

    setUploadingAvatar(true)
    try {
      // 이전 아바타 파일 목록을 먼저 확보해 두고, 새 업로드가 끝나면 정리한다 (Storage 고아 파일 방지)
      const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id)
      const previousPaths = (existingFiles || []).map((f) => `${user.id}/${f.name}`)

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const publicUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl

      // Supabase Auth metadata 업데이트
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })
      if (updateErr) throw updateErr

      const { error: reviewAvatarError } = await supabase
        .from('deliveries')
        .update({ user_avatar_url: publicUrl })
        .eq('user_id', user.id)
      if (reviewAvatarError) throw reviewAvatarError

      if (previousPaths.length > 0) {
        await supabase.storage.from('avatars').remove(previousPaths).catch(() => undefined)
      }

      setAvatarUrl(publicUrl)
      alert('🖼️ 프로필 사진이 성공적으로 수정되었습니다!')
    } catch (err: any) {
      const msg = err.message || ''
      if (/bucket.*not found/i.test(msg) || msg.includes('Bucket not found')) {
        alert(
          '⚠️ Supabase Storage에 "avatars" 버킷이 생성되지 않았습니다.\n\n' +
          '📋 해결 방법:\n' +
          '1. Supabase 대시보드 접속\n' +
          '2. Storage 메뉴 클릭\n' +
          '3. "New Bucket" 클릭\n' +
          '4. 이름: avatars / Public: ON 으로 생성\n\n' +
          '버킷 생성 후 다시 시도해 주세요.'
        )
      } else {
        alert('프로필 사진 업로드에 실패했습니다: ' + msg)
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  // 14일 닉네임 변경 제한 계산
  const canChangeNickname = () => {
    if (!lastNicknameChange) return true
    const lastDate = new Date(lastNicknameChange).getTime()
    const now = new Date().getTime()
    const diffDays = (now - lastDate) / (1000 * 3600 * 24)
    return diffDays >= 14
  }

  // #9: 닉네임 중복 체크 함수
  const checkNickname = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setNicknameError('닉네임을 입력해 주세요.')
      return
    }

    // 기존 닉네임과 동일하면 중복체크 불필요
    if (trimmed === originalNickname) {
      setNicknameSuccess('현재 사용 중인 닉네임입니다.')
      setIsNicknameVerified(true)
      return
    }

    setCheckingNickname(true)
    setNicknameError('')
    setNicknameSuccess('')

    try {
      // 1. Supabase RPC check_nickname_exists 호출 시도
      const { data: isDuplicate, error: rpcError } = await supabase.rpc('check_nickname_exists', {
        input_nickname: trimmed,
      })

      if (!rpcError && typeof isDuplicate === 'boolean') {
        if (isDuplicate) {
          setNicknameError('이미 사용 중인 닉네임입니다.')
          setIsNicknameVerified(false)
        } else {
          setNicknameSuccess('사용 가능한 닉네임입니다.')
          setIsNicknameVerified(true)
        }
        setCheckingNickname(false)
        return
      }

      // 2. RPC 미등록 시 deliveries 테이블 작성자 닉네임 fallback 체크
      const { data: existingDeliveries } = await supabase
        .from('deliveries')
        .select('id')
        .ilike('user_nickname', trimmed)
        .limit(1)

      if (existingDeliveries && existingDeliveries.length > 0) {
        setNicknameError('이미 사용 중인 닉네임입니다.')
        setIsNicknameVerified(false)
      } else {
        setNicknameSuccess('사용 가능한 닉네임입니다.')
        setIsNicknameVerified(true)
      }
    } catch {
      // RPC 예외 시에도 fallback 중복 체크는 그대로 수행한다 (fail-open 방지)
      const { data: existingDeliveries } = await supabase
        .from('deliveries')
        .select('id')
        .ilike('user_nickname', trimmed)
        .limit(1)

      if (existingDeliveries && existingDeliveries.length > 0) {
        setNicknameError('이미 사용 중인 닉네임입니다.')
        setIsNicknameVerified(false)
      } else {
        setNicknameSuccess('사용 가능한 닉네임입니다.')
        setIsNicknameVerified(true)
      }
    } finally {
      setCheckingNickname(false)
    }
  }

  // 닉네임 저장
  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!canChangeNickname()) {
      alert('닉네임은 14일에 1회만 변경할 수 있습니다.')
      return
    }

    const trimmed = nickname.trim()
    if (!trimmed) {
      alert('닉네임을 입력해 주세요.')
      return
    }

    // 닉네임이 변경되었는데 중복확인을 안 했으면 차단
    if (trimmed !== originalNickname && !isNicknameVerified) {
      alert('닉네임 중복 확인을 먼저 진행해 주세요.')
      return
    }

    setSavingNickname(true)
    try {
      // profiles 테이블의 닉네임 고유 제약을 먼저 통과시켜야 auth/deliveries가 서로 어긋나지 않는다.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname: trimmed }, { onConflict: 'user_id' })

      if (profileError) {
        if (profileError.code === '23505') {
          setNicknameError('이미 사용 중인 닉네임입니다.')
          setIsNicknameVerified(false)
          alert('이미 사용 중인 닉네임입니다.')
        } else {
          alert('닉네임 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        }
        return
      }

      const nowIso = new Date().toISOString()
      const { error } = await supabase.auth.updateUser({
        data: {
          nickname: trimmed,
          last_nickname_change: nowIso,
        },
      })

      if (error) throw error
      await supabase
        .from('deliveries')
        .update({ user_nickname: trimmed })
        .eq('user_id', user.id)
      setLastNicknameChange(nowIso)
      setOriginalNickname(trimmed)
      alert('닉네임이 성공적으로 변경되었습니다!')
    } catch (err: any) {
      alert(err.message || '닉네임 변경에 실패했습니다.')
    } finally {
      setSavingNickname(false)
    }
  }

  // #10: 비밀번호 변경 처리
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) return

    setPasswordError('')

    if (!currentPassword) {
      setPasswordError('현재 비밀번호를 입력해 주세요.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('새 비밀번호가 기존 비밀번호와 동일합니다.')
      return
    }

    setChangingPassword(true)
    try {
      // 1. 현재 비밀번호 검증 (재로그인)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError('현재 비밀번호가 올바르지 않습니다.')
        setChangingPassword(false)
        return
      }

      // 2. 새 비밀번호로 변경
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      alert('🔒 비밀번호가 성공적으로 변경되었습니다!')
    } catch (err: any) {
      setPasswordError(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setChangingPassword(false)
    }
  }

  // 내가 쓴 리뷰 삭제
  const handleDeleteMyReview = async (id: string) => {
    const target = myReviews.find((item) => item.id === id)

    // root 게시물이면 다른 사용자 리뷰도 DB CASCADE로 함께 삭제되므로 미리 개수를 확인해 경고한다
    let confirmMessage = '정말 이 맛집 리뷰를 삭제하시겠습니까?'
    if (target && !target.root_delivery_id) {
      const { count } = await supabase
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('root_delivery_id', id)
      if (count && count > 0) {
        confirmMessage = `이 맛집을 삭제하면 다른 사용자가 남긴 리뷰 ${count}건도 함께 영구 삭제됩니다.\n정말로 삭제하시겠습니까?`
      }
    }
    if (!confirm(confirmMessage)) return
    const { error } = await supabase.from('deliveries').delete().eq('id', id)
    if (error) {
      alert('삭제 처리 실패했습니다.')
    } else {
      if (target?.image_path) {
        await removeDeliveryImage(target.image_path).catch(() => undefined)
      }
      setMyReviews((prev) => prev.filter((item) => item.id !== id))
      alert('삭제가 완료되었습니다.')
    }
  }

  if (authLoading || !user) {
    return <div className="p-20 text-center text-slate-400 font-serif">사용자 확인 중...</div>
  }

  const newPasswordsMatch = newPasswordConfirm.length > 0 && newPassword === newPasswordConfirm
  const newPasswordsMismatch = newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm
  const reviewGrade = getReviewGrade(myReviews)
  const photoReviewCount = myReviews.filter((review) => Boolean(review.image_path)).length
  const receiptReviewCount = myReviews.filter((review) => Boolean(review.is_verified)).length
  const generalReviewCount = myReviews.filter((review) => !review.image_path && !review.is_verified).length
  const isBookmarksView = activeTab === 'bookmarks'
  const isPasswordAccount = !user.app_metadata?.provider || user.app_metadata.provider === 'email'

  return (
    <div className="min-h-screen flex flex-col font-serif bg-gradient-to-b from-sky-50 to-slate-50">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* 즐겨찾기는 프로필/리뷰와 분리된 전용 화면으로 보여준다. */}
        {!isBookmarksView && <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-center gap-6">
          {/* 프로필 아바타 카메라 업로드 */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-blue-50 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="프로필" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-blue-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md transition-all">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {user.user_metadata?.nickname || 'DeliveryPick 회원'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>

            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">
                📝 내가 쓴 리뷰 {myReviews.length}개 · {reviewGrade.emoji} {reviewGrade.label}
              </span>
              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-sm font-semibold">
                일반 {generalReviewCount}개 · 포토 {photoReviewCount}개 · 영수증 {receiptReviewCount}개
              </span>
            </div>
          </div>
        </div>}

        {!isBookmarksView && <div className="flex border-b border-slate-200 mb-6 gap-6 text-sm font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="w-4 h-4" />
            <span>내 정보 수정</span>
          </button>

          <button
            onClick={() => setActiveTab('my_reviews')}
            className={`pb-3 transition-all flex items-center gap-1.5 ${
              activeTab === 'my_reviews'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📝 작성한 리뷰 ({myReviews.length})</span>
          </button>

        </div>}

        {/* 탭 1: 프로필, 닉네임, 비밀번호 변경 */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* 닉네임 변경 섹션 */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900">👤 닉네임 설정</h2>

              <form onSubmit={handleSaveNickname} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    닉네임 (14일에 1회 변경 가능)
                  </label>
                  {/* #9: 닉네임 + 중복확인 버튼 */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => {
                          setNickname(e.target.value)
                          setNicknameError('')
                          setNicknameSuccess('')
                          setIsNicknameVerified(false)
                        }}
                        disabled={!canChangeNickname()}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="닉네임 입력"
                      />
                      {!canChangeNickname() && (
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={checkNickname}
                      disabled={checkingNickname || !nickname.trim() || !canChangeNickname()}
                      className="px-4 py-3 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 text-sm font-bold rounded-xl whitespace-nowrap transition disabled:opacity-50"
                    >
                      {checkingNickname ? '확인 중...' : '중복 확인'}
                    </button>
                  </div>

                  {nicknameError && (
                    <p className="flex items-center gap-1 text-sm text-rose-500 font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {nicknameError}
                    </p>
                  )}
                  {nicknameSuccess && (
                    <p className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {nicknameSuccess}
                    </p>
                  )}

                  {!canChangeNickname() ? (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ 닉네임은 14일 경과 후 다시 변경할 수 있습니다.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                      💡 한 번 설정 후 14일간 변경이 제한됩니다.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingNickname || !canChangeNickname() || (nickname.trim() !== originalNickname && !isNicknameVerified)}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-50"
                >
                  {savingNickname ? '저장 중...' : '닉네임 변경 저장'}
                </button>
              </form>
            </div>

            {/* #10: 비밀번호 변경 섹션 */}
            {isPasswordAccount && <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900">🔒 비밀번호 변경</h2>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">현재 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="현재 비밀번호 입력"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500/30 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="8자 이상 입력해주세요"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500/30 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => {
                      setNewPasswordConfirm(e.target.value)
                      setPasswordError('')
                    }}
                    placeholder="새 비밀번호 재입력"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500/30"
                  />
                  {newPasswordsMatch && (
                    <p className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 비밀번호가 일치합니다.
                    </p>
                  )}
                  {newPasswordsMismatch && (
                    <p className="flex items-center gap-1 text-sm text-rose-500 font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> 비밀번호가 일치하지 않습니다.
                    </p>
                  )}
                </div>

                {passwordError && (
                  <p className="text-sm text-rose-500 font-medium">{passwordError}</p>
                )}

                <button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !newPasswordConfirm}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-all disabled:opacity-50"
                >
                  {changingPassword ? '변경 처리 중...' : '비밀번호 변경'}
                </button>
              </form>
            </div>}
          </div>
        )}

        {/* 탭 2: 내가 쓴 리뷰 모아보기 */}
        {activeTab === 'my_reviews' && (
          <div>
            {myReviews.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white/60 rounded-3xl p-8 border border-white">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">작성한 배달 맛집 리뷰가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openDeliveryDetail(item)}
                    className="p-5 rounded-2xl bg-white/90 border border-white shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-sm font-semibold">
                        {item.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{item.name}</h3>
                      {item.memo && (
                        <p className="text-sm text-slate-600 mt-1">💬 &quot;{item.memo}&quot;</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/delivery/${item.id}/edit`)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteMyReview(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-sm hover:bg-rose-100"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 3: 즐겨찾기 목록 */}
        {activeTab === 'bookmarks' && (
          <div>
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-slate-900">❤️ 즐겨찾기</h1>
              <p className="text-sm text-slate-500 mt-1">찜한 배달 맛집만 모아볼 수 있습니다.</p>
            </div>
            {loadingBookmarks ? (
              <div className="py-16 text-center text-slate-400">즐겨찾기 목록을 불러오는 중입니다...</div>
            ) : bookmarkedItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white/60 rounded-3xl p-8 border border-white">
                <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">즐겨찾기한 배달 맛집이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarkedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openDeliveryDetail(item)}
                    className="p-5 rounded-2xl bg-white/90 border border-white shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-sm font-semibold">
                        {item.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{item.name}</h3>
                      {item.memo && (
                        <p className="text-sm text-slate-600 mt-1">💬 &quot;{item.memo}&quot;</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveBookmark(item.id)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-sm hover:bg-rose-100 flex items-center gap-1"
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-500" />
                      <span>해제</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />

      <DeliveryDetailModal
        delivery={selectedDelivery}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onDeleted={(id) => {
          setMyReviews((prev) => prev.filter((item) => item.id !== id))
          setBookmarkedItems((prev) => prev.filter((item) => item.id !== id))
        }}
      />
    </div>
  )
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-400 font-serif">마이페이지 로딩 중...</div>}>
      <MyPageContent />
    </Suspense>
  )
}
