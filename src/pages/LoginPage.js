import React from 'react';
// import swal from 'sweetalert';

// Firebase:
import { auth, signInWithPopup, fb_provider, getAdditionalUserInfo, gg_provider } from '../firebase/config';

// Redux:
import { useDispatch } from 'react-redux';
import { setUser } from '../features/auth/userAuthSlice';

// Context:
import { AlertControlContext } from '../context/AlertControlProvider';

// Services:
import { addDocument, addDocumentWithoutTimestamp, generateUserNameKeywords } from '../firebase/services';

// CSS:
import '../styles/scss/pages/LoginPage.scss';

// Assets:
import Logo from '../assets/images/logo-full.png'
import fbIcon from '../assets/images/icon_Facebook.png';
import ggIcon from '../assets/images/icon_Google.png';


function LoginPage(props) {
    // Context:
    const {
        showAppAlertMessage
    } = React.useContext(AlertControlContext);


    // Redux:
    const dispatch = useDispatch();


    // Methods:
    const handleLoginWithFB = () => {
        signInWithPopup(auth, fb_provider)
            .then((result) => {
                // Get user data:
                const { displayName, email, uid, photoURL } = result.user;
                const action = setUser({ displayName, email, uid, photoURL });
                dispatch(action);

                // Check isNewUser:
                const moreInfo = getAdditionalUserInfo(result);
                if (moreInfo.isNewUser === true) {
                    // If user's account is the first login, create necessary tables in database:
                    // - Table 'users':
                    addDocument("users", {
                        displayName: result.user.displayName,
                        email: result.user.email,
                        uid: result.user.uid,
                        photoURL: result.user.photoURL,
                        providerId: moreInfo.providerId,
                        displayNameSearchKeywords: generateUserNameKeywords(result.user.displayName),
                        phoneNumber: result.user.phoneNumber,
                        gender: ''
                    });
                    // - Table 'friends':
                    addDocumentWithoutTimestamp("friends", {
                        uid: result.user.uid,
                        friends: [],
                        friendsFrom: []
                    });
                }

                // Display result:
                // swal("Successfully logged in!", `Your email: ${email}`, "success");
                showAppAlertMessage('success', 'Đăng nhập thành công', `Tài khoản: ${email}`, 3);
            })
            .catch((error) => {
                // Handle Errors:
                const errorCode = error.code;
                const errorMessage = error.message;
                // Display result:
                // swal(errorCode, errorMessage, "error");
                showAppAlertMessage('danger', errorCode, errorMessage, 5);
            });
    };


    const handleLoginWithGG = () => {
        signInWithPopup(auth, gg_provider)
            .then((result) => {
                // Get user data:
                const { displayName, email, uid, photoURL } = result.user;
                const action = setUser({ displayName, email, uid, photoURL });
                dispatch(action);

                // Check isNewUser:
                const moreInfo = getAdditionalUserInfo(result);
                if (moreInfo.isNewUser === true) {
                    // If user's account is the first login, create necessary tables in database:
                    // - Table 'users':
                    addDocument("users", {
                        displayName: result.user.displayName,
                        email: result.user.email,
                        uid: result.user.uid,
                        photoURL: result.user.photoURL,
                        providerId: moreInfo.providerId,
                        displayNameSearchKeywords: generateUserNameKeywords(result.user.displayName),
                        phoneNumber: result.user.phoneNumber,
                        gender: ''
                    });
                    // - Table 'friends':
                    addDocumentWithoutTimestamp("friends", {
                        uid: result.user.uid,
                        friends: [],
                        friendsFrom: []
                    });
                }

                // Display result:
                // swal("Successfully logged in!", `Your email: ${email}`, "success");
                showAppAlertMessage('success', 'Đăng nhập thành công', `Tài khoản: ${email}`, 3);
            })
            .catch((error) => {
                // Handle Errors:
                const errorCode = error.code;
                const errorMessage = error.message;
                // Display result:
                // swal(errorCode, errorMessage, "error");
                showAppAlertMessage('danger', errorCode, errorMessage, 5);
            });
    };


    // Component:
    return (
        <div className='wrapper'>
        <div className='form'>
          {/* Login container */}
          <div className='form_container'>
            {/* Header */}
            <div className='form_header'>
              <div className='form_logo-wrapper'>
                <img className='form_logo' src={Logo} alt="" />
              </div>
              <h1 className='form_title'>Đăng nhập với</h1>
            </div>
  
            {/* Provider */}
            <ul className='form_provider'>
              <li onClick={handleLoginWithGG} className='form_provider-item'>
                <img className='form_provider-item-img' src={ggIcon} alt="" />
              </li>
              <li onClick={handleLoginWithFB} className='form_provider-item'>
                <img className='form_provider-item-img' src={fbIcon} alt="" />
              </li>
            </ul>
          </div>
  
          {/* Background image */}
          
            <div className='form_cool-img-wrapper'>
              <div className='form_cool-img'></div>
            </div>
        </div>
      </div>
    );
}

export default LoginPage;