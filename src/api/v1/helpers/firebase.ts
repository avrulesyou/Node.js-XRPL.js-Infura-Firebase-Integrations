import * as admin from 'firebase-admin';
import serviceAccount from '../../../config/serviceAccountKey.json';

// Initialize Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Firestore database instance
const db: admin.firestore.Firestore = admin.firestore();

export default db;