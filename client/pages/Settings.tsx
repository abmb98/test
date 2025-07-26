import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings as SettingsIcon, 
  Users, 
  Plus, 
  Trash2, 
  Shield,
  Database,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Building,
  Bed,
  Save,
  RotateCcw
} from 'lucide-react';
import { usersService, dormsService, roomsService } from '@/lib/firebase-service';
import { initializeSampleData } from '@/lib/initialize-data';
import { AdminUser, Dorm, Room } from '@shared/types';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export function Settings() {
  const { user } = useAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isInitializeDialogOpen, setIsInitializeDialogOpen] = useState(false);
  const [isFixingData, setIsFixingData] = useState(false);
  const [fixResults, setFixResults] = useState<{ fixed: number; errors: string[] } | null>(null);

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    display_name: ''
  });

  const [initializeForm, setInitializeForm] = useState({
    male_rooms: 20,
    female_rooms: 20
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, dormsData, roomsData] = await Promise.all([
        usersService.getAll(),
        dormsService.getAll(),
        roomsService.getAll()
      ]);
      
      setAdminUsers(usersData);
      setDorms(dormsData);
      setRooms(roomsData);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await usersService.create({
        email: newUserForm.email,
        role: 'admin',
        display_name: newUserForm.display_name
      });
      
      setSuccess('Administrateur ajouté avec succès');
      setNewUserForm({ email: '', display_name: '' });
      setIsAddUserDialogOpen(false);
      loadData();
    } catch (err) {
      setError('Erreur lors de l\'ajout de l\'administrateur');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet administrateur ?')) return;

    try {
      await usersService.delete(userId);
      setSuccess('Administrateur supprimé avec succès');
      loadData();
    } catch (err) {
      setError('Erreur lors de la suppression de l\'administrateur');
      console.error(err);
    }
  };

  const initializeSystem = async () => {
    try {
      setError('');
      setSuccess('');

      // Create dorms
      const maleDormId = await dormsService.create({
        name: 'Male',
        name_ar: 'Hommes'
      });

      const femaleDormId = await dormsService.create({
        name: 'Female',
        name_ar: 'Femmes'
      });

      // Create rooms for male dorm
      const maleRoomPromises = [];
      for (let i = 1; i <= initializeForm.male_rooms; i++) {
        maleRoomPromises.push(roomsService.create({
          dorm_id: maleDormId,
          room_number: i,
          capacity: 4,
          current_occupancy: 0
        }));
      }

      // Create rooms for female dorm
      const femaleRoomPromises = [];
      for (let i = 1; i <= initializeForm.female_rooms; i++) {
        femaleRoomPromises.push(roomsService.create({
          dorm_id: femaleDormId,
          room_number: i,
          capacity: 4,
          current_occupancy: 0
        }));
      }

      await Promise.all([...maleRoomPromises, ...femaleRoomPromises]);

      setSuccess('Système initialisé avec succès');
      setIsInitializeDialogOpen(false);
      loadData();
    } catch (err) {
      setError('Erreur lors de l\'initialisation du système');
      console.error(err);
    }
  };

  const initializeSampleDataHandler = async () => {
    if (!confirm('Ceci ajoutera des données d\'exemple au système. Voulez-vous continuer ?')) return;

    try {
      setError('');
      setSuccess('');
      await initializeSampleData();
      setSuccess('Données d\'exemple ajoutées avec succès');
      loadData();
    } catch (err) {
      setError('Erreur lors de l\'ajout des données d\'exemple');
      console.error(err);
    }
  };

  const handleFixDataIntegrity = async () => {
    if (!confirm('Cette opération va corriger les ouvriers avec des données de chambre invalides. Continuer ?')) return;

    try {
      setIsFixingData(true);
      setError('');
      setFixResults(null);

      const results = await workersService.fixWorkerRoomData();
      setFixResults(results);

      if (results.fixed > 0) {
        setSuccess(`${results.fixed} ouvrier(s) corrigé(s) avec succès`);
      } else {
        setSuccess('Aucune correction nécessaire. Toutes les données sont valides.');
      }
    } catch (err: any) {
      setError('Erreur lors de la correction des données: ' + (err.message || 'Erreur inconnue'));
    } finally {
      setIsFixingData(false);
    }
  };

  const isSystemInitialized = dorms.length > 0 && rooms.length > 0;

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-foreground">Paramètres du Système</h1>
          <p className="text-muted-foreground">
            Gestion des utilisateurs et paramètres généraux du système
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

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>État du Système</span>
            <Database className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Badge variant={isSystemInitialized ? 'default' : 'secondary'} className="mb-2">
                {isSystemInitialized ? 'Initialisé' : 'Non initialisé'}
              </Badge>
              <p className="text-sm text-muted-foreground">État du système</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{dorms.length}</p>
              <p className="text-sm text-muted-foreground">Types de dortoirs</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{rooms.length}</p>
              <p className="text-sm text-muted-foreground">Total chambres</p>
            </div>
          </div>

          {!isSystemInitialized && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-warning">Système non initialisé</p>
                  <p className="text-sm text-muted-foreground">
                    Le système doit d'abord être initialisé pour créer les types de dortoirs et les chambres
                  </p>
                </div>
                <Dialog open={isInitializeDialogOpen} onOpenChange={setIsInitializeDialogOpen}>
                  <DialogTrigger>
                    <Button variant="outline">
                      <Database className="w-4 h-4 mr-2" />
                      Initialiser le système
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Initialisation du système</DialogTitle>
                      <DialogDescription>
                        Définissez le nombre de chambres pour chaque type de dortoir
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="male_rooms">
                          Nombre de chambres hommes
                        </Label>
                        <Input
                          id="male_rooms"
                          type="number"
                          min="1"
                          max="100"
                          value={initializeForm.male_rooms}
                          onChange={(e) => setInitializeForm({ 
                            ...initializeForm, 
                            male_rooms: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="female_rooms">
                          Nombre de chambres femmes
                        </Label>
                        <Input
                          id="female_rooms"
                          type="number"
                          min="1"
                          max="100"
                          value={initializeForm.female_rooms}
                          onChange={(e) => setInitializeForm({ 
                            ...initializeForm, 
                            female_rooms: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button onClick={initializeSystem} className="flex-1">
                          <Save className="w-4 h-4 mr-2" />
                          Initialiser le système
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setIsInitializeDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Integrity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Intégrité des Données</span>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Correction automatique des problèmes de données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Corriger les ouvriers avec données de chambre invalides</p>
                <p className="text-sm text-muted-foreground">
                  Identifie et corrige automatiquement les ouvriers sans chambre assignée
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleFixDataIntegrity}
                disabled={isFixingData}
              >
                {isFixingData ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Correction...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Corriger les données
                  </>
                )}
              </Button>
            </div>

            {fixResults && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="font-medium mb-2">Résultats de la correction:</p>
                <div className="space-y-1 text-sm">
                  <p>✅ Ouvriers corrigés: {fixResults.fixed}</p>
                  {fixResults.errors.length > 0 && (
                    <div>
                      <p className="text-destructive font-medium">❌ Erreurs ({fixResults.errors.length}):</p>
                      <ul className="list-disc list-inside text-destructive ml-4">
                        {fixResults.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Administrateurs</TabsTrigger>
          <TabsTrigger value="system">Paramètres système</TabsTrigger>
        </TabsList>

        {/* Admin Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                  <CardDescription>
                    Ajouter et gérer les administrateurs qui peuvent accéder au système
                  </CardDescription>
                </div>
                
                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <DialogTrigger>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter administrateur
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Ajouter nouvel administrateur</DialogTitle>
                      <DialogDescription>
                        Entrez les données du nouvel administrateur
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Adresse e-mail
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({ 
                            ...newUserForm, 
                            email: e.target.value 
                          })}
                          dir="ltr"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="display_name">
                          Nom d'affichage
                        </Label>
                        <Input
                          id="display_name"
                          value={newUserForm.display_name}
                          onChange={(e) => setNewUserForm({ 
                            ...newUserForm, 
                            display_name: e.target.value 
                          })}
                          required
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Ajouter administrateur
                        </Button>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setIsAddUserDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Adresse e-mail</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date d'ajout</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((adminUser) => (
                    <TableRow key={adminUser.id}>
                      <TableCell className="font-medium">
                        {adminUser.display_name}
                      </TableCell>
                      <TableCell dir="ltr">
                        {adminUser.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Shield className="w-3 h-3 mr-1" />
                          <span>Administrateur</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(adminUser.created_at, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(adminUser.id)}
                          className="text-destructive hover:text-destructive"
                          disabled={adminUser.email === user?.email}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {adminUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucun administrateur enregistré pour le moment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du système</CardTitle>
              <CardDescription>
                Informations détaillées sur la configuration du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Types de dortoirs</h3>
                  {dorms.map((dorm) => {
                    const dormRooms = rooms.filter(r => r.dorm_id === dorm.id);
                    return (
                      <div key={dorm.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{dorm.name === 'Male' ? 'Hommes' : 'Femmes'}</p>
                          <p className="text-sm text-muted-foreground">
                            {dormRooms.length} chambres
                          </p>
                        </div>
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Statistiques des chambres</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Total chambres</p>
                        <p className="text-sm text-muted-foreground">
                          Capacité complète: {rooms.length * 4} personnes
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{rooms.length}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Capacité disponible</p>
                        <p className="text-sm text-muted-foreground">
                          Places libres
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {rooms.reduce((sum, room) => sum + (4 - room.current_occupancy), 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sample Data Section */}
              {isSystemInitialized && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Données d'exemple</h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Ajouter données d'exemple</p>
                        <p className="text-sm text-muted-foreground">
                          Ajouter ouvriers et données fictives pour tester le système
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={initializeSampleDataHandler}
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Ajouter données d'exemple
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
