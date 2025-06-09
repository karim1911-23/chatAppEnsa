import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import socket from '../../lib/socket';
import { CALL_NOTIFICATION_SOUND } from '../../utils/constants';

interface CallComponentProps {
  userId: string;
  targetUserId: string;
  isVideo: boolean;
  onEndCall: () => void;
  callerName?: string;
  callerImage?: string;
}

const CallComponent: React.FC<CallComponentProps> = ({ 
  userId, 
  targetUserId, 
  isVideo, 
  onEndCall,
  callerName,
  callerImage 
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerInfo, setCallerInfo] = useState<{name: string, image: string} | null>(null);
  const [callerSignal, setCallerSignal] = useState<any>();
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  
  const userVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance>();
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize notification sound
    notificationSound.current = new Audio(CALL_NOTIFICATION_SOUND);
    
    // First, make sure we join the socket room with our userId
    socket.emit('join', userId);
    
    navigator.mediaDevices.getUserMedia({ 
      video: isVideo, 
      audio: true 
    })
    .then((stream) => {
      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    })
    .catch(err => {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone");
      onEndCall();
    });

    // Listen for incoming calls
    socket.on('incoming-call', (data) => {
      console.log('Received incoming call from:', data.from);
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
      setCallStatus('ringing');
    });

    // Listen for call answers
    socket.on('call-answered', (data) => {
      if (connectionRef.current) {
        connectionRef.current.signal(data.signal);
        setCallAccepted(true);
        setCallStatus('connected');
      }
    });

    // Listen for call rejections
    socket.on('call-rejected', () => {
      alert('Call was rejected');
      endCall();
    });

    // Listen for call ends
    socket.on('call-ended', () => {
      endCall();
    });

    return () => {
      stream?.getTracks().forEach(track => track.stop());
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('call-rejected');
      socket.off('call-ended');
    };
  }, [isVideo, userId]);

  const callUser = () => {
    setCallStatus('calling');
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream!
    });

    peer.on('signal', (data) => {
      console.log('Calling user:', targetUserId);
      socket.emit('call-user', {
        to: targetUserId,
        signal: data,
        from: userId,
        type: isVideo ? 'video' : 'audio',
        callerName: callerName,
        callerImage: callerImage
      });
    });

    peer.on('stream', (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    setCallStatus('connected');
    
    // Stop notification sound when call is answered
    if (notificationSound.current) {
      notificationSound.current.pause();
      notificationSound.current.currentTime = 0;
    }
    
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream!
    });

    peer.on('signal', (data) => {
      socket.emit('answer-call', { 
        signal: data, 
        to: caller 
      });
    });

    peer.on('stream', (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const rejectCall = () => {
    // Stop notification sound when call is rejected
    if (notificationSound.current) {
      notificationSound.current.pause();
      notificationSound.current.currentTime = 0;
    }
    
    socket.emit('reject-call', { to: caller });
    setReceivingCall(false);
    setCallStatus('idle');
    onEndCall();
  };

  const endCall = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    stream?.getTracks().forEach(track => track.stop());
    socket.emit('end-call', { to: targetUserId });
    setCallAccepted(false);
    setReceivingCall(false);
    setCallStatus('idle');
    onEndCall();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 p-4 rounded-lg">
        {/* Call status indicator */}
        {callStatus === 'calling' && (
          <div className="mb-4 text-center">
            <p className="text-lg">Calling...</p>
          </div>
        )}
        
        {/* Incoming call UI */}
        {receivingCall && !callAccepted && (
          <div className="mb-4 text-center">
            <h2 className="text-xl mb-2">Incoming {isVideo ? 'Video' : 'Voice'} Call</h2>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={answerCall} 
                className="bg-green-500 px-4 py-2 rounded"
              >
                Accept
              </button>
              <button 
                onClick={rejectCall} 
                className="bg-red-500 px-4 py-2 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {stream && (
            <div className="relative">
              <video
                playsInline
                muted
                ref={userVideo}
                autoPlay
                className="w-full md:w-64 h-48 bg-black rounded-lg"
              />
              <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                You
              </span>
            </div>
          )}
          {callAccepted && (
            <div className="relative">
              <video
                playsInline
                ref={partnerVideo}
                autoPlay
                className="w-full md:w-64 h-48 bg-black rounded-lg"
              />
              <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                {callerInfo?.name || 'Caller'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex justify-center gap-4 mt-6">
          {!callAccepted && !receivingCall && callStatus === 'idle' && (
            <button
              onClick={callUser}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isVideo ? 'Start Video Call' : 'Start Voice Call'}
            </button>
          )}
          <button
            onClick={endCall}
            className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallComponent;