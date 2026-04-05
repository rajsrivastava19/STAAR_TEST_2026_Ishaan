import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  arrayUnion,
  type Timestamp,
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATbU7QUJPzLCpOtYHCH-gP9VpubO7hLgk",
  authDomain: "math-staar-test.firebaseapp.com",
  projectId: "math-staar-test",
  storageBucket: "math-staar-test.firebasestorage.app",
  messagingSenderId: "435644974797",
  appId: "1:435644974797:web:fe16a16d3a3beaa5860b84",
  measurementId: "G-VKCSGHCHPH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Types ──

export type UserDoc = {
  firstName: string;
  lastName: string;
  passcode?: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  lastLogin: Timestamp | ReturnType<typeof serverTimestamp>;
  loginCount: number;
  scores: Record<string, number>;     // { examId: bestScore }
  history: AttemptRecord[];            // all attempts
};

export type AttemptRecord = {
  examId: string;
  examYear: number;
  date: string;
  percent: number;
  correct: number;
  total: number;
  timerEnabled: boolean;
  elapsedSeconds: number;
};

// ── Helper Functions ──

const usersCol = collection(db, 'users');

/**
 * Login or register a user. Creates the doc if new, updates lastLogin if existing.
 * Returns the user's scores and history.
 */
export async function loginUser(
  userId: string,
  firstName: string,
  lastName: string,
  passcode: string
): Promise<{ scores: Record<string, number>; history: AttemptRecord[]; loginCount: number }> {
  const userRef = doc(usersCol, userId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    // Existing user
    const data = snap.data() as UserDoc;

    if (data.passcode) {
      if (data.passcode !== passcode) {
        throw new Error("Incorrect Passcode. Please try again.");
      }
    } else {
      // Legacy account -> lock in new passcode
      await updateDoc(userRef, { passcode });
    }

    const newCount = (data.loginCount || 0) + 1;
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      loginCount: newCount,
    });
    return {
      scores: data.scores || {},
      history: data.history || [],
      loginCount: newCount,
    };
  } else {
    // New user — create document
    const newUser: UserDoc = {
      firstName,
      lastName,
      passcode,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      loginCount: 1,
      scores: {},
      history: [],
    };
    await setDoc(userRef, newUser);
    return { scores: {}, history: [], loginCount: 1 };
  }
}

/**
 * Fetch user data (scores + history) without login increment.
 */
export async function getUser(userId: string): Promise<{ scores: Record<string, number>; history: AttemptRecord[] } | null> {
  const snap = await getDoc(doc(usersCol, userId));
  if (!snap.exists()) return null;
  const data = snap.data() as UserDoc;
  return { scores: data.scores || {}, history: data.history || [] };
}

/**
 * Save a score — only updates if the new score is better than existing.
 */
export async function saveScore(userId: string, examId: string, score: number): Promise<void> {
  const userRef = doc(usersCol, userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const data = snap.data() as UserDoc;
  const currentBest = data.scores?.[examId] || 0;
  if (score > currentBest) {
    await updateDoc(userRef, {
      [`scores.${examId}`]: score,
    });
  }
}

/**
 * Append an attempt record to the user's history.
 */
export async function saveAttempt(userId: string, record: AttemptRecord): Promise<void> {
  const userRef = doc(usersCol, userId);
  await updateDoc(userRef, {
    history: arrayUnion(record),
  });
}

/**
 * Get all users (for admin panel).
 */
export async function getAllUsers(): Promise<{ id: string; data: UserDoc }[]> {
  const snap = await getDocs(usersCol);
  return snap.docs.map(d => ({ id: d.id, data: d.data() as UserDoc }));
}

/**
 * Admin: toggle level completion for a user.
 * If currently complete, remove scores for this level and all after.
 * If not complete, set scores to 85 for this level and all before.
 */
export async function toggleLevel(
  userId: string,
  levelIndex: number,
  examIds: string[],
  currentlyComplete: boolean
): Promise<Record<string, number>> {
  const userRef = doc(usersCol, userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return {};
  const data = snap.data() as UserDoc;
  const scores = { ...(data.scores || {}) };

  if (currentlyComplete) {
    // Remove scores for this level and all after
    for (let i = levelIndex; i < examIds.length; i++) {
      delete scores[examIds[i]];
    }
  } else {
    // Set 85 for this level and all before
    for (let i = 0; i <= levelIndex; i++) {
      if ((scores[examIds[i]] || 0) < 85) {
        scores[examIds[i]] = 85;
      }
    }
  }

  await updateDoc(userRef, { scores });
  return scores;
}
