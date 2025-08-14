import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDhinYUw2uiyVSmtQTf5-3hG4ORUXuvGkg',
  authDomain: 'corridinha-f6160.firebaseapp.com',
  projectId: 'corridinha-f6160',
  storageBucket: 'corridinha-f6160.firebasestorage.app',
  messagingSenderId: '201989936347',
  appId: '1:201989936347:web:94b53f21358964973ba8fe',
  measurementId: 'G-PSXNWQ099W',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence (best-effort)
enableIndexedDbPersistence(db).catch(() => {
  // ignore if not available (e.g., multiple tabs)
});


