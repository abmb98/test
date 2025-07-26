import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleNetworkError } from './firebase';
import {
  Worker,
  Room,
  Dorm,
  AdminUser,
  DashboardStats,
  RecentExit,
  CreateWorkerRequest,
  UpdateWorkerRequest
} from '@shared/types';

// Collections
const WORKERS_COLLECTION = 'workers';
const ROOMS_COLLECTION = 'rooms';
const DORMS_COLLECTION = 'dorms';
const USERS_COLLECTION = 'users';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) {
    return new Date();
  }

  // Firestore Timestamp object
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Timestamp with seconds and nanoseconds
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }

  // String or number timestamp
  return new Date(timestamp);
};

// Helper function to calculate age from birth year
const calculateAge = (birthYear: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

// Helper function to check authentication (temporarily disabled)
const requireAuth = () => {
  // Temporarily disabled for development
  // if (!auth.currentUser) {
  //   throw new Error('المستخدم غير مُسجل دخول');
  // }
  return auth.currentUser;
};

// Helper function to handle Firebase operations with error handling
// Enhanced network retry wrapper with better error detection
const withRetry = async <T>(operation: () => Promise<T>, retries = 3): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Firebase operation attempt ${i + 1}/${retries} failed:`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
        online: navigator.onLine
      });

      const isNetworkError = error.message?.includes('Failed to fetch') ||
                           error.message?.includes('NetworkError') ||
                           error.message?.includes('fetch') ||
                           error.code === 'unavailable' ||
                           error.code === 'deadline-exceeded' ||
                           error.code === 'permission-denied' ||
                           !navigator.onLine;

      if (isNetworkError && i < retries - 1) {
        console.warn(`Firebase retry ${i + 1}/${retries}:`, error.message || error.code);

        // Progressive backoff: 1s, 3s, 5s
        const delay = [1000, 3000, 5000][i] || 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Nombre maximum de tentatives dépassé');
};

const withErrorHandling = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await withRetry(operation);
  } catch (error: any) {
    console.error('Firebase operation failed after retries:', error);

    // Enhanced error handling with user-friendly messages
    const errorMessage = handleNetworkError(error);
    throw new Error(errorMessage);
  }
};

// Dorms Service
export const dormsService = {
  async getAll(): Promise<Dorm[]> {
    return withErrorHandling(async () => {
      requireAuth();
      const querySnapshot = await getDocs(collection(db, DORMS_COLLECTION));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToDate(doc.data().created_at),
        updated_at: timestampToDate(doc.data().updated_at)
      })) as Dorm[];
    });
  },

  async create(dorm: Omit<Dorm, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    return withErrorHandling(async () => {
      requireAuth();
      const docRef = await addDoc(collection(db, DORMS_COLLECTION), {
        ...dorm,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    });
  }
};

// Rooms Service
export const roomsService = {
  async getAll(): Promise<Room[]> {
    requireAuth();
    const querySnapshot = await getDocs(
      query(collection(db, ROOMS_COLLECTION), orderBy('room_number'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: timestampToDate(doc.data().created_at),
      updated_at: timestampToDate(doc.data().updated_at)
    })) as Room[];
  },

  async getByDorm(dormId: string): Promise<Room[]> {
    requireAuth();
    const querySnapshot = await getDocs(
      query(
        collection(db, ROOMS_COLLECTION),
        where('dorm_id', '==', dormId),
        orderBy('room_number')
      )
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: timestampToDate(doc.data().created_at),
      updated_at: timestampToDate(doc.data().updated_at)
    })) as Room[];
  },

  async create(room: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    requireAuth();
    const docRef = await addDoc(collection(db, ROOMS_COLLECTION), {
      ...room,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async updateOccupancy(roomId: string, newOccupancy: number): Promise<void> {
    requireAuth();
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(roomRef, {
      current_occupancy: newOccupancy,
      updated_at: serverTimestamp()
    });
  }
};

// Workers Service
export const workersService = {
  async getAll(): Promise<Worker[]> {
    requireAuth();
    const querySnapshot = await getDocs(
      query(collection(db, WORKERS_COLLECTION), orderBy('created_at', 'desc'))
    );
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        age: data.birth_year ? calculateAge(data.birth_year) : undefined,
        check_in_date: timestampToDate(data.check_in_date),
        check_out_date: data.check_out_date ? timestampToDate(data.check_out_date) : undefined,
        created_at: timestampToDate(data.created_at),
        updated_at: timestampToDate(data.updated_at)
      };
    }) as Worker[];
  },

  async getActive(): Promise<Worker[]> {
    requireAuth();
    const querySnapshot = await getDocs(
      query(
        collection(db, WORKERS_COLLECTION),
        where('status', '==', 'Active'),
        orderBy('check_in_date', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      check_in_date: timestampToDate(doc.data().check_in_date),
      check_out_date: doc.data().check_out_date ? timestampToDate(doc.data().check_out_date) : undefined,
      created_at: timestampToDate(doc.data().created_at),
      updated_at: timestampToDate(doc.data().updated_at)
    })) as Worker[];
  },

  async getByRoom(roomId: string): Promise<Worker[]> {
    requireAuth();
    const querySnapshot = await getDocs(
      query(
        collection(db, WORKERS_COLLECTION),
        where('room_id', '==', roomId),
        where('status', '==', 'Active')
      )
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      check_in_date: timestampToDate(doc.data().check_in_date),
      check_out_date: doc.data().check_out_date ? timestampToDate(doc.data().check_out_date) : undefined,
      created_at: timestampToDate(doc.data().created_at),
      updated_at: timestampToDate(doc.data().updated_at)
    })) as Worker[];
  },

  async create(workerData: CreateWorkerRequest): Promise<string> {
    requireAuth();

    // Validate required fields
    if (!workerData.room_id || workerData.room_id.trim() === '') {
      throw new Error('ID de chambre requis');
    }
    if (!workerData.dorm_id || workerData.dorm_id.trim() === '') {
      throw new Error('ID de dortoir requis');
    }

    const batch = writeBatch(db);

    // Calculate stay duration if check_out_date exists
    const stayDuration = workerData.check_in_date ?
      Math.floor((new Date().getTime() - workerData.check_in_date.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Add worker
    const workerRef = doc(collection(db, WORKERS_COLLECTION));
    batch.set(workerRef, {
      ...workerData,
      status: 'Active',
      stay_duration_days: stayDuration,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // Update room occupancy
    const roomRef = doc(db, ROOMS_COLLECTION, workerData.room_id);
    const roomDoc = await getDoc(roomRef);
    if (roomDoc.exists()) {
      const currentOccupancy = roomDoc.data().current_occupancy || 0;
      batch.update(roomRef, {
        current_occupancy: currentOccupancy + 1,
        updated_at: serverTimestamp()
      });
    }

    await batch.commit();
    return workerRef.id;
  },

  async update(workerId: string, updates: UpdateWorkerRequest): Promise<void> {
    requireAuth();
    const batch = writeBatch(db);
    const workerRef = doc(db, WORKERS_COLLECTION, workerId);
    const workerDoc = await getDoc(workerRef);

    if (!workerDoc.exists()) {
      throw new Error('Worker not found');
    }

    const rawData = workerDoc.data();
    const currentData = {
      ...rawData,
      check_in_date: timestampToDate(rawData.check_in_date),
      check_out_date: rawData.check_out_date ? timestampToDate(rawData.check_out_date) : undefined,
      created_at: timestampToDate(rawData.created_at),
      updated_at: timestampToDate(rawData.updated_at)
    } as Worker;
    
    // Calculate stay duration if checking out
    let stayDurationDays = currentData.stay_duration_days;
    if (updates.check_out_date && !currentData.check_out_date) {
      stayDurationDays = Math.floor(
        (updates.check_out_date.getTime() - currentData.check_in_date.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Update worker - if check_out_date is being cleared, status should be Active
    const newStatus = updates.check_out_date ? 'Inactive' :
                     (updates.check_out_date === null || updates.check_out_date === undefined) ? 'Active' :
                     currentData.status;

    batch.update(workerRef, {
      ...updates,
      status: newStatus,
      stay_duration_days: stayDurationDays,
      updated_at: serverTimestamp()
    });

    // Handle room changes
    if (updates.room_id && updates.room_id !== currentData.room_id) {
      // Validate new room ID
      if (!updates.room_id || updates.room_id.trim() === '') {
        throw new Error('Nouvel ID de chambre invalide');
      }

      // Handle old room occupancy decrease (if valid room_id exists)
      if (currentData.room_id && currentData.room_id.trim() !== '') {
        try {
          const oldRoomRef = doc(db, ROOMS_COLLECTION, currentData.room_id);
          const oldRoomDoc = await getDoc(oldRoomRef);
          if (oldRoomDoc.exists()) {
            const oldOccupancy = oldRoomDoc.data().current_occupancy || 0;
            batch.update(oldRoomRef, {
              current_occupancy: Math.max(0, oldOccupancy - 1),
              updated_at: serverTimestamp()
            });
          }
        } catch (error) {
          console.warn('Erreur lors de la mise à jour de l\'ancienne chambre:', currentData.room_id, error);
          // Continue without failing the entire operation
        }
      } else {
        console.warn('Worker has invalid current room_id, skipping old room occupancy update');
      }

      // Increase new room occupancy
      const newRoomRef = doc(db, ROOMS_COLLECTION, updates.room_id);
      const newRoomDoc = await getDoc(newRoomRef);
      if (newRoomDoc.exists()) {
        const newOccupancy = newRoomDoc.data().current_occupancy || 0;
        batch.update(newRoomRef, {
          current_occupancy: newOccupancy + 1,
          updated_at: serverTimestamp()
        });
      }
    }

    // Handle checkout - decrease room occupancy
    if (updates.check_out_date && !currentData.check_out_date) {
      // Handle room occupancy decrease for checkout (if valid room_id exists)
      if (currentData.room_id && currentData.room_id.trim() !== '') {
        try {
          const roomRef = doc(db, ROOMS_COLLECTION, currentData.room_id);
          const roomDoc = await getDoc(roomRef);
          if (roomDoc.exists()) {
            const currentOccupancy = roomDoc.data().current_occupancy || 0;
            batch.update(roomRef, {
              current_occupancy: Math.max(0, currentOccupancy - 1),
              updated_at: serverTimestamp()
            });
          }
        } catch (error) {
          console.warn('Erreur lors de la mise à jour de la chambre au checkout:', currentData.room_id, error);
          // Continue without failing the checkout operation
        }
      } else {
        console.warn('Worker has invalid room_id, skipping room occupancy update for checkout');
      }
    }

    await batch.commit();
  },

  // Data integrity helper - fix workers with invalid room_ids
  async fixWorkerRoomData(): Promise<{ fixed: number; errors: string[] }> {
    return withErrorHandling(async () => {
      requireAuth();
      const workersSnapshot = await getDocs(collection(db, WORKERS_COLLECTION));
      const roomsSnapshot = await getDocs(collection(db, ROOMS_COLLECTION));

      const workers = workersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Worker & { id: string })[];

      const rooms = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Room & { id: string })[];

      let fixed = 0;
      const errors: string[] = [];

      for (const worker of workers) {
        if (!worker.room_id || worker.room_id.trim() === '') {
          try {
            // Find an available room in the same dorm or any dorm
            const availableRoom = rooms.find(r =>
              (worker.dorm_id ? r.dorm_id === worker.dorm_id : true) &&
              (r.current_occupancy || 0) < 4
            ) || rooms.find(r => (r.current_occupancy || 0) < 4);

            if (availableRoom) {
              const workerRef = doc(db, WORKERS_COLLECTION, worker.id);
              await updateDoc(workerRef, {
                room_id: availableRoom.id,
                dorm_id: availableRoom.dorm_id,
                updated_at: serverTimestamp()
              });

              // Update room occupancy
              const roomRef = doc(db, ROOMS_COLLECTION, availableRoom.id);
              await updateDoc(roomRef, {
                current_occupancy: (availableRoom.current_occupancy || 0) + 1,
                updated_at: serverTimestamp()
              });

              fixed++;
            } else {
              errors.push(`Aucune chambre disponible pour l'ouvrier ${worker.full_name}`);
            }
          } catch (error) {
            errors.push(`Erreur lors de la correction de l'ouvrier ${worker.full_name}: ${error}`);
          }
        }
      }

      return { fixed, errors };
    });
  },

  async delete(workerId: string): Promise<void> {
    requireAuth();
    const batch = writeBatch(db);
    const workerRef = doc(db, WORKERS_COLLECTION, workerId);
    const workerDoc = await getDoc(workerRef);

    if (!workerDoc.exists()) {
      throw new Error('Worker not found');
    }

    const rawData = workerDoc.data();
    const workerData = {
      ...rawData,
      check_in_date: timestampToDate(rawData.check_in_date),
      check_out_date: rawData.check_out_date ? timestampToDate(rawData.check_out_date) : undefined,
      created_at: timestampToDate(rawData.created_at),
      updated_at: timestampToDate(rawData.updated_at)
    } as Worker;
    
    // Decrease room occupancy if worker was active
    if (workerData.status === 'Active') {
      // Validate room ID before updating occupancy
      if (!workerData.room_id || workerData.room_id.trim() === '') {
        console.warn('Worker has invalid room_id, skipping room occupancy update');
      } else {
        const roomRef = doc(db, ROOMS_COLLECTION, workerData.room_id);
        const roomDoc = await getDoc(roomRef);
        if (roomDoc.exists()) {
          const currentOccupancy = roomDoc.data().current_occupancy || 0;
          batch.update(roomRef, {
            current_occupancy: Math.max(0, currentOccupancy - 1),
            updated_at: serverTimestamp()
          });
        }
      }
    }

    batch.delete(workerRef);
    await batch.commit();
  }
};

