import React, { useState } from 'react';
import { BsCameraVideo, BsTelephone } from 'react-icons/bs';
import CallComponent from '../../../components/Call/CallComponent';

interface ChatHeaderProps {
  channelId: string;
  userId: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ channelId, userId }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const startCall = (video: boolean) => {
    setIsVideoCall(video);
    setIsCallActive(true);
  };

  return (
    <div className="flex items-center justify-between p-2 border-b border-neutral-700">
      <div className="flex gap-4">
        <button
          onClick={() => startCall(true)}
          className="p-2 hover:bg-neutral-700 rounded"
        >
          <BsCameraVideo size={20} />
        </button>
        <button
          onClick={() => startCall(false)}
          className="p-2 hover:bg-neutral-700 rounded"
        >
          <BsTelephone size={20} />
        </button>
      </div>

      {isCallActive && (
        <CallComponent
          userId={userId}
          targetUserId={channelId}
          isVideo={isVideoCall}
          onEndCall={() => setIsCallActive(false)}
        />
      )}
    </div>
  );
};

export default ChatHeader;