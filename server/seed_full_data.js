/**
 * Seed Firestore with comprehensive initial data:
 * - People (Anna, Ravi, Dr. Priya, Mohan)
 * - Places (Home Garden, Munnar Tea Hills, Living Room, Central Park, Dining Table)
 * - Memories with real photos, dates, locations, narrations, and tags
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seedUser(userId, userEmail) {
  console.log(`Seeding data for user: ${userEmail} (${userId})...`);
  const userRef = db.collection('users').doc(userId);

  // 1. SEED PEOPLE
  const peopleData = [
    {
      id: 'person_anna',
      name: 'Anna Sharma',
      relation: 'Daughter',
      notes: 'Loves painting and gardening. Visits every Sunday morning with fresh flowers.',
      photo: '/anna.jpg',
      phone: '+91 98450 12345',
      createdAt: '2023-01-15T09:00:00.000Z',
      updatedAt: '2023-01-15T09:00:00.000Z',
    },
    {
      id: 'person_ravi',
      name: 'Ravi Sharma',
      relation: 'Son',
      notes: 'Software engineer living in Bengaluru. Calls every evening at 7:00 PM.',
      photo: '/ravi.jpg',
      phone: '+91 98450 54321',
      createdAt: '2023-01-15T09:00:00.000Z',
      updatedAt: '2023-01-15T09:00:00.000Z',
    },
    {
      id: 'person_priya',
      name: 'Dr. Priya Mehta',
      relation: 'Family Physician',
      notes: 'Friendly doctor for monthly wellness and memory checkups.',
      photo: '/priya.jpg',
      phone: '+91 98450 99887',
      createdAt: '2023-02-10T10:00:00.000Z',
      updatedAt: '2023-02-10T10:00:00.000Z',
    },
    {
      id: 'person_mohan',
      name: 'Mohan Sharma',
      relation: 'Brother',
      notes: 'Loves reminiscing about childhood in Kerala and listening to classical music.',
      photo: '/mohan.jpg',
      phone: '+91 98450 67890',
      createdAt: '2023-02-12T11:00:00.000Z',
      updatedAt: '2023-02-12T11:00:00.000Z',
    }
  ];

  for (const p of peopleData) {
    const { id, ...data } = p;
    await userRef.collection('people').doc(id).set(data, { merge: true });
  }
  console.log(`✓ Seeded ${peopleData.length} people`);

  // 2. SEED PLACES
  const placesData = [
    {
      id: 'place_garden',
      name: 'Home Garden',
      label: 'Backyard Rose Garden',
      description: 'Our quiet morning sanctuary with blooming roses, marigolds, and birds singing.',
      photo: '/family-garden.jpg',
      address: 'Home Backyard, Bangalore',
      createdAt: '2023-01-20T08:00:00.000Z',
      updatedAt: '2023-01-20T08:00:00.000Z',
    },
    {
      id: 'place_munnar',
      name: 'Munnar Tea Hills',
      label: 'Munnar, Kerala',
      description: 'Misty mountain tea plantations, fresh mountain air, and scenic viewpoint walks.',
      photo: '/munnar.jpg',
      address: 'Idukki District, Kerala',
      createdAt: '2023-02-01T08:00:00.000Z',
      updatedAt: '2023-02-01T08:00:00.000Z',
    },
    {
      id: 'place_living_room',
      name: 'Living Room',
      label: 'Reading Corner & Bookshelf',
      description: 'Cozy yellow armchair by the sunny window with family photo albums.',
      photo: '/home.jpg',
      address: 'Main Floor, Home',
      createdAt: '2023-02-05T08:00:00.000Z',
      updatedAt: '2023-02-05T08:00:00.000Z',
    },
    {
      id: 'place_central_park',
      name: 'City Central Park',
      label: 'Botanical Lake Walk',
      description: 'Paved shaded walking trails beside the swan lake and seasonal flower displays.',
      photo: '/park.jpg',
      address: 'Central Park West',
      createdAt: '2023-02-15T08:00:00.000Z',
      updatedAt: '2023-02-15T08:00:00.000Z',
    },
    {
      id: 'place_dining',
      name: 'Dining Table',
      label: 'Family Kitchen & Dining',
      description: 'Where our entire family gathers for warm home-cooked Sunday dinners.',
      photo: '/family-dinner.jpg',
      address: 'Kitchen Dining Area',
      createdAt: '2023-02-20T08:00:00.000Z',
      updatedAt: '2023-02-20T08:00:00.000Z',
    }
  ];

  for (const pl of placesData) {
    const { id, ...data } = pl;
    await userRef.collection('places').doc(id).set(data, { merge: true });
  }
  console.log(`✓ Seeded ${placesData.length} places`);

  // 3. SEED MEMORIES
  const memoriesData = [
    {
      id: 'mem_garden_morning',
      title: 'Morning in the Rose Garden',
      date: '2024-04-12',
      location: 'Home Garden',
      description: 'A serene morning in our backyard garden tending to blooming roses and marigolds with Anna and Ravi. Warm sunshine and fresh breeze.',
      people: ['person_anna', 'person_ravi'],
      peopleNames: ['Anna Sharma', 'Ravi Sharma'],
      favorite: true,
      type: 'photo',
      thumbnail: '/family-garden.jpg',
      fileUrl: '/family-garden.jpg',
      photos: [
        { url: '/family-garden.jpg', filename: 'family-garden.jpg' }
      ],
      tags: ['garden', 'family', 'flowers', 'morning', 'peaceful'],
      narration: 'Do you remember this beautiful sunny morning in your garden? You and Anna were looking after the fragrant roses, and Ravi came over with hot tea. It was one of your favorite calm mornings.',
      createdAt: '2024-04-12T09:30:00.000Z',
      updatedAt: '2024-04-12T09:30:00.000Z',
    },
    {
      id: 'mem_birthday_75',
      title: '75th Birthday Celebration',
      date: '2023-11-20',
      location: 'Living Room',
      description: 'Celebrated 75th birthday surrounded by loved ones! Fresh strawberry cream cake, cheerful singing, colorful balloons, and pure joy.',
      people: ['person_anna', 'person_ravi', 'person_mohan'],
      peopleNames: ['Anna Sharma', 'Ravi Sharma', 'Mohan Sharma'],
      favorite: true,
      type: 'photo',
      thumbnail: '/birthday.jpg',
      fileUrl: '/birthday.jpg',
      photos: [
        { url: '/birthday.jpg', filename: 'birthday.jpg' }
      ],
      tags: ['birthday', 'celebration', 'cake', 'family', 'happiness'],
      narration: 'This was your 75th birthday celebration in the living room! Anna baked your favorite strawberry cake, and Ravi captured this happy moment right as you blew out the candles.',
      createdAt: '2023-11-20T18:00:00.000Z',
      updatedAt: '2023-11-20T18:00:00.000Z',
    },
    {
      id: 'mem_munnar_trip',
      title: 'Munnar Tea Estate Vacation',
      date: '2023-08-15',
      location: 'Munnar Tea Hills',
      description: 'Breathtaking mountain road trip to Munnar. Emerald tea estates stretching over undulating hills with cool mist in the morning air.',
      people: ['person_ravi', 'person_anna'],
      peopleNames: ['Ravi Sharma', 'Anna Sharma'],
      favorite: true,
      type: 'photo',
      thumbnail: '/munnar.jpg',
      fileUrl: '/munnar.jpg',
      photos: [
        { url: '/munnar.jpg', filename: 'munnar.jpg' }
      ],
      tags: ['munnar', 'vacation', 'tea', 'travel', 'nature', 'mountains'],
      narration: 'Look at the mist rolling over the Munnar hills! You loved the aroma of freshly plucked tea leaves during that memorable mountain trip with Ravi and Anna.',
      createdAt: '2023-08-15T12:00:00.000Z',
      updatedAt: '2023-08-15T12:00:00.000Z',
    },
    {
      id: 'mem_family_dinner',
      title: 'Sunday Family Feast',
      date: '2024-01-28',
      location: 'Dining Table',
      description: 'Anna cooked delicious traditional vegetable biryani and sweet saffron kheer. We shared old stories and laughed together for hours.',
      people: ['person_anna', 'person_ravi'],
      peopleNames: ['Anna Sharma', 'Ravi Sharma'],
      favorite: false,
      type: 'photo',
      thumbnail: '/family-dinner.jpg',
      fileUrl: '/family-dinner.jpg',
      photos: [
        { url: '/family-dinner.jpg', filename: 'family-dinner.jpg' }
      ],
      tags: ['dinner', 'food', 'family', 'gathering', 'sunday'],
      narration: 'A cozy Sunday feast around the dining table. The warm aroma of spices filled the house, and everyone stayed late sharing wonderful memories.',
      createdAt: '2024-01-28T19:30:00.000Z',
      updatedAt: '2024-01-28T19:30:00.000Z',
    },
    {
      id: 'mem_park_walk',
      title: 'Evening Walk by the Lake',
      date: '2024-03-05',
      location: 'City Central Park',
      description: 'Peaceful afternoon walk along the botanical lake. Sat on the wooden bench watching gentle ripples on the water and blooming flowers.',
      people: ['person_anna'],
      peopleNames: ['Anna Sharma'],
      favorite: false,
      type: 'photo',
      thumbnail: '/park.jpg',
      fileUrl: '/park.jpg',
      photos: [
        { url: '/park.jpg', filename: 'park.jpg' }
      ],
      tags: ['park', 'walk', 'nature', 'lake', 'relaxation'],
      narration: 'Your quiet walk along the botanical lake in Central Park. You rested on the wooden bench under the big willow tree, enjoying the peaceful water.',
      createdAt: '2024-03-05T16:30:00.000Z',
      updatedAt: '2024-03-05T16:30:00.000Z',
    },
    {
      id: 'mem_reading_corner',
      title: 'Afternoon in the Reading Nook',
      date: '2024-02-10',
      location: 'Living Room',
      description: 'Quiet afternoon reading classic poetry in the sunny armchair with a warm cup of herbal tea and the golden afternoon sun.',
      people: [],
      peopleNames: [],
      favorite: true,
      type: 'photo',
      thumbnail: '/home.jpg',
      fileUrl: '/home.jpg',
      photos: [
        { url: '/home.jpg', filename: 'home.jpg' }
      ],
      tags: ['home', 'reading', 'books', 'cozy', 'quiet'],
      narration: 'Your favorite sunny reading nook in the living room next to the bookshelf. So peaceful and comfortable with your favorite books and soft blanket.',
      createdAt: '2024-02-10T15:00:00.000Z',
      updatedAt: '2024-02-10T15:00:00.000Z',
    }
  ];

  for (const m of memoriesData) {
    const { id, ...data } = m;
    await userRef.collection('memories').doc(id).set(data, { merge: true });
  }
  console.log(`✓ Seeded ${memoriesData.length} memories`);

  // 4. SEED ENROLLED OBJECTS (FR-FRM-03, FR-FRM-05)
  const objectsData = [
    {
      id: 'obj_tea_box',
      name: 'Vintage Munnar Tea Box',
      category: 'Travel Keepsake',
      description: 'Wooden tea box brought back from the emerald plantations in Munnar.',
      photo: '/munnar.jpg',
      tags: ['munnar', 'tea', 'travel', 'trip'],
      createdAt: '2023-08-16T10:00:00.000Z',
    },
    {
      id: 'obj_birthday_album',
      name: '75th Birthday Photo Keepsake',
      category: 'Milestone Keepsake',
      description: 'Framed family photograph taken at the 75th birthday celebration.',
      photo: '/birthday.jpg',
      tags: ['birthday', 'celebration', 'family', '75th'],
      createdAt: '2023-05-12T10:00:00.000Z',
    },
    {
      id: 'obj_garden_pot',
      name: 'Rose Garden Ceramic Planter',
      category: 'Garden Keepsake',
      description: 'Handcrafted ceramic pot placed by the morning rose garden.',
      photo: '/family-garden.jpg',
      tags: ['garden', 'rose', 'flowers', 'morning'],
      createdAt: '2023-01-20T10:00:00.000Z',
    }
  ];

  for (const obj of objectsData) {
    const { id, ...data } = obj;
    await userRef.collection('enrolled_objects').doc(id).set(data, { merge: true });
  }
  console.log(`✓ Seeded ${objectsData.length} enrolled objects`);

  // 5. SEED REMINDERS (FR-CGD-03)
  const remindersData = [
    {
      id: 'rem_1',
      time: '10:00 AM',
      title: 'Morning Garden Walk',
      prompt: 'Take a gentle breath in the morning rose garden and listen to the birds.',
      memoryId: 'mem_garden_1',
      active: true,
      createdAt: '2024-01-01T08:00:00.000Z',
    },
    {
      id: 'rem_2',
      time: '02:00 PM',
      title: 'Reminisce about Daughter Anna',
      prompt: 'Anna loves painting and gardening. Remember her lovely smile at your birthday.',
      memoryId: 'mem_birthday_75',
      active: true,
      createdAt: '2024-01-01T08:00:00.000Z',
    },
    {
      id: 'rem_3',
      time: '07:00 PM',
      title: 'Evening Family Celebration Story',
      prompt: 'Relax and listen to the story of our Sunday family feast with Ravi and Mohan.',
      memoryId: 'mem_family_dinner',
      active: true,
      createdAt: '2024-01-01T08:00:00.000Z',
    }
  ];

  for (const r of remindersData) {
    const { id, ...data } = r;
    await userRef.collection('reminders').doc(id).set(data, { merge: true });
  }
  console.log(`✓ Seeded ${remindersData.length} reminders`);
}

async function run() {
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const user = doc.data();
    // Seed for all patient accounts or hemanth123
    if (user.role === 'patient' || user.email === 'hemanth123@gmail.com') {
      await seedUser(doc.id, user.email);
    }
  }
  console.log('ALL SEEDING COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

run().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
