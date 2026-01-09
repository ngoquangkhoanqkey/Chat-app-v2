import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faExclamation, faUser, faInfo, faArrowLeft, faVideo, faImage, faFileVideo, faPaperclip } from '@fortawesome/free-solid-svg-icons';

// Components:
import AvatarGroup from './AvatarGroup';
import VideoChat from './VideoChat';

// Redux:
import { useDispatch, useSelector } from 'react-redux';
import { clearSelectedRoom, setRoomIDWillBeSelected } from '../features/manageRooms/manageRoomsSlice';

// Services:
import { addDocument, addDocumentWithTimestamps, formatDateTimeFromDateString, updateDocumentByIDWithTimestamps, uploadVideoToStorage, uploadImageToStorage } from '../firebase/services';

// CSS:
import '../styles/scss/components/ChatRoom.scss';

// Custom hooks:
import useFirestore from "../customHooks/useFirestore";
import { setLogLevel } from 'firebase/app';


function ChatRoom(props) {
    const {
        setIsChatRoomMenuDisplayed
    } = props;
    const messagesEndRef = useRef(null);
    const videoInputRef = useRef(null);
    const imageInputRef = useRef(null);


    // State:
    const [roomData, setRoomData] = useState({});
    const [inputMessage, setInputMessage] = useState('');
    const [isVideoChatOpen, setIsVideoChatOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);


    // Redux:
    const user = useSelector((state) => state.userAuth.user);
    const { rooms, selectedChatRoomID, selectedChatRoomUsers } = useSelector((state) => state.manageRooms);
    const dispatch = useDispatch();


    // Side effects:
    useEffect(() => {
        if (selectedChatRoomID !== '') {
            let count = 0;
            for (let i = 0; i < rooms.length; i++) {
                if (rooms[i].id === selectedChatRoomID) {
                    setRoomData(rooms[i]);
                    count++;
                    break;
                }
            }
            if (count === 0) {
                setRoomData([]);
            }
        } else {
            setRoomData([]);
        }
    }, [rooms, selectedChatRoomID]);


    // Methods:
    const handleInputChange = (e) => {
        setInputMessage(e.target.value);
    }

    const sendMessage = () => {
        if (selectedChatRoomID !== '') {
            if (inputMessage.length > 0) {
                if (roomData.state === 'temporary') {
                    // Add data to Cloud Firestore:
                    addDocumentWithTimestamps('rooms', {
                        id: 'temporary',
                        name: 'Room\'s name',
                        description: 'One To One chat',
                        type: 'one-to-one-chat',
                        members: roomData.members,
                        latestMessage: inputMessage,
                        isSeenBy: [user.uid],
                        fromOthers_BgColor: '',
                        fromMe_BgColor: '',
                    }, ['createdAt', 'lastActiveAt'])
                        .then((roomRef) => {
                            addDocument('messages', {
                                roomId: roomRef.id,
                                content: inputMessage,
                                uid: user.uid,
                            }).then((messageRef) => {
                                dispatch(setRoomIDWillBeSelected(roomRef.id));
                            });
                        });

                    // Clear form:
                    setInputMessage('');
                } else {
                    // Add data to Cloud Firestore:
                    addDocument('messages', {
                        roomId: selectedChatRoomID,
                        content: inputMessage,
                        uid: user.uid,
                    })
                        .then((messageRef) => {
                            updateDocumentByIDWithTimestamps('rooms', selectedChatRoomID, {
                                latestMessage: inputMessage,
                                isSeenBy: [user.uid]
                            }, ['lastActiveAt']);
                        });

                    // Clear form:
                    setInputMessage('');
                }
            }
        }
    }

    const handleInputOnKeyPress = (e) => {
        if (e.charCode === 13) {
            sendMessage();
        }
    }

    const unselectCurrentRoom = () => {
        dispatch(clearSelectedRoom());
        setIsChatRoomMenuDisplayed(false);
    }

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            alert('Vui lòng chọn file video!');
            return;
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            alert('File quá lớn! Vui lòng chọn file nhỏ hơn 100MB.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Upload video to Firebase Storage
            const videoURL = await uploadVideoToStorage(file, user.uid, (progress) => {
                setUploadProgress(progress);
            });

            // Send message with video URL
            await sendMediaMessage(videoURL, 'video');

            // Reset
            setIsUploading(false);
            setUploadProgress(0);
            e.target.value = null;
        } catch (error) {
            console.error('Error uploading video:', error);
            alert('Lỗi khi tải video lên. Vui lòng thử lại!');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file hình ảnh!');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('File quá lớn! Vui lòng chọn file nhỏ hơn 10MB.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Upload image to Firebase Storage
            const imageURL = await uploadImageToStorage(file, user.uid, (progress) => {
                setUploadProgress(progress);
            });

            // Send message with image URL
            await sendMediaMessage(imageURL, 'image');

            // Reset
            setIsUploading(false);
            setUploadProgress(0);
            e.target.value = null;
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Lỗi khi tải hình ảnh lên. Vui lòng thử lại!');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const sendMediaMessage = async (mediaURL, mediaType) => {
        if (selectedChatRoomID !== '') {
            if (roomData.state === 'temporary') {
                // Add data to Cloud Firestore:
                addDocumentWithTimestamps('rooms', {
                    id: 'temporary',
                    name: 'Room\'s name',
                    description: 'One To One chat',
                    type: 'one-to-one-chat',
                    members: roomData.members,
                    latestMessage: mediaType === 'video' ? '[Video]' : '[Hình ảnh]',
                    isSeenBy: [user.uid],
                    fromOthers_BgColor: '',
                    fromMe_BgColor: '',
                }, ['createdAt', 'lastActiveAt'])
                    .then((roomRef) => {
                        addDocument('messages', {
                            roomId: roomRef.id,
                            content: mediaURL,
                            uid: user.uid,
                            type: mediaType,
                        }).then((messageRef) => {
                            dispatch(setRoomIDWillBeSelected(roomRef.id));
                        });
                    });
            } else {
                // Add data to Cloud Firestore:
                addDocument('messages', {
                    roomId: selectedChatRoomID,
                    content: mediaURL,
                    uid: user.uid,
                    type: mediaType,
                })
                    .then((messageRef) => {
                        updateDocumentByIDWithTimestamps('rooms', selectedChatRoomID, {
                            latestMessage: mediaType === 'video' ? '[Video]' : '[Hình ảnh]',
                            isSeenBy: [user.uid]
                        }, ['lastActiveAt']);
                    });
            }
        }
    };

    //Get info usser
    // const MessEditUser = useMemo(()=>{
    //     const editUser = (selectedChatRoomUsers !== '' && selectedChatRoomID < 1 )? setLogLevel:
        
    // })


    // Hooks:
    const messagesCondition = useMemo(() => {
        const comparisonValue = (selectedChatRoomID !== '' && rooms.length > 0) ? selectedChatRoomID : '';
        return {
            fieldName: 'roomId',
            operator: '==',
            value: comparisonValue
        };
    }, [rooms, selectedChatRoomID]);
    // (GET REALTIME UPDATES) Get all messages that belong to this room.
    let messages = useFirestore('messages', messagesCondition);

    // Scroll to bottom if there are new messages:
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages]);


    // Component:
    const generateChatRoomName = () => {
        let result = '';
        if (selectedChatRoomID !== '') {
            if (roomData.type === 'one-to-one-chat') {
                if (selectedChatRoomUsers.length > 0) {
                    for (let i = 0; i < selectedChatRoomUsers.length; i++) {
                        if (selectedChatRoomUsers[i].uid !== user.uid) {
                            result = selectedChatRoomUsers[i].displayName;
                            break;
                        }
                    }
                }
            } else if (roomData.type === 'group-chat') {
                result = roomData.name ? roomData.name : '';
            }
        }
        return result;
    };

    const renderOneToOneChatRoomImg = () => {
        if (selectedChatRoomUsers.length > 0) {
            let indexOfMember = -1;
            for (let i = 0; i < selectedChatRoomUsers.length; i++) {
                if (selectedChatRoomUsers[i].uid !== user.uid) {
                    indexOfMember = i;
                    break;
                }
            }
            if (indexOfMember === -1) {
                return (
                    <div className='person-img-wrapper'></div>
                );
            } else {
                return (
                    <div className='person-img-wrapper'>
                        {selectedChatRoomUsers[indexOfMember].photoURL ? (
                            <img className='person-img' src={selectedChatRoomUsers[indexOfMember].photoURL} alt='' ></img>
                        ) : (
                            <div className='person-character-name'>
                                <span>{selectedChatRoomUsers[indexOfMember].displayName?.charAt(0)?.toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                );
            }
        } else {
            return (
                <div className='person-img-wrapper'></div>
            );
        }
    };

    const renderGroupChatImg = () => {
        if (selectedChatRoomUsers.length > 0) {
            let imgGroup = [];
            for (let i = 0; i < selectedChatRoomUsers.length; i++) {
                if (selectedChatRoomUsers[i].uid !== user.uid) {
                    imgGroup.push({
                        imgSrc: selectedChatRoomUsers[i].photoURL,
                        displayName: selectedChatRoomUsers[i].displayName
                    });
                }
            }
            if (imgGroup.length === 0) {
                return (
                    <div className='group-img-wrapper'></div>
                );
            } else {
                if (imgGroup.length === 1) {
                    imgGroup.push({
                        imgSrc: user.photoURL,
                        displayName: user.displayName
                    });
                }
                return (
                    <div className='group-img-wrapper'>
                        <AvatarGroup
                            className='small-size'
                            imgsData={imgGroup}
                            moreAvatarsNumber={1}
                        ></AvatarGroup>
                    </div>
                );
            }
        } else {
            return (
                <div className='group-img-wrapper'></div>
            );
        }
    };

    const renderChatRoomImage = () => {
        if (selectedChatRoomID !== '') {
            let roomType = '';
            for (let i = 0; i < rooms.length; i++) {
                if (rooms[i].id === selectedChatRoomID) {
                    roomType = rooms[i].type;
                    break;
                }
            }
            if (roomType === 'group-chat') {
                return renderGroupChatImg();
            } else {
                return renderOneToOneChatRoomImg();
            }
        } else {
            return renderOneToOneChatRoomImg();
        }
    };

    const renderChatRoomMessages = () => {
        if (selectedChatRoomID === '' && selectedChatRoomUsers.length > 0) {
            messages = [];
        }
        return (
            <>
                {
                    messages.slice(0).reverse().map((msg, index) => {
                        const relativeDateTime = formatDateTimeFromDateString(msg.createdAt);
                        const messageType = msg.type || 'text';
                        
                        if (msg.uid === user.uid) {
                            return (
                                <div key={`msg-${index}`} className='message from-me'>
                                    <div className='message__content'>
                                        {messageType === 'video' ? (
                                            <div className='message-media video-message'>
                                                <video controls className='message-video'>
                                                    <source src={msg.content} type='video/mp4' />
                                                    Trình duyệt của bạn không hỗ trợ video.
                                                </video>
                                                <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                            </div>
                                        ) : messageType === 'image' ? (
                                            <div className='message-media image-message'>
                                                <img src={msg.content} alt='Shared image' className='message-image' />
                                                <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                            </div>
                                        ) : (
                                            <span className='message-piece'>
                                                {msg.content}
                                                <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        } else {
                            // Get user data:
                            let data = null;
                            for (let i = 0; i < selectedChatRoomUsers.length; i++) {
                                if (selectedChatRoomUsers[i].uid === msg.uid) {
                                    data = selectedChatRoomUsers[i];
                                    break;
                                }
                            }

                            // Return:
                            return (
                                <div key={`msg-${index}`} className='message from-others'>
                                    <div className='message__person-img'>
                                        {data?.photoURL ? (
                                            <img className='person-img' src={data.photoURL} alt='' ></img>
                                        ) : (
                                            <div className='person-icon-wrapper'>
                                                <FontAwesomeIcon className='person-icon' icon={faUser} />
                                            </div>
                                        )}
                                    </div>
                                    <div className='message__content'>
                                        {messageType === 'video' ? (
                                            <div className='message-media video-message'>
                                                <video controls className='message-video'>
                                                    <source src={msg.content} type='video/mp4' />
                                                    Trình duyệt của bạn không hỗ trợ video.
                                                </video>
                                                <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                            </div>
                                        ) : messageType === 'image' ? (
                                            <div className='message-media image-message'>
                                                <img src={msg.content} alt='Shared image' className='message-image' />
                                                <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                            </div>
                                        ) : (
                                            <span className='message-piece'>
                                                {msg.content}
                                                <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                    })
                }

                <div ref={messagesEndRef} />
            </>
        );
    };

    const renderChatRoomMessagesWithGrouping = () => {
        if (selectedChatRoomID === '' && selectedChatRoomUsers.length > 0) {
            messages = [];
        }

        const messageList = messages.slice(0).reverse();
        let messageGroup = [];
        let result = [];

        for (let i = 0; i < messageList.length; i++) {
            const messageType = messageList[i].type || 'text';
            
            if (messageList[i].uid === user.uid) {
                let indexSkipTo = i;
                
                // Don't group media messages
                if (messageType === 'video' || messageType === 'image') {
                    const relativeDateTime = formatDateTimeFromDateString(messageList[i].createdAt);
                    result.push(
                        <div key={`msg-${i}`} className='message from-me'>
                            <div className='message__content'>
                                {messageType === 'video' ? (
                                    <div className='message-media video-message'>
                                        <video controls className='message-video'>
                                            <source src={messageList[i].content} type='video/mp4' />
                                            Trình duyệt của bạn không hỗ trợ video.
                                        </video>
                                        <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                    </div>
                                ) : (
                                    <div className='message-media image-message'>
                                        <img src={messageList[i].content} alt='Shared image' className='message-image' />
                                        <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                } else {
                    // Group text messages
                    for (let j = i; j < messageList.length; j++) {
                        const d1 = new Date(messageList[i].createdAt);
                        const d2 = new Date(messageList[j].createdAt);
                        const msgType = messageList[j].type || 'text';
                        if (messageList[i].uid === messageList[j].uid && Math.abs(d1 - d2) <= 60000 && msgType === 'text') {
                            const relativeDateTime = formatDateTimeFromDateString(messageList[j].createdAt);
                            messageGroup.push(
                                <span key={`msgpiece-${j}`} className='message-piece'>
                                    {messageList[j].content}
                                    <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                </span>
                            );
                            indexSkipTo++;
                        } else {
                            break;
                        }
                    }
                    result.push(
                        <div key={`msg-${i}`} className='message from-me'>
                            <div className='message__content'>
                                {messageGroup.map((msg) => msg)}
                            </div>
                        </div>
                    );
                    messageGroup = [];
                }
                i = indexSkipTo - 1;
            } else {
                // Get user data:
                let data = null;
                for (let t = 0; t < selectedChatRoomUsers.length; t++) {
                    if (messageList[i].uid === selectedChatRoomUsers[t].uid) {
                        data = selectedChatRoomUsers[t];
                        break;
                    }
                }

                // Group messages:
                let indexSkipTo = i;
                
                // Don't group media messages
                if (messageType === 'video' || messageType === 'image') {
                    const relativeDateTime = formatDateTimeFromDateString(messageList[i].createdAt);
                    result.push(
                        <div key={`msg-${i}`} className='message from-others'>
                            <div className='message__person-img'>
                                {data?.photoURL ? (
                                    <img className='person-img' src={data.photoURL} alt='' ></img>
                                ) : (
                                    <div className='person-icon-wrapper'>
                                        <FontAwesomeIcon className='person-icon' icon={faUser} />
                                    </div>
                                )}
                            </div>
                            <div className='message__content'>
                                {messageType === 'video' ? (
                                    <div className='message-media video-message'>
                                        <video controls className='message-video'>
                                            <source src={messageList[i].content} type='video/mp4' />
                                            Trình duyệt của bạn không hỗ trợ video.
                                        </video>
                                        <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                    </div>
                                ) : (
                                    <div className='message-media image-message'>
                                        <img src={messageList[i].content} alt='Shared image' className='message-image' />
                                        <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                } else {
                    // Group text messages
                    for (let j = i; j < messageList.length; j++) {
                        const d1 = new Date(messageList[i].createdAt);
                        const d2 = new Date(messageList[j].createdAt);
                        const msgType = messageList[j].type || 'text';
                        if (messageList[i].uid === messageList[j].uid && Math.abs(d1 - d2) <= 60000 && msgType === 'text') {
                            const relativeDateTime = formatDateTimeFromDateString(messageList[j].createdAt);
                            messageGroup.push(
                                <span key={`msgpiece-${j}`} className='message-piece'>
                                    {messageList[j].content}
                                    <span className='message-piece__tooltip'>{relativeDateTime}</span>
                                </span>
                            );
                            indexSkipTo++;
                        } else {
                            break;
                        }
                    }
                    result.push(
                        <div key={`msg-${i}`} className='message from-others'>
                            <div className='message__person-img'>
                                {data?.photoURL ? (
                                    <img className='person-img' src={data.photoURL} alt='' ></img>
                                ) : (
                                    <div className='person-icon-wrapper'>
                                        <FontAwesomeIcon className='person-icon' icon={faUser} />
                                    </div>
                                )}
                            </div>
                            <div className='message__content'>
                                {messageGroup.map((msg) => msg)}
                            </div>
                        </div>
                    );
                    messageGroup = [];
                }
                i = indexSkipTo - 1;
            }
        }

        return (
            <>
                {result}
                <div ref={messagesEndRef} />
            </>
        );
    };

    const renderGoBackButtonForSmallDevices = () => {
        return (
            <div className='btn-for-small-devices' onClick={() => unselectCurrentRoom()}>
                <FontAwesomeIcon className='btn-icon' icon={faArrowLeft} />
            </div>
        );
    };

    const renderChatRoomComponent = () => {
        return (
            <>
                <div className='chat-info'>
                    <div className='chat-info__person'>
                        {renderGoBackButtonForSmallDevices()}
                        {renderChatRoomImage()}
                        <div className='person-info'>
                            <span className='person-name'>{generateChatRoomName()}</span>
                            <span className='person-active-status'>{roomData.type === 'group-chat' ? formatDateTimeFromDateString(roomData.lastActiveAt) : ''}</span>
                        </div>
                    </div>

                    <div className='chat-info__actions'>
                        <div className='action-list-wrapper'>
                            <div className='action-list'>
                                <button className='action-item' onClick={() => setIsVideoChatOpen(true)} title="Bắt đầu video call">
                                    <span className='action-icon-wrapper video-icon'>
                                        <span className='action-icon-circle'>
                                            <FontAwesomeIcon className='action-icon' icon={faVideo} />
                                        </span>
                                    </span>
                                </button>
                                <label className='action-item' htmlFor="checkbox-for-chatroom-menu">
                                    <span className='action-icon-wrapper info-icon'>
                                        <span className='action-icon-circle'>
                                            <FontAwesomeIcon className='action-icon' icon={faInfo} />
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='chat-content'>
                    <div className='content-wrapper'>
                        <div className='content'>

                            {true ? renderChatRoomMessagesWithGrouping() : renderChatRoomMessages()}

                            {/* <div className='message from-others'>
                                <div className='message__person-img'>
                                    <img className='person-img' src='' alt='' ></img>
                                </div>
                                <div className='message__content'>
                                    <span className='message-piece'>Xin chào bạn!</span>
                                    <span className='message-piece'>Bạn biết tôi là ai không?</span>
                                    <span className='message-piece'>Alo, bạn ơi bạn có nghe tôi nói không?</span>
                                    <span className='message-piece'>Bạn không thèm nghe tôi nói à?</span>
                                </div>
                            </div>

                            <div className='message from-others'>
                                <div className='message__person-img'>
                                    <img className='person-img' src='' alt='' ></img>
                                </div>
                                <div className='message__content'>
                                    <span className='message-piece'>Alo, nghe rõ trả lời!</span>
                                </div>
                            </div>

                            <div className='message from-me'>
                                <div className='message__content'>
                                    <span className='message-piece'>Ừ xin chào bạn mà tôi không quen bạn nhé!</span>
                                </div>
                            </div>

                            <div ref={messagesEndRef} /> */}

                        </div>
                    </div>
                </div>

                <div className='chat-tools'>
                    <div className='textbox-wrapper'>
                        <div className='textbox'>
                            {/* Hidden file inputs */}
                            <input
                                ref={videoInputRef}
                                type='file'
                                accept='video/*'
                                style={{ display: 'none' }}
                                onChange={handleVideoUpload}
                            />
                            <input
                                ref={imageInputRef}
                                type='file'
                                accept='image/*'
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                            />
                            
                            {/* Upload buttons */}
                            <div className='attachment-buttons'>
                                <button
                                    className='attachment-btn'
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isUploading}
                                    title='Gửi hình ảnh'
                                >
                                    <FontAwesomeIcon icon={faImage} />
                                </button>
                                <button
                                    className='attachment-btn'
                                    onClick={() => videoInputRef.current?.click()}
                                    disabled={isUploading}
                                    title='Gửi video'
                                >
                                    <FontAwesomeIcon icon={faFileVideo} />
                                </button>
                            </div>

                            <input
                                type='text' placeholder='Nhập tin nhắn'
                                value={inputMessage}
                                onChange={(e) => handleInputChange(e)}
                                onKeyPress={(e) => handleInputOnKeyPress(e)}
                                disabled={isUploading}
                            ></input>
                            <div className='action-button send-btn' onClick={(e) => sendMessage()}>
                                <FontAwesomeIcon className='action-button__icon send-icon' icon={faAngleRight} />
                            </div>
                        </div>
                        {isUploading && (
                            <div className='upload-progress'>
                                <div className='progress-bar'>
                                    <div className='progress-fill' style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <span className='progress-text'>{Math.round(uploadProgress)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    };

    const renderEmptyChatRoom = () => {
        return (
            <div className='chatroom__app-message'>
                <div className='app-message-wrapper'>
                    <div className='app-message'>
                        <div className='app-message__icon-wrapper'>
                            <FontAwesomeIcon className='app-message__icon' icon={faExclamation} />
                        </div>
                        <div className='app-message__content'>Hãy chọn người dùng để chat</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='chatroom'>
            {
                Object.keys(roomData).length > 0 ? (
                    renderChatRoomComponent()
                ) : (
                    renderEmptyChatRoom()
                )
            }
            {isVideoChatOpen && (
                <VideoChat
                    roomId={selectedChatRoomID}
                    userId={user.uid}
                    onClose={() => setIsVideoChatOpen(false)}
                />
            )}
        </div>
    );
}

export default ChatRoom;