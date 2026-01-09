import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faVideoSlash, faMicrophone, faMicrophoneSlash, faPhone, faTimes } from '@fortawesome/free-solid-svg-icons';

// Firebase:
import { addDocument, updateDocumentByID } from '../firebase/services';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

// CSS:
import '../styles/scss/components/VideoChat.scss';


function VideoChat(props) {
    const {
        roomId,
        userId,
        onClose
    } = props;

    // Refs:
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);

    // State:
    const [isCallStarted, setIsCallStarted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
    const [callDocId, setCallDocId] = useState(null);

    // WebRTC Configuration:
    const configuration = {
        iceServers: [
            {
                urls: [
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302',
                ]
            }
        ],
        iceCandidatePoolSize: 10,
    };


    // Initialize local stream:
    useEffect(() => {
        const startLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing media devices:', error);
                alert('Không thể truy cập camera/microphone. Vui lòng kiểm tra quyền truy cập.');
            }
        };

        startLocalStream();

        // Cleanup:
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    // Start call:
    const startCall = async () => {
        if (!localStreamRef.current) {
            alert('Không thể bắt đầu cuộc gọi. Vui lòng kiểm tra camera/microphone.');
            return;
        }

        setIsCallStarted(true);
        setIsWaitingForAnswer(true);

        // Create peer connection:
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;

        // Add local stream to peer connection:
        localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        // Collect ICE candidates:
        const callerCandidatesCollection = collection(db, 'calls', 'temp', 'callerCandidates');

        peerConnection.addEventListener('icecandidate', async (event) => {
            if (event.candidate) {
                await addDocument(`calls/${callDocId}/callerCandidates`, event.candidate.toJSON());
            }
        });

        // Get remote stream:
        peerConnection.addEventListener('track', (event) => {
            const [remoteStream] = event.streams;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsWaitingForAnswer(false);
        });

        // Create offer:
        const offerDescription = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        // Save call data to Firestore:
        const callDoc = await addDocument('calls', {
            roomId: roomId,
            callerId: userId,
            offer: offer,
            answer: null,
            createdAt: new Date().toISOString()
        });

        setCallDocId(callDoc.id);

        // Listen for answer:
        const unsubscribe = onSnapshot(doc(db, 'calls', callDoc.id), async (snapshot) => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(answerDescription);
            }
        });

        // Listen for callee ICE candidates:
        onSnapshot(
            query(collection(db, 'calls', callDoc.id, 'calleeCandidates')),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        await peerConnection.addIceCandidate(candidate);
                    }
                });
            }
        );
    };


    // Answer call:
    const answerCall = async (callDoc) => {
        setIsCallStarted(true);

        // Create peer connection:
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;

        // Add local stream:
        localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        // Collect ICE candidates:
        peerConnection.addEventListener('icecandidate', async (event) => {
            if (event.candidate) {
                await addDocument(`calls/${callDoc.id}/calleeCandidates`, event.candidate.toJSON());
            }
        });

        // Get remote stream:
        peerConnection.addEventListener('track', (event) => {
            const [remoteStream] = event.streams;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        // Get offer and set remote description:
        const offerDescription = callDoc.data().offer;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

        // Create answer:
        const answerDescription = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        // Update call document with answer:
        await updateDocumentByID('calls', callDoc.id, { answer: answer });

        // Listen for caller ICE candidates:
        onSnapshot(
            query(collection(db, 'calls', callDoc.id, 'callerCandidates')),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        await peerConnection.addIceCandidate(candidate);
                    }
                });
            }
        );

        setCallDocId(callDoc.id);
    };


    // Listen for incoming calls:
    useEffect(() => {
        if (!roomId || !userId) return;

        const q = query(
            collection(db, 'calls'),
            where('roomId', '==', roomId),
            where('answer', '==', null)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    // Only answer if this user is not the caller:
                    if (callData.callerId !== userId) {
                        const confirmAnswer = window.confirm('Bạn có cuộc gọi video đến. Trả lời?');
                        if (confirmAnswer) {
                            await answerCall(change.doc);
                        }
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [roomId, userId]);


    // Toggle video:
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };


    // Toggle audio:
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };


    // End call:
    const endCall = async () => {
        // Stop local stream:
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        // Close peer connection:
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }

        // Delete call document from Firestore:
        if (callDocId) {
            try {
                await deleteDoc(doc(db, 'calls', callDocId));
            } catch (error) {
                console.error('Error deleting call document:', error);
            }
        }

        // Close video chat component:
        onClose();
    };


    return (
        <div className='video-chat'>
            <div className='video-chat__container'>
                <div className='video-chat__header'>
                    <h3>Video Call</h3>
                    <button className='close-btn' onClick={endCall}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className='video-chat__videos'>
                    <div className='remote-video-wrapper'>
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className='remote-video'
                        />
                        {isWaitingForAnswer && (
                            <div className='waiting-message'>
                                <p>Đang chờ người khác trả lời...</p>
                            </div>
                        )}
                    </div>

                    <div className='local-video-wrapper'>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className='local-video'
                        />
                    </div>
                </div>

                <div className='video-chat__controls'>
                    {!isCallStarted && (
                        <button className='control-btn start-btn' onClick={startCall}>
                            <FontAwesomeIcon icon={faVideo} />
                            <span>Bắt đầu gọi</span>
                        </button>
                    )}

                    {isCallStarted && (
                        <>
                            <button
                                className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
                                onClick={toggleVideo}
                            >
                                <FontAwesomeIcon icon={isVideoEnabled ? faVideo : faVideoSlash} />
                            </button>

                            <button
                                className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
                                onClick={toggleAudio}
                            >
                                <FontAwesomeIcon icon={isAudioEnabled ? faMicrophone : faMicrophoneSlash} />
                            </button>

                            <button className='control-btn end-btn' onClick={endCall}>
                                <FontAwesomeIcon icon={faPhone} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoChat;
