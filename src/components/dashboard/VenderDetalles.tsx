import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  type Product,
  type Lote,
  type Doctor,
} from "@/api/SalesApi";

export interface SaleItemWithLotes extends Product {
  cantidad: number;
  ubicacion?: string;
  lotesSeleccionados: { idlote: number; cantidad: number; fechaVencimiento: string }[];
  descuentoProducto: number; // Descuento en monto fijo (Bs)
}

export const formatBs = (value: number) => {
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return v.toFixed(2);
};

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const getImageUrl = (imagen: any): string | null => {
  if (!imagen) return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';

  if (typeof imagen === "string") {
    if (imagen.startsWith("http") || imagen.startsWith("data:image")) {
      return imagen;
    }
    if (imagen.length > 0 && !imagen.includes("object")) {
      return `data:image/jpeg;base64,${imagen}`;
    }
    return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
  }

  if (imagen && imagen.data && Array.isArray(imagen.data)) {
    try {
      const uint8Array = new Uint8Array(imagen.data);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.error("Error converting image buffer:", e);
      return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
    }
  }

  if (
    imagen &&
    typeof imagen === "object" &&
    imagen.type === "Buffer" &&
    Array.isArray(imagen.data)
  ) {
    try {
      const uint8Array = new Uint8Array(imagen.data);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.error("Error converting Buffer:", e);
      return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
    }
  }

  return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
};

// Componente DoctorSelect - con botón + en el campo de búsqueda
export const DoctorSelect = ({
  selectedDoctor,
  onDoctorChange,
  onRefreshList,
}: {
  selectedDoctor: Doctor | null;
  onDoctorChange: (doctor: Doctor | null) => void;
  onRefreshList: () => Promise<void>;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editName, setEditName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const searchResults = doctors.filter(
    (doctor) =>
      doctor.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectDoctor = (doctor: Doctor) => {
    onDoctorChange(doctor);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleAddDoctor = async () => {
    if (!newDoctorName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del doctor es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newDoctor = await createDoctor({ nombre: newDoctorName.trim() });
      setDoctors(prev => [...prev, newDoctor]);
      onDoctorChange(newDoctor);
      setShowAddDialog(false);
      setNewDoctorName("");
      if (onRefreshList) onRefreshList();
      toast({
        title: "Doctor agregado",
        description: `${newDoctor.nombre} ha sido agregado exitosamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el doctor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDoctor = async () => {
    if (!editingDoctor) return;
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del doctor es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updated = await updateDoctor(editingDoctor.id, { nombre: editName.trim() });
      setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d));
      if (selectedDoctor?.id === updated.id) {
        onDoctorChange(updated);
      }
      setEditingDoctor(null);
      setEditName("");
      if (onRefreshList) onRefreshList();
      toast({
        title: "Doctor actualizado",
        description: `${updated.nombre} ha sido actualizado exitosamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el doctor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    
    try {
      await deleteDoctor(doctorToDelete.id);
      setDoctors(prev => prev.filter(d => d.id !== doctorToDelete.id));
      if (selectedDoctor?.id === doctorToDelete.id) {
        onDoctorChange(null);
      }
      if (onRefreshList) onRefreshList();
      toast({
        title: "Doctor eliminado",
        description: `${doctorToDelete.nombre} ha sido eliminado`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el doctor",
        variant: "destructive",
      });
    } finally {
      setDoctorToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const startEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setEditName(doctor.nombre);
  };

  const cancelEdit = () => {
    setEditingDoctor(null);
    setEditName("");
  };

  const handleDeselect = () => {
    onDoctorChange(null);
  };

  const confirmDelete = (doctor: Doctor) => {
    setDoctorToDelete(doctor);
    setShowDeleteDialog(true);
  };

  const openAddDialog = () => {
    setShowAddDialog(true);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar doctor?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{doctorToDelete?.nombre}"?
              {selectedDoctor?.id === doctorToDelete?.id && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este doctor está seleccionado y será removido.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDoctorToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoctor}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Buscador con dropdown y botón + integrado - SOLO si NO hay doctor seleccionado */}
      {!selectedDoctor && (
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder="Buscar doctor..."
                className="h-9 text-sm pr-8"
              />
              {searchTerm.length > 0 && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0 flex-shrink-0"
              onClick={openAddDialog}
              title="Agregar doctor"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Dropdown de resultados */}
          {isOpen && searchTerm.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((doctor) => {
                  const isSelected = selectedDoctor?.id === doctor.id;
                  return (
                    <div
                      key={doctor.id}
                      className={`flex items-center justify-between px-3 py-1.5 hover:bg-accent group ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`flex-1 text-left text-sm ${
                          isSelected ? "text-primary font-medium" : ""
                        }`}
                        onMouseDown={() => selectDoctor(doctor)}
                      >
                        {doctor.nombre}
                        {isSelected && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ✓ seleccionado
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEdit(doctor);
                          }}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            confirmDelete(doctor);
                          }}
                          title="Eliminar"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No hay resultados para "{searchTerm}"
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0 text-primary"
                    onMouseDown={openAddDialog}
                  >
                    Agregar nuevo
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Doctor seleccionado - SOLO muestra el nombre y botón para deseleccionar */}
      {selectedDoctor && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 p-2 rounded-lg">
          <User className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm flex-1 font-medium text-primary truncate">{selectedDoctor.nombre}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={handleDeselect}
            title="Deseleccionar doctor"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Modal de edición */}
      {editingDoctor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-4 max-w-sm w-full mx-4 shadow-lg">
            <h4 className="text-sm font-medium mb-3">Editar doctor</h4>
            <Input
              placeholder="Nombre completo"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-9 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditDoctor();
                if (e.key === "Escape") cancelEdit();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                className="h-8"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleEditDoctor}
                className="h-8 bg-primary hover:bg-primary/90"
                disabled={loading || !editName.trim()}
              >
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de agregar */}
      {showAddDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-4 max-w-sm w-full mx-4 shadow-lg">
            <h4 className="text-sm font-medium mb-3">Agregar doctor</h4>
            <Input
              placeholder="Nombre completo *"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              className="h-9 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddDoctor();
                if (e.key === "Escape") {
                  setShowAddDialog(false);
                  setNewDoctorName("");
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewDoctorName("");
                }}
                className="h-8"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddDoctor}
                className="h-8 bg-primary hover:bg-primary/90"
                disabled={loading || !newDoctorName.trim()}
              >
                {loading ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para seleccionar cantidad y lotes
export const SeleccionarLoteDialog = ({
  open,
  onOpenChange,
  lotes,
  productName,
  stockDisponible,
  cantidadInicial,
  esEdicion,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: Lote[];
  productName: string;
  stockDisponible: number;
  cantidadInicial?: number;
  esEdicion?: boolean;
  onConfirm: (cantidad: number, selecciones: { idlote: number; cantidad: number }[]) => void;
  onCancel: () => void;
}) => {
  const [cantidadSolicitada, setCantidadSolicitada] = useState<number | undefined>(cantidadInicial);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [error, setError] = useState<string>("");
  const [paso, setPaso] = useState<'cantidad' | 'distribucion'>('cantidad');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cuando el diálogo se abre, enfocar el input
  useEffect(() => {
    if (open && paso === 'cantidad') {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [open, paso]);

  // Resetear el estado cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setCantidadSolicitada(cantidadInicial);
      setError("");
      setPaso('cantidad');
      setCantidades({});
    }
  }, [open, cantidadInicial]);

  const handleConfirmarCantidad = () => {
    if (!cantidadSolicitada || cantidadSolicitada <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    if (cantidadSolicitada > stockDisponible) {
      setError(`Stock insuficiente. Solo hay ${stockDisponible} unidades disponibles.`);
      return;
    }

    const sorted = [...lotes].sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
    
    const initial: Record<number, number> = {};
    let restante = cantidadSolicitada;
    
    for (const lote of sorted) {
      if (restante <= 0) break;
      const tomar = Math.min(lote.stock, restante);
      if (tomar > 0) {
        initial[lote.idlote] = tomar;
        restante -= tomar;
      }
    }
    
    // Si no se pudo distribuir toda la cantidad
    if (restante > 0) {
      setError(`No hay suficiente stock en los lotes para cubrir ${cantidadSolicitada} unidades. Faltan ${restante} unidades.`);
      return;
    }
    
    setCantidades(initial);
    setError("");
    setPaso('distribucion');
  };

  const totalSeleccionado = Object.values(cantidades).reduce((sum, c) => sum + c, 0);
  const esValido = totalSeleccionado === cantidadSolicitada && cantidadSolicitada && cantidadSolicitada > 0;

  const handleCantidadChange = (idlote: number, value: string) => {
    const num = parseInt(value) || 0;
    const lote = lotes.find(l => l.idlote === idlote);
    
    if (num < 0) return;
    if (lote && num > lote.stock) {
      setError(`Stock insuficiente. Solo hay ${lote.stock} unidades en este lote.`);
      return;
    }
    
    setError("");
    setCantidades(prev => {
      const newCantidades = { ...prev, [idlote]: num };
      const total = Object.values(newCantidades).reduce((sum, c) => sum + c, 0);
      if (cantidadSolicitada && total > cantidadSolicitada) {
        setError(`La suma total (${total}) no puede exceder la cantidad solicitada (${cantidadSolicitada})`);
        return prev;
      }
      return newCantidades;
    });
  };

  const handleConfirm = () => {
    if (!esValido || !cantidadSolicitada) {
      setError(`Debe seleccionar exactamente ${cantidadSolicitada || 0} unidades en total. Actual: ${totalSeleccionado}`);
      return;
    }
    
    const selecciones = Object.entries(cantidades)
      .filter(([_, cantidad]) => cantidad > 0)
      .map(([idlote, cantidad]) => ({
        idlote: parseInt(idlote),
        cantidad
      }));
    
    onConfirm(cantidadSolicitada, selecciones);
  };

  const handleVolver = () => {
    setPaso('cantidad');
    setError("");
  };

  const lotesOrdenados = [...lotes].sort((a, b) => 
    new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
  );

  // Funciones para los botones + y - de cantidad
  const incrementarCantidad = () => {
    const actual = cantidadSolicitada || 0;
    if (actual < stockDisponible) {
      setCantidadSolicitada(actual + 1);
      setError("");
    } else {
      setError(`No puedes agregar más de ${stockDisponible} unidades`);
    }
  };

  const decrementarCantidad = () => {
    const actual = cantidadSolicitada || 0;
    if (actual > 1) {
      setCantidadSolicitada(actual - 1);
      setError("");
    } else if (actual === 1) {
      setCantidadSolicitada(undefined);
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{esEdicion ? `Editar cantidad de ${productName}` : `Agregar ${productName}`}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {paso === 'cantidad' ? (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{productName}</p>
                <p className="text-sm text-muted-foreground">
                  Stock disponible: <strong>{stockDisponible}</strong> unidades
                </p>
                {esEdicion && (
                  <p className="text-sm text-muted-foreground">
                    Cantidad actual en carrito: <strong>{cantidadInicial || 0}</strong> unidades
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">
                  {esEdicion ? `Nueva cantidad total (${cantidadInicial || 0} actual)` : '¿Cuántas unidades deseas agregar?'}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 flex-shrink-0"
                    onClick={decrementarCantidad}
                    disabled={!cantidadSolicitada || cantidadSolicitada <= 1}
                  >
                    <span className="text-lg font-bold">−</span>
                  </Button>
                  <Input
                    ref={inputRef}
                    id="cantidad"
                    type="number"
                    min="1"
                    max={stockDisponible}
                    value={cantidadSolicitada === undefined ? "" : cantidadSolicitada}
                    placeholder="Ingrese la cantidad"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCantidadSolicitada(undefined);
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num > 0) {
                          if (num <= stockDisponible) {
                            setCantidadSolicitada(num);
                            setError("");
                          } else {
                            setError(`Máximo permitido: ${stockDisponible} unidades`);
                          }
                        }
                      }
                    }}
                    className="text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 text-center flex-1"
                    onWheel={(e) => e.currentTarget.blur()}
                    autoFocus={false}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 flex-shrink-0"
                    onClick={incrementarCantidad}
                    disabled={cantidadSolicitada === stockDisponible}
                  >
                    <span className="text-lg font-bold">+</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Mínimo: 1, Máximo: {stockDisponible}
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmarCantidad} 
                  className="flex-1"
                  disabled={!cantidadSolicitada || cantidadSolicitada <= 0 || cantidadSolicitada > stockDisponible}
                >
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{productName}</p>
                <p className="text-sm text-muted-foreground">
                  Cantidad solicitada: <strong>{cantidadSolicitada}</strong> unidades
                </p>
                <p className="text-sm text-muted-foreground">
                  Total seleccionado: <strong className={totalSeleccionado === cantidadSolicitada ? "text-green-600" : "text-red-600"}>
                    {totalSeleccionado}
                  </strong> unidades
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Distribuir entre lotes:</p>
                
                {lotesOrdenados.map((lote) => (
                  <div key={lote.idlote} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline" className="mb-1">
                          Lote #{lote.idlote}
                        </Badge>
                        <p className="text-sm">
                          Stock: <strong>{lote.stock}</strong> unidades
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vence: {new Date(lote.fechaVencimiento).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const current = cantidades[lote.idlote] || 0;
                            if (current > 0) {
                              handleCantidadChange(lote.idlote, String(current - 1));
                            }
                          }}
                          disabled={(cantidades[lote.idlote] || 0) <= 0}
                        >
                          <span className="font-bold">−</span>
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          max={Math.min(lote.stock, cantidadSolicitada || 999)}
                          value={cantidades[lote.idlote] || 0}
                          onChange={(e) => handleCantidadChange(lote.idlote, e.target.value)}
                          className="w-16 h-7 text-center text-sm number-input-no-scroll focus-visible:ring-0 focus-visible:ring-offset-0"
                          onWheel={(e) => e.currentTarget.blur()}
                          autoFocus={false}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            const current = cantidades[lote.idlote] || 0;
                            const maxPosible = Math.min(
                              lote.stock,
                              (cantidadSolicitada || 0) - totalSeleccionado + current
                            );
                            if (current < maxPosible) {
                              handleCantidadChange(lote.idlote, String(current + 1));
                            }
                          }}
                          disabled={
                            (cantidades[lote.idlote] || 0) >= lote.stock ||
                            totalSeleccionado >= (cantidadSolicitada || 0)
                          }
                        >
                          <span className="font-bold">+</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleVolver} className="flex-1">
                  Volver
                </Button>
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} disabled={!esValido} className="flex-1">
                  {esEdicion ? "Actualizar" : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente para ver lotes en carrito
export const LotesCarritoDialog = ({
  open,
  onOpenChange,
  productName,
  lotes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  lotes: { idlote: number; cantidad: number; fechaVencimiento: string }[];
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lotes en el carrito</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="font-medium">{productName}</p>
          
          <div className="space-y-2">
            {lotes.map((lote, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <div>
                  <Badge variant="outline" className="mb-1">
                    Lote #{lote.idlote}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Vence: {new Date(lote.fechaVencimiento).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <span className="font-semibold">{lote.cantidad} unidades</span>
              </div>
            ))}
          </div>
          
          <div className="bg-muted p-3 rounded-lg text-center">
            <p className="text-sm">
              Total: <strong>{lotes.reduce((sum, l) => sum + l.cantidad, 0)}</strong> unidades
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};