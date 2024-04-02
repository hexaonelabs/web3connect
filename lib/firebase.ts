// Import the functions you need from the SDKs you need
import { FirebaseOptions, initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth, GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, Auth} from 'firebase/auth';

let auth!: Auth;

const signinWithGoogle = async () => {
  // Initialize Firebase Google Auth
  try {
    // await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential;

  } catch (err) {
    throw err;
  }
};

const sendLinkToEmail = async (email: string) => {
    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) for this
      // URL must be in the authorized domains list in the Firebase Console.
      url: 'http://localhost:5173/?finishSignUp=true',
      // This must be true.
      handleCodeInApp: true,
      // dynamicLinkDomain: 'example.page.link'
    }
    // Initialize Firebase email Auth
    try {
      // await setPersistence(auth, browserLocalPersistence);
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
        .then(() => {
          // The link was successfully sent. Inform the user.
          // Save the email locally so you don't need to ask the user for it again
          // if they open the link on the same device.
          window.localStorage.setItem('hexaconnect_emailForSignIn', email);
        });
    } catch (err) {
      throw err;
    }
};

const signInWithLink = async ()=> {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return undefined;
  }
  console.log('[INFO] HexaConnect - signInWithLink: ', window.location.href);
  // Additional state parameters can also be passed via URL.
  // This can be used to continue the user's intended action before triggering
  // the sign-in operation.
  // Get the email if available. This should be available if the user completes
  // the flow on the same device where they started it.
  let email = window.localStorage.getItem('hexaconnect_emailForSignIn');
  if (!email) {
    // User opened the link on a different device. To prevent session fixation
    // attacks, ask the user to provide the associated email again. For example:
    email = window.prompt('Please provide your email for confirmation');
  }
  if (!email) {
    throw new Error('No email provided');
  }
  try {
    // The client SDK will parse the code from the link for you.
    const credential = await signInWithEmailLink(auth, email, window.location.href)//.catch(err => err)
    // You can check if the user is new or existing:
    // result.additionalUserInfo.isNewUser
    // Clear email from storage.
    window.localStorage.removeItem('emailForSignIn');
    return credential;
  } catch (error) {
    throw error;
  }
}

const initialize = (firebaseConfig: FirebaseOptions) => {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  // Initialize Firebase Auth
  auth = getAuth(app);
}

export {
  auth, 
  signinWithGoogle,
  sendLinkToEmail,
  signInWithLink,
  initialize,
}
