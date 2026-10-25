'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string | null;
  personality?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  participantIds: string[];
}

export function useLiveCall(roomId: string, currentUserId: string, gamePhase?: string) {
  const [callId, setCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'outgoing' | 'incoming' | 'connected'>('idle');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isCurfewMuted, setIsCurfewMuted] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const audioElements = useRef<Record<string, HTMLAudioElement>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Record<string, AnalyserNode>>({});
  const animationFrameRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);

  // Helper to fetch current user's profile
  const getCurrentUserDetails = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('players')
        .select('username, avatar_base64, personality')
        .eq('id', currentUserId)
        .maybeSingle();

      return {
        username: data?.username || 'Player',
        avatar: data?.avatar_base64 || null,
        personality: data?.personality || 'Leader',
      };
    } catch {
      return { username: 'Player', avatar: null, personality: 'Leader' };
    }
  }, [currentUserId]);

  // Night Curfew: Automatically deafen and mute during Night phase
  useEffect(() => {
    if (callStatus === 'connected') {
      if (gamePhase === 'Night') {
        setIsCurfewMuted(true);
        // Mute local tracks
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        // Mute remote audio outputs
        Object.values(audioElements.current).forEach((el) => {
          el.muted = true;
        });
      } else {
        setIsCurfewMuted(false);
        // Unmute if user hadn't manually muted
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = !isMicMuted;
        });
        Object.values(audioElements.current).forEach((el) => {
          el.muted = isSpeakerMuted;
        });
      }
    }
  }, [gamePhase, callStatus, isMicMuted, isSpeakerMuted]);

  // Active speaker volume visualizer ticker
  const startVolumeAnalysis = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const checkVolume = () => {
      const speakingMap: Record<string, boolean> = {};

      Object.entries(analysersRef.current).forEach(([pid, analyser]) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        speakingMap[pid] = average > 14;
      });

      setParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          isSpeaking: speakingMap[p.id] || false,
        }))
      );

      animationFrameRef.current = requestAnimationFrame(checkVolume);
    };

    animationFrameRef.current = requestAnimationFrame(checkVolume);
  }, []);

  // WebRTC ICE Servers
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Setup peer connection for a specific remote participant
  const createPeerConnection = useCallback(
    (remoteUserId: string, isInitiator: boolean) => {
      if (peerConnections.current[remoteUserId]) {
        return peerConnections.current[remoteUserId];
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnections.current[remoteUserId] = pc;

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'call_ice',
            payload: {
              targetId: remoteUserId,
              senderId: currentUserId,
              candidate: event.candidate,
            },
          });
        }
      };

      // Handle Remote Audio Stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!audioElements.current[remoteUserId]) {
          const audio = new Audio();
          audio.srcObject = remoteStream;
          audio.autoplay = true;
          audio.muted = isSpeakerMuted || isCurfewMuted;
          audioElements.current[remoteUserId] = audio;
        }

        // Connect remote stream to Web Audio Analyser for speaking indicator
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          const source = ctx.createMediaStreamSource(remoteStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analysersRef.current[remoteUserId] = analyser;
          startVolumeAnalysis();
        } catch (e) {
          console.warn('AudioContext hook non-fatal error:', e);
        }
      };

      // If initiator, generate SDP Offer
      if (isInitiator) {
        pc.createOffer({ offerToReceiveAudio: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'call_offer',
              payload: {
                targetId: remoteUserId,
                senderId: currentUserId,
                offer: pc.localDescription,
              },
            });
          })
          .catch((err) => console.warn('Peer offer error:', err));
      }

      return pc;
    },
    [currentUserId, isSpeakerMuted, isCurfewMuted, startVolumeAnalysis]
  );

  // Initialize Local Media Stream
  const initLocalAudio = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;

      // Local speaking analyser
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analysersRef.current[currentUserId] = analyser;
        startVolumeAnalysis();
      } catch (e) {
        console.warn('Local volume analyser error:', e);
      }

      return stream;
    } catch (err) {
      console.warn('Mic access failed or permission denied:', err);
      return null;
    }
  };

  // Supabase Realtime Signaling Listener
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`call:${roomId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'call_invite' }, async ({ payload }) => {
        const { targetIds, callerId, callerName, callerAvatar, callId: cId } = payload;
        if (targetIds?.includes(currentUserId) && callerId !== currentUserId) {
          setIncomingCall({
            callId: cId,
            callerId,
            callerName,
            callerAvatar,
            participantIds: targetIds,
          });
          setCallStatus('incoming');
        }
      })
      .on('broadcast', { event: 'call_accept' }, async ({ payload }) => {
        const { accepterId, accepterName, accepterAvatar, callId: cId } = payload;
        if (cId === callId && accepterId !== currentUserId) {
          setParticipants((prev) => {
            if (prev.some((p) => p.id === accepterId)) return prev;
            return [...prev, { id: accepterId, name: accepterName, avatar: accepterAvatar }];
          });

          // Connect peer WebRTC
          createPeerConnection(accepterId, true);
        }
      })
      .on('broadcast', { event: 'call_offer' }, async ({ payload }) => {
        const { targetId, senderId, offer } = payload;
        if (targetId === currentUserId) {
          await initLocalAudio();
          const pc = createPeerConnection(senderId, false);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'call_answer',
            payload: {
              targetId: senderId,
              senderId: currentUserId,
              answer: pc.localDescription,
            },
          });
        }
      })
      .on('broadcast', { event: 'call_answer' }, async ({ payload }) => {
        const { targetId, senderId, answer } = payload;
        if (targetId === currentUserId) {
          const pc = peerConnections.current[senderId];
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        }
      })
      .on('broadcast', { event: 'call_ice' }, async ({ payload }) => {
        const { targetId, senderId, candidate } = payload;
        if (targetId === currentUserId) {
          const pc = peerConnections.current[senderId];
          if (pc && candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('ICE Candidate add error:', err);
            }
          }
        }
      })
      .on('broadcast', { event: 'call_leave' }, ({ payload }) => {
        const { leaverId } = payload;
        if (peerConnections.current[leaverId]) {
          peerConnections.current[leaverId].close();
          delete peerConnections.current[leaverId];
        }
        if (audioElements.current[leaverId]) {
          audioElements.current[leaverId].pause();
          delete audioElements.current[leaverId];
        }
        delete analysersRef.current[leaverId];
        setParticipants((prev) => prev.filter((p) => p.id !== leaverId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [roomId, currentUserId, callId, createPeerConnection]);

  // Start outgoing call
  const startCall = async (targetPlayerIds: string[], targetPlayersData: CallParticipant[]) => {
    if (targetPlayerIds.length === 0) return;
    const stream = await initLocalAudio();
    if (!stream) {
      alert('Microphone permission required for audio calls.');
      return;
    }

    const newCallId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setCallId(newCallId);
    setCallStatus('outgoing');

    const currentUser = await getCurrentUserDetails();
    setParticipants([
      { id: currentUserId, name: currentUser.username, avatar: currentUser.avatar },
    ]);

    // Broadcast call invites to targets
    channelRef.current?.send({
      type: 'broadcast',
      event: 'call_invite',
      payload: {
        callId: newCallId,
        callerId: currentUserId,
        callerName: currentUser.username,
        callerAvatar: currentUser.avatar,
        targetIds: targetPlayerIds,
      },
    });

    // Auto set to connected if initiating
    setCallStatus('connected');
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall) return;
    const stream = await initLocalAudio();
    if (!stream) {
      alert('Microphone permission required to join call.');
      setCallStatus('idle');
      setIncomingCall(null);
      return;
    }

    const currentUser = await getCurrentUserDetails();
    setCallId(incomingCall.callId);
    setCallStatus('connected');

    setParticipants([
      { id: currentUserId, name: currentUser.username, avatar: currentUser.avatar },
      { id: incomingCall.callerId, name: incomingCall.callerName, avatar: incomingCall.callerAvatar },
    ]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'call_accept',
      payload: {
        callId: incomingCall.callId,
        accepterId: currentUserId,
        accepterName: currentUser.username,
        accepterAvatar: currentUser.avatar,
      },
    });

    setIncomingCall(null);
  };

  // Decline incoming call
  const declineCall = () => {
    setCallStatus('idle');
    setIncomingCall(null);
  };

  // Leave / End Call
  const leaveCall = () => {
    if (callId) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'call_leave',
        payload: { callId, leaverId: currentUserId },
      });
    }

    // Stop tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};

    // Pause audio elements
    Object.values(audioElements.current).forEach((el) => el.pause());
    audioElements.current = {};

    analysersRef.current = {};
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    setCallId(null);
    setCallStatus('idle');
    setIncomingCall(null);
    setParticipants([]);
    setIsMicMuted(false);
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const willBeMuted = !isMicMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !willBeMuted;
    });
    setIsMicMuted(willBeMuted);

    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUserId ? { ...p, isMuted: willBeMuted } : p))
    );
  };

  // Toggle Speaker (Deafen)
  const toggleSpeaker = () => {
    const willBeMuted = !isSpeakerMuted;
    Object.values(audioElements.current).forEach((el) => {
      el.muted = willBeMuted || isCurfewMuted;
    });
    setIsSpeakerMuted(willBeMuted);
  };

  // Invite more participants
  const addParticipants = (newTargetIds: string[]) => {
    if (!callId) return;
    getCurrentUserDetails().then((currentUser) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'call_invite',
        payload: {
          callId,
          callerId: currentUserId,
          callerName: currentUser.username,
          callerAvatar: currentUser.avatar,
          targetIds: newTargetIds,
        },
      });
    });
  };

  return {
    callId,
    callStatus,
    incomingCall,
    participants,
    isMicMuted,
    isSpeakerMuted,
    isCurfewMuted,
    startCall,
    acceptCall,
    declineCall,
    leaveCall,
    toggleMic,
    toggleSpeaker,
    addParticipants,
  };
}
