'use client';

import { useLongPress } from '@/hooks/longPress';
import { Check, X, Trash2 } from 'lucide-react';

interface PlayerCardProps {
  player: any;
  onLongPress: (player: any) => void;
  onApprove?: (player: any) => void;
  onReject?: (player: any) => void;
  onDelete?: (player: any) => void;
  showActions?: boolean;
  actionType?: 'pending' | 'approved' | 'rejected';
  isProcessing?: boolean;
}

export default function PlayerCard({
  player,
  onLongPress,
  onApprove,
  onReject,
  onDelete,
  showActions = true,
  actionType = 'pending',
  isProcessing = false,
  children,
}: React.PropsWithChildren<PlayerCardProps>) {
  const longPressProps = useLongPress(() => onLongPress(player), 700);

  return (
    <div {...longPressProps} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">

    {/* Left side: Avatar + Info */}
    <div className="flex items-center gap-4">

      <img
        src={player.profile_url ||
        `data:image/svg+xml;utf8,
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
          <circle cx='50' cy='50' r='50' fill='%236b7280'/>
          <circle cx='50' cy='40' r='18' fill='white'/>
          <path d='M20 85c0-20 60-20 60 0' fill='white'/>
        </svg>`
        }
        alt={player.username}
        className="w-14 h-14 rounded-full object-cover border-2 border-gray-600"
      />

      {children}

    </div>
      
      {showActions && (
        <div className="flex space-x-2">
          {actionType === 'pending' && (
            <>
              <button
                onClick={() => onApprove && onApprove(player)}
                disabled={isProcessing}
                className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                title="Approve"
              >
                <Check size={20} />
              </button>
              <button
                onClick={() => onReject && onReject(player)}
                disabled={isProcessing}
                className="p-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                title="Reject"
              >
                <X size={20} />
              </button>
            </>
          )}

          {actionType === 'approved' && (
            <button
              onClick={() => onReject && onReject(player)}
              disabled={isProcessing}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
              title="Reject Player"
            >
              <X size={20} />
            </button>
          )}

          {actionType === 'rejected' && (
            <>
              <button
                onClick={() => onApprove && onApprove(player)}
                disabled={isProcessing}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                title="Approve Now"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => onDelete && onDelete(player)}
                disabled={isProcessing}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                title="Delete Player"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
