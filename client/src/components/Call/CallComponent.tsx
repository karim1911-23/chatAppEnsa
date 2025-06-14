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
  const [videoEnabled, setVideoEnabled] = useState(isVideo);
  
  const userVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance>();
  const notificationSound = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fonction pour accéder aux médias avec gestion d'erreur améliorée
  const getMediaStream = async (video: boolean, audio: boolean) => {
    try {
      console.log("Requesting media access with video:", video, "audio:", audio);
      
      // Définir des contraintes spécifiques pour la vidéo
      const videoConstraints = video ? {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user"
      } : false;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints, 
        audio: audio 
      });
      
      console.log("Media stream obtained successfully", mediaStream.getTracks());
      
      // Vérifier si les pistes vidéo sont actives
      if (video) {
        const videoTracks = mediaStream.getVideoTracks();
        console.log("Video tracks:", videoTracks.length, videoTracks.map(t => t.enabled));
        
        if (videoTracks.length === 0) {
          console.warn("No video tracks found in the media stream");
        }
      }
      
      setStream(mediaStream);
      streamRef.current = mediaStream;
      
      // Assurez-vous que l'élément vidéo est correctement configuré
      if (userVideo.current) {
        console.log("Setting local video source");
        userVideo.current.srcObject = mediaStream;
        
        // Forcer la lecture de la vidéo avec gestion d'événements
        userVideo.current.onloadedmetadata = () => {
          console.log("Local video metadata loaded");
          userVideo.current?.play()
            .then(() => console.log("Local video playback started"))
            .catch(e => console.error("Error playing local video:", e));
        };
      }
      
      return mediaStream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone. Please check your device permissions.");
      onEndCall();
      return null;
    }
  };

  // Fonction pour configurer la vidéo distante
  const setupRemoteVideo = (remoteStream: MediaStream) => {
    console.log("Setting up remote video", remoteStream.getTracks());
    
    if (partnerVideo.current) {
      partnerVideo.current.srcObject = remoteStream;
      
      partnerVideo.current.onloadedmetadata = () => {
        console.log("Remote video metadata loaded");
        partnerVideo.current?.play()
          .then(() => console.log("Remote video playback started"))
          .catch(e => console.error("Error playing remote video:", e));
      };
    } else {
      console.error("Partner video element not found");
    }
  };

  useEffect(() => {
    // Initialize notification sound
    notificationSound.current = new Audio(CALL_NOTIFICATION_SOUND);
    
    // First, make sure we join the socket room with our userId
    socket.emit('join', userId);
    
    // Listen for incoming calls
    socket.on('incoming-call', (data) => {
      console.log('Received incoming call from:', data.from);
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
      setCallStatus('ringing');
      
      // Play notification sound
      if (notificationSound.current) {
        notificationSound.current.play().catch(e => console.error("Error playing notification sound:", e));
      }
    });

    // Listen for call answers
    socket.on('call-answered', (data) => {
      console.log('Call answered:', data);
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
      // Cleanup function
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log("Stopping track:", track.kind, track.id);
          track.stop();
        });
      }
      
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('call-rejected');
      socket.off('call-ended');
    };
  }, [userId]);

  const callUser = async () => {
    setCallStatus('calling');
    
    // Obtenir le flux média seulement au moment d'appeler
    const mediaStream = await getMediaStream(videoEnabled, true);
    if (!mediaStream) return;
    
    console.log("Creating peer as initiator");
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: mediaStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      console.log('Signaling to peer:', targetUserId);
      socket.emit('call-user', {
        to: targetUserId,
        signal: data,
        from: userId,
        type: videoEnabled ? 'video' : 'audio',
        callerName: callerName,
        callerImage: callerImage
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received stream from peer');
      setupRemoteVideo(remoteStream);
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      alert('Connection error. Please try again.');
      endCall();
    });

    connectionRef.current = peer;
  };

  const answerCall = async () => {
    // Obtenir le flux média seulement au moment de répondre
    const mediaStream = await getMediaStream(videoEnabled, true);
    if (!mediaStream) return;
    
    setCallAccepted(true);
    setCallStatus('connected');
    
    // Stop notification sound when call is answered
    if (notificationSound.current) {
      notificationSound.current.pause();
      notificationSound.current.currentTime = 0;
    }
    
    console.log("Creating peer as receiver");
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: mediaStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      console.log('Signaling answer to:', caller);
      socket.emit('answer-call', { 
        signal: data, 
        to: caller 
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received stream from caller');
      setupRemoteVideo(remoteStream);
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      alert('Connection error. Please try again.');
      endCall();
    });

    console.log('Signaling to caller with:', callerSignal);
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
    console.log("Ending call");
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    
    // Arrêter tous les tracks du stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind, track.id);
        track.stop();
      });
    }
    
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