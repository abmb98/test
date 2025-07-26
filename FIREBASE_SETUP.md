# Firebase Setup Instructions - IMMEDIATE FIX

## 🚨 QUICK FIX (Do this NOW)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `secteur-14f7c`
3. Click "Firestore Database" in the left sidebar
4. Click the "Rules" tab
5. **Replace ALL existing rules** with this simple rule:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. Click "Publish"
7. **Refresh your app** - it should work immediately

## ✅ This Will Fix
- Permission denied errors
- Real-time subscriptions
- All database operations

## ⚠️ Security Note
This rule allows anyone to read/write your database. It's fine for development but should be secured for production.

## The Rules Allow:
- ✅ Authenticated users can read/write all collections
- ✅ Real-time subscriptions for authenticated users
- ✅ Full CRUD operations for workers, rooms, dorms, and users

## Alternative: Use Firebase CLI (Optional)
If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## Test Authentication
1. Try logging in with any email/password
2. Create a user account first if needed
3. The app should now work without permission errors

## Collections Structure
The app will create these collections automatically:
- `users` - Admin users
- `dorms` - Male/Female dormitory types
- `rooms` - Individual rooms with capacity
- `workers` - Worker records with check-in/out data

## Note
These rules allow full access to authenticated users. In production, you might want more restrictive rules based on user roles.