// Dashboard Service
export const dashboardService = {
  async getStats(): Promise<{ stats: DashboardStats; recentExits: RecentExit[] }> {
    return withErrorHandling(async () => {
      requireAuth();
    const [workersSnapshot, roomsSnapshot] = await Promise.all([
      getDocs(collection(db, WORKERS_COLLECTION)),
      getDocs(collection(db, ROOMS_COLLECTION))
    ]);

    const workers = workersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      check_in_date: timestampToDate(doc.data().check_in_date),
      check_out_date: doc.data().check_out_date ? timestampToDate(doc.data().check_out_date) : undefined
    })) as Worker[];

    const rooms = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Room[];

    const activeWorkers = workers.filter(w => w.status === 'Active');
    const inactiveWorkers = workers.filter(w => w.status === 'Inactive');
    const maleWorkers = activeWorkers.filter(w => {
      // We'll need to check the dorm type - for now assume even room numbers are male
      return parseInt(w.room_id.slice(-1)) % 2 === 0;
    });
    const femaleWorkers = activeWorkers.filter(w => {
      return parseInt(w.room_id.slice(-1)) % 2 === 1;
    });

    const occupiedRooms = rooms.filter(r => r.current_occupancy > 0);
    const totalCapacity = rooms.length * 4;
    const occupancyRate = totalCapacity > 0 ? Math.round((activeWorkers.length / totalCapacity) * 100) : 0;

    // Calculate average stay for inactive workers
    const avgStay = inactiveWorkers.length > 0
      ? Math.round(inactiveWorkers.reduce((sum, w) => sum + (w.stay_duration_days || 0), 0) / inactiveWorkers.length)
      : 0;

    // Calculate average ages
    const activeMales = activeWorkers.filter(w => maleWorkers.includes(w));
    const activeFemales = activeWorkers.filter(w => femaleWorkers.includes(w));

    const averageAgeMale = activeMales.length > 0
      ? Math.round(activeMales.reduce((sum, w) => sum + calculateAge(w.birth_year || 0), 0) / activeMales.length)
      : 0;

    const averageAgeFemale = activeFemales.length > 0
      ? Math.round(activeFemales.reduce((sum, w) => sum + calculateAge(w.birth_year || 0), 0) / activeFemales.length)
      : 0;

    const remainingWorkers = totalCapacity - activeWorkers.length;

    const stats: DashboardStats = {
      totalWorkers: workers.length,
      activeWorkers: activeWorkers.length,
      inactiveWorkers: inactiveWorkers.length,
      remainingWorkers,
      averageStayDays: avgStay,
      occupancyRate,
      maleWorkers: maleWorkers.length,
      femaleWorkers: femaleWorkers.length,
      averageAgeMale,
      averageAgeFemale,
      totalRooms: rooms.length,
      occupiedRooms: occupiedRooms.length,
      exitPercentage: workers.length > 0 ? Math.round((inactiveWorkers.length / workers.length) * 100) : 0
    };

    // Get recent exits (last 5)
    const recentExits: RecentExit[] = inactiveWorkers
      .filter(w => w.check_out_date)
      .sort((a, b) => (b.check_out_date?.getTime() || 0) - (a.check_out_date?.getTime() || 0))
      .slice(0, 5)
      .map(w => ({
        worker_name: w.full_name,
        exit_reason: w.exit_reason || 'Non spécifié',
        exit_date: w.check_out_date!,
        stay_duration_days: w.stay_duration_days || 0
      }));

      return { stats, recentExits };
    });
  },

  async getEnhancedStats(): Promise<{
    weeklyTrend: number;
    monthlyTrend: number;
    averageStayDuration: number;
    peakOccupancyDate: string;
    occupancyTrend: Array<{ date: string; count: number }>;
    ageDistribution: { range: string; count: number; percentage: number }[];
    departureReasons: { reason: string; count: number; percentage: number }[];
    monthlyStats: Array<{ month: string; entries: number; exits: number; occupancy: number }>;
  }> {
    return withErrorHandling(async () => {
      requireAuth();
      const workersSnapshot = await getDocs(collection(db, WORKERS_COLLECTION));
      const workers = workersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        check_in_date: timestampToDate(doc.data().check_in_date),
        check_out_date: doc.data().check_out_date ? timestampToDate(doc.data().check_out_date) : undefined,
        created_at: timestampToDate(doc.data().created_at),
        updated_at: timestampToDate(doc.data().updated_at)
      })) as Worker[];

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate trends based on real data
      const activeWorkers = workers.filter(w => w.status === 'Active');
      const inactiveWorkers = workers.filter(w => w.status === 'Inactive');

      const weeklyNewWorkers = workers.filter(w => w.created_at && w.created_at >= oneWeekAgo).length;
      const monthlyNewWorkers = workers.filter(w => w.created_at && w.created_at >= oneMonthAgo).length;

      const weeklyTrend = activeWorkers.length > 0 ? (weeklyNewWorkers / activeWorkers.length) * 100 : 0;
      const monthlyTrend = activeWorkers.length > 0 ? (monthlyNewWorkers / activeWorkers.length) * 100 : 0;

      // Average stay duration from actual data
      const averageStayDuration = inactiveWorkers.length > 0
        ? Math.round(inactiveWorkers.reduce((sum, w) => sum + (w.stay_duration_days || 0), 0) / inactiveWorkers.length)
        : activeWorkers.length > 0
          ? Math.round(activeWorkers.reduce((sum, w) => {
              const stayDays = Math.floor((now.getTime() - w.check_in_date.getTime()) / (1000 * 60 * 60 * 24));
              return sum + stayDays;
            }, 0) / activeWorkers.length)
          : 0;

      // Find peak occupancy date (most workers created on same day)
      const workersByDate = workers.reduce((acc, w) => {
        const dateKey = w.created_at ? w.created_at.toISOString().split('T')[0] : 'unknown';
        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const peakEntry = Object.entries(workersByDate)
        .filter(([key]) => key !== 'unknown')
        .sort(([,a], [,b]) => b - a)[0];
      const peakOccupancyDate = peakEntry ? new Date(peakEntry[0]).toLocaleDateString('fr-FR') : 'N/A';

      // Generate occupancy trend for last 30 days from real data
      const occupancyTrend = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const workersOnDay = workers.filter(w => {
          const checkedIn = w.check_in_date <= dayEnd;
          const notCheckedOut = !w.check_out_date || w.check_out_date >= dayStart;
          return checkedIn && notCheckedOut;
        }).length;

        return {
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          count: workersOnDay
        };
      });

      // Age distribution from real data
      const ageGroups = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '45+': 0
      };

      activeWorkers.forEach(w => {
        const age = calculateAge(w.birth_year || 0);
        if (age >= 18 && age <= 25) ageGroups['18-25']++;
        else if (age >= 26 && age <= 35) ageGroups['26-35']++;
        else if (age >= 36 && age <= 45) ageGroups['36-45']++;
        else if (age > 45) ageGroups['45+']++;
      });

      const totalActiveWorkers = activeWorkers.length;
      const ageDistribution = Object.entries(ageGroups).map(([range, count]) => ({
        range,
        count,
        percentage: totalActiveWorkers > 0 ? Math.round((count / totalActiveWorkers) * 100) : 0
      }));

      // Departure reasons from real data
      const reasonCounts = inactiveWorkers.reduce((acc, w) => {
        const reason = w.exit_reason || 'Non spécifié';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalDepartures = inactiveWorkers.length;
      const departureReasons = Object.entries(reasonCounts).map(([reason, count]) => ({
        reason,
        count,
        percentage: totalDepartures > 0 ? Math.round((count / totalDepartures) * 100) : 0
      }));

      // Monthly statistics from real data for last 6 months
      const monthlyStats = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const entriesInMonth = workers.filter(w =>
          w.created_at && w.created_at >= date && w.created_at < nextMonth
        ).length;

        const exitsInMonth = workers.filter(w =>
          w.check_out_date && w.check_out_date >= date && w.check_out_date < nextMonth
        ).length;

        const workersInMonth = workers.filter(w => {
          const checkedIn = w.check_in_date < nextMonth;
          const notCheckedOut = !w.check_out_date || w.check_out_date >= date;
          return checkedIn && notCheckedOut;
        }).length;

        // Get total capacity from rooms (assuming 100 for now, should be calculated from actual rooms)
        const totalCapacity = 100;
        const occupancy = Math.min(Math.round((workersInMonth / totalCapacity) * 100), 100);

        return {
          month: date.toLocaleDateString('fr-FR', { month: 'long' }),
          entries: entriesInMonth,
          exits: exitsInMonth,
          occupancy: occupancy
        };
      }).reverse();

      return {
        weeklyTrend: Math.round(weeklyTrend * 10) / 10,
        monthlyTrend: Math.round(monthlyTrend * 10) / 10,
        averageStayDuration,
        peakOccupancyDate,
        occupancyTrend,
        ageDistribution,
        departureReasons,
        monthlyStats
      };
    });
  },

  async getFilteredStats(filters: {
    dateRange?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    gender?: string;
    ageRange?: string;
  }): Promise<{ stats: DashboardStats; recentExits: RecentExit[] }> {
    return withErrorHandling(async () => {
      requireAuth();
      const workersSnapshot = await getDocs(collection(db, WORKERS_COLLECTION));
      const roomsSnapshot = await getDocs(collection(db, ROOMS_COLLECTION));

      let workers = workersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        check_in_date: timestampToDate(doc.data().check_in_date),
        check_out_date: doc.data().check_out_date ? timestampToDate(doc.data().check_out_date) : undefined,
        created_at: timestampToDate(doc.data().created_at),
        updated_at: timestampToDate(doc.data().updated_at)
      })) as Worker[];

      // Apply date range filters
      const now = new Date();
      if (filters.dateRange) {
        let startDate: Date;
        switch (filters.dateRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (filters.startDate) {
              workers = workers.filter(w => w.created_at >= filters.startDate!);
            }
            if (filters.endDate) {
              workers = workers.filter(w => w.created_at <= filters.endDate!);
            }
            break;
          default:
            startDate = new Date(0); // All time
        }

        if (filters.dateRange !== 'custom' && filters.dateRange !== 'all') {
          workers = workers.filter(w => w.created_at >= startDate);
        }
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        workers = workers.filter(w => w.status === (filters.status === 'active' ? 'Active' : 'Inactive'));
      }

      // Apply gender filter
      if (filters.gender && filters.gender !== 'all') {
        workers = workers.filter(w => {
          const isMale = parseInt(w.room_id.slice(-1)) % 2 === 0;
          return filters.gender === 'male' ? isMale : !isMale;
        });
      }

      // Apply age range filter
      if (filters.ageRange && filters.ageRange !== 'all') {
        workers = workers.filter(w => {
          const age = w.age || 0;
          switch (filters.ageRange) {
            case '18-25': return age >= 18 && age <= 25;
            case '26-35': return age >= 26 && age <= 35;
            case '36-45': return age >= 36 && age <= 45;
            case '45+': return age > 45;
            default: return true;
          }
        });
      }

      const rooms = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];

      // Calculate filtered stats (same logic as getStats but with filtered data)
      const activeWorkers = workers.filter(w => w.status === 'Active');
      const inactiveWorkers = workers.filter(w => w.status === 'Inactive');

      const maleWorkers = activeWorkers.filter(w => {
        return parseInt(w.room_id.slice(-1)) % 2 === 0;
      });
      const femaleWorkers = activeWorkers.filter(w => {
        return parseInt(w.room_id.slice(-1)) % 2 === 1;
      });

      const occupiedRooms = rooms.filter(r => r.current_occupancy > 0);
      const totalCapacity = rooms.length * 4;
      const occupancyRate = totalCapacity > 0 ? Math.round((activeWorkers.length / totalCapacity) * 100) : 0;

      const avgStay = inactiveWorkers.length > 0
        ? Math.round(inactiveWorkers.reduce((sum, w) => sum + (w.stay_duration_days || 0), 0) / inactiveWorkers.length)
        : 0;

      const activeMales = activeWorkers.filter(w => maleWorkers.includes(w));
      const activeFemales = activeWorkers.filter(w => femaleWorkers.includes(w));

      const averageAgeMale = activeMales.length > 0
        ? Math.round(activeMales.reduce((sum, w) => sum + calculateAge(w.birth_year || 0), 0) / activeMales.length)
        : 0;

      const averageAgeFemale = activeFemales.length > 0
        ? Math.round(activeFemales.reduce((sum, w) => sum + calculateAge(w.birth_year || 0), 0) / activeFemales.length)
        : 0;

      const remainingWorkers = totalCapacity - activeWorkers.length;

      const stats: DashboardStats = {
        totalWorkers: workers.length,
        activeWorkers: activeWorkers.length,
        inactiveWorkers: inactiveWorkers.length,
        remainingWorkers,
        averageStayDays: avgStay,
        occupancyRate,
        maleWorkers: maleWorkers.length,
        femaleWorkers: femaleWorkers.length,
        averageAgeMale,
        averageAgeFemale,
        totalRooms: rooms.length,
        occupiedRooms: occupiedRooms.length,
        exitPercentage: workers.length > 0 ? Math.round((inactiveWorkers.length / workers.length) * 100) : 0
      };

      const recentExits: RecentExit[] = inactiveWorkers
        .filter(w => w.check_out_date)
        .sort((a, b) => (b.check_out_date?.getTime() || 0) - (a.check_out_date?.getTime() || 0))
        .slice(0, 5)
        .map(w => ({
          worker_name: w.full_name,
          exit_reason: w.exit_reason || 'Non spécifié',
          exit_date: w.check_out_date!,
          stay_duration_days: w.stay_duration_days || 0
        }));

      return { stats, recentExits };
    });
  }
};

