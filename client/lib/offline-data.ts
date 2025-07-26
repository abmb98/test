import { Worker, Room, Dorm } from '@shared/types';

// Local storage keys
const STORAGE_KEYS = {
  workers: 'dorm_workers',
  rooms: 'dorm_rooms', 
  dorms: 'dorm_dorms'
};

// Sample data for offline mode
const sampleDorms: Dorm[] = [
  {
    id: 'dorm_male',
    name: 'Male',
    name_ar: 'ذكور',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'dorm_female', 
    name: 'Female',
    name_ar: 'إناث',
    created_at: new Date(),
    updated_at: new Date()
  }
];

const sampleRooms: Room[] = [
  // Male rooms
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `room_male_${i + 1}`,
    dorm_id: 'dorm_male',
    room_number: i + 1,
    capacity: 4,
    current_occupancy: Math.floor(Math.random() * 4),
    created_at: new Date(),
    updated_at: new Date()
  })),
  // Female rooms  
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `room_female_${i + 1}`,
    dorm_id: 'dorm_female',
    room_number: i + 1,
    capacity: 4,
    current_occupancy: Math.floor(Math.random() * 4),
    created_at: new Date(),
    updated_at: new Date()
  }))
];

// Calculate age from birth year
const calculateAge = (birthYear: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

const sampleWorkers: Worker[] = [
  {
    id: 'worker_1',
    full_name: 'Ahmed Mohamed Ali',
    cin: '12345678',
    phone: '0512345678',
    birth_year: 1990,
    age: calculateAge(1990),
    dorm_id: 'dorm_male',
    room_id: 'room_male_1',
    check_in_date: new Date('2024-01-15'),
    check_out_date: undefined,
    exit_reason: undefined,
    status: 'Active',
    stay_duration_days: undefined,
    created_at: new Date('2024-01-15'),
    updated_at: new Date()
  },
  {
    id: 'worker_2',
    full_name: 'Fatima Khalid Saad',
    cin: '87654321',
    phone: '0687654321',
    birth_year: 1985,
    age: calculateAge(1985),
    dorm_id: 'dorm_female',
    room_id: 'room_female_1',
    check_in_date: new Date('2024-01-10'),
    check_out_date: new Date('2024-01-25'),
    exit_reason: 'Fin de contrat',
    status: 'Inactive',
    stay_duration_days: 15,
    created_at: new Date('2024-01-10'),
    updated_at: new Date()
  },
  {
    id: 'worker_3',
    full_name: 'Omar Hassan',
    cin: '11223344',
    phone: '0511223344',
    birth_year: 1992,
    age: calculateAge(1992),
    dorm_id: 'dorm_male',
    room_id: 'room_male_2',
    check_in_date: new Date('2024-01-20'),
    check_out_date: undefined,
    exit_reason: undefined,
    status: 'Active',
    stay_duration_days: undefined,
    created_at: new Date('2024-01-20'),
    updated_at: new Date()
  },
  {
    id: 'worker_4',
    full_name: 'Maryam Al-Zahra',
    cin: '55667788',
    phone: '0655667788',
    birth_year: 1988,
    age: calculateAge(1988),
    dorm_id: 'dorm_female',
    room_id: 'room_female_2',
    check_in_date: new Date('2024-01-18'),
    check_out_date: undefined,
    exit_reason: undefined,
    status: 'Active',
    stay_duration_days: undefined,
    created_at: new Date('2024-01-18'),
    updated_at: new Date()
  },
  {
    id: 'worker_5',
    full_name: 'Youssef Ibrahim',
    cin: '99887766',
    phone: '0599887766',
    birth_year: 1995,
    age: calculateAge(1995),
    dorm_id: 'dorm_male',
    room_id: 'room_male_3',
    check_in_date: new Date('2024-01-22'),
    check_out_date: undefined,
    exit_reason: undefined,
    status: 'Active',
    stay_duration_days: undefined,
    created_at: new Date('2024-01-22'),
    updated_at: new Date()
  },
  {
    id: 'worker_6',
    full_name: 'Aisha Salem',
    cin: '33445566',
    phone: '0633445566',
    birth_year: 1993,
    age: calculateAge(1993),
    dorm_id: 'dorm_female',
    room_id: 'room_female_3',
    check_in_date: new Date('2024-01-25'),
    check_out_date: undefined,
    exit_reason: undefined,
    status: 'Active',
    stay_duration_days: undefined,
    created_at: new Date('2024-01-25'),
    updated_at: new Date()
  }
];

// Offline data service
export const offlineDataService = {
  // Initialize with sample data if not exists
  initialize() {
    if (!localStorage.getItem(STORAGE_KEYS.dorms)) {
      localStorage.setItem(STORAGE_KEYS.dorms, JSON.stringify(sampleDorms));
    }
    if (!localStorage.getItem(STORAGE_KEYS.rooms)) {
      localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(sampleRooms));
    }
    if (!localStorage.getItem(STORAGE_KEYS.workers)) {
      localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(sampleWorkers));
    }
  },

  // Workers
  getWorkers(): Worker[] {
    const data = localStorage.getItem(STORAGE_KEYS.workers);
    return data ? JSON.parse(data).map((w: any) => ({
      ...w,
      check_in_date: new Date(w.check_in_date),
      check_out_date: w.check_out_date ? new Date(w.check_out_date) : undefined,
      created_at: new Date(w.created_at),
      updated_at: new Date(w.updated_at)
    })) : [];
  },

  saveWorkers(workers: Worker[]) {
    localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(workers));
  },

  addWorker(worker: Omit<Worker, 'id' | 'created_at' | 'updated_at'>): string {
    const workers = this.getWorkers();
    const newWorker: Worker = {
      ...worker,
      id: `worker_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    };
    workers.push(newWorker);
    this.saveWorkers(workers);
    
    // Update room occupancy
    this.updateRoomOccupancy(worker.room_id, 1);
    
    return newWorker.id;
  },

  updateWorker(id: string, updates: Partial<Worker>) {
    const workers = this.getWorkers();
    const index = workers.findIndex(w => w.id === id);
    if (index !== -1) {
      const oldWorker = workers[index];
      workers[index] = { ...workers[index], ...updates, updated_at: new Date() };
      
      // Handle room changes
      if (updates.room_id && updates.room_id !== oldWorker.room_id) {
        this.updateRoomOccupancy(oldWorker.room_id, -1);
        this.updateRoomOccupancy(updates.room_id, 1);
      }
      
      // Handle check out
      if (updates.check_out_date && !oldWorker.check_out_date) {
        this.updateRoomOccupancy(oldWorker.room_id, -1);
      }
      
      this.saveWorkers(workers);
    }
  },

  deleteWorker(id: string) {
    const workers = this.getWorkers();
    const worker = workers.find(w => w.id === id);
    if (worker && worker.status === 'Active') {
      this.updateRoomOccupancy(worker.room_id, -1);
    }
    const filtered = workers.filter(w => w.id !== id);
    this.saveWorkers(filtered);
  },

  // Rooms
  getRooms(): Room[] {
    const data = localStorage.getItem(STORAGE_KEYS.rooms);
    return data ? JSON.parse(data).map((r: any) => ({
      ...r,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at)
    })) : [];
  },

  updateRoomOccupancy(roomId: string, change: number) {
    const rooms = this.getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      room.current_occupancy = Math.max(0, Math.min(4, room.current_occupancy + change));
      room.updated_at = new Date();
      localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(rooms));
    }
  },

  // Dorms
  getDorms(): Dorm[] {
    const data = localStorage.getItem(STORAGE_KEYS.dorms);
    return data ? JSON.parse(data).map((d: any) => ({
      ...d,
      created_at: new Date(d.created_at),
      updated_at: new Date(d.updated_at)
    })) : [];
  },

  // Check if we're in offline mode
  isOfflineMode(): boolean {
    return localStorage.getItem('offline_mode') === 'true';
  },

  setOfflineMode(offline: boolean) {
    localStorage.setItem('offline_mode', offline.toString());
  }
};
