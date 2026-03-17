'use client'

import { useParams } from 'next/navigation'
import { YjsProviderComponent } from '@/collaboration/YjsProvider'
import BoardContent from './BoardContent'
import RoomGate from './RoomGate'

export default function BoardPage() {
  const params = useParams()
  const roomId = params.roomId as string

  return (
    <RoomGate roomId={roomId}>
      <YjsProviderComponent roomId={roomId}>
        <BoardContent roomId={roomId} />
      </YjsProviderComponent>
    </RoomGate>
  )
}
