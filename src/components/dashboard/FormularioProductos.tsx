// components/FormularioProductos.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Search, Camera, Edit, Trash2, Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import BarcodeScanner from "./BarcodeScanner";
import {
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  createLaboratorio,
  updateLaboratorio,
  deleteLaboratorio,
  createFormaFarmaceutica,
  updateFormaFarmaceutica,
  deleteFormaFarmaceutica,
  getUbicaciones,
  getCategorias,
  getLaboratorios,
  getFormasFarmaceuticas,
  getTodosProductosParaSelect,
} from "@/api/ProductsApi";
import {
  createProducto,
  updateProducto,
  getProductoByCodigoP,
} from "@/api/ProductsApi";

interface ProductFormData {
  id?: string;
  codigoP: string;
  nombre: string;
  categorias: string[];
  descripcion: string;
  ubicacion: string;
  laboratorio: string;
  formaFarmaceutica: string;
  precioVenta: string | number;
  precioCompra?: string | number;
  stock: number | string;
  stockMinimo?: number | string;
  imagen?: string;
  imagenFile?: File | string | string[];
  codigoBarras?: string;
  productosSimilares?: number[];
  productosSimilaresData?: Array<{ idproducto: number; nombre: string }>;
  lotes?: Array<{ stock: number; fechaVencimiento: string }>;
}

interface LoteForm {
  stock: number;
  fechaVencimiento: string;
}

interface FormularioProductosProps {
  product?: any;
  ubicaciones: string[];
  categorias: string[];
  laboratorios: string[];
  formasFarmaceuticas: string[];
  onSubmit: (productData: ProductFormData, isEditing: boolean) => void;
  onCancel: () => void;
  onRefreshData?: () => void;
}

interface AddDialogState {
  open: boolean;
  type: "categoria" | "ubicacion" | "laboratorio" | "formaFarmaceutica" | null;
}

interface ManagementItem {
  idubicacion?: number;
  idcategoria?: number;
  idlaboratorio?: number;
  idforma_farmaceutica?: number;
  id?: number;
  nombre: string;
  estado: number;
}

interface ProductoSelect {
  idproducto: number;
  nombre: string;
  descripcion: string;
}

