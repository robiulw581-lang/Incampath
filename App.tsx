import React, { useState, useEffect } from 'react';
import { import { auth, googleProvider } from "./firebase";
import { signInWithPopup } from "firebase/auth";
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  addDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  LogOut, 
  Home,
  Briefcase,
  Users,
  User as UserIcon,
  TrendingUp,
  CheckCircle2,
  Clock,
  Wallet,
  Bell,
  BellOff,
  Gift,
  ShieldAlert,
  Headphones,
  ChevronRight,
  Star,
  Copy,
  Check,
  Share2,
  History,
  Shield,
  MessageSquare,
  AlertTriangle,
  CreditCard,
  Settings,
  RefreshCw,
  Calendar,
  PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Helper Functions ---
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// --- Types & Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface Task {
  title: string;
  reward: string;
  rewardValue: number;
  time: string;
  description: string;
  icon: any;
  color: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  balance: number;
  tasksCompleted: number;
  successRate: number;
  level: number;
  referralCode: string;
  referredBy?: string;
  totalEarnings?: number;
  totalReferrals?: number;
  fcmToken?: string;
  role?: 'user' | 'admin';
  lastCheckIn?: string;
  checkInStreak?: number;
  taskHistory?: {
    title: string;
    reward: number;
    completedAt: string;
  }[];
  appRating?: number;
}

interface AppSettings {
  adReward: number;
  dailyCheckInRewards: number[];
  referralCommissionRate: number;
}

interface AdHistory {
  uid: string;
  date: string;
  count: number;
}

interface Notification {
  id?: string;
  title: string;
  body: string;
  sentAt: string;
  target: string;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

function handleAuthError(error: any) {
  console.error('Auth Error:', error);
}

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const LoginPage = () => { 
  const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log(result.user);
  } catch (error) {
    console.log(error);
  }
};
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferredBy(ref);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Find referrer UID if ref code exists
        let referrerUid = '';
        if (referredBy) {
          const q = query(collection(db, 'users'), where('referralCode', '==', referredBy), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            referrerUid = querySnapshot.docs[0].id;
          }
        }

        // Initialize user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || email.split('@')[0],
          balance: 0,
          tasksCompleted: 0,
          successRate: 0,
          level: 1,
          referralCode: generateReferralCode(),
          referredBy: referrerUid,
          role: 'user',
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("Sign-in method not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable 'Email/Password'.");
      } else {
        setError(err.message);
      }
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || userCredential.user.email?.split('@')[0],
          balance: 0,
          tasksCompleted: 0,
          successRate: 0,
          level: 1,
          referralCode: generateReferralCode(),
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("Google Sign-in not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable 'Google'.");
      } else {
        setError(err.message);
      }
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Income Path</h1>
          <p className="text-neutral-500 mt-2 font-medium">Earn Money By Completing Tasks</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-200/50">
          <h2 className="text-xl font-bold text-neutral-900 mb-6 text-center">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>
          
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
<button
 type="button"
 onClick={loginWithGoogle}
 className="w-full bg-red-500 text-white py-3 rounded-xl mt-4"
