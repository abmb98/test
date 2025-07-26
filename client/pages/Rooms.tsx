import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building, 
  Bed, 
  Users, 
  UserPlus,
  Eye,
  AlertCircle,
  CheckCircle,
  Home,
  Gauge
} from 'lucide-react';
import { roomsService, workersService, dormsService, subscribeToRooms, subscribeToWorkers } from '@/lib/firebase-service';
import { Room, Worker, Dorm } from '@shared/types';

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomOccupants, setRoomOccupants] = useState<Worker[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadInitialData();

    // Subscribe to real-time updates for both rooms and workers
    const unsubscribeRooms = subscribeToRooms((updatedRooms) => {
      setRooms(updatedRooms);
    });

    const unsubscribeWorkers = subscribeToWorkers((updatedWorkers) => {
      setWorkers(updatedWorkers);
    });

    return () => {
      unsubscribeRooms();
      unsubscribeWorkers();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [roomsData, workersData, dormsData] = await Promise.all([
        roomsService.getAll(),
        workersService.getAll(),
        dormsService.getAll()
      ]);
      
      setRooms(roomsData);
      setWorkers(workersData);
      setDorms(dormsData);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoom = async (room: Room) => {
    try {
      const occupants = await workersService.getByRoom(room.id);
      setRoomOccupants(occupants);
      setSelectedRoom(room);
    } catch (err) {
      setError('Erreur lors du chargement des données de la chambre');
      console.error(err);
    }
  };

  // Calculate room occupancy based on current active workers
  const getRoomOccupancy = (roomId: string) => {
    const activeWorkers = workers.filter(worker =>
      worker.room_id === roomId && worker.status === 'Active'
    );
    return activeWorkers.length;
  };

  // Get updated room data with current worker counts
  const getUpdatedRooms = () => {
    if (!rooms.length || !workers.length) return rooms;
    return rooms.map(room => ({
      ...room,
      current_occupancy: getRoomOccupancy(room.id)
    }));
  };

  const getDormName = (dormId: string) => {
    const dorm = dorms.find(d => d.id === dormId);
    return dorm ? (dorm.name === 'Male' ? 'Hommes' : 'Femmes') : 'Non défini';
  };

  const getDormRooms = (dormId: string) => {
    return updatedRooms.filter(room => room.dorm_id === dormId);
  };

  const getOccupancyColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage === 0) return 'text-muted-foreground';
    if (percentage <= 50) return 'text-success';
    if (percentage <= 75) return 'text-warning';
    return 'text-destructive';
  };

  const getOccupancyBadgeVariant = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage === 0) return 'secondary';
    if (percentage <= 50) return 'default';
    if (percentage <= 75) return 'outline';
    return 'destructive';
  };

  const updatedRooms = getUpdatedRooms();
  const totalRooms = updatedRooms.length;
  const occupiedRooms = updatedRooms.filter(r => r.current_occupancy > 0).length;
  const fullRooms = updatedRooms.filter(r => r.current_occupancy >= 4).length;
  const emptyRooms = updatedRooms.filter(r => r.current_occupancy === 0).length;

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Chambres</h1>
          <p className="text-muted-foreground">
            Voir et gérer les chambres du dortoir et les informations d'occupation
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total chambres</p>
                <p className="text-2xl font-bold">{totalRooms}</p>
              </div>
              <Building className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Chambres occupées</p>
                <p className="text-2xl font-bold text-success">{occupiedRooms}</p>
              </div>
              <Bed className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Chambres complètes</p>
                <p className="text-2xl font-bold text-destructive">{fullRooms}</p>
              </div>
              <Home className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Chambres vides</p>
                <p className="text-2xl font-bold text-muted-foreground">{emptyRooms}</p>
              </div>
              <Gauge className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms by Dorm */}
      <Tabs defaultValue={dorms[0]?.id} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {dorms.map((dorm) => (
            <TabsTrigger key={dorm.id} value={dorm.id}>
              {dorm.name === 'Male' ? 'Hommes' : 'Femmes'}
            </TabsTrigger>
          ))}
        </TabsList>

        {dorms.map((dorm) => (
          <TabsContent key={dorm.id} value={dorm.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Chambres {dorm.name === 'Male' ? 'Hommes' : 'Femmes'} ({getDormRooms(dorm.id).length} chambres)
                </CardTitle>
                <CardDescription>
                  Vue détaillée de toutes les chambres du dortoir {dorm.name === 'Male' ? 'hommes' : 'femmes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getDormRooms(dorm.id).map((room) => (
                    <Card key={room.id} className="hover-lift card-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            Chambre {room.room_number}
                          </CardTitle>
                          <Badge 
                            variant={getOccupancyBadgeVariant(room.current_occupancy, room.capacity)}
                          >
                            {room.current_occupancy}/{room.capacity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Taux d'occupation</p>
                            <p className={`text-lg font-bold ${getOccupancyColor(room.current_occupancy, room.capacity)}`}>
                              {Math.round((room.current_occupancy / room.capacity) * 100)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Capacité disponible</p>
                            <p className="text-lg font-bold text-primary">
                              {room.capacity - room.current_occupancy}
                            </p>
                          </div>
                        </div>

                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              room.current_occupancy === 0 ? 'bg-muted-foreground' :
                              room.current_occupancy <= 2 ? 'bg-success' :
                              room.current_occupancy === 3 ? 'bg-warning' :
                              'bg-destructive'
                            }`}
                            style={{ 
                              width: `${(room.current_occupancy / room.capacity) * 100}%` 
                            }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleViewRoom(room)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Voir détails
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  Détails Chambre {selectedRoom?.room_number}
                                </DialogTitle>
                                <DialogDescription>
                                  Informations détaillées sur la chambre et les occupants
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedRoom && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Numéro chambre</p>
                                      <p className="font-medium">{selectedRoom.room_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Type dortoir</p>
                                      <p className="font-medium">{getDormName(selectedRoom.dorm_id)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Capacité totale</p>
                                      <p className="font-medium">{selectedRoom.capacity} personnes</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Occupants actuels</p>
                                      <p className="font-medium">{selectedRoom.current_occupancy} personnes</p>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <h4 className="font-medium">Occupants actuels:</h4>
                                    {roomOccupants.length > 0 ? (
                                      <div className="space-y-2">
                                        {roomOccupants.map((occupant) => (
                                          <div key={occupant.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                            <div>
                                              <p className="font-medium">{occupant.full_name}</p>
                                              <p className="text-sm text-muted-foreground">{occupant.cin}</p>
                                            </div>
                                            <Badge variant="outline">
                                              <UserPlus className="w-3 h-3 mr-1" />
                                              <span>Actif</span>
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-4">
                                        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-muted-foreground">Aucun occupant actuellement</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    <div className="flex-1">
                                      <p className="text-sm text-muted-foreground">Places disponibles</p>
                                      <p className="text-lg font-bold text-success">
                                        {selectedRoom.capacity - selectedRoom.current_occupancy}
                                      </p>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-muted-foreground">Taux d'occupation</p>
                                      <p className={`text-lg font-bold ${getOccupancyColor(selectedRoom.current_occupancy, selectedRoom.capacity)}`}>
                                        {Math.round((selectedRoom.current_occupancy / selectedRoom.capacity) * 100)}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {getDormRooms(dorm.id).length === 0 && (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Aucune chambre enregistrée dans le dortoir {dorm.name === 'Male' ? 'hommes' : 'femmes'} pour le moment
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques générales</CardTitle>
          <CardDescription>
            Vue d'ensemble de l'occupation de toutes les chambres du dortoir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRooms}</p>
                <p className="text-sm text-muted-foreground">Total chambres</p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <Bed className="h-8 w-8 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{occupiedRooms}</p>
                <p className="text-sm text-muted-foreground">Chambres occupées</p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <Home className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{fullRooms}</p>
                <p className="text-sm text-muted-foreground">Chambres complètes</p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Gauge className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{emptyRooms}</p>
                <p className="text-sm text-muted-foreground">Chambres vides</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
