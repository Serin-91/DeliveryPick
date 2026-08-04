'use client'

import { useState, useEffect } from 'react'

interface Dice3DProps {
  rolling: boolean
  onRollComplete?: (targetNumber: number) => void
  targetNumber?: number
}

// 1~6 주사위 눈의 좌표 (회전 도수)
const DICE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: -180 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 },
}

export default function Dice3D({ rolling, onRollComplete, targetNumber = 1 }: Dice3DProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    if (rolling) {
      // 3D 팽팽 가속 회전 (3~4 바퀴 회전)
      const baseRot = DICE_ROTATIONS[targetNumber] || { x: 0, y: 0 }
      const extraX = 360 * 3 + baseRot.x
      const extraY = 360 * 3 + baseRot.y
      setRotation({ x: extraX, y: extraY, z: 15 })

      const timer = setTimeout(() => {
        if (onRollComplete) onRollComplete(targetNumber)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [rolling, targetNumber, onRollComplete])

  return (
    <div className="dice-scene">
      <div
        className="dice-cube"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
        }}
      >
        {/* Face 1 */}
        <div className="dice-face face-1">
          <div className="dice-dot col-start-2 row-start-2" />
        </div>
        {/* Face 2 */}
        <div className="dice-face face-2">
          <div className="dice-dot col-start-1 row-start-1" />
          <div className="dice-dot col-start-3 row-start-3" />
        </div>
        {/* Face 3 */}
        <div className="dice-face face-3">
          <div className="dice-dot col-start-1 row-start-1" />
          <div className="dice-dot col-start-2 row-start-2" />
          <div className="dice-dot col-start-3 row-start-3" />
        </div>
        {/* Face 4 */}
        <div className="dice-face face-4">
          <div className="dice-dot col-start-1 row-start-1" />
          <div className="dice-dot col-start-3 row-start-1" />
          <div className="dice-dot col-start-1 row-start-3" />
          <div className="dice-dot col-start-3 row-start-3" />
        </div>
        {/* Face 5 */}
        <div className="dice-face face-5">
          <div className="dice-dot col-start-1 row-start-1" />
          <div className="dice-dot col-start-3 row-start-1" />
          <div className="dice-dot col-start-2 row-start-2" />
          <div className="dice-dot col-start-1 row-start-3" />
          <div className="dice-dot col-start-3 row-start-3" />
        </div>
        {/* Face 6 */}
        <div className="dice-face face-6">
          <div className="dice-dot col-start-1 row-start-1" />
          <div className="dice-dot col-start-3 row-start-1" />
          <div className="dice-dot col-start-1 row-start-2" />
          <div className="dice-dot col-start-3 row-start-2" />
          <div className="dice-dot col-start-1 row-start-3" />
          <div className="dice-dot col-start-3 row-start-3" />
        </div>
      </div>
    </div>
  )
}