// Admin Users Service
export const usersService = {
  async getAll(): Promise<AdminUser[]> {
    requireAuth();
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: timestampToDate(doc.data().created_at),
      updated_at: timestampToDate(doc.data().updated_at)
    })) as AdminUser[];
  },

  async create(user: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    requireAuth();
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...user,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async delete(userId: string): Promise<void> {
    requireAuth();
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  }
};

// Real-time subscriptions
export const subscribeToWorkers = (callback: (workers: Worker[]) => void) => {
  return onSnapshot(
    query(collection(db, WORKERS_COLLECTION), orderBy('created_at', 'desc')),
    (snapshot) => {
      const workers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        check_in_date: timestampToDate(doc.data().check_in_date),
        check_out_date: doc.data().check_out_date ? timestampToDate(doc.data().check_out_date) : undefined,
        created_at: timestampToDate(doc.data().created_at),
        updated_at: timestampToDate(doc.data().updated_at)
      })) as Worker[];
      callback(workers);
    },
    (error) => {
      console.error('Workers subscription error:', error);
      // Call callback with empty array on error
      callback([]);
    }
  );
};

export const subscribeToRooms = (callback: (rooms: Room[]) => void) => {
  return onSnapshot(
    query(collection(db, ROOMS_COLLECTION), orderBy('room_number')),
    (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: timestampToDate(doc.data().created_at),
        updated_at: timestampToDate(doc.data().updated_at)
      })) as Room[];
      callback(rooms);
    },
    (error) => {
      console.error('Rooms subscription error:', error);
      // Call callback with empty array on error
      callback([]);
    }
  );
};