>
Login with Google
</button>
            {error && (
              <div className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100 leading-relaxed">
                {error}
                {error.includes("Firebase Console") && (
                  <div className="mt-2">
                    <a 
                      href="https://console.firebase.google.com/project/gen-lang-client-0460931531/authentication/providers" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-bold"
                    >
                      Open Firebase Console Settings
                    </a>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Login")}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-neutral-200 w-full"></div>
              <span className="bg-white px-4 text-sm text-neutral-400 font-medium absolute">or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all font-semibold text-neutral-700"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Google
              </button>
              <button 
                className="flex items-center justify-center gap-2 py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all font-semibold text-neutral-700"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook" className="w-5 h-5" />
                Facebook
              </button>
            </div>
          </div>

          <p className="text-center mt-8 text-neutral-500 font-medium">
            {isSignUp ? "Already have an account?" : "Don't have an account?"} 
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="ml-1 text-emerald-600 font-bold hover:underline"
            >
              {isSignUp ? "Login" : "Sign Up"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const availableTasks: Task[] = [
  { 
    title: "Watch Video Ads", 
    reward: "$0.50", 
    rewardValue: 0.5,
    time: "30s", 
    icon: Clock, 
    color: "bg-blue-50 text-blue-500",
    description: "Watch a short 30-second video advertisement to earn a quick reward. You can complete this task multiple times a day to boost your earnings."
  },
  { 
    title: "Complete Survey", 
    reward: "$2.00", 
    rewardValue: 2.0,
    time: "5m", 
    icon: CheckCircle2, 
    color: "bg-emerald-50 text-emerald-500",
    description: "Participate in a market research survey about your daily habits. Your feedback is valuable to brands and helps them improve their products."
  },
  { 
    title: "App Install", 
    reward: "$1.50", 
    rewardValue: 1.5,
    time: "2m", 
    icon: TrendingUp, 
    color: "bg-purple-50 text-purple-500",
    description: "Download and install a featured app from the store. Open the app for at least 30 seconds to verify the installation and claim your reward."
  },
];

const AdminPanel = ({ settings }: { settings: AppSettings }) => {
  const [newAdReward, setNewAdReward] = useState(settings.adReward || 0.01);
  const [newCheckInRewards, setNewCheckInRewards] = useState((settings.dailyCheckInRewards || [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05]).join(', '));
  const [newCommission, setNewCommission] = useState(settings.referralCommissionRate || 0.02);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateSettings = async () => {
    setIsSaving(true);
    try {
      const rewardsArray = newCheckInRewards.split(',').map(r => Number(r.trim()));
      await setDoc(doc(db, 'settings', 'global'), {
        adReward: Number(newAdReward),
        dailyCheckInRewards: rewardsArray,
        referralCommissionRate: Number(newCommission),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Settings updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifBody) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title: notifTitle,
        body: notifBody,
        target: 'all',
        sentAt: new Date().toISOString()
      });
      setNotifTitle('');
      setNotifBody('');
      alert('Notification sent to all users!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="p-6 space-y-6 max-w-md mx-auto pb-24">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900">Admin Panel</h2>
      </div>

      {/* Rewards Configuration */}
      <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm space-y-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <Gift className="w-5 h-5 text-emerald-500" />
          Rewards Config
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Ad Reward ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={newAdReward}
              onChange={(e) => setNewAdReward(Number(e.target.value))}
              className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Daily Check-in Rewards (comma separated for 7 days)</label>
            <input 
              type="text" 
              value={newCheckInRewards}
              onChange={(e) => setNewCheckInRewards(e.target.value)}
              className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Referral Commission (0.02 = 2%)</label>
            <input 
              type="number" 
              step="0.01"
              value={newCommission}
              onChange={(e) => setNewCommission(Number(e.target.value))}
              className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleUpdateSettings}
          disabled={isSaving}
          className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Update Settings"}
        </button>
      </div>

      {/* Push Notifications */}
      <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm space-y-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          Send Push Notification
        </h3>
        
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Notification Title"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:border-indigo-500 outline-none transition-all"
          />
          <textarea 
            placeholder="Notification Message"
            value={notifBody}
            onChange={(e) => setNotifBody(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        <button
          onClick={handleSendNotification}
          disabled={isSaving || !notifTitle || !notifBody}
          className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? "Sending..." : "Send to All Users"}
        </button>
      </div>
    </main>
  );
};

const Dashboard = ({ user }: { user: User }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [copied, setCopied] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<FirestoreErrorInfo | null>(null);
  const [takingLong, setTakingLong] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    adReward: 0.50,
    dailyCheckInRewards: [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05],
    referralCommissionRate: 0.02
  });
  const [adCountToday, setAdCountToday] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Fetch global settings
    const settingsRef = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      } else {
        // Initialize settings if they don't exist (first time admin setup)
        setDoc(settingsRef, {
          adReward: 0.50,
          dailyCheckInRewards: [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05],
          referralCommissionRate: 0.02
        }).catch(err => console.error("Error initializing settings:", err));
      }
    });

    // Fetch ad history for today
    const today = new Date().toISOString().split('T')[0];
    const adHistoryRef = doc(db, 'adHistory', `${user.uid}_${today}`);
    const unsubAdHistory = onSnapshot(adHistoryRef, (doc) => {
      if (doc.exists()) {
        setAdCountToday(doc.data().count);
      } else {
        setAdCountToday(0);
      }
    });

    // Fetch notifications
    const q = query(collection(db, 'notifications'), where('target', 'in', [user.uid, 'all']), limit(10));
    const unsubNotifications = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));
    });

    return () => {
      unsubSettings();
      unsubAdHistory();
      unsubNotifications();
    };
  }, [user.uid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (profileLoading) setTakingLong(true);
    }, 8000);

    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
        setProfileLoading(false);
        setTakingLong(false);
      } else {
        try {
          await setDoc(docRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            balance: 0,
            tasksCompleted: 0,
            successRate: 0,
            level: 1,
            referralCode: generateReferralCode(),
            totalEarnings: 0,
            totalReferrals: 0,
            taskHistory: [],
            appRating: 0,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          const errInfo = handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          setLoadingError(errInfo);
          setProfileLoading(false);
        }
      }
    }, (error) => {
      const errInfo = handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setLoadingError(errInfo);
      setProfileLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user.uid, user.email, user.displayName]);

  const copyReferralLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}?ref=${profile.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-neutral-500 font-medium">Loading your profile...</p>
        {takingLong && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-4"
          >
            <p className="text-sm text-neutral-400">This is taking longer than expected.</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-emerald-600 font-bold text-sm hover:underline"
            >
              Retry Connection
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  if (!profile || loadingError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">
          {loadingError ? "Connection Error" : "Profile Error"}
        </h2>
        <p className="text-neutral-500 mb-6 max-w-xs mx-auto">
          {loadingError 
            ? `We encountered an issue connecting to the database: ${loadingError.error}`
            : "We couldn't load your profile. Please try logging out and back in."}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg"
          >
            Retry
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="text-neutral-500 font-bold py-2"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const availableTasks: Task[] = [
    { 
      title: "Watch Video Ads", 
      reward: "$0.50", 
      rewardValue: 0.5,
      time: "30s", 
      icon: Clock, 
      color: "bg-blue-50 text-blue-500",
      description: "Watch a short 30-second video advertisement to earn a quick reward. You can complete this task multiple times a day to boost your earnings."
    },
    { 
      title: "Complete Survey", 
      reward: "$2.00", 
      rewardValue: 2.0,
      time: "5m", 
      icon: CheckCircle2, 
      color: "bg-emerald-50 text-emerald-500",
      description: "Participate in a market research survey about your daily habits. Your feedback is valuable to brands and helps them improve their products."
    },
    { 
      title: "App Install", 
      reward: "$1.50", 
      rewardValue: 1.5,
      time: "2m", 
      icon: TrendingUp, 
      color: "bg-purple-50 text-purple-500",
      description: "Download and install a featured app from the store. Open the app for at least 30 seconds to verify the installation and claim your reward."
    },
  ];

  const handleCompleteTask = async (task: Task) => {
    if (!profile) return;
    setCompletingTask(true);
    try {
      const newBalance = profile.balance + task.rewardValue;
      const newTotalEarnings = (profile.totalEarnings || 0) + task.rewardValue;
      const newTasksCompleted = profile.tasksCompleted + 1;
      
      const newTaskHistoryItem = {
        title: task.title,
        reward: task.rewardValue,
        completedAt: new Date().toISOString()
      };

      const currentHistory = profile.taskHistory || [];
      const updatedHistory = [newTaskHistoryItem, ...currentHistory].slice(0, 50); // Keep last 50

      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        totalEarnings: newTotalEarnings,
        tasksCompleted: newTasksCompleted,
        taskHistory: updatedHistory,
        successRate: Math.min(100, Math.floor((newTasksCompleted / (newTasksCompleted + 1)) * 100)) // Simple mock logic
      });

      // Handle Referral Commission
      if (profile.referredBy) {
        const referrerRef = doc(db, 'users', profile.referredBy);
        const referrerSnap = await getDoc(referrerRef);
        if (referrerSnap.exists()) {
          const referrerData = referrerSnap.data() as UserProfile;
          const commission = task.rewardValue * settings.referralCommissionRate;
          await updateDoc(referrerRef, {
            balance: referrerData.balance + commission,
            totalEarnings: (referrerData.totalEarnings || 0) + commission
          });
        }
      }

      setSelectedTask(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setCompletingTask(false);
    }
  };

  const handleWatchAd = async () => {
    if (!profile) return;
    if (adCountToday >= 10) {
      alert("Daily ad limit reached (10/day). Come back tomorrow!");
      return;
    }

    setCompletingTask(true);
    try {
      // Simulate watching ad
      await new Promise(resolve => setTimeout(resolve, 2000));

      const today = new Date().toISOString().split('T')[0];
      const adHistoryRef = doc(db, 'adHistory', `${user.uid}_${today}`);
      const userRef = doc(db, 'users', user.uid);

      await setDoc(adHistoryRef, {
        uid: user.uid,
        date: today,
        count: adCountToday + 1
      }, { merge: true });

      await updateDoc(userRef, {
        balance: profile.balance + settings.adReward,
        totalEarnings: (profile.totalEarnings || 0) + settings.adReward
      });

      alert(`Ad completed! You earned $${settings.adReward.toFixed(2)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setCompletingTask(false);
    }
  };

  const handleDailyCheckIn = async () => {
    if (!profile) return;
    
    const now = new Date();
    const lastCheckIn = profile.lastCheckIn ? new Date(profile.lastCheckIn) : null;
    
    if (lastCheckIn && lastCheckIn.toDateString() === now.toDateString()) {
      alert("You already checked in today!");
      return;
    }

    let newStreak = 1;
    if (lastCheckIn) {
      const diffTime = Math.abs(now.getTime() - lastCheckIn.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak = (profile.checkInStreak || 0) % 7 + 1;
      }
    }

    const rewards = settings.dailyCheckInRewards || [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05];
    const reward = rewards[newStreak - 1] || 0.01;
    const userRef = doc(db, 'users', user.uid);

    try {
      await updateDoc(userRef, {
        balance: profile.balance + reward,
        totalEarnings: (profile.totalEarnings || 0) + reward,
        lastCheckIn: now.toISOString(),
        checkInStreak: newStreak
      });
      alert(`Day ${newStreak} Check-in successful! Earned $${reward.toFixed(2)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <main className="p-6 space-y-6 max-w-md mx-auto">
            {/* Daily Check-in Section */}
            <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Daily Check-in
                </h3>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Streak: {profile.checkInStreak || 0} Days
                </span>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isCompleted = (profile.checkInStreak || 0) >= day;
                  const isCurrent = (profile.checkInStreak || 0) + 1 === day;
                  const rewards = settings.dailyCheckInRewards || [0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.05];
                  const reward = rewards[day - 1] || 0.01;
                  
                  return (
                    <div 
                      key={day}
                      className={`flex flex-col items-center p-2 rounded-xl border ${
                        isCompleted 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : isCurrent 
                            ? 'bg-white border-emerald-500 text-emerald-500 shadow-sm' 
                            : 'bg-neutral-50 border-neutral-100 text-neutral-400'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase mb-1">D{day}</span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-[10px] font-black">${reward}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleDailyCheckIn}
                disabled={(() => {
                  if (!profile.lastCheckIn) return false;
                  const last = new Date(profile.lastCheckIn);
                  const now = new Date();
                  return last.toDateString() === now.toDateString();
                })()}
                className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
              >
                {(() => {
                  if (!profile.lastCheckIn) return "Claim Daily Reward";
                  const last = new Date(profile.lastCheckIn);
                  const now = new Date();
                  return last.toDateString() === now.toDateString() ? "Already Claimed" : "Claim Daily Reward";
                })()}
              </button>
            </div>

            {/* Ad Reward Section */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Watch & Earn</h3>
                    <p className="text-indigo-100 text-xs">Earn ${settings.adReward || 0.01} per ad</p>
                  </div>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                  {adCountToday}/10 Today
                </div>
              </div>

              <button
                onClick={handleWatchAd}
                disabled={adCountToday >= 10}
                className="w-full py-3 rounded-2xl bg-white text-indigo-600 font-bold shadow-xl disabled:opacity-50 transition-all active:scale-95"
              >
                {adCountToday >= 10 ? "Daily Limit Reached" : "Watch Rewarded Ad"}
              </button>
            </div>

            {/* Feature Cards (Horizontal Scroll) */}
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
              <div className="min-w-[280px] bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-200/50">
                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">Referral System</h3>
                <p className="text-emerald-50 text-sm leading-relaxed">Referral system is now live! Earn $0.10 per friend.</p>
              </div>

              <div className="min-w-[280px] bg-gradient-to-br from-orange-400 to-red-500 p-6 rounded-[2rem] text-white shadow-lg shadow-orange-200/50">
                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">Security Alert</h3>
                <p className="text-orange-50 text-sm leading-relaxed">Never share your password with anyone.</p>
              </div>

              <div className="min-w-[280px] bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-lg shadow-purple-200/50">
                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">Daily Bonus</h3>
                <p className="text-purple-50 text-sm leading-relaxed">Complete 5 tasks today to get extra bonus.</p>
              </div>

              <div className="min-w-[280px] bg-gradient-to-br from-rose-500 to-pink-600 p-6 rounded-[2rem] text-white shadow-lg shadow-rose-200/50">
                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                  <Headphones className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">Support</h3>
                <p className="text-rose-50 text-sm leading-relaxed">Need help? Contact support anytime.</p>
              </div>
            </div>

            {/* Level Progress Card */}
            <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm flex items-center gap-6">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                  <circle 
                    cx="40" cy="40" r="36" fill="none" stroke="#10B981" strokeWidth="8" 
                    strokeDasharray={226} 
                    strokeDashoffset={226 - (226 * (profile.tasksCompleted % 10)) / 10}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-neutral-400 font-bold uppercase">Lvl</span>
                  <span className="text-xl font-black text-neutral-900">{profile.level}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-neutral-900 mb-1">Level {profile.level}</h3>
                <p className="text-neutral-500 text-sm font-medium">
                  Complete {10 - (profile.tasksCompleted % 10)} tasks to reach Level {profile.level + 1}.
                </p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-3xl font-black text-neutral-900">{profile.tasksCompleted}</p>
                <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider mt-1">Completed Tasks</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-3xl font-black text-neutral-900">{profile.successRate}%</p>
                <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider mt-1">Success Rate</p>
              </div>
            </div>

            {/* Task Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                  Available Tasks
                </h3>
                <button className="text-emerald-600 text-sm font-bold">View All</button>
              </div>
              
              <div className="space-y-4">
                {availableTasks.map((task, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between group cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${task.color} rounded-2xl flex items-center justify-center`}>
                        <task.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900">{task.title}</h4>
                        <p className="text-neutral-400 text-xs font-bold uppercase tracking-tight">{task.time} • {task.reward}</p>
                      </div>
                    </div>
                    <button className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </main>
        );
      case 'refer':
        return (
          <main className="p-6 space-y-8 max-w-md mx-auto">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-neutral-900">Invite & Earn</h2>
              <p className="text-neutral-500 font-medium">
                Share your referral link with friends and earn <span className="text-emerald-600 font-bold">$0.10</span> for every successful signup.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Your Referral Code</label>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center justify-between">
                  <span className="text-xl font-black text-neutral-900 tracking-widest">{profile.referralCode}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(profile.referralCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-emerald-600"
                  >
                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Referral Link</label>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-neutral-600 truncate">
                    {window.location.origin}?ref={profile.referralCode}
                  </span>
                  <button 
                    onClick={copyReferralLink}
                    className="flex-shrink-0 w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-emerald-600 transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                onClick={copyReferralLink}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all"
              >
                Share Link Now
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 text-center">
                <p className="text-2xl font-black text-neutral-900">0</p>
                <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mt-1">Total Refers</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 text-center">
                <p className="text-2xl font-black text-neutral-900">$0.00</p>
                <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mt-1">Refer Earnings</p>
              </div>
            </div>
          </main>
        );
      case 'tasks':
        return (
          <main className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center">
              <Briefcase className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">Task Center</h2>
            <p className="text-neutral-500 max-w-[200px]">More tasks are coming soon. Keep checking!</p>
          </main>
        );
      case 'notifications':
        return (
          <main className="p-6 space-y-6 max-w-md mx-auto pb-24">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-neutral-900">Notifications</h2>
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {notifications.length} New
              </span>
            </div>
            
            <div className="space-y-4">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex-shrink-0 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-neutral-900 mb-1">{notif.title}</h4>
                      <p className="text-neutral-500 text-sm leading-relaxed mb-2">{notif.body}</p>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        {new Date(notif.sentAt).toLocaleDateString()} • {new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BellOff className="w-8 h-8 text-neutral-300" />
                  </div>
                  <p className="text-neutral-400 font-medium">No notifications yet</p>
                </div>
              )}
            </div>
          </main>
        );
      case 'admin':
        return profile?.role === 'admin' ? <AdminPanel settings={settings} /> : null;
      case 'profile':
        return (
          <main className="p-6 space-y-6 max-w-md mx-auto pb-24">
            {/* 1. User Card */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-200 shadow-sm flex items-center gap-4">
              <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-10 h-10 text-neutral-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-neutral-900">{profile.displayName}</h2>
                <p className="text-neutral-400 text-sm font-medium">{profile.email}</p>
              </div>
              <button className="p-2 bg-neutral-50 rounded-xl text-neutral-400">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Wallet Section */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[2.5rem] text-white shadow-lg shadow-emerald-200/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-200" />
                  <span className="text-sm font-bold uppercase tracking-wider text-emerald-100">My Wallet</span>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-tight mb-1">Current Balance</p>
                  <p className="text-3xl font-black">${profile.balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-tight mb-1">Total Earnings</p>
                  <p className="text-2xl font-black text-emerald-50">${(profile.totalEarnings || 0).toFixed(2)}</p>
                </div>
              </div>

              <button className="w-full bg-white text-emerald-700 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5" />
                Withdraw Funds
              </button>
            </div>

            {/* 3. Referral Section */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Referral Program
                </h3>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {profile.totalReferrals || 0} Referrals
                </span>
              </div>
              
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center justify-between gap-3">
                <div className="truncate text-sm font-medium text-neutral-500">
                  {window.location.origin}?ref={profile.referralCode}
                </div>
                <button 
                  onClick={copyReferralLink}
                  className="flex-shrink-0 w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-emerald-600 transition-colors"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 4. Task History */}
            <div className="space-y-4">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2 px-2">
                <History className="w-5 h-5 text-blue-600" />
                Task History
              </h3>
              <div className="space-y-3">
                {profile.taskHistory && profile.taskHistory.length > 0 ? (
                  profile.taskHistory.slice(0, 5).map((task, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl border border-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-neutral-900">{task.title}</h4>
                          <p className="text-neutral-400 text-[10px] font-bold uppercase">{new Date(task.completedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="font-black text-emerald-600 text-sm">+${task.reward.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-8 rounded-3xl border border-dashed border-neutral-300 text-center">
                    <p className="text-neutral-400 text-sm font-medium">No tasks completed yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Security Settings */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Security Settings
              </h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-neutral-400 group-hover:text-indigo-600" />
                    <span className="text-sm font-bold text-neutral-700">Change Password</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-300" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-neutral-400 group-hover:text-indigo-600" />
                    <span className="text-sm font-bold text-neutral-700">Two-Factor Auth</span>
                  </div>
                  <div className="bg-neutral-200 w-10 h-5 rounded-full relative">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                  </div>
                </button>
              </div>
            </div>

            {/* 6. Support */}
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex flex-col items-center gap-2 hover:bg-neutral-50 transition-colors">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-rose-500" />
                </div>
                <span className="text-xs font-bold text-neutral-700">Contact Support</span>
              </button>
              <button className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex flex-col items-center gap-2 hover:bg-neutral-50 transition-colors">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <span className="text-xs font-bold text-neutral-700">Report Problem</span>
              </button>
            </div>

            {/* 7. App Rating */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-200 shadow-sm text-center space-y-4">
              <h3 className="font-bold text-neutral-900">Rate Your Experience</h3>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'users', user.uid), { appRating: star });
                      } catch (err) {
                        console.error("Error updating rating:", err);
                      }
                    }}
                    className="p-1"
                  >
                    <Star 
                      className={`w-8 h-8 ${star <= (profile.appRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-neutral-400 text-xs font-medium">Your feedback helps us improve!</p>
            </div>

            {/* 8. Logout Button */}
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center justify-center gap-3 py-5 bg-red-50 text-red-600 font-black rounded-[2rem] hover:bg-red-100 transition-all border border-red-100"
            >
              <LogOut className="w-6 h-6" />
              Sign Out Account
            </button>
          </main>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Top Section */}
      <header className="bg-white px-6 py-6 flex items-center justify-between sticky top-0 z-20 shadow-sm border-b border-neutral-100">
        <div className="flex flex-col">
          <span className="text-neutral-400 text-sm font-medium">Welcome back,</span>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{profile.displayName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-neutral-50 rounded-xl text-neutral-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-emerald-100">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-700 text-lg">${profile.balance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4 flex items-center justify-between z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'home' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'tasks' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Tasks</span>
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'notifications' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">Notifs</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'profile' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Profile</span>
        </button>
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-neutral-400'}`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Admin</span>
          </button>
        )}
      </nav>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-md bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={`w-20 h-20 ${selectedTask.color} rounded-[2rem] flex items-center justify-center shadow-lg`}>
                  <selectedTask.icon className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-neutral-900">{selectedTask.title}</h3>
                  <div className="flex items-center justify-center gap-3">
                    <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-black border border-emerald-100">
                      Reward: {selectedTask.reward}
                    </span>
                    <span className="bg-neutral-50 text-neutral-500 px-4 py-1.5 rounded-full text-sm font-bold border border-neutral-100">
                      {selectedTask.time}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 w-full">
                  <p className="text-neutral-600 text-sm leading-relaxed font-medium">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="w-full grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="py-4 bg-neutral-100 text-neutral-500 font-bold rounded-2xl hover:bg-neutral-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={completingTask}
                    onClick={() => handleCompleteTask(selectedTask)}
                    className="py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {completingTask ? "Completing..." : "Complete Task"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {user ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard user={user} />
          </motion.div>
        ) : (
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginPage />
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}


