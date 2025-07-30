// Firebase Configuration and Setup
class FirebaseConfig {
    static getConfig() {
        // Конфігурація для браузера (без process.env)
        return {
            apiKey: "AIzaSyDT_5CQ_NrbmGKuYiXjJs_2uSw62fVK4QY",
            authDomain: "word-bot-ua.firebaseapp.com",
            databaseURL: "https://word-bot-ua-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "word-bot-ua",
            storageBucket: "word-bot-ua.firebasestorage.app",
            messagingSenderId: "1043590586166",
            appId: "1:1043590586166:web:5a461a3f61ef5d2db3d4c7",
            measurementId: "G-TMBHNXWKDK"
        };
    }

    static getRules() {
        // Firebase Realtime Database Security Rules
        return `{
  "rules": {
    // Rooms - accessible to authenticated users
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.child('hostId').val() == auth.uid || data.child('players').child(auth.uid).exists())",
        
        "players": {
          "$playerId": {
            ".write": "auth != null && $playerId == auth.uid"
          }
        },
        
        "gameState": {
          ".write": "auth != null && (root.child('rooms').child($roomCode).child('hostId').val() == auth.uid || root.child('rooms').child($roomCode).child('players').child(auth.uid).exists())"
        },
        
        "gameActions": {
          ".write": "auth != null && root.child('rooms').child($roomCode).child('players').child(auth.uid).exists()",
          "$actionId": {
            ".validate": "newData.hasChildren(['type', 'playerId', 'timestamp']) && newData.child('playerId').val() == auth.uid"
          }
        }
      }
    },
    
    // User profiles - only the user can write to their own profile
    "users": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && $userId == auth.uid",
        ".validate": "newData.hasChildren(['name', 'createdAt'])"
      }
    },
    
    // Game statistics - readable by all, writable by the user
    "statistics": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && $userId == auth.uid"
      }
    }
  }
}`;
    }

    static getIndexes() {
        // Firebase Realtime Database Indexes for better performance
        return `{
  "rules": {
    "rooms": {
      ".indexOn": ["createdAt", "hostId"]
    },
    "users": {
      ".indexOn": ["createdAt", "lastSeen"]
    }
  }
}`;
    }
}

// Firebase Setup Helper
class FirebaseSetup {
    static async initialize() {
        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded. Please include Firebase scripts in your HTML.');
            }

            // Check if already initialized
            if (firebase.apps.length > 0) {
                console.log('Firebase already initialized');
                return firebase.app();
            }

            // Initialize Firebase
            const config = FirebaseConfig.getConfig();
            const app = firebase.initializeApp(config);
            
            console.log('Firebase initialized successfully');
            return app;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    static async setupDatabase() {
        try {
            const app = await this.initialize();
            const database = firebase.database();
            
            // Test connection
            const connectedRef = database.ref('.info/connected');
            return new Promise((resolve, reject) => {
                connectedRef.once('value', (snapshot) => {
                    if (snapshot.val() === true) {
                        console.log('Firebase Database connected');
                        resolve(database);
                    } else {
                        reject(new Error('Failed to connect to Firebase Database'));
                    }
                });
            });
        } catch (error) {
            console.error('Firebase Database setup failed:', error);
            throw error;
        }
    }

    static async setupAuth() {
        try {
            await this.initialize();
            const auth = firebase.auth();
            
            // Configure auth settings
            auth.useDeviceLanguage(); // Use device language for auth UI
            
            return auth;
        } catch (error) {
            console.error('Firebase Auth setup failed:', error);
            throw error;
        }
    }

    static createRoomCleanupFunction() {
        // Cloud Function to clean up old rooms (pseudo-code)
        return `
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.cleanupOldRooms = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const database = admin.database();
    const roomsRef = database.ref('rooms');
    
    const snapshot = await roomsRef.once('value');
    const rooms = snapshot.val() || {};
    
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    const promises = [];
    
    Object.keys(rooms).forEach(roomCode => {
      const room = rooms[roomCode];
      const roomAge = now - (room.createdAt || 0);
      
      // Delete rooms older than 1 hour with no activity
      if (roomAge > ONE_HOUR && 
          (!room.gameState || room.gameState.status === 'finished')) {
        console.log(\`Deleting old room: \${roomCode}\`);
        promises.push(roomsRef.child(roomCode).remove());
      }
    });
    
    await Promise.all(promises);
    console.log(\`Cleaned up \${promises.length} old rooms\`);
  });
`;
    }

    static getInstallationInstructions() {
        return `
# Firebase Setup Instructions

## 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter project name: "word-game-multiplayer"
4. Enable Google Analytics (optional)
5. Create project

## 2. Setup Realtime Database
1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose location (closest to your users)
4. Start in "Test mode" (we'll add security rules later)

## 3. Get Configuration
1. Go to Project Settings (gear icon)
2. In "Your apps" section, click "Web" icon
3. Register app with nickname "word-game-web"
4. Copy the firebaseConfig object
5. Replace the config in firebase-config.js

## 4. Setup Security Rules
1. Go to "Realtime Database" > "Rules"
2. Replace default rules with the rules from FirebaseConfig.getRules()
3. Click "Publish"

## 5. Enable Authentication
1. Go to "Authentication" > "Sign-in method"
2. Enable "Anonymous" authentication
3. Save

## 6. Add Firebase SDK to HTML
Add these scripts to your index.html before other scripts:

<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

## 7. Environment Variables (Optional)
For production, use environment variables:
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_DATABASE_URL
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID

## 8. Deploy (Optional)
Use Firebase Hosting for easy deployment:
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
`;
    }
}

// Environment Config Extension
if (typeof window !== 'undefined' && window.EnvironmentConfig) {
    // Extend existing EnvironmentConfig
    window.EnvironmentConfig.isFirebaseEnabled = function() {
        return true; // Set to false to disable Firebase
    };
    
    window.EnvironmentConfig.getFirebaseConfig = function() {
        return FirebaseConfig.getConfig();
    };
}

// Export
if (typeof window !== 'undefined') {
    window.FirebaseConfig = FirebaseConfig;
    window.FirebaseSetup = FirebaseSetup;
}
