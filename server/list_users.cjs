const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listUsers() {
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().email, '| Role:', doc.data().role);
  });
}

listUsers();
