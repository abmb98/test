import { dormsService, roomsService, workersService } from './firebase-service';

// Sample worker names in Arabic
const sampleWorkerNames = [
  'أحمد محمد علي',
  'فاطمة خالد سعد',
  'محمد أحمد الجابري',
  'نورا عبد الله',
  'علي حسن المصري',
  'زينب محمود',
  'يوسف إبراهيم',
  'مريم الطيب',
  'حسن عبد الرحمن',
  'عائشة سالم',
  'عمر فاروق',
  'خديجة النور',
  'إبراهيم موسى',
  'سارة أحمد',
  'محمود علي',
  'ليلى حسن',
  'طارق عبد الله',
  'رقية الزهراء',
  'سامي محمد',
  'هدى يوسف'
];

const exitReasons = [
  'انتهاء العقد',
  'استقالة',
  'نقل إلى فرع آخر',
  'إنهاء خدمات',
  'ظروف شخصية'
];

// Generate random CIN (National ID)
const generateCIN = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Generate random phone number
const generatePhone = () => {
  const prefixes = ['05', '06', '07'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return prefix + number.toString().slice(0, 8);
};

// Generate random date within the last year
const generateRandomDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

export async function initializeSampleData() {
  try {
    console.log('Starting sample data initialization...');

    // Create dorms
    console.log('Creating dorms...');
    const maleDormId = await dormsService.create({
      name: 'Male',
      name_ar: 'ذكور'
    });

    const femaleDormId = await dormsService.create({
      name: 'Female',
      name_ar: 'إناث'
    });

    console.log('Dorms created successfully');

    // Create rooms (20 for each dorm)
    console.log('Creating rooms...');
    const roomPromises = [];
    
    // Male rooms (1-20)
    for (let i = 1; i <= 20; i++) {
      roomPromises.push(roomsService.create({
        dorm_id: maleDormId,
        room_number: i,
        capacity: 4,
        current_occupancy: 0
      }));
    }

    // Female rooms (1-20)  
    for (let i = 1; i <= 20; i++) {
      roomPromises.push(roomsService.create({
        dorm_id: femaleDormId,
        room_number: i,
        capacity: 4,
        current_occupancy: 0
      }));
    }

    const roomIds = await Promise.all(roomPromises);
    const maleRoomIds = roomIds.slice(0, 20);
    const femaleRoomIds = roomIds.slice(20, 40);

    console.log('Rooms created successfully');

    // Create sample workers
    console.log('Creating sample workers...');
    const workerPromises = [];

    for (let i = 0; i < sampleWorkerNames.length; i++) {
      const name = sampleWorkerNames[i];
      const isMale = i % 2 === 0; // Alternate between male and female
      const roomIds = isMale ? maleRoomIds : femaleRoomIds;
      const dormId = isMale ? maleDormId : femaleDormId;
      
      // Select a random room that's not full
      const roomIndex = Math.floor(Math.random() * roomIds.length);
      const roomId = roomIds[roomIndex];
      
      const checkInDate = generateRandomDate(365); // Within last year
      
      // 30% chance the worker has already left
      const hasLeft = Math.random() < 0.3;
      
      const workerData: any = {
        full_name: name,
        cin: generateCIN(),
        phone: generatePhone(),
        dorm_id: dormId,
        room_id: roomId,
        check_in_date: checkInDate
      };

      if (hasLeft) {
        // Set checkout date after check-in date
        const stayDuration = Math.floor(Math.random() * 200) + 30; // 30-230 days
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + stayDuration);
        
        workerData.check_out_date = checkOutDate;
        workerData.exit_reason = exitReasons[Math.floor(Math.random() * exitReasons.length)];
      }

      workerPromises.push(workersService.create(workerData));
    }

    await Promise.all(workerPromises);
    console.log('Sample workers created successfully');

    console.log('Sample data initialization completed!');
    return true;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    throw error;
  }
}

// Helper function to clear all data (for development/testing)
export async function clearAllData() {
  console.warn('This function should only be used in development!');
  // Note: This would require additional Firebase Admin SDK setup
  // For now, data can be cleared manually from Firebase Console
}
