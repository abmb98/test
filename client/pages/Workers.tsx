import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  UserCheck, 
  UserX,
  Calendar,
  Phone,
  IdCard,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { workersService, roomsService, dormsService, subscribeToWorkers, testFirebaseConnection } from '@/lib/firebase-service';
import { Worker, Room, Dorm, EXIT_REASONS } from '@shared/types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    cin: '',
    phone: '',
    birth_year: new Date().getFullYear() - 25,
    dorm_id: '',
    room_id: '',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: '',
    exit_reason: ''
  });

  useEffect(() => {
    loadInitialData();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToWorkers((updatedWorkers) => {
      setWorkers(updatedWorkers);
    });

    return () => unsubscribe();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const [workersData, roomsData, dormsData] = await Promise.all([
        workersService.getAll(),
        roomsService.getAll(),
        dormsService.getAll()
      ]);
      
      setWorkers(workersData);
      setRooms(roomsData);
      setDorms(dormsData);
    } catch (err: any) {
      console.error('Workers data loading error:', err);
      
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

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.cin.includes(searchTerm) ||
                         worker.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && worker.status === 'Active') ||
                         (statusFilter === 'inactive' && worker.status === 'Inactive');
    
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      cin: '',
      phone: '',
      birth_year: new Date().getFullYear() - 25,
      dorm_id: '',
      room_id: '',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: '',
      exit_reason: ''
    });
    setEditingWorker(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        setError('Le nom complet est requis');
        return;
      }
      if (!formData.cin.trim()) {
        setError('Le CIN est requis');
        return;
      }
      if (!formData.phone.trim()) {
        setError('Le numéro de téléphone est requis');
        return;
      }

      if (editingWorker) {
        // Update existing worker
        const updates: any = {
          full_name: formData.full_name,
          cin: formData.cin,
          phone: formData.phone,
          birth_year: formData.birth_year,
        };

        if (formData.check_out_date && !editingWorker.check_out_date) {
          // Setting check out date - worker becomes inactive
          updates.check_out_date = new Date(formData.check_out_date);
          updates.exit_reason = formData.exit_reason;
          updates.status = 'Inactive';
        } else if (!formData.check_out_date && editingWorker.check_out_date) {
          // Clearing check out date - worker becomes active again
          updates.check_out_date = null;
          updates.exit_reason = null;
          updates.status = 'Active';
        }

        if (formData.room_id !== editingWorker.room_id) {
          // Check room capacity
          const targetRoom = rooms.find(r => r.id === formData.room_id);
          if (targetRoom && targetRoom.current_occupancy >= 4) {
            setError('Chambre complète, impossible de transférer l\'ouvrier');
            return;
          }
          updates.room_id = formData.room_id;
          updates.dorm_id = formData.dorm_id;
        }

        await workersService.update(editingWorker.id, updates);
        setSuccess('Données de l\'ouvrier mises à jour avec succès');
      } else {
        // Create new worker - validate room and dorm selection
        if (!formData.dorm_id || formData.dorm_id.trim() === '') {
          setError('Veuillez sélectionner un dortoir');
          return;
        }
        if (!formData.room_id || formData.room_id.trim() === '') {
          setError('Veuillez sélectionner une chambre');
          return;
        }

        const targetRoom = rooms.find(r => r.id === formData.room_id);
        if (targetRoom && targetRoom.current_occupancy >= 4) {
          setError('Chambre complète, choisissez une autre chambre');
          return;
        }

        await workersService.create({
          full_name: formData.full_name,
          cin: formData.cin,
          phone: formData.phone,
          birth_year: formData.birth_year,
          dorm_id: formData.dorm_id,
          room_id: formData.room_id,
          check_in_date: new Date(formData.check_in_date)
        });
        setSuccess('Ouvrier ajouté avec succès');
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      setError('Erreur lors de la sauvegarde des données');
      console.error(err);
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      full_name: worker.full_name,
      cin: worker.cin,
      phone: worker.phone,
      birth_year: worker.birth_year || new Date().getFullYear() - 25,
      dorm_id: worker.dorm_id,
      room_id: worker.room_id,
      check_in_date: format(worker.check_in_date, 'yyyy-MM-dd'),
      check_out_date: worker.check_out_date ? format(worker.check_out_date, 'yyyy-MM-dd') : '',
      exit_reason: worker.exit_reason || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (workerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ouvrier ?')) return;

    try {
      await workersService.delete(workerId);
      setSuccess('Ouvrier supprimé avec succès');
    } catch (err) {
      setError('Erreur lors de la suppression de l\'ouvrier');
      console.error(err);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredWorkers.map(worker => ({
      'Nom complet': worker.full_name,
      'CIN': worker.cin,
      'Téléphone': worker.phone,
      'Année de naissance': worker.birth_year,
      'Âge': worker.age,
      'Type de dortoir': getDormName(worker.dorm_id),
      'Numéro de chambre': getRoomNumber(worker.room_id),
      'Date d\'entrée': format(worker.check_in_date, 'dd/MM/yyyy'),
      'Date de sortie': worker.check_out_date ? format(worker.check_out_date, 'dd/MM/yyyy') : '',
      'Raison de sortie': worker.exit_reason || '',
      'Statut': worker.status === 'Active' ? 'Actif' : 'Inactif',
      'Durée de séjour (jours)': worker.stay_duration_days || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ouvriers');
    
    // Auto-size columns
    const maxWidth = 20;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, 10), maxWidth)
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `ouvriers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    setSuccess('Fichier Excel exporté avec succès');
  };

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.room_number : 'Non défini';
  };

  const getDormName = (dormId: string) => {
    const dorm = dorms.find(d => d.id === dormId);
    return dorm ? (dorm.name === 'Male' ? 'Hommes' : 'Femmes') : 'Non défini';
  };

  const availableRooms = rooms.filter(room => {
    if (formData.dorm_id && room.dorm_id !== formData.dorm_id) return false;
    if (editingWorker && room.id === editingWorker.room_id) return true;
    return room.current_occupancy < 4;
  });

  const activeWorkers = workers.filter(w => w.status === 'Active');
  const inactiveWorkers = workers.filter(w => w.status === 'Inactive');
  const maleWorkers = activeWorkers.filter(w => {
    const dorm = dorms.find(d => d.id === w.dorm_id);
    return dorm?.name === 'Male';
  });
  const femaleWorkers = activeWorkers.filter(w => {
    const dorm = dorms.find(d => d.id === w.dorm_id);
    return dorm?.name === 'Female';
  });

  const averageStay = inactiveWorkers.length > 0 
    ? Math.round(inactiveWorkers.reduce((sum, w) => sum + (w.stay_duration_days || 0), 0) / inactiveWorkers.length)
    : 0;

  const averageAgeMale = maleWorkers.length > 0 
    ? Math.round(maleWorkers.reduce((sum, w) => sum + (w.age || 0), 0) / maleWorkers.length)
    : 0;

  const averageAgeFemale = femaleWorkers.length > 0 
    ? Math.round(femaleWorkers.reduce((sum, w) => sum + (w.age || 0), 0) / femaleWorkers.length)
    : 0;

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 gap-6">
          {[...Array(5)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-foreground">Gestion des Ouvriers</h1>
          <p className="text-muted-foreground">
            Voir et gérer tous les ouvriers résidant dans le dortoir
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportToExcel}
            disabled={filteredWorkers.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exporter Excel
          </Button>
          
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un ouvrier
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingWorker ? 'Modifier les données de l\'ouvrier' : 'Ajouter un nouvel ouvrier'}
                </DialogTitle>
                <DialogDescription>
                  {editingWorker ? 'Modifiez les données requises' : 'Entrez les données du nouvel ouvrier'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cin">Numéro d'identité</Label>
                  <Input
                    id="cin"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_year">Année de naissance</Label>
                  <Input
                    id="birth_year"
                    type="number"
                    min="1940"
                    max={new Date().getFullYear()}
                    value={formData.birth_year}
                    onChange={(e) => setFormData({ ...formData, birth_year: parseInt(e.target.value) || new Date().getFullYear() - 25 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dorm_id">Type de dortoir</Label>
                  <Select 
                    value={formData.dorm_id} 
                    onValueChange={(value) => setFormData({ ...formData, dorm_id: value, room_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir le type de dortoir" />
                    </SelectTrigger>
                    <SelectContent>
                      {dorms.map((dorm) => (
                        <SelectItem key={dorm.id} value={dorm.id}>
                          {dorm.name === 'Male' ? 'Hommes' : 'Femmes'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.dorm_id && (
                  <div className="space-y-2">
                    <Label htmlFor="room_id">Numéro de chambre</Label>
                    <Select 
                      value={formData.room_id} 
                      onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir le numéro de chambre" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            Chambre {room.room_number} ({room.current_occupancy}/4)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="check_in_date">Date d'entrée</Label>
                  <Input
                    id="check_in_date"
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    disabled={!!editingWorker}
                    required
                  />
                </div>

                {editingWorker && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="check_out_date">Date de sortie</Label>
                      <Input
                        id="check_out_date"
                        type="date"
                        value={formData.check_out_date}
                        onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                      />
                    </div>

                    {formData.check_out_date && (
                      <div className="space-y-2">
                        <Label htmlFor="exit_reason">Raison de sortie</Label>
                        <Select 
                          value={formData.exit_reason} 
                          onValueChange={(value) => setFormData({ ...formData, exit_reason: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir la raison de sortie" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fin de contrat">Fin de contrat</SelectItem>
                            <SelectItem value="Démission">Démission</SelectItem>
                            <SelectItem value="Mutation">Mutation vers une autre branche</SelectItem>
                            <SelectItem value="Licenciement">Licenciement</SelectItem>
                            <SelectItem value="Raisons personnelles">Raisons personnelles</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingWorker ? 'Sauvegarder les modifications' : 'Ajouter l\'ouvrier'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total ouvriers</p>
                <p className="text-2xl font-bold">{workers.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Actifs</p>
                <p className="text-2xl font-bold text-success">{activeWorkers.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hommes</p>
                <p className="text-2xl font-bold text-blue-600">{maleWorkers.length}</p>
                <p className="text-xs text-muted-foreground">Âge moyen: {averageAgeMale} ans</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Femmes</p>
                <p className="text-2xl font-bold text-pink-600">{femaleWorkers.length}</p>
                <p className="text-xs text-muted-foreground">Âge moyen: {averageAgeFemale} ans</p>
              </div>
              <Users className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sortis</p>
                <p className="text-2xl font-bold text-destructive">{inactiveWorkers.length}</p>
              </div>
              <UserX className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Séjour moyen</p>
                <p className="text-2xl font-bold text-primary">{averageStay}</p>
                <p className="text-xs text-muted-foreground">jours</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, CIN ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les ouvriers</SelectItem>
                <SelectItem value="active">Actifs seulement</SelectItem>
                <SelectItem value="inactive">Sortis seulement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des ouvriers ({filteredWorkers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>CIN</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead>Dortoir</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Date d'entrée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">
                      {worker.full_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <IdCard className="h-4 w-4 text-muted-foreground" />
                        <span>{worker.cin}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{worker.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {worker.age || 'N/A'} ans
                    </TableCell>
                    <TableCell>
                      {getDormName(worker.dorm_id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>Chambre {getRoomNumber(worker.room_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(worker.check_in_date, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={worker.status === 'Active' ? 'default' : 'secondary'}>
                        {worker.status === 'Active' ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Actif</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <XCircle className="h-3 w-3" />
                            <span>Sorti</span>
                          </div>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(worker)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(worker.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredWorkers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Aucun résultat ne correspond à la recherche'
                    : 'Aucun ouvrier enregistré pour le moment'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
