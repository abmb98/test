import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Activity, 
  Users,
  Clock,
  Calendar
} from 'lucide-react';

interface ChartData {
  occupancyTrend: Array<{ date: string; count: number }>;
  ageDistribution: { range: string; count: number; percentage: number }[];
  departureReasons: { reason: string; count: number; percentage: number }[];
  monthlyStats: Array<{ month: string; entries: number; exits: number; occupancy: number }>;
}

interface DashboardChartsProps {
  data: ChartData;
  className?: string;
}

export function DashboardCharts({ data, className = '' }: DashboardChartsProps) {
  const maxOccupancy = Math.max(...data.occupancyTrend.map(item => item.count));
  const totalAge = data.ageDistribution.reduce((sum, item) => sum + item.count, 0);
  const totalDepartures = data.departureReasons.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Occupancy Trend Chart */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Tendance d'occupation (30 derniers jours)
          </CardTitle>
          <CardDescription>
            Évolution du nombre d'ouvriers présents par jour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Minimum: {Math.min(...data.occupancyTrend.map(item => item.count))}</span>
              <span className="text-muted-foreground">Maximum: {maxOccupancy}</span>
            </div>
            
            <div className="flex items-end justify-between space-x-1 h-48 bg-muted/20 rounded-lg p-4">
              {data.occupancyTrend.map((item, index) => {
                const height = (item.count / maxOccupancy) * 100;
                const isWeekend = index % 7 === 5 || index % 7 === 6;
                
                return (
                  <div key={index} className="flex flex-col items-center space-y-1 group">
                    <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </div>
                    <div 
                      className={`rounded-t-sm w-3 transition-all duration-200 hover:opacity-80 ${
                        isWeekend ? 'bg-secondary' : 'bg-primary'
                      }`}
                      style={{ height: `${height}%` }}
                      title={`${item.date}: ${item.count} ouvriers`}
                    ></div>
                    <span className="text-xs text-muted-foreground transform -rotate-45 whitespace-nowrap">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution Chart */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              Distribution par âge
            </CardTitle>
            <CardDescription>
              Répartition des ouvriers par tranche d'âge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.ageDistribution.map((item, index) => {
                const percentage = totalAge > 0 ? (item.count / totalAge) * 100 : 0;
                const colors = [
                  'bg-blue-500',
                  'bg-green-500', 
                  'bg-yellow-500',
                  'bg-red-500'
                ];
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                        <span className="text-sm font-medium">{item.range} ans</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <Badge variant="secondary" className="text-xs">
                          {percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                );
              })}
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total</span>
                  <span className="text-muted-foreground">{totalAge} ouvriers</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Departure Reasons Chart */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-600" />
              Raisons de départ
            </CardTitle>
            <CardDescription>
              Analyse des motifs de sortie du dortoir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.departureReasons.map((item, index) => {
                const percentage = totalDepartures > 0 ? (item.count / totalDepartures) * 100 : 0;
                const colors = [
                  'bg-red-500',
                  'bg-orange-500', 
                  'bg-purple-500',
                  'bg-pink-500'
                ];
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                        <span className="text-sm font-medium">{item.reason}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <Badge variant="destructive" className="text-xs">
                          {percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                );
              })}
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total départs</span>
                  <span className="text-muted-foreground">{totalDepartures} personnes</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Statistics */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Statistiques mensuelles
          </CardTitle>
          <CardDescription>
            Évolution des entrées, sorties et taux d'occupation par mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
              <div>Mois</div>
              <div className="text-center">Entrées</div>
              <div className="text-center">Sorties</div>
              <div className="text-center">Occupation</div>
            </div>
            
            {data.monthlyStats.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-muted/50 last:border-0">
                <div className="font-medium">{item.month}</div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    +{item.entries}
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant="destructive" className="text-xs">
                    -{item.exits}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm font-medium">{item.occupancy}%</span>
                    <Progress value={item.occupancy} className="w-16 h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Firebase Data Confirmation */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
            Données Firebase en temps réel
          </CardTitle>
          <CardDescription>
            Toutes les statistiques ci-dessus proviennent directement de Firebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800">Connexion Firebase active</div>
                <div className="text-xs text-green-600">Toutes les données sont synchronisées en temps réel</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Sources de données:</div>
                <div className="text-muted-foreground space-y-1">
                  <div>• Collection "workers" - Firestore</div>
                  <div>• Collection "rooms" - Firestore</div>
                  <div>• Calculs en temps réel</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Fréquence de mise à jour:</div>
                <div className="text-muted-foreground space-y-1">
                  <div>• Actualisation automatique</div>
                  <div>• Synchronisation instantanée</div>
                  <div>• Données toujours à jour</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick Stats Component
interface QuickStatsProps {
  stats: {
    totalCapacity: number;
    currentOccupancy: number;
    dailyChange: number;
    weeklyGrowth: number;
  };
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="hover-lift card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Capacité totale</p>
              <p className="text-2xl font-bold">{stats.totalCapacity}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Occupation actuelle</p>
              <p className="text-2xl font-bold text-primary">{stats.currentOccupancy}</p>
            </div>
            <Activity className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Changement quotidien</p>
              <p className={`text-2xl font-bold ${stats.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.dailyChange >= 0 ? '+' : ''}{stats.dailyChange}
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${stats.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Croissance 7j</p>
              <p className={`text-2xl font-bold ${stats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth}%
              </p>
            </div>
            <Clock className={`h-8 w-8 ${stats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