// ============================================
// COMPONENTE DE BÚSQUEDA CON DROPDOWN PARA MÚLTIPLE SELECCIÓN (CATEGORÍAS)
// ============================================
const SearchSelectWithDropdown = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  label,
  required,
  onEdit,
  onDelete,
  showActions = false,
  itemType = "item",
  onAddNew,
  isAdding,
  isDeleting,
}: {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  onEdit?: (item: string) => void;
  onDelete?: (item: string) => void;
  showActions?: boolean;
  itemType?: string;
  onAddNew?: () => void;
  isAdding?: boolean;
  isDeleting?: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = (options || []).filter(
    (option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedValues.includes(option),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addSelection = (option: string) => {
    onSelectionChange([...selectedValues, option]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeSelection = (option: string) => {
    onSelectionChange(selectedValues.filter((v) => v !== option));
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleDeleteClick = (option: string) => {
    setDeleteTarget(option);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
          {onAddNew && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddNew}
              className="h-6 w-6 p-0"
              disabled={isAdding}
              title={`Agregar ${itemType}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="relative w-full" ref={dropdownRef}>
          <div className="relative">
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={handleInputChange}
              onClick={handleInputClick}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="h-9 text-sm w-full pr-8 cursor-pointer"
            />
            <ChevronDown 
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    className="flex items-center justify-between px-3 py-2 hover:bg-accent hover:text-accent-foreground border-b last:border-0"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addSelection(option);
                      }}
                    >
                      {option}
                    </button>
                    {showActions && (
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(option);
                            setIsOpen(false);
                          }}
                          className="p-1 hover:text-blue-500 transition-colors"
                          title={`Editar ${itemType}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(option);
                          }}
                          className="p-1 hover:text-red-500 transition-colors"
                          title={`Eliminar ${itemType}`}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {searchTerm ? (
                    <>
                      No hay resultados para "{searchTerm}"
                      {onAddNew && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 ml-1 text-primary text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onAddNew();
                            setIsOpen(false);
                          }}
                        >
                          Agregar "{searchTerm}"
                        </Button>
                      )}
                    </>
                  ) : (
                    "No hay opciones disponibles"
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selectedValues.map((value) => (
              <Badge
                key={value}
                variant="secondary"
                className="text-sm px-2 py-1 h-6 flex items-center gap-1"
              >
                <span className="max-w-[150px] truncate">{value}</span>
                <button
                  type="button"
                  onClick={() => removeSelection(value)}
                  className="hover:text-destructive transition-colors ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {itemType}?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{deleteTarget}"?
              {selectedValues.includes(deleteTarget || '') && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este elemento está seleccionado y será removido.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ============================================
// COMPONENTE PARA SELECCIÓN ÚNICA CON DROPDOWN
// ============================================
const SingleSelectWithDropdown = ({
  options,
  selectedValue,
  onSelectionChange,
  placeholder,
  label,
  required,
  onEdit,
  onDelete,
  onAddNew,
  isAdding,
  isDeleting,
}: {
  options: string[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  onEdit?: (item: string) => void;
  onDelete?: (item: string) => void;
  onAddNew?: () => void;
  isAdding?: boolean;
  isDeleting?: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = (options || []).filter(
    (option) => option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectOption = (option: string) => {
    onSelectionChange(option);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleDeleteClick = (option: string) => {
    setDeleteTarget(option);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
          {onAddNew && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddNew}
              className="h-6 w-6 p-0"
              disabled={isAdding}
              title={`Agregar ${label.toLowerCase()}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="relative w-full" ref={dropdownRef}>
          <div className="relative">
            <Input
              ref={inputRef}
              value={searchTerm || selectedValue || ""}
              onChange={handleInputChange}
              onClick={handleInputClick}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="h-9 text-sm w-full pr-8 cursor-pointer"
            />
            <ChevronDown 
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    className={`flex items-center justify-between px-3 py-2 hover:bg-accent hover:text-accent-foreground border-b last:border-0 ${
                      selectedValue === option ? "bg-primary/5" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectOption(option);
                      }}
                    >
                      {option}
                      {selectedValue === option && (
                        <span className="text-xs text-primary ml-2">✓ seleccionado</span>
                      )}
                    </button>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(option);
                          setIsOpen(false);
                        }}
                        className="p-1 hover:text-blue-500 transition-colors"
                        title={`Editar ${label.toLowerCase()}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(option);
                        }}
                        className="p-1 hover:text-red-500 transition-colors"
                        title={`Eliminar ${label.toLowerCase()}`}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {searchTerm ? (
                    <>
                      No hay resultados para "{searchTerm}"
                      {onAddNew && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 ml-1 text-primary text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onAddNew();
                            setIsOpen(false);
                          }}
                        >
                          Agregar "{searchTerm}"
                        </Button>
                      )}
                    </>
                  ) : (
                    "No hay opciones disponibles"
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedValue && !searchTerm && (
          <div className="mt-1">
            <Badge variant="secondary" className="text-sm px-2 py-1 h-6">
              {selectedValue}
              <button
                type="button"
                onClick={() => onSelectionChange("")}
                className="ml-1.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {label.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{deleteTarget}"?
              {selectedValue === deleteTarget && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este elemento está seleccionado y será removido.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ============================================
// COMPONENTE PARA PRODUCTOS SIMILARES CON BÚSQUEDA
// ============================================
const ProductoSimilarSelect = ({
  selectedValues,
  onSelectionChange,
  currentProductId,
}: {
  selectedValues: number[];
  onSelectionChange: (values: number[]) => void;
  currentProductId?: number;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoSelect[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar productos iniciales (sin búsqueda)
  useEffect(() => {
    const loadInitialProducts = async () => {
      setLoading(true);
      try {
        const productos = await getTodosProductosParaSelect();
        setProductosDisponibles(productos);
      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialProducts();
  }, []);

  // Buscar productos con debounce
  const searchProducts = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      // Si el término es corto, cargar todos los productos
      setLoading(true);
      try {
        const productos = await getTodosProductosParaSelect();
        setProductosDisponibles(productos);
      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setLoading(false);
      }
      return;
    }

    setIsSearching(true);
    try {
      const productos = await getTodosProductosParaSelect(term);
      setProductosDisponibles(productos);
    } catch (error) {
      console.error("Error buscando productos:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(searchTerm);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchProducts]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = (productosDisponibles || []).filter(
    (producto) =>
      !selectedValues.includes(producto.idproducto) &&
      producto.idproducto !== currentProductId,
  );

  const addSelection = (producto: ProductoSelect) => {
    onSelectionChange([...selectedValues, producto.idproducto]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeSelection = (productoId: number) => {
    onSelectionChange(selectedValues.filter((v) => v !== productoId));
  };

  const getProductoNombre = (id: number) => {
    const producto = (productosDisponibles || []).find((p) => p.idproducto === id);
    return producto ? producto.nombre : `Producto ${id}`;
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  return (
    <div className="space-y-1.5 w-full">
      <Label className="text-sm font-medium">Productos Similares</Label>
      <div className="relative w-full" ref={dropdownRef}>
        <div className="relative">
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar por n. comercial o n. generico..."
            className="h-9 text-sm pl-9 w-full pr-8 cursor-pointer"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <ChevronDown 
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
          {(loading || isSearching) && (
            <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((producto) => (
                <button
                  key={producto.idproducto}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground border-b last:border-0 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addSelection(producto);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{producto.nombre}</span>
                    {producto.descripcion && (
                      <span className="text-xs text-muted-foreground truncate max-w-full">
                        {producto.descripcion}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                {searchTerm.trim().length >= 2 ? (
                  `No se encontraron productos con "${searchTerm}"`
                ) : (
                  "No hay productos disponibles"
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selectedValues.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="text-sm px-2 py-1 h-6 flex items-center gap-1"
            >
              <span className="max-w-[150px] truncate">{getProductoNombre(id)}</span>
              <button
                type="button"
                onClick={() => removeSelection(id)}
                className="hover:text-destructive transition-colors ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// FUNCIONES UTILITARIAS
// ============================================
const base64ToFile = (base64String: string, fileName = "imagen.jpg"): File | null => {
  try {
    if (base64String.startsWith('http') || base64String.startsWith('https')) {
      return null;
    }

    if (!base64String.includes(',')) {
      return null;
    }

    const [metadata, data] = base64String.split(',');
    if (!data) {
      return null;
    }

    const mimeMatch = metadata.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const byteCharacters = atob(data);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }

    const byteArray = new Uint8Array(byteArrays);
    const blob = new Blob([byteArray], { type: mime });

    return new File([blob], fileName, { type: mime });
  } catch (error) {
    console.warn('Error al convertir base64 a File:', error);
    return null;
  }
};

const getImageUrl = (imagen: string | undefined): string => {
  if (!imagen) {
    return "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
  }
  
  if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
    return imagen;
  }
  
  if (imagen.includes('data:image')) {
    return imagen;
  }
  
  return imagen;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function FormularioProductos({
  product,
  ubicaciones,
  categorias,
  laboratorios,
  formasFarmaceuticas,
  onSubmit,
  onCancel,
  onRefreshData,
}: FormularioProductosProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (product) {
      let imagenFile = null;
      if (product.imagen) {
        imagenFile = base64ToFile(product.imagen, "producto.jpg");
      }

      return {
        id: product.idproducto?.toString(),
        codigoP: product.codigoP || '',
        nombre: product.nombre || '',
        categorias: product.categorias || [],
        descripcion: product.descripcion || '',
        ubicacion: product.ubicacion || '',
        laboratorio: product.laboratorio || '',
        formaFarmaceutica: product.forma_farmaceutica || '',
        precioVenta: product.precio_venta?.toString() || '',
        precioCompra: product.precio_compra?.toString() || '',
        stock: product.stock_total?.toString() || '',
        stockMinimo: product.stock_minimo?.toString() || '',
        imagen: getImageUrl(product.imagen),
        imagenFile: imagenFile,
        codigoBarras: product.codigo_barras || '',
        productosSimilares: product.productos_similares?.map((p: any) => p.idproducto) || [],
        productosSimilaresData: product.productos_similares || [],
        lotes: product.lotes || [],
      };
    }
    return {
      codigoP: "",
      nombre: "",
      categorias: [],
      descripcion: "",
      ubicacion: "",
      laboratorio: "",
      formaFarmaceutica: "",
      precioVenta: "",
      precioCompra: "",
      stock: "",
      stockMinimo: "",
      imagen: "",
      imagenFile: null,
      codigoBarras: "",
      productosSimilares: [],
      productosSimilaresData: [],
      lotes: [],
    };
  });

  const [addDialogState, setAddDialogState] = useState<AddDialogState>({
    open: false,
    type: null,
  });
  const [editDialogData, setEditDialogData] = useState({ name: "", id: 0 });
  const [todosProductos, setTodosProductos] = useState<ProductoSelect[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lotesForm, setLotesForm] = useState<LoteForm[]>([
    { stock: 0, fechaVencimiento: "" }
  ]);

  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [productoEncontrado, setProductoEncontrado] = useState<any>(null);
  const [mostrarMensajeExistente, setMostrarMensajeExistente] = useState(false);
  const codeInputTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localLists, setLocalLists] = useState({
    ubicaciones: ubicaciones || [],
    categorias: categorias || [],
    laboratorios: laboratorios || [],
    formasFarmaceuticas: formasFarmaceuticas || [],
  });

  const [managementItems, setManagementItems] = useState<{
    ubicaciones: ManagementItem[];
    categorias: ManagementItem[];
    laboratorios: ManagementItem[];
    formasFarmaceuticas: ManagementItem[];
  }>({
    ubicaciones: [],
    categorias: [],
    laboratorios: [],
    formasFarmaceuticas: [],
  });

  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isAddingElement, setIsAddingElement] = useState(false);
  const [isDeletingElement, setIsDeletingElement] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (showScanner) {
        event.preventDefault();
        setShowScanner(false);
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showScanner]);

  const openScanner = () => {
    setShowScanner(true);
    window.history.pushState({ scanner: true }, '');
  };

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false);
    setFormData((prev) => ({ ...prev, codigoBarras: barcode }));
    toast({
      title: "Código escaneado",
      description: `Código: ${barcode}`,
      duration: 2000,
    });
  };

  const loadManagementItems = async () => {
    try {
      const [ubicacionesData, categoriasData, laboratoriosData, formasFarmaceuticasData] = await Promise.all([
        getUbicaciones(),
        getCategorias(),
        getLaboratorios(),
        getFormasFarmaceuticas(),
      ]);

      const ubicacionesMapped = ubicacionesData.map(item => ({
        ...item,
        id: item.idubicacion,
        nombre: item.nombre
      }));
      
      const categoriasMapped = categoriasData.map(item => ({
        ...item,
        id: item.idcategoria,
        nombre: item.nombre
      }));
      
      const laboratoriosMapped = laboratoriosData.map(item => ({
        ...item,
        id: item.idlaboratorio,
        nombre: item.nombre
      }));

      const formasFarmaceuticasMapped = formasFarmaceuticasData.map(item => ({
        ...item,
        id: item.idforma_farmaceutica,
        nombre: item.nombre_forma
      }));

      setManagementItems({
        ubicaciones: ubicacionesMapped,
        categorias: categoriasMapped,
        laboratorios: laboratoriosMapped,
        formasFarmaceuticas: formasFarmaceuticasMapped,
      });

      setLocalLists({
        ubicaciones: ubicacionesData.map((item) => item.nombre),
        categorias: categoriasData.map((item) => item.nombre),
        laboratorios: laboratoriosData.map((item) => item.nombre),
        formasFarmaceuticas: formasFarmaceuticasData.map((item) => item.nombre_forma),
      });
    } catch (error) {
      console.error("Error cargando elementos de gestión:", error);
    }
  };

  // Cargar productos para similares con búsqueda
  const loadTodosProductos = async (searchTerm?: string) => {
    setLoadingProductos(true);
    try {
      const productos = await getTodosProductosParaSelect(searchTerm);
      setTodosProductos(productos);
    } catch (error) {
      console.error("Error cargando productos para similares:", error);
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    loadTodosProductos();
    loadManagementItems();
  }, []);

  useEffect(() => {
    setLocalLists({
      ubicaciones: ubicaciones || [],
      categorias: categorias || [],
      laboratorios: laboratorios || [],
      formasFarmaceuticas: formasFarmaceuticas || [],
    });
  }, [ubicaciones, categorias, laboratorios, formasFarmaceuticas]);

  useEffect(() => {
    if (product && product.lotes && product.lotes.length > 0) {
      setLotesForm(product.lotes.map((lote: any) => ({
        stock: lote.stock,
        fechaVencimiento: lote.fechaVencimiento || '',
      })));
    }
  }, [product]);

  // Efecto para buscar producto por código automáticamente
  useEffect(() => {
    if (codeInputTimeout.current) {
      clearTimeout(codeInputTimeout.current);
    }

    if (product && formData.codigoP === product.codigoP) {
      setProductoEncontrado(null);
      setMostrarMensajeExistente(false);
      return;
    }

    if (!formData.codigoP || formData.codigoP.trim().length < 2) {
      setProductoEncontrado(null);
      setMostrarMensajeExistente(false);
      return;
    }

    codeInputTimeout.current = setTimeout(() => {
      buscarProductoPorCodigo(formData.codigoP);
    }, 800);

    return () => {
      if (codeInputTimeout.current) {
        clearTimeout(codeInputTimeout.current);
      }
    };
  }, [formData.codigoP]);

  const buscarProductoPorCodigo = async (codigo: string) => {
    if (!codigo || codigo.trim().length < 2) {
      setProductoEncontrado(null);
      setMostrarMensajeExistente(false);
      return;
    }

    setBuscandoCodigo(true);
    try {
      const result = await getProductoByCodigoP(codigo.trim());
      
      if (result.exists && result.producto) {
        if (product && result.producto.idproducto === product.idproducto) {
          setProductoEncontrado(null);
          setMostrarMensajeExistente(false);
          return;
        }
        
        setProductoEncontrado(result.producto);
        setMostrarMensajeExistente(true);
        
        toast({
          title: "Producto ya registrado",
          description: `El código "${codigo}" ya pertenece al producto: ${result.producto.nombre}`,
          variant: "destructive",
        });
      } else {
        setProductoEncontrado(null);
        setMostrarMensajeExistente(false);
      }
    } catch (error) {
      console.error("Error buscando producto:", error);
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const handleInputChange = (
    field: keyof ProductFormData,
    value: string | string[] | File | number | number[] | LoteForm[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDescriptionForProduction = (description: string): string => {
    if (!description) return "";
    return description
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n+/g, "\n")
      .replace(/[ ]+/g, " ")
      .trim();
  };

  const getItemIdByName = (items: ManagementItem[], name: string): number => {
    const item = items.find((item) => item.nombre === name);
    if (item) {
      return (item as any).idubicacion || (item as any).idcategoria || (item as any).idlaboratorio || (item as any).idforma_farmaceutica || item.id || 0;
    }
    return 0;
  };

  const handleLoteChange = (index: number, field: keyof LoteForm, value: any) => {
    const nuevosLotes = [...lotesForm];
    nuevosLotes[index] = { ...nuevosLotes[index], [field]: value };
    setLotesForm(nuevosLotes);
  };

  const addLoteRow = () => {
    setLotesForm([...lotesForm, { stock: 0, fechaVencimiento: "" }]);
  };

  const removeLoteRow = (index: number) => {
    if (lotesForm.length > 1) {
      const nuevosLotes = lotesForm.filter((_, i) => i !== index);
      setLotesForm(nuevosLotes);
    }
  };

  // ============================================
  // FUNCIONES PARA GESTIÓN DE ELEMENTOS
  // ============================================
  const handleEditUbicacion = (nombre: string) => {
    const item = managementItems.ubicaciones.find(u => u.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Ubicación no encontrada", variant: "destructive" });
      return;
    }
    setEditDialogData({ name: item.nombre, id: item.id || 0 });
    setAddDialogState({ open: true, type: "ubicacion" });
  };

  const handleDeleteUbicacion = async (nombre: string) => {
    const item = managementItems.ubicaciones.find(u => u.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Ubicación no encontrada", variant: "destructive" });
      return;
    }

    if (formData.ubicacion === nombre) {
      toast({
        title: "Error",
        description: "No puedes eliminar la ubicación que está seleccionada",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingElement(true);
    try {
      await deleteUbicacion(item.id || 0);
      await loadManagementItems();
      toast({ title: "Ubicación eliminada", description: `"${nombre}" ha sido eliminada.`, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar", variant: "destructive" });
    } finally {
      setIsDeletingElement(false);
    }
  };

  const handleEditCategoria = (nombre: string) => {
    const item = managementItems.categorias.find(c => c.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Categoría no encontrada", variant: "destructive" });
      return;
    }
    setEditDialogData({ name: item.nombre, id: item.id || 0 });
    setAddDialogState({ open: true, type: "categoria" });
  };

  const handleDeleteCategoria = async (nombre: string) => {
    const item = managementItems.categorias.find(c => c.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Categoría no encontrada", variant: "destructive" });
      return;
    }

    if (formData.categorias.includes(nombre)) {
      toast({
        title: "Error",
        description: "No puedes eliminar una categoría que está seleccionada",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingElement(true);
    try {
      await deleteCategoria(item.id || 0);
      await loadManagementItems();
      toast({ title: "Categoría eliminada", description: `"${nombre}" ha sido eliminada.`, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar", variant: "destructive" });
    } finally {
      setIsDeletingElement(false);
    }
  };

  const handleEditLaboratorio = (nombre: string) => {
    const item = managementItems.laboratorios.find(l => l.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Laboratorio no encontrado", variant: "destructive" });
      return;
    }
    setEditDialogData({ name: item.nombre, id: item.id || 0 });
    setAddDialogState({ open: true, type: "laboratorio" });
  };

  const handleDeleteLaboratorio = async (nombre: string) => {
    const item = managementItems.laboratorios.find(l => l.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Laboratorio no encontrado", variant: "destructive" });
      return;
    }

    if (formData.laboratorio === nombre) {
      toast({
        title: "Error",
        description: "No puedes eliminar el laboratorio que está seleccionado",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingElement(true);
    try {
      await deleteLaboratorio(item.id || 0);
      await loadManagementItems();
      toast({ title: "Laboratorio eliminado", description: `"${nombre}" ha sido eliminado.`, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar", variant: "destructive" });
    } finally {
      setIsDeletingElement(false);
    }
  };

  const handleEditFormaFarmaceutica = (nombre: string) => {
    const item = managementItems.formasFarmaceuticas.find(f => f.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Forma farmacéutica no encontrada", variant: "destructive" });
      return;
    }
    setEditDialogData({ name: item.nombre, id: item.id || 0 });
    setAddDialogState({ open: true, type: "formaFarmaceutica" });
  };

  const handleDeleteFormaFarmaceutica = async (nombre: string) => {
    const item = managementItems.formasFarmaceuticas.find(f => f.nombre === nombre);
    if (!item) {
      toast({ title: "Error", description: "Forma farmacéutica no encontrada", variant: "destructive" });
      return;
    }

    if (formData.formaFarmaceutica === nombre) {
      toast({
        title: "Error",
        description: "No puedes eliminar la forma farmacéutica que está seleccionada",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingElement(true);
    try {
      await deleteFormaFarmaceutica(item.id || 0);
      await loadManagementItems();
      toast({ title: "Forma farmacéutica eliminada", description: `"${nombre}" ha sido eliminada.`, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo eliminar", variant: "destructive" });
    } finally {
      setIsDeletingElement(false);
    }
  };

  const handleAddNewElement = async (id: number, name: string) => {
    if (isAddingElement) return;

    const type = addDialogState.type;
    if (!type) return;

    setIsAddingElement(true);

    try {
      if (id) {
        switch (type) {
          case "categoria":
            await updateCategoria(id, { nombre: name });
            break;
          case "ubicacion":
            await updateUbicacion(id, { nombre: name });
            break;
          case "laboratorio":
            await updateLaboratorio(id, { nombre: name });
            break;
          case "formaFarmaceutica":
            await updateFormaFarmaceutica(id, { nombre: name });
            break;
        }
      } else {
        switch (type) {
          case "categoria":
            await createCategoria({ nombre: name });
            break;
          case "ubicacion":
            await createUbicacion({ nombre: name });
            break;
          case "laboratorio":
            await createLaboratorio({ nombre: name });
            break;
          case "formaFarmaceutica":
            await createFormaFarmaceutica({ nombre: name });
            break;
        }
      }

      await loadManagementItems();

      toast({
        title: `${type === "formaFarmaceutica" ? "Forma farmacéutica" : type.charAt(0).toUpperCase() + type.slice(1)} agregado`,
        description: `"${name}" ha sido agregado exitosamente.`,
      });

      if (onRefreshData) {
        onRefreshData();
      }

      setAddDialogState({ open: false, type: null });
      setEditDialogData({ name: "", id: 0 });
    } catch (error) {
      console.error(`Error agregando ${type}:`, error);
      toast({
        title: "Error",
        description: `No se pudo agregar el ${type === "formaFarmaceutica" ? "forma farmacéutica" : type}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingElement(false);
    }
  };

  const openAddDialog = (type: "categoria" | "ubicacion" | "laboratorio" | "formaFarmaceutica") => {
    setAddDialogState({ open: true, type });
    setEditDialogData({ name: "", id: 0 });
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingProduct) return;

    if (!formData.codigoP?.trim()) {
      toast({ 
        title: "Error", 
        description: "El código de producto es obligatorio", 
        variant: "destructive" 
      });
      return;
    }

    if (!product || formData.codigoP !== product.codigoP) {
      if (productoEncontrado && mostrarMensajeExistente) {
        toast({ 
          title: "Error", 
          description: `El código "${formData.codigoP}" ya está registrado para el producto: ${productoEncontrado.nombre}`,
          variant: "destructive" 
        });
        return;
      }
    }

    if (!formData.nombre?.trim()) {
      toast({ title: "Error", description: "El nombre del producto es obligatorio", variant: "destructive" });
      return;
    }

    if (!formData.ubicacion) {
      toast({ title: "Error", description: "La ubicación es obligatoria", variant: "destructive" });
      return;
    }

    if (!formData.laboratorio) {
      toast({ title: "Error", description: "El laboratorio es obligatorio", variant: "destructive" });
      return;
    }

    if (!formData.formaFarmaceutica) {
      toast({ title: "Error", description: "La forma farmacéutica es obligatoria", variant: "destructive" });
      return;
    }

    if (formData.categorias.length === 0) {
      toast({ title: "Error", description: "Debe seleccionar al menos una categoría", variant: "destructive" });
      return;
    }

    const precioVentaNum = Number(formData.precioVenta);
    if (isNaN(precioVentaNum) || precioVentaNum <= 0) {
      toast({ title: "Error", description: "El precio de venta debe ser mayor a 0", variant: "destructive" });
      return;
    }

    if (!formData.descripcion?.trim()) {
      toast({ title: "Error", description: "La descripción es obligatoria", variant: "destructive" });
      return;
    }

    const lotesValidos = lotesForm.filter(l => l.stock > 0 && l.fechaVencimiento);
    if (lotesValidos.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un lote con stock y fecha de vencimiento",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingProduct(true);

    try {
      const idubicacion = getItemIdByName(managementItems.ubicaciones, formData.ubicacion);
      const idlaboratorio = getItemIdByName(managementItems.laboratorios, formData.laboratorio);
      const idformaFarmaceutica = getItemIdByName(managementItems.formasFarmaceuticas, formData.formaFarmaceutica);

      if (idubicacion === 0) {
        toast({ title: "Error", description: "La ubicación seleccionada no es válida", variant: "destructive" });
        setIsSubmittingProduct(false);
        return;
      }

      if (idlaboratorio === 0) {
        toast({ title: "Error", description: "El laboratorio seleccionado no es válido", variant: "destructive" });
        setIsSubmittingProduct(false);
        return;
      }

      if (idformaFarmaceutica === 0) {
        toast({ title: "Error", description: "La forma farmacéutica seleccionada no es válida", variant: "destructive" });
        setIsSubmittingProduct(false);
        return;
      }

      const descripcionFormateada = formatDescriptionForProduction(formData.descripcion);
      const formDataToSend = new FormData();

      formDataToSend.append("codigoP", formData.codigoP.trim());
      formDataToSend.append("nombre", formData.nombre);
      formDataToSend.append("descripcion", descripcionFormateada);
      formDataToSend.append("idubicacion", idubicacion.toString());
      formDataToSend.append("idlaboratorio", idlaboratorio.toString());
      formDataToSend.append("idforma_farmaceutica", idformaFarmaceutica.toString());

      const categoriaIds = formData.categorias.map((cat) =>
        getItemIdByName(managementItems.categorias, cat)
      );
      formDataToSend.append("categorias", JSON.stringify(categoriaIds));

      formDataToSend.append("precio_venta", precioVentaNum.toString());
      
      const precioCompraNum = Number(formData.precioCompra) || 0;
      formDataToSend.append("precio_compra", precioCompraNum.toString());
      
      const stockMinimoNum = Number(formData.stockMinimo) || 0;
      formDataToSend.append("stock_minimo", stockMinimoNum.toString());

      if (formData.codigoBarras && formData.codigoBarras.trim()) {
        formDataToSend.append("codigo_barras", formData.codigoBarras.trim());
      }

      if (formData.productosSimilares && formData.productosSimilares.length > 0) {
        formDataToSend.append("productos_similares", JSON.stringify(formData.productosSimilares));
      }

      const lotesData = lotesValidos.map(l => ({
        stock: l.stock,
        fecha_vencimiento: l.fechaVencimiento,
      }));
      formDataToSend.append("lotes", JSON.stringify(lotesData));

      if (formData.imagenFile instanceof File) {
        formDataToSend.append("imagen", formData.imagenFile);
      }

      const isEditing = !!product && !!formData.id;

      if (isEditing) {
        await updateProducto(parseInt(formData.id!), formDataToSend);
        toast({ title: "Producto actualizado", description: "El producto ha sido actualizado exitosamente." });
      } else {
        await createProducto(formDataToSend);
        toast({ title: "Producto creado", description: "El producto ha sido creado exitosamente." });
      }

      onSubmit(formData, isEditing);
    } catch (error: any) {
      console.error("Error al guardar el producto:", error);
      
      if (error.response?.status === 409 && error.response?.data?.code === "DUPLICATE_CODE") {
        toast({
          title: "Código duplicado",
          description: error.response?.data?.error || "Ya existe un producto con este código.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "No se pudo guardar el producto. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Por favor, selecciona una imagen válida", variant: "destructive" });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "La imagen no puede superar los 5MB", variant: "destructive" });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, imagen: previewUrl, imagenFile: file }));
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imagen: "", imagenFile: null }));
  };

  return (
    <>
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            window.history.back();
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-3">
        {/* Código de Producto */}
        <div className="space-y-1.5">
          <Label htmlFor="codigoP" className="text-sm font-medium">
            Código de Producto <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="codigoP"
              value={formData.codigoP}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setFormData((prev) => ({ ...prev, codigoP: value }));
                setMostrarMensajeExistente(false);
                setProductoEncontrado(null);
              }}
              placeholder="Ej: PROD-001"
              className={`h-9 text-sm font-mono ${mostrarMensajeExistente && productoEncontrado ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              required
            />
            {buscandoCodigo && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          {mostrarMensajeExistente && productoEncontrado && (
            <div className="flex items-center p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Producto ya registrado
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Código:</strong> {productoEncontrado.codigoP}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Producto:</strong> {productoEncontrado.nombre}
                </p>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            El código debe ser único y se usará para identificar el producto.
          </p>
        </div>

        {/* Nombre Comercial */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre" className="text-sm font-medium">
            Nombre Comercial <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => handleInputChange("nombre", e.target.value)}
            placeholder="Ej: Paracetamol 500mg"
            className="h-9 text-sm"
            required
          />
        </div>

        {/* Imagen circular */}
        <div className="flex justify-center py-2">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => document.getElementById("image-upload-input")?.click()}
            >
              {formData.imagen ? (
                <img
                  src={formData.imagen}
                  className="w-full h-full object-cover"
                  alt="Producto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
                  }}
                />
              ) : (
                <Camera className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {formData.imagen && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-0.5 bg-destructive rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <Label htmlFor="descripcion" className="text-sm font-medium">
            Nombre Genérico <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => handleInputChange("descripcion", e.target.value)}
            rows={2}
            placeholder="Describe tu producto..."
            className="text-sm resize-none h-14"
            required
          />
        </div>

        {/* Ubicación y Categorías */}
        <div className="grid grid-cols-2 gap-3">
          <SingleSelectWithDropdown
            options={localLists.ubicaciones}
            selectedValue={formData.ubicacion}
            onSelectionChange={(value) => handleInputChange("ubicacion", value)}
            placeholder="Buscar ubicación..."
            label="Ubicación"
            required
            onEdit={handleEditUbicacion}
            onDelete={handleDeleteUbicacion}
            onAddNew={() => openAddDialog("ubicacion")}
            isAdding={isAddingElement}
            isDeleting={isDeletingElement}
          />

          <SearchSelectWithDropdown
            options={localLists.categorias}
            selectedValues={formData.categorias}
            onSelectionChange={(values) => handleInputChange("categorias", values)}
            placeholder="Buscar categorías..."
            label="Categorías"
            required
            onEdit={handleEditCategoria}
            onDelete={handleDeleteCategoria}
            showActions={true}
            itemType="categoría"
            onAddNew={() => openAddDialog("categoria")}
            isAdding={isAddingElement}
            isDeleting={isDeletingElement}
          />
        </div>

        {/* Laboratorio y Forma Farmacéutica */}
        <div className="grid grid-cols-2 gap-3">
          <SingleSelectWithDropdown
            options={localLists.laboratorios}
            selectedValue={formData.laboratorio}
            onSelectionChange={(value) => handleInputChange("laboratorio", value)}
            placeholder="Buscar laboratorio..."
            label="Laboratorio"
            required
            onEdit={handleEditLaboratorio}
            onDelete={handleDeleteLaboratorio}
            onAddNew={() => openAddDialog("laboratorio")}
            isAdding={isAddingElement}
            isDeleting={isDeletingElement}
          />

          <SingleSelectWithDropdown
            options={localLists.formasFarmaceuticas}
            selectedValue={formData.formaFarmaceutica}
            onSelectionChange={(value) => handleInputChange("formaFarmaceutica", value)}
            placeholder="Buscar forma farmacéutica..."
            label="Forma Farmacéutica"
            required
            onEdit={handleEditFormaFarmaceutica}
            onDelete={handleDeleteFormaFarmaceutica}
            onAddNew={() => openAddDialog("formaFarmaceutica")}
            isAdding={isAddingElement}
            isDeleting={isDeletingElement}
          />
        </div>

        {/* Stock Mínimo */}
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Stock Mínimo</Label>
            <Input
              type="number"
              value={formData.stockMinimo}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("stockMinimo", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              min="0"
              className="h-9 text-sm number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

        {/* Precios */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="precioVenta" className="text-sm font-medium">
              Precio Venta (Bs) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="precioVenta"
              type="number"
              step="0.01"
              value={formData.precioVenta === "" ? "" : formData.precioVenta}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("precioVenta", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              className="h-9 text-sm number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="precioCompra" className="text-sm font-medium">
              Precio Compra (Bs)
            </Label>
            <Input
              id="precioCompra"
              type="number"
              step="0.01"
              value={formData.precioCompra === "" ? "" : formData.precioCompra}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange("precioCompra", value === "" ? "" : Number(value));
              }}
              placeholder="0"
              className="h-9 text-sm number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

        {/* Código de Barras */}
        <div className="space-y-1.5">
          <Label htmlFor="codigoBarras" className="text-sm font-medium">
            Código de Barras
          </Label>
          <div className="relative">
            <Input
              id="codigoBarras"
              value={formData.codigoBarras || ""}
              onChange={(e) => handleInputChange("codigoBarras", e.target.value)}
              placeholder="Escanea o escribe el código"
              className="h-9 text-sm pr-10"
            />
            {isMobile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openScanner}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Lotes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Lotes y Stock <span className="text-red-500">*</span>
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addLoteRow}
              className="h-7 px-3 text-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar Lote
            </Button>
          </div>

          {lotesForm.map((lote, index) => (
            <div key={index} className="flex items-center gap-2 p-2.5 border rounded-md">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Stock</Label>
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={lote.stock || ''}
                  onChange={(e) => handleLoteChange(index, 'stock', Number(e.target.value))}
                  className="h-9 text-sm"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={lote.fechaVencimiento}
                  onChange={(e) => handleLoteChange(index, 'fechaVencimiento', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              {lotesForm.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLoteRow(index)}
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive self-end"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {lotesForm.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Stock total: {lotesForm.reduce((sum, l) => sum + (l.stock || 0), 0)} unidades
            </div>
          )}
        </div>

        {/* Productos Similares */}
        <div className="space-y-1.5">
          <ProductoSimilarSelect
            selectedValues={formData.productosSimilares || []}
            onSelectionChange={(values) => handleInputChange("productosSimilares", values)}
            currentProductId={formData.id ? parseInt(formData.id) : undefined}
          />
          {loadingProductos && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando productos...
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 text-sm px-4"
            disabled={isSubmittingProduct || isAddingElement}
          >
            Cancelar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 h-9 text-sm px-4"
                disabled={isSubmittingProduct || isAddingElement}
              >
                {isSubmittingProduct ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {product ? "Actualizando..." : "Agregando..."}
                  </>
                ) : product ? (
                  "Actualizar"
                ) : (
                  "Agregar"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                <AlertDialogDescription>
                  {product
                    ? `¿Estás seguro de actualizar "${formData.nombre}"?`
                    : `¿Estás seguro de agregar "${formData.nombre}"?`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmittingProduct}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} disabled={isSubmittingProduct}>
                  {isSubmittingProduct ? "Procesando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>

      {/* Dialog para agregar/editar elementos */}
      <Dialog
        open={addDialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogState({ open: false, type: null });
            setEditDialogData({ name: "", id: 0 });
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialogData.id ? "Editar" : "Agregar"}{" "}
              {addDialogState.type === "categoria"
                ? "Categoría"
                : addDialogState.type === "ubicacion"
                ? "Ubicación"
                : addDialogState.type === "laboratorio"
                ? "Laboratorio"
                : addDialogState.type === "formaFarmaceutica"
                ? "Forma Farmacéutica"
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={`Ej: ${addDialogState.type === "categoria" ? "Medicamentos" : addDialogState.type === "ubicacion" ? "Pasillo A" : addDialogState.type === "laboratorio" ? "Laboratorio ABC" : "Tabletas"}`}
                value={editDialogData.name}
                onChange={(e) => setEditDialogData({ ...editDialogData, name: e.target.value })}
                autoFocus
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editDialogData.name.trim()) {
                    handleAddNewElement(editDialogData.id, editDialogData.name);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogState({ open: false, type: null });
                setEditDialogData({ name: "", id: 0 });
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editDialogData.name.trim()) {
                  handleAddNewElement(editDialogData.id, editDialogData.name.trim());
                }
              }}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              disabled={!editDialogData.name.trim() || isAddingElement}
            >
              {isAddingElement ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editDialogData.id ? "Actualizando..." : "Creando..."}
                </>
              ) : editDialogData.id ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FormularioProductos;