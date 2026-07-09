'use client';

import { useLongPress } from '@/hooks/longPress';
import { Check, X, Trash2, ArrowRightLeft } from 'lucide-react'; 
import { getPersonalityBorder } from '@/lib/personalityBorder';

interface PlayerCardProps {
  player: any;
  onLongPress: (player: any) => void;
  onApprove?: (player: any) => void;
  onReject?: (player: any) => void;
  onDelete?: (player: any) => void;
  onChangeRoom?: (player: any) => void; 
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
  onChangeRoom,
  showActions = true,
  actionType = 'pending',
  isProcessing = false,
  children,
}: React.PropsWithChildren<PlayerCardProps>) {
  const longPressProps = useLongPress(() => onLongPress(player), 1500);

  const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23FFFFFF'><path d='M222-255q63-44 125-67.5T480-346q71 0 133.5 23.5T739-255q44-54 62.5-109T820-480q0-145-97.5-242.5T480-820q-145 0-242.5 97.5T140-480q0 61 19 116t63 109Zm160.5-234.5Q343-529 343-587t39.5-97.5Q422-724 480-724t97.5 39.5Q617-645 617-587t-39.5 97.5Q538-450 480-450t-97.5-39.5ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm107.5-76Q640-172 691-212q-51-36-104-55t-107-19q-54 0-107 19t-104 55q51 40 103.5 56T480-140q55 0 107.5-16Zm-52-375.5Q557-553 557-587t-21.5-55.5Q514-664 480-664t-55.5 21.5Q403-621 403-587t21.5 55.5Q446-510 480-510t55.5-21.5ZM480-587Zm0 374Z'/></svg>`;

  return (
    <div {...longPressProps} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
      {/* Left side: Avatar + Info */}
      <div className="flex items-center gap-4 overflow-hidden">
        <img
          src={player.avatar_base64 || defaultAvatar}
          alt={player.username}
          onMouseEnter={() => audioEngine.playHover()}
          onClick={() => { audioEngine.playClick(); onLongPress(player); }} 
          className={`w-14 h-14 rounded-full m-1 object-cover border-2 cursor-pointer transition-transform hover:scale-105 ${getPersonalityBorder(player.personality)}`}
        />

        <div className="flex flex-col truncate">
          <span className="font-bold text-lg truncate">{player.username}</span>
          <span className="text-sm text-gray-300 truncate">
            {player.age ? `${player.age} yrs` : 'Age N/A'} • {player.personality || 'Unknown'}
          </span>
          {player.room_id && (
            <span className="text-xs text-gray-400 truncate">
              Room: {player.room_id.substring(0, 8)}
            </span>
          )}
        </div>
        {children}
      </div>
      
      {showActions && (
        <div className="flex space-x-2 pl-2">
          {actionType === 'pending' && (
            <>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); onApprove && onApprove(player); }}
                disabled={isProcessing}
                className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                title="Approve"
              >
                <Check size={20} />
              </button>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); onReject && onReject(player); }}
                disabled={isProcessing}
                className="p-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                title="Reject"
              >
                <X size={20} />
              </button>
            </>
          )}

          {actionType === 'approved' && (
            <>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); onChangeRoom && onChangeRoom(player); }}
                disabled={isProcessing}
                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors"
                title="Change Room"
              >
                <ArrowRightLeft size={20} />
              </button>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); onReject && onReject(player); }}
                disabled={isProcessing}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                title="Reject Player"
              >
                <X size={20} />
              </button>
            </>
          )}

          {actionType === 'rejected' && (
            <>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); onApprove && onApprove(player); }}
                disabled={isProcessing}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                title="Approve Now"
              >
                <Check size={18} />
              </button>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); onDelete && onDelete(player); }}
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
