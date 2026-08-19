// components/ProductosView.tsx
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Package,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormularioProductos } from "./FormularioProductos";
import {
  getUbicaciones,
  getCategorias,
  getLaboratorios,
  buscarProductos,
  getAllProductos,
  deleteProducto,
  Producto,
  updateStockProducto,
  ProductoLote,
} from "@/api/ProductsApi";
import { getImageUrl } from "./VenderView";

interface StockFormData {
  stockActual: number;
  cantidadAñadir: string;
  productoId: number;
  productoNombre: string;
  loteId: number;
  fechaVencimiento: string;
  modoNuevoLote: boolean;
}

// Componente para el carrusel de imágenes
interface ImageCarouselProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ImageCarousel({
  images,
  productName,
  className = "",
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1,
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
      >
        <Package className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <div className="relative aspect-square w-full">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// Componente para desglose de lotes
function LotesDesglose({ lotes, productName }: { lotes: ProductoLote[], productName: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!lotes || lotes.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin lotes</span>;
  }

  const totalStock = lotes.reduce((sum, l) => sum + l.stock, 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-primary">{totalStock}</span>
        <span className="text-xs text-muted-foreground">unidades totales</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 px-1"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="text-xs ml-1">{lotes.length} lotes</span>
        </Button>
      </div>
      {expanded && (
        <div className="space-y-1 pl-2 border-l-2 border-primary/30">
          {lotes.map((lote, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                Lote {idx + 1}
              </Badge>
              <span className="font-medium">{lote.stock} u.</span>
              <span className="text-muted-foreground">
                Vence: {new Date(lote.fechaVencimiento).toLocaleDateString('es-ES')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente para mostrar productos similares en un Dialog
function ProductosSimilaresDialog({ 
  similares, 
  productName,
  children
}: { 
  similares: Array<{ idproducto: number; nombre: string }>;
  productName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!similares || similares.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Productos similares a "{productName}"
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto py-4">
            {similares.map((similar) => (
              <div
                key={similar.idproducto}
                className="py-2 px-3 hover:bg-accent rounded-md text-sm border-b last:border-0"
              >
                {similar.nombre}
              </div>
            ))}
          </div>
          <DialogFooter>
            <div className="text-xs text-muted-foreground w-full text-center">
              Total: {similares.length} productos similares
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
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

// Componente de filtros
function FiltrosProductos({
  categorias,
  laboratorios,
  categoriaSeleccionada,
  laboratorioSeleccionado,
  onCategoriaChange,
  onLaboratorioChange,
  onClearFilters,
}: {
  categorias: string[];
  laboratorios: string[];
  categoriaSeleccionada: string;
  laboratorioSeleccionado: string;
  onCategoriaChange: (value: string) => void;
  onLaboratorioChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = categoriaSeleccionada || laboratorioSeleccionado;

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Filtros
        {hasFilters && (
          <Badge variant="secondary" className="ml-1 text-xs">
            Activos
          </Badge>
        )}
      </Button>

      {showFilters && (
        <div className="p-3 border rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtros</span>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-6 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Categoría</Label>
              <select
                value={categoriaSeleccionada}
                onChange={(e) => onCategoriaChange(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Laboratorio</Label>
              <select
                value={laboratorioSeleccionado}
                onChange={(e) => onLaboratorioChange(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="">Todos los laboratorios</option>
                {laboratorios.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Label
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}

export function ProductosView() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockFormOpen, setIsStockFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [currentStockProduct, setCurrentStockProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searching, setSearching] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filtros
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState("");

  // Estados para las opciones desde la API
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [laboratorios, setLaboratorios] = useState<string[]>([]);

  const userRole = localStorage.getItem("userRole") || "admin";
  const isAssistant = userRole === "Asistente";

  const [stockFormData, setStockFormData] = useState<StockFormData>({
    stockActual: 0,
    cantidadAñadir: "",
    productoId: 0,
    productoNombre: "",
    loteId: 0,
    fechaVencimiento: "",
    modoNuevoLote: true,
  });

  const { toast } = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // REF para controlar si ya se procesó la búsqueda desde sessionStorage
  const hasProcessedSessionStorage = useRef(false);

  // NUEVO: Efecto para leer los valores de sessionStorage cuando se monta el componente
  useEffect(() => {
    // Solo procesar una vez
    if (hasProcessedSessionStorage.current) return;
    
    // Verificar si hay un producto guardado en sessionStorage
    const storedProductName = sessionStorage.getItem('searchProductName');
    
    if (storedProductName) {
      console.log('ProductosView: Leyendo sessionStorage:', storedProductName);
      
      // Establecer el término de búsqueda
      setSearchTerm(storedProductName);
      
      // Marcar como procesado
      hasProcessedSessionStorage.current = true;
      
      // Limpiar el sessionStorage DESPUÉS de establecer el valor
      // Usamos setTimeout para asegurar que el estado se actualice primero
      setTimeout(() => {
        sessionStorage.removeItem('searchProductId');
        sessionStorage.removeItem('searchProductName');
        console.log('ProductosView: sessionStorage limpiado');
      }, 100);
    }
  }, []); // Solo se ejecuta al montar el componente

  // Cargar datos básicos (opciones para selects)
  useEffect(() => {
    const loadBasicData = async () => {
      try {
        setLoading(true);
        const [ubicacionesData, categoriasData, laboratoriosData] = await Promise.all([
          getUbicaciones(),
          getCategorias(),
          getLaboratorios(),
        ]);

        setUbicaciones(ubicacionesData.map((item) => item.nombre));
        setCategorias(categoriasData.map((item) => item.nombre));
        setLaboratorios(laboratoriosData.map((item) => item.nombre));
      } catch (error) {
        console.error("Error cargando datos básicos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBasicData();
  }, [toast]);

  // Cargar productos con paginación
  const loadProducts = useCallback(async (page: number = 1) => {
    setLoadingAll(true);
    try {
      const response = await getAllProductos(page, 15);
      setProducts(response.productos);
      setTotalPages(response.totalPages);
      setTotalProducts(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoadingAll(false);
    }
  }, [toast]);

  // Búsqueda con paginación y filtros
  const performSearch = useCallback(async (query: string, page: number = 1) => {
    setSearching(true);
    try {
      const response = await buscarProductos(
        query,
        categoriaSeleccionada || undefined,
        laboratorioSeleccionado || undefined,
        page,
        15
      );
      setProducts(response.productos);
      setTotalPages(response.totalPages);
      setTotalProducts(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error("Error buscando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron buscar los productos",
        variant: "destructive",
      });
      setProducts([]);
      setTotalPages(0);
      setTotalProducts(0);
    } finally {
      setSearching(false);
    }
  }, [categoriaSeleccionada, laboratorioSeleccionado, toast]);

  // Cargar productos iniciales - SOLO si no hay búsqueda desde sessionStorage
  useEffect(() => {
    // Si ya hay un término de búsqueda (desde sessionStorage), no cargar todos los productos
    if (searchTerm.trim().length >= 2) {
      // Realizar la búsqueda directamente
      performSearch(searchTerm, 1);
    } else {
      loadProducts(1);
    }
  }, []); // Solo ejecutar al montar

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      performSearch(debouncedSearchTerm, 1);
    } else if (debouncedSearchTerm.trim().length === 0) {
      loadProducts(1);
    }
  }, [debouncedSearchTerm, performSearch, loadProducts]);

  // Efecto para filtros
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      performSearch(searchTerm, 1);
    } else {
      loadProducts(1);
    }
  }, [categoriaSeleccionada, laboratorioSeleccionado]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm, newPage);
      } else {
        loadProducts(newPage);
      }
    }
  };

  const handleEdit = (product: Producto) => {
    if (isAssistant) return;
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleIncreaseStock = (product: Producto) => {
    setCurrentStockProduct(product);
    const primerLote = product.lotes && product.lotes.length > 0 ? product.lotes[0] : null;
    setStockFormData({
      stockActual: product.stock_total,
      cantidadAñadir: "",
      productoId: product.idproducto,
      productoNombre: product.nombre,
      loteId: primerLote?.idlote || 0,
      fechaVencimiento: primerLote?.fechaVencimiento || "",
      modoNuevoLote: product.lotes?.length === 0,
    });
    setIsStockFormOpen(true);
  };

  const handleStockSubmit = async () => {
    try {
      const cantidad = parseInt(stockFormData.cantidadAñadir || "0");
      if (cantidad <= 0) {
        toast({
          title: "Error",
          description: "La cantidad debe ser mayor a 0",
          variant: "destructive",
        });
        return;
      }

      if (!stockFormData.modoNuevoLote && stockFormData.loteId === 0) {
        toast({
          title: "Error",
          description: "Debe seleccionar un lote existente",
          variant: "destructive",
        });
        return;
      }

      if (stockFormData.modoNuevoLote && !stockFormData.fechaVencimiento) {
        toast({
          title: "Error",
          description: "Debe seleccionar una fecha de vencimiento para el nuevo lote",
          variant: "destructive",
        });
        return;
      }

      await updateStockProducto(
        stockFormData.productoId,
        stockFormData.modoNuevoLote ? 0 : stockFormData.loteId,
        cantidad,
        stockFormData.modoNuevoLote ? stockFormData.fechaVencimiento : undefined
      );

      const newTotal = stockFormData.stockActual + cantidad;
      toast({
        title: "Stock actualizado",
        description: `Stock de ${stockFormData.productoNombre} aumentado a ${newTotal} unidades.`,
      });

      // Recargar productos para actualizar la vista
      if (searchTerm.trim().length >= 2) {
        await performSearch(searchTerm, currentPage);
      } else {
        await loadProducts(currentPage);
      }

      setIsStockFormOpen(false);
      setStockFormData({
        stockActual: 0,
        cantidadAñadir: "",
        productoId: 0,
        productoNombre: "",
        loteId: 0,
        fechaVencimiento: "",
        modoNuevoLote: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el stock",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: number, productName: string) => {
    if (isAssistant) return;

    try {
      await deleteProducto(productId);
      toast({
        title: "Producto eliminado",
        description: `${productName} ha sido eliminado.`,
        variant: "destructive",
      });

      // Recargar productos
      if (searchTerm.trim().length >= 2) {
        await performSearch(searchTerm, currentPage);
      } else {
        await loadProducts(currentPage);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (productData: any, isEditing: boolean) => {
    try {
      const action = isEditing ? "editado" : "agregado";
      toast({
        title: `Producto ${action}`,
        description: `${productData.nombre} ha sido ${action} exitosamente.`,
      });

      setEditingProduct(null);
      setIsFormOpen(false);

      // Recargar productos
      if (searchTerm.trim().length >= 2) {
        await performSearch(searchTerm, currentPage);
      } else {
        await loadProducts(currentPage);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? "editar" : "agregar"} el producto`,
        variant: "destructive",
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const clearFilters = () => {
    setCategoriaSeleccionada("");
    setLaboratorioSeleccionado("");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando configuraciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          {isAssistant ? "Visualización de Productos" : "Gestión de Productos"}
        </h1>
        {!isAssistant && (
          <Dialog
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) {
                handleFormCancel();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full md:w-auto flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Producto</span>
                <span className="sm:hidden">Agregar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>
                  {editingProduct
                    ? "Editar Producto"
                    : "Agregar Nuevo Producto"}
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6">
                <FormularioProductos
                  product={editingProduct}
                  ubicaciones={ubicaciones}
                  categorias={categorias}
                  laboratorios={laboratorios}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog para aumentar stock */}
      <Dialog open={isStockFormOpen} onOpenChange={setIsStockFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aumentar Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Producto: {currentStockProduct?.nombre}
              </div>
              <div className="text-sm text-muted-foreground">
                Stock actual: {stockFormData.stockActual} unidades
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!stockFormData.modoNuevoLote}
                    onChange={() => setStockFormData(prev => ({
                      ...prev,
                      modoNuevoLote: false
                    }))}
                  />
                  Lote existente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={stockFormData.modoNuevoLote}
                    onChange={() => setStockFormData(prev => ({
                      ...prev,
                      modoNuevoLote: true
                    }))}
                  />
                  Nuevo lote
                </label>
              </div>

              {!stockFormData.modoNuevoLote && currentStockProduct?.lotes && (
                <div className="space-y-1">
                  <Label className="text-xs">Seleccionar lote</Label>
                  <select
                    value={stockFormData.loteId}
                    onChange={(e) => {
                      const loteId = Number(e.target.value);
                      const lote = currentStockProduct.lotes.find((l: any) => l.idlote === loteId);
                      setStockFormData(prev => ({
                        ...prev,
                        loteId,
                        fechaVencimiento: lote?.fechaVencimiento || '',
                      }));
                    }}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value={0}>Seleccionar lote</option>
                    {currentStockProduct.lotes.map((lote: any) => (
                      <option key={lote.idlote} value={lote.idlote}>
                        Lote {lote.idlote} - {lote.stock} u. - Vence: {new Date(lote.fechaVencimiento).toLocaleDateString('es-ES')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {stockFormData.modoNuevoLote && (
                <div className="space-y-1">
                  <Label className="text-xs">Fecha de vencimiento</Label>
                  <Input
                    type="date"
                    value={stockFormData.fechaVencimiento}
                    onChange={(e) => setStockFormData(prev => ({
                      ...prev,
                      fechaVencimiento: e.target.value
                    }))}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Cantidad a añadir</div>
              <Input
                type="number"
                value={stockFormData.cantidadAñadir}
                onChange={(e) =>
                  setStockFormData((prev) => ({
                    ...prev,
                    cantidadAñadir: e.target.value,
                  }))
                }
                placeholder="0"
                className="number-input-no-scroll"
                onWheel={(e) => e.currentTarget.blur()}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Total después del aumento</div>
              <Input
                value={
                  stockFormData.stockActual +
                  parseInt(stockFormData.cantidadAñadir || "0")
                }
                disabled
                className="font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStockSubmit}
              className="bg-primary hover:bg-primary/90"
              disabled={
                !stockFormData.cantidadAñadir ||
                parseInt(stockFormData.cantidadAñadir) <= 0
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>
            {searchTerm.trim().length >= 2
              ? `Resultados de búsqueda (${totalProducts})`
              : `Todos los Productos (${totalProducts})`}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
              {searching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <FiltrosProductos
              categorias={categorias}
              laboratorios={laboratorios}
              categoriaSeleccionada={categoriaSeleccionada}
              laboratorioSeleccionado={laboratorioSeleccionado}
              onCategoriaChange={setCategoriaSeleccionada}
              onLaboratorioChange={setLaboratorioSeleccionado}
              onClearFilters={clearFilters}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAll ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Cargando productos...</p>
            </div>
          ) : (
            <>
              {products.length > 0 ? (
                <>
                  {/* Vista móvil y tablet - Cards */}
                  <div className="block xl:hidden space-y-3 w-full">
                    {products.map((product) => {
                      return (
                        <Card key={product.idproducto} className="p-3 w-full">
                          <div className="space-y-3 w-full">
                            <div className="flex items-start gap-3 w-full">
                              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                                <ImageCarousel
                                  images={[getImageUrl(product.imagen)]}
                                  productName={product.nombre}
                                  className="w-16 h-16 sm:w-20 sm:h-20"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 break-words">
                                  {product.nombre}
                                </h3>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.categorias
                                    .slice(0, 2)
                                    .map((categoria, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        {categoria.length > 15
                                          ? categoria.substring(0, 12) + "..."
                                          : categoria}
                                      </Badge>
                                    ))}
                                  {product.categorias.length > 2 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      +{product.categorias.length - 2}
                                    </Badge>
                                  )}
                                  {product.laboratorio && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                      {product.laboratorio}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                              <div>
                                <span className="font-medium">Ubicación:</span>
                                <span className="text-muted-foreground ml-1 block sm:inline">
                                  {product.ubicacion}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Laboratorio:</span>
                                <span className="text-muted-foreground ml-1 block sm:inline">
                                  {product.laboratorio}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium">Stock:</span>
                                <LotesDesglose lotes={product.lotes || []} productName={product.nombre} />
                              </div>
                              <div>
                                <span className="font-medium">Precio:</span>
                                <span className="text-primary ml-1 font-semibold">
                                  Bs {Number(product.precio_venta).toFixed(2)}
                                </span>
                              </div>
                              {product.codigo_barras && (
                                <div className="col-span-2">
                                  <span className="font-medium">Código:</span>
                                  <span className="text-muted-foreground ml-1 font-mono text-xs break-all">
                                    {product.codigo_barras}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Similares en móvil - con botón de ojo */}
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">Similares:</span>
                              <ProductosSimilaresDialog
                                similares={product.productos_similares || []}
                                productName={product.nombre}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 relative"
                                >
                                  <Eye className="h-4 w-4" />
                                  {product.productos_similares && product.productos_similares.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
                                      {product.productos_similares.length}
                                    </span>
                                  )}
                                </Button>
                              </ProductosSimilaresDialog>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIncreaseStock(product)}
                                className="flex-1 h-8 text-xs"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Añadir Stock
                              </Button>
                              {!isAssistant && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(product)}
                                    className="flex-1 h-8 text-xs"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-xs"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                                        Eliminar
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          ¿Estás seguro?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer.
                                          Esto eliminará permanentemente el
                                          producto "{product.nombre}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDelete(
                                              product.idproducto,
                                              product.nombre,
                                            )
                                          }
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Vista desktop - Tabla */}
                  <div className="hidden xl:block">
                    <div className="w-full border rounded-lg">
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px]">Imagen</TableHead>
                              <TableHead className="min-w-[200px]">Producto</TableHead>
                              <TableHead className="w-[120px]">Ubicación</TableHead>
                              <TableHead className="w-[130px]">Laboratorio</TableHead>
                              <TableHead className="w-[140px]">Código</TableHead>
                              <TableHead className="min-w-[180px]">Stock / Lotes</TableHead>
                              <TableHead className="w-[100px] text-center">Similares</TableHead>
                              <TableHead className="w-[110px]">Precio</TableHead>
                              <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => {
                              return (
                                <TableRow key={product.idproducto}>
                                  <TableCell>
                                    <div className="w-10 h-10">
                                      <ImageCarousel
                                        images={[getImageUrl(product.imagen)]}
                                        productName={product.nombre}
                                        className="w-10 h-10"
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {product.nombre}
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {product.categorias
                                          .slice(0, 2)
                                          .map((categoria, index) => (
                                            <Badge
                                              key={index}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {categoria.length > 15
                                                ? categoria.substring(0, 12) + "..."
                                                : categoria}
                                            </Badge>
                                          ))}
                                        {product.categorias.length > 2 && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{product.categorias.length - 2}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {product.ubicacion}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {product.laboratorio}
                                  </TableCell>
                                  <TableCell>
                                    {product.codigo_barras ? (
                                      <span className="text-xs font-mono">
                                        {product.codigo_barras.length > 12
                                          ? product.codigo_barras.substring(0, 10) + "..."
                                          : product.codigo_barras}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <LotesDesglose lotes={product.lotes || []} productName={product.nombre} />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleIncreaseStock(product)}
                                      className="h-6 text-xs px-2 mt-1"
                                    >
                                      <Package className="h-2.5 w-2.5 mr-1" />
                                      Añadir
                                    </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <ProductosSimilaresDialog
                                      similares={product.productos_similares || []}
                                      productName={product.nombre}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 relative mx-auto"
                                      >
                                        <Eye className="h-4 w-4" />
                                        {product.productos_similares && product.productos_similares.length > 0 && (
                                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
                                            {product.productos_similares.length}
                                          </span>
                                        )}
                                      </Button>
                                    </ProductosSimilaresDialog>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-semibold">
                                      Bs {Number(product.precio_venta).toFixed(2)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                      {!isAssistant && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(product)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {!isAssistant && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                            >
                                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                ¿Estás seguro?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Esta acción no se puede deshacer.
                                                Esto eliminará permanentemente el
                                                producto "{product.nombre}".
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                Cancelar
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() =>
                                                  handleDelete(
                                                    product.idproducto,
                                                    product.nombre,
                                                  )
                                                }
                                              >
                                                Eliminar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * 15) + 1} - {Math.min(currentPage * 15, totalProducts)} de {totalProducts} productos
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loadingAll}
                          className="h-8 px-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                disabled={loadingAll}
                                className="h-8 w-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || loadingAll}
                          className="h-8 px-2"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {searchTerm.trim().length >= 2
                    ? "No se encontraron productos que coincidan con la búsqueda."
                    : "No hay productos registrados."}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}