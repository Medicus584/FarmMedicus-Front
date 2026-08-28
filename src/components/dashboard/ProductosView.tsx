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
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormularioProductos } from "./FormularioProductos";
import {
  getUbicaciones,
  getCategorias,
  getLaboratorios,
  getFormasFarmaceuticas,
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

function formatDateToLocal(dateStr: string): string {
  if (!dateStr) return '';
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { timeZone: 'UTC' });
  } catch {
    return dateStr;
  }
}

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
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1,
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
    <div 
      className={`relative overflow-hidden rounded ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-square w-full">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          className={`w-full h-full object-cover transition-all duration-300 ${isHovered ? 'scale-125' : 'scale-100'}`}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

function LotesDesglose({ lotes }: { lotes: ProductoLote[], productName: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!lotes || lotes.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin lotes</span>;
  }

  const totalStock = lotes.reduce((sum, l) => sum + l.stock, 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-primary">{totalStock}</span>
        <span className="text-xs text-muted-foreground">u.</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-5 px-1"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="text-[10px] ml-0.5">{lotes.length}</span>
        </Button>
      </div>
      {expanded && (
        <div className="space-y-0.5 pl-2 border-l-2 border-primary/30">
          {lotes.map((lote, idx) => (
            <div key={idx} className="flex items-center gap-1 text-[10px]">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                L{idx + 1}
              </Badge>
              <span className="font-medium">{lote.stock}</span>
              <span className="text-muted-foreground">
                {formatDateToLocal(lote.fechaVencimiento)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetallesProductoDialog({ 
  product,
  children
}: { 
  product: Producto;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del Producto</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Fila 1: Laboratorio | Forma Farm. */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Laboratorio</div>
                <div className="text-sm font-medium mt-0.5 break-words">{product.laboratorio || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Forma Farm.</div>
                <div className="text-sm font-medium mt-0.5 break-words">{product.forma_farmaceutica || "—"}</div>
              </div>
            </div>
            {/* Fila 2: Productos Similares | Categorías */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Productos Similares</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.productos_similares && product.productos_similares.length > 0 ? (
                    product.productos_similares.map((sim, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {sim.nombre}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Categorías</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.categorias && product.categorias.length > 0 ? (
                    product.categorias.map((cat, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
        className="flex items-center gap-2 h-9"
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filtros</span>
        {hasFilters && (
          <Badge variant="secondary" className="ml-1 text-xs">
            Activos
          </Badge>
        )}
      </Button>

      {showFilters && (
        <div className="p-3 border rounded-md space-y-3 bg-background">
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
                Limpiar
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
                <option value="">Todas</option>
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
                <option value="">Todos</option>
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

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}

function DescripcionCell({ descripcion }: { descripcion: string }) {
  const [showFull, setShowFull] = useState(false);

  if (!descripcion) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const maxLength = 50;
  const isLong = descripcion.length > maxLength;
  const displayText = isLong && !showFull 
    ? descripcion.substring(0, maxLength) + '...' 
    : descripcion;

  return (
    <div className="relative">
      <div className="text-xs max-w-[150px] break-words">
        {displayText}
        {isLong && (
          <button
            onClick={() => setShowFull(!showFull)}
            className="ml-1 text-primary hover:underline text-[10px] font-medium"
          >
            {showFull ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </div>
    </div>
  );
}

function DescripcionMobile({ descripcion }: { descripcion: string }) {
  const [showFull, setShowFull] = useState(false);

  if (!descripcion) {
    return <span className="text-xs text-muted-foreground">Sin descripción</span>;
  }

  const maxLength = 50;
  const isLong = descripcion.length > maxLength;
  const displayText = isLong && !showFull 
    ? descripcion.substring(0, maxLength) + '...' 
    : descripcion;

  return (
    <div className="text-xs">
      <span className="font-medium">Descripción:</span>
      <span className="text-muted-foreground ml-1 block sm:inline">
        {displayText}
      </span>
      {isLong && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="ml-1 text-primary hover:underline text-[10px] font-medium block sm:inline"
        >
          {showFull ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

// Capturar código de barras automáticamente
function useBarcodeCapture(onBarcodeScanned: (barcode: string) => void) {
  const bufferRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      if (event.key === "Enter") {
        if (bufferRef.current.length > 0) {
          event.preventDefault();
          const barcode = bufferRef.current;
          bufferRef.current = "";
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          onBarcodeScanned(barcode);
        }
        return;
      }

      if (event.key.length === 1) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        bufferRef.current += event.key;

        timeoutRef.current = setTimeout(() => {
          bufferRef.current = "";
          timeoutRef.current = null;
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onBarcodeScanned]);
}

const ITEMS_PER_PAGE = 15;

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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState("");

  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [laboratorios, setLaboratorios] = useState<string[]>([]);
  const [formasFarmaceuticas, setFormasFarmaceuticas] = useState<string[]>([]);

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

  const hasProcessedSessionStorage = useRef(false);
  const isInitialMount = useRef(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPerformingSearch = useRef(false);

  useBarcodeCapture((barcode) => {
    setSearchTerm(barcode);
    if (barcode.trim().length >= 2) {
      performSearch(barcode, 1);
    }
  });

  useEffect(() => {
    if (hasProcessedSessionStorage.current) return;
    
    const storedProductName = sessionStorage.getItem('searchProductName');
    
    if (storedProductName) {
      setSearchTerm(storedProductName);
      hasProcessedSessionStorage.current = true;
      
      setTimeout(() => {
        sessionStorage.removeItem('searchProductId');
        sessionStorage.removeItem('searchProductName');
      }, 300);
    }
  }, []);

  useEffect(() => {
    const loadBasicData = async () => {
      try {
        setLoading(true);
        const [ubicacionesData, categoriasData, laboratoriosData, formasFarmaceuticasData] = await Promise.all([
          getUbicaciones(),
          getCategorias(),
          getLaboratorios(),
          getFormasFarmaceuticas(),
        ]);

        setUbicaciones(ubicacionesData.map((item) => item.nombre));
        setCategorias(categoriasData.map((item) => item.nombre));
        setLaboratorios(laboratoriosData.map((item) => item.nombre));
        setFormasFarmaceuticas(formasFarmaceuticasData.map((item) => item.nombre_forma));
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

  const performSearch = useCallback(async (query: string, page: number = 1) => {
    const hasFilters = categoriaSeleccionada || laboratorioSeleccionado;
    
    if ((!query || query.trim().length < 2) && !hasFilters) {
      await loadProducts(page);
      return;
    }

    if (isPerformingSearch.current) return;
    isPerformingSearch.current = true;

    setSearching(true);
    try {
      const response = await buscarProductos(
        query && query.trim().length >= 2 ? query : "",
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
      isPerformingSearch.current = false;
    }
  }, [categoriaSeleccionada, laboratorioSeleccionado, loadProducts, toast]);

  const loadProductsWithFilters = useCallback(async (page: number = 1) => {
    const hasFilters = categoriaSeleccionada || laboratorioSeleccionado;
    
    if (searchTerm.trim().length >= 2 || hasFilters) {
      await performSearch(searchTerm, page);
    } else {
      await loadProducts(page);
    }
  }, [searchTerm, categoriaSeleccionada, laboratorioSeleccionado, performSearch, loadProducts]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (searchTerm.trim().length < 2 && !categoriaSeleccionada && !laboratorioSeleccionado) {
      loadProducts(1);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadProductsWithFilters(1);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    if (isInitialMount.current) return;
    
    loadProductsWithFilters(1);
    
  }, [categoriaSeleccionada, laboratorioSeleccionado]);

  useEffect(() => {
    const storedProductName = sessionStorage.getItem('searchProductName');
    
    if (storedProductName && storedProductName.trim().length >= 2) {
      const searchQuery = storedProductName;
      sessionStorage.removeItem('searchProductName');
      setSearchTerm(searchQuery);
      performSearch(searchQuery, 1);
    } else {
      loadProducts(1);
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      loadProductsWithFilters(newPage);
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

      toast({
        title: "Stock actualizado",
        description: `Stock de ${stockFormData.productoNombre} aumentado.`,
      });

      await loadProductsWithFilters(currentPage);

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

      await loadProductsWithFilters(currentPage);
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

      await loadProductsWithFilters(currentPage);
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
    if (!searchTerm || searchTerm.trim().length < 2) {
      loadProducts(1);
    } else {
      performSearch(searchTerm, 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando configuraciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          {isAssistant ? "Visualización de Productos" : "Gestión de Productos"}
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[350px] md:min-w-[500px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, código o escanear..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
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

          {(categoriaSeleccionada || laboratorioSeleccionado || searchTerm) && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          )}

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
                <Button className="bg-primary hover:bg-primary/90 whitespace-nowrap w-full sm:w-auto">
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
                    product={editingProduct || undefined}
                    ubicaciones={ubicaciones}
                    categorias={categorias}
                    laboratorios={laboratorios}
                    formasFarmaceuticas={formasFarmaceuticas}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
                        Lote {lote.idlote} - {lote.stock} u. - Vence: {formatDateToLocal(lote.fechaVencimiento)}
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
                  Number(stockFormData.stockActual) + 
                  Number(parseInt(stockFormData.cantidadAñadir || "0") || 0)
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

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Productos ({totalProducts})
            {loadingAll && <span className="text-sm font-normal text-muted-foreground ml-2">Cargando...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead className="px-4 py-3 w-[70px]">Imagen</TableHead>
                  <TableHead className="px-4 py-3 w-[90px]">Código</TableHead>
                  <TableHead className="px-4 py-3 w-[120px]">N. Comercial</TableHead>
                  <TableHead className="px-4 py-3 w-[160px]">N. Genérico</TableHead>
                  <TableHead className="px-4 py-3 w-[100px]">Ubicación</TableHead>
                  <TableHead className="px-4 py-3 w-[140px]">Stock</TableHead>
                  <TableHead className="px-4 py-3 w-[90px]">Precio</TableHead>
                  <TableHead className="px-4 py-3 w-[90px] text-center">Detalles</TableHead>
                  {!isAssistant && (
                    <TableHead className="px-4 py-3 w-[90px] text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAll ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {categoriaSeleccionada || laboratorioSeleccionado || searchTerm
                        ? "No se encontraron productos que coincidan con la búsqueda"
                        : "No hay productos registrados"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.idproducto} className="border-b transition-colors hover:bg-muted/50">
                      {/* Desktop View */}
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <div className="w-12 h-12">
                          <ImageCarousel
                            images={[getImageUrl(product.imagen)]}
                            productName={product.nombre}
                            className="w-12 h-12"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <span className="text-xs font-mono font-medium text-primary">
                          {product.codigoP || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3 font-medium truncate max-w-[110px]" title={product.nombre}>
                        {product.nombre}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <DescripcionCell descripcion={product.descripcion} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3 truncate max-w-[90px]" title={product.ubicacion}>
                        {product.ubicacion}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
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
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <div className="text-sm font-semibold">
                          Bs {Number(product.precio_venta).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3 text-center">
                        <DetallesProductoDialog product={product}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3"
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </DetallesProductoDialog>
                      </TableCell>
                      {!isAssistant && (
                        <TableCell className="hidden md:table-cell px-4 py-3 text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
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
                          </div>
                        </TableCell>
                      )}

                      {/* Mobile View */}
                      <TableCell className="md:hidden px-4 py-3">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-16 h-16 flex-shrink-0">
                              <ImageCarousel
                                images={[getImageUrl(product.imagen)]}
                                productName={product.nombre}
                                className="w-16 h-16"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{product.nombre}</div>
                              {product.codigoP && (
                                <div className="text-xs font-mono text-primary mt-0.5">
                                  Código: {product.codigoP}
                                </div>
                              )}
                              <div className="mt-1">
                                <DetallesProductoDialog product={product}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Info className="h-3 w-3 mr-1" />
                                    Ver detalles
                                  </Button>
                                </DetallesProductoDialog>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <DescripcionMobile descripcion={product.descripcion} />
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">UBICACIÓN</div>
                                <div>{product.ubicacion}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">PRECIO</div>
                                <div className="font-semibold">Bs {Number(product.precio_venta).toFixed(2)}</div>
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">STOCK</div>
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
                            </div>
                          </div>

                          {!isAssistant && (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                                className="flex-1"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
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
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {products.length > 0 && !loadingAll && totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} de {totalProducts} productos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Página anterior</span>
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-8 h-8"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="w-8 h-8"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Página siguiente</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}