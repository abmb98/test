import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar,
  TrendingUp,
  Building2,
  Bed,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Target,
  Home,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { hybridDashboardService as dashboardService } from '@/lib/hybrid-dashboard-service';
import { offlineDataService } from '@/lib/offline-data';
import { DashboardStats, RecentExit, Worker } from '@shared/types';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardCharts, QuickStats } from '@/components/DashboardCharts';

interface DashboardFilters {
  dateRange: 'all' | 'week' | 'month' | 'quarter' | 'custom';
  startDate?: string;
  endDate?: string;
  status: 'all' | 'active' | 'exited';
  gender: 'all' | 'male' | 'female';
  ageRange: 'all' | '18-25' | '26-35' | '36-45' | '45+';
  minAge?: number;
  maxAge?: number;
}

interface EnhancedStats {
  weeklyTrend: number;
  monthlyTrend: number;
  averageStayDuration: number;
  peakOccupancyDate: string;
  occupancyTrend: Array<{ date: string; count: number }>;
  ageDistribution: { range: string; count: number; percentage: number }[];
  departureReasons: { reason: string; count: number; percentage: number }[];
  monthlyStats: Array<{ month: string; entries: number; exits: number; occupancy: number }>;
}

interface ChartData {
  occupancyTrend: Array<{ date: string; count: number }>;
  ageDistribution: { range: string; count: number; percentage: number }[];
  departureReasons: { reason: string; count: number; percentage: number }[];
  monthlyStats: Array<{ month: string; entries: number; exits: number; occupancy: number }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [enhancedStats, setEnhancedStats] = useState<EnhancedStats | null>(null);
  const [recentExits, setRecentExits] = useState<RecentExit[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'month',
    status: 'all',
    gender: 'all',
    ageRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadDashboardData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    if (stats) {
      applyFilters();
    }
  }, [filters, stats]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      // Load basic and enhanced stats in parallel
      const [basicData, enhancedData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getEnhancedStats()
      ]);

      setStats(basicData.stats);
      setRecentExits(basicData.recentExits);
      setEnhancedStats(enhancedData);

      // Set chart data from enhanced stats
      setChartData({
        occupancyTrend: enhancedData.occupancyTrend,
        ageDistribution: enhancedData.ageDistribution,
        departureReasons: enhancedData.departureReasons,
        monthlyStats: enhancedData.monthlyStats
      });

      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Dashboard data loading error:', err);
      
      // Check if it's a network connectivity issue
      if (err.message?.includes('Network connection issue') || 
          err.message?.includes('Failed to fetch') ||
          !navigator.onLine) {
        setError('Problème de connexion réseau. Veuillez vérifier votre connexion Internet et réessayer.');
      } else {
        setError('Erreur lors du chargement des données: ' + (err.message || 'Erreur inconnue'));
      }
    } finally {
      setLoading(false);
    }
  };



  const applyFilters = async () => {
    if (!stats) return;

    try {
      // Convert date range to actual dates
      const filterParams = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined
      };

      const filteredData = await dashboardService.getFilteredStats(filterParams);
      setStats(filteredData.stats);
      setRecentExits(filteredData.recentExits);
    } catch (err) {
      console.error('Error applying filters:', err);
    }
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportReport = () => {
    if (!stats || !enhancedStats) return;

    const reportData = {
      generatedAt: format(new Date(), 'dd/MM/yyyy HH:mm'),
      basicStatistics: stats,
      enhancedStatistics: enhancedStats,
      appliedFilters: filters,
      recentExits: recentExits,
      chartData: chartData
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `rapport-dortoir-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 animate-fade-in">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-2"
              onClick={loadDashboardData}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 animate-fade-in">
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucune donnée disponible. Veuillez d'abord initialiser le système depuis la page Paramètres.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Tableau de bord avancé
          </h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des statistiques du dortoir universitaire avec filtres
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Arrêter auto' : 'Auto-actualisation'}
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </Button>
          <Button variant="outline" onClick={exportReport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres de données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Période</Label>
                <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les données</SelectItem>
                    <SelectItem value="week">7 derniers jours</SelectItem>
                    <SelectItem value="month">30 derniers jours</SelectItem>
                    <SelectItem value="quarter">3 derniers mois</SelectItem>
                    <SelectItem value="custom">Période personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actifs seulement</SelectItem>
                    <SelectItem value="exited">Sortis seulement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Filter */}
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select value={filters.gender} onValueChange={(value) => handleFilterChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les genres</SelectItem>
                    <SelectItem value="male">Hommes seulement</SelectItem>
                    <SelectItem value="female">Femmes seulement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Range Filter */}
              <div className="space-y-2">
                <Label>Tranche d'âge</Label>
                <Select value={filters.ageRange} onValueChange={(value) => handleFilterChange('ageRange', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les âges</SelectItem>
                    <SelectItem value="18-25">18-25 ans</SelectItem>
                    <SelectItem value="26-35">26-35 ans</SelectItem>
                    <SelectItem value="36-45">36-45 ans</SelectItem>
                    <SelectItem value="45+">45+ ans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input 
                    type="date" 
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input 
                    type="date" 
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Workers */}
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total ouvriers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkers}</div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary">
                {stats.maleWorkers} H
              </Badge>
              <Badge variant="outline">
                {stats.femaleWorkers} F
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Workers */}
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ouvriers actifs
            </CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeWorkers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Résident actuellement
            </p>
          </CardContent>
        </Card>

        {/* Remaining Capacity */}
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Places restantes
            </CardTitle>
            <Building2 className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.remainingWorkers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Capacité disponible
            </p>
          </CardContent>
        </Card>

        {/* Male Average Age */}
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Âge moyen H
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.averageAgeMale}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ans (hommes)
            </p>
          </CardContent>
        </Card>

        {/* Female Average Age */}
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Âge moyen F
            </CardTitle>
            <Users className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.averageAgeFemale}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ans (femmes)
            </p>
          </CardContent>
        </Card>

        {/* Average Stay Duration */}
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Séjour moyen
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{enhancedStats?.averageStayDuration || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              jours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trends Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tendance hebdomadaire
            </CardTitle>
            <div className="flex items-center gap-1">
              <ChevronUp className="h-4 w-4 text-green-600" />
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{enhancedStats?.weeklyTrend || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs semaine précédente
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tendance mensuelle
            </CardTitle>
            <div className="flex items-center gap-1">
              <ChevronUp className="h-4 w-4 text-blue-600" />
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">+{enhancedStats?.monthlyTrend || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs mois précédent
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pic d'occupation
            </CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600">{enhancedStats?.peakOccupancyDate || 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Date du pic
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Occupancy */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Occupation des chambres</span>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Taux d'occupation des chambres dans le dortoir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary">{stats.occupancyRate}%</div>
                    <p className="text-sm text-muted-foreground">Taux d'occupation</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.occupiedRooms}/{stats.totalRooms}</div>
                    <p className="text-sm text-muted-foreground">Chambres occupées</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-primary" />
                      <span className="text-sm">Dortoir hommes</span>
                    </div>
                    <div className="text-sm font-medium">{stats.maleWorkers} ouvriers</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-destructive" />
                      <span className="text-sm">Dortoir femmes</span>
                    </div>
                    <div className="text-sm font-medium">{stats.femaleWorkers} ouvrières</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Exits */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Derniers départs</span>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Derniers ouvriers ayant quitté le dortoir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentExits.length > 0 ? (
                    recentExits.map((exit, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <div className="font-medium">{exit.worker_name}</div>
                          <div className="text-sm text-muted-foreground">{exit.exit_reason}</div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium">{exit.stay_duration_days} jours</div>
                          <div className="text-xs text-muted-foreground">
                            {format(exit.exit_date, 'dd/MM/yyyy')}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <UserX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        Aucun départ récent
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          {chartData && enhancedStats ? (
            <DashboardCharts data={chartData} />
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Chargement des tendances depuis Firebase...</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Quick Stats from Real Firebase Data */}
            {enhancedStats ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="success" className="bg-green-100 text-green-800 border-green-300">
                    📊 Données Firebase en temps réel
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Dernière mise à jour: {format(lastUpdate, 'HH:mm:ss')}
                  </span>
                </div>
                <QuickStats
                  stats={{
                    totalCapacity: stats.totalRooms * 4,
                    currentOccupancy: stats.activeWorkers,
                    dailyChange: Math.round(enhancedStats.weeklyTrend),
                    weeklyGrowth: enhancedStats.monthlyTrend
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Chargement des analyses Firebase...</span>
              </div>
            )}

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Taux de départ</p>
                      <p className="text-2xl font-bold text-destructive">{stats.exitPercentage}%</p>
                    </div>
                    <div className="h-12 w-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                      <UserX className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Taux de rétention</p>
                      <p className="text-2xl font-bold text-success">{100 - stats.exitPercentage}%</p>
                    </div>
                    <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Capacité disponible</p>
                      <p className="text-2xl font-bold text-warning">{(stats.totalRooms * 4) - stats.activeWorkers}</p>
                    </div>
                    <div className="h-12 w-12 bg-warning/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Firebase Data Indicator */}
            <div className="flex items-center justify-between mb-4">
              <Badge variant="success" className="bg-green-100 text-green-800 border-green-300">
                🔥 Connecté à Firebase - Données en temps réel
              </Badge>
              <span className="text-sm text-muted-foreground">
                {recentExits.length} sorties récentes • {stats.totalWorkers} ouvriers total
              </span>
            </div>

            {/* Real-time Status from Firebase */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600 animate-pulse" />
                    Statut en temps réel (Firebase)
                  </div>
                  <Badge variant={autoRefresh ? "default" : "secondary"}>
                    {autoRefresh ? 'Actif' : 'Inactif'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Dernière mise à jour: {format(lastUpdate, 'dd/MM/yyyy HH:mm:ss')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-600">{stats.activeWorkers}</div>
                    <div className="text-sm text-muted-foreground">Ouvriers actifs</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-600">{stats.occupiedRooms}</div>
                    <div className="text-sm text-muted-foreground">Chambres occupées</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-orange-600">{stats.occupancyRate}%</div>
                    <div className="text-sm text-muted-foreground">Taux d'occupation</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Reports */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Rapports et exports
                </CardTitle>
                <CardDescription>
                  Générez et téléchargez des rapports détaillés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" onClick={exportReport} className="h-auto p-4 flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-4 w-4" />
                      <span className="font-medium">Rapport complet JSON</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Exporte toutes les données du tableau de bord en format JSON
                    </p>
                  </Button>

                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start" disabled>
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-4 w-4" />
                      <span className="font-medium">Rapport PDF</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Rapport formaté PDF avec graphiques (bientôt disponible)
                    </p>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Firebase Statistics */}
            {enhancedStats && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Statistiques avancées Firebase
                  </CardTitle>
                  <CardDescription>
                    Données calculées en temps réel depuis la base Firebase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Trends */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Tendances calculées</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Croissance hebdomadaire:</span>
                          <Badge variant="secondary">+{enhancedStats.weeklyTrend.toFixed(1)}%</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Croissance mensuelle:</span>
                          <Badge variant="secondary">+{enhancedStats.monthlyTrend.toFixed(1)}%</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Séjour moyen:</span>
                          <Badge variant="outline">{enhancedStats.averageStayDuration} jours</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Pic d'occupation:</span>
                          <Badge variant="outline">{enhancedStats.peakOccupancyDate}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Data Sources */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Sources de données Firebase</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>• Distribution d'âge:</span>
                          <span>{enhancedStats.ageDistribution.reduce((sum, item) => sum + item.count, 0)} ouvriers</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Raisons de départ:</span>
                          <span>{enhancedStats.departureReasons.reduce((sum, item) => sum + item.count, 0)} cas</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Historique tendance:</span>
                          <span>{enhancedStats.occupancyTrend.length} jours</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Statistiques mensuelles:</span>
                          <span>{enhancedStats.monthlyStats.length} mois</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
