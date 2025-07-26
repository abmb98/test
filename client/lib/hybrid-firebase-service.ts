import { Worker, Room, Dorm } from '@shared/types';
import { offlineDataService } from './offline-data';

// Try to import Firebase services, but handle failures gracefully
let firebaseServices: any = null;

try {
  import('./firebase-service').then(services => {
    firebaseServices = services;
  }).catch(() => {
    console.warn('Firebase services not available, using offline mode');
  });
} catch {
  console.warn('Firebase services failed to load, using offline mode');
}

// Hybrid service that tries Firebase first, then falls back to offline
export const hybridWorkersService = {
  async getAll(): Promise<Worker[]> {
    try {
      if (firebaseServices) {
        return await firebaseServices.workersService.getAll();
      }
    } catch (error) {
      console.warn('Firebase failed, using offline data:', error);
    }
    
    // Fallback to offline
    offlineDataService.initialize();
    return offlineDataService.getWorkers();
  },

  async create(workerData: any): Promise<string> {
    try {
      if (firebaseServices) {
        return await firebaseServices.workersService.create(workerData);
      }
    } catch (error) {
      console.warn('Firebase failed, using offline mode:', error);
    }
    
    // Fallback to offline
    return offlineDataService.addWorker(workerData);
  },

  async update(workerId: string, updates: any): Promise<void> {
    try {
      if (firebaseServices) {
        await firebaseServices.workersService.update(workerId, updates);
        return;
      }
    } catch (error) {
      console.warn('Firebase failed, using offline mode:', error);
    }
    
    // Fallback to offline
    offlineDataService.updateWorker(workerId, updates);
  },

  async delete(workerId: string): Promise<void> {
    try {
      if (firebaseServices) {
        await firebaseServices.workersService.delete(workerId);
        return;
      }
    } catch (error) {
      console.warn('Firebase failed, using offline mode:', error);
    }
    
    // Fallback to offline
    offlineDataService.deleteWorker(workerId);
  },

  async getByRoom(roomId: string): Promise<Worker[]> {
    try {
      if (firebaseServices) {
        return await firebaseServices.workersService.getByRoom(roomId);
      }
    } catch (error) {
      console.warn('Firebase failed, using offline data:', error);
    }
    
    // Fallback to offline
    const workers = offlineDataService.getWorkers();
    return workers.filter(w => w.room_id === roomId && w.status === 'Active');
  }
};

export const hybridRoomsService = {
  async getAll(): Promise<Room[]> {
    try {
      if (firebaseServices) {
        return await firebaseServices.roomsService.getAll();
      }
    } catch (error) {
      console.warn('Firebase failed, using offline data:', error);
    }
    
    // Fallback to offline
    offlineDataService.initialize();
    return offlineDataService.getRooms();
  }
};

export const hybridDormsService = {
  async getAll(): Promise<Dorm[]> {
    try {
      if (firebaseServices) {
        return await firebaseServices.dormsService.getAll();
      }
    } catch (error) {
      console.warn('Firebase failed, using offline data:', error);
    }
    
    // Fallback to offline
    offlineDataService.initialize();
    return offlineDataService.getDorms();
  }
};

// Mock subscriptions for offline mode
export const hybridSubscribeToWorkers = (callback: (workers: Worker[]) => void) => {
  try {
    if (firebaseServices) {
      return firebaseServices.subscribeToWorkers(callback);
    }
  } catch (error) {
    console.warn('Firebase subscription failed, using polling:', error);
  }
  
  // Fallback: poll local data every few seconds
  const interval = setInterval(() => {
    try {
      const workers = offlineDataService.getWorkers();
      callback(workers);
    } catch (error) {
      console.error('Offline polling error:', error);
    }
  }, 3000);
  
  // Return unsubscribe function
  return () => clearInterval(interval);
};

export const hybridSubscribeToRooms = (callback: (rooms: Room[]) => void) => {
  try {
    if (firebaseServices) {
      return firebaseServices.subscribeToRooms(callback);
    }
  } catch (error) {
    console.warn('Firebase subscription failed, using polling:', error);
  }
  
  // Fallback: poll local data every few seconds
  const interval = setInterval(() => {
    try {
      const rooms = offlineDataService.getRooms();
      callback(rooms);
    } catch (error) {
      console.error('Offline polling error:', error);
    }
  }, 3000);
  
  // Return unsubscribe function
  return () => clearInterval(interval);
};

// Connection test
export const testConnection = async (): Promise<{ connected: boolean; error?: string }> => {
  try {
    if (firebaseServices && firebaseServices.testFirebaseConnection) {
      return await firebaseServices.testFirebaseConnection();
    }
    return { connected: false, error: 'Firebase services not loaded' };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
};
