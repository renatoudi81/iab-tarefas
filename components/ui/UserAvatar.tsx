import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/types'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: {
    nome?: string
    name?: string
    avatar_color?: string
    avatar_url?: string | null
  } | null | undefined
  size?: number
  textSize?: string
  className?: string
}

/**
 * Avatar do usuário. Mostra a foto (`avatar_url`) se existir; caso contrário,
 * mostra as iniciais sobre o `avatar_color`.
 */
export function UserAvatar({ user, size = 32, textSize, className }: UserAvatarProps) {
  if (!user) {
    return (
      <Avatar style={{ width: size, height: size }} className={cn('flex-shrink-0', className)}>
        <AvatarFallback className="bg-[#E4E4E7] text-[#A1A1AA]">?</AvatarFallback>
      </Avatar>
    )
  }

  const displayName = user.nome || user.name || ''
  const color = user.avatar_color || '#6366f1'
  const initials = getInitials(displayName)
  const fallbackTextSize = textSize || (size < 24 ? 'text-[8px]' : size < 32 ? 'text-[10px]' : 'text-xs')

  return (
    <Avatar style={{ width: size, height: size }} className={cn('flex-shrink-0', className)}>
      {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={displayName} /> : null}
      <AvatarFallback
        className={cn('font-semibold text-white', fallbackTextSize)}
        style={{ background: color }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
