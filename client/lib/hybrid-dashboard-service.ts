import { DashboardStats, RecentExit, Worker, Room, Dorm } from '@shared/types';
import { offlineDataService } from './offline-data';

// Try to import Firebase dashboard service, but handle failures gracefully
let firebaseDashboardService: any = null;

try {
  import('./firebase-service').then(services => {
    firebaseDashboardService = services.dashboardService;
  }).catch(() => {
    console.warn('Firebase dashboard service not available, using offline calculations');
  });
} catch {
  console.warn('Firebase dashboard service failed to load, using offline calculations');
}

// Calculate age from birth year
const calculateAge = (birthYear: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

// Calculate dashboard stats from offline data
const calculateOfflineStats = (): { stats: DashboardStats; recentExits: RecentExit[] } => {
  offlineDataService.initialize();
  
  const workers = offlineDataService.getWorkers();
  const rooms = offlineDataService.getRooms();
  const dorms = offlineDataService.getDorms();

  const activeWorkers = workers.filter(w => w.status === 'Active');
  const inactiveWorkers = workers.filter(w => w.status === 'Inactive');
  
  // Get dorm information for gender calculation
  const maleDorm = dorms.find(d => d.name === 'Male');
  const femaleDorm = dorms.find(d => d.name === 'Female');
  
  const maleWorkers = activeWorkers.filter(w => w.dorm_id === maleDorm?.id);
  const femaleWorkers = activeWorkers.filter(w => w.dorm_id === femaleDorm?.id);

  const occupiedRooms = rooms.filter(r => r.current_occupancy > 0);
  const totalCapacity = rooms.length * 4;
  const occupancyRate = totalCapacity > 0 ? Math.round((activeWorkers.length / totalCapacity) * 100) : 0;

  // Calculate average stay for inactive workers
  const avgStay = inactiveWorkers.length > 0
    ? Math.round(inactiveWorkers.reduce((sum, w) => sum + (w.stay_duration_days || 0), 0) / inactiveWorkers.length)
    : 0;

  // Calculate average ages
  const averageAgeMale = maleWorkers.length > 0
    ? Math.round(maleWorkers.reduce((sum, w) => sum + (w.age || calculateAge(w.birth_year || 0)), 0) / maleWorkers.length)
    : 0;

  const averageAgeFemale = femaleWorkers.length > 0
    ? Math.round(femaleWorkers.reduce((sum, w) => sum + (w.age || calculateAge(w.birth_year || 0)), 0) / femaleWorkers.length)
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
};

// Calculate enhanced stats from offline data
const calculateOfflineEnhancedStats = () => {
  const workers = offlineDataService.getWorkers();
  const activeWorkers = workers.filter(w => w.status === 'Active');
  const inactiveWorkers = workers.filter(w => w.status === 'Inactive');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Calculate trends
  const weeklyNewWorkers = workers.filter(w => w.created_at && w.created_at >= oneWeekAgo).length;
  const monthlyNewWorkers = workers.filter(w => w.created_at && w.created_at >= oneMonthAgo).length;

  const weeklyTrend = activeWorkers.length > 0 ? (weeklyNewWorkers / activeWorkers.length) * 100 : 0;
  const monthlyTrend = activeWorkers.length > 0 ? (monthlyNewWorkers / activeWorkers.length) * 100 : 0;

  // Average stay duration
  const averageStayDuration = inactiveWorkers.length > 0
    ? Math.round(inactiveWorkers.reduce((sum, w) => sum + (w.stay_duration_days || 0), 0) / inactiveWorkers.length)
    : activeWorkers.length > 0
      ? Math.round(activeWorkers.reduce((sum, w) => {
          const stayDays = Math.floor((now.getTime() - w.check_in_date.getTime()) / (1000 * 60 * 60 * 24));
          return sum + stayDays;
        }, 0) / activeWorkers.length)
      : 0;

  // Find peak occupancy date
  const workersByDate = workers.reduce((acc, w) => {
    const dateKey = w.created_at ? w.created_at.toISOString().split('T')[0] : 'unknown';
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const peakEntry = Object.entries(workersByDate)
    .filter(([key]) => key !== 'unknown')
    .sort(([,a], [,b]) => b - a)[0];
  const peakOccupancyDate = peakEntry ? new Date(peakEntry[0]).toLocaleDateString('fr-FR') : 'N/A';

  // Generate occupancy trend for last 30 days
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

  // Age distribution
  const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '45+': 0 };
  activeWorkers.forEach(w => {
    const age = w.age || calculateAge(w.birth_year || 0);
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

  // Departure reasons
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

  // Monthly statistics
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

    const totalCapacity = 100; // Assuming capacity
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
};

// Hybrid dashboard service
export const hybridDashboardService = {
  async getStats(): Promise<{ stats: DashboardStats; recentExits: RecentExit[] }> {
    try {
      if (firebaseDashboardService) {
        return await firebaseDashboardService.getStats();
      }
    } catch (error) {
      console.warn('Firebase dashboard failed, using offline calculations:', error);
    }
    
    // Fallback to offline calculations
    return calculateOfflineStats();
  },

  async getEnhancedStats() {
    try {
      if (firebaseDashboardService) {
        return await firebaseDashboardService.getEnhancedStats();
      }
    } catch (error) {
      console.warn('Firebase enhanced stats failed, using offline calculations:', error);
    }
    
    // Fallback to offline calculations
    return calculateOfflineEnhancedStats();
  },

  async getFilteredStats(filters: any): Promise<{ stats: DashboardStats; recentExits: RecentExit[] }> {
    try {
      if (firebaseDashboardService) {
        return await firebaseDashboardService.getFilteredStats(filters);
      }
    } catch (error) {
      console.warn('Firebase filtered stats failed, using offline calculations:', error);
    }
    
    // For offline mode, return basic stats (filtering not implemented yet)
    return calculateOfflineStats();
  }
};
