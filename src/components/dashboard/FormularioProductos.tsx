// components/FormularioProductos.tsx
import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, X, Search, Camera, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddItemDialog } from "./AddItemDialog";
import BarcodeScanner from "./BarcodeScanner";
import {
  createUbicacion,
  createCategoria,
  createLaboratorio,
  getUbicaciones,
  getCategorias,
  getLaboratorios,
  updateUbicacion,
  updateCategoria,
  updateLaboratorio,
  deleteUbicacion,
  deleteCategoria,
  deleteLaboratorio,
} from "@/api/ProductsApi";
import {
  createProducto,
  updateProducto,
  getTodosProductosParaSelect,
} from "@/api/ProductsApi";

interface ProductFormData {
  id?: string;
  nombre: string;
  categorias: string[];
  descripcion: string;
  ubicacion: string;
  laboratorio: string;
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
  onSubmit: (productData: ProductFormData, isEditing: boolean) => void;
  onCancel: () => void;
  onRefreshData?: () => void;
}

interface AddDialogState {
  open: boolean;
  type: "categoria" | "ubicacion" | "laboratorio" | null;
}

interface ManagementItem {
  idubicacion?: number;
  idcategoria?: number;
  idlaboratorio?: number;
  id?: number;
  nombre: string;
  estado: number;
}

// Componente de búsqueda con edición y eliminación en el dropdown
const SearchSelectWithManagement = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  label,
  required,
  onAddNew,
  items,
  type,
  onRefreshList,
}: {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  onAddNew?: () => void;
  items?: ManagementItem[];
  type?: "ubicacion" | "categoria" | "laboratorio";
  onRefreshList?: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ManagementItem | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();

  // Filtrar elementos que coinciden con la búsqueda
  const searchResults = (items || []).filter(
    (item) =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const addSelection = (option: string) => {
    if (!selectedValues.includes(option)) {
      onSelectionChange([...selectedValues, option]);
    }
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeSelection = (option: string) => {
    onSelectionChange(selectedValues.filter((v) => v !== option));
  };

  const handleEdit = (item: ManagementItem) => {
    setEditingItem(item);
    setEditName(item.nombre);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim() || !type) return;

    const id = (editingItem as any).idubicacion || 
               (editingItem as any).idcategoria || 
               (editingItem as any).idlaboratorio || 
               editingItem.id || 0;

    try {
      switch (type) {
        case "ubicacion":
          await updateUbicacion(id, { nombre: editName.trim() });
          break;
        case "categoria":
          await updateCategoria(id, { nombre: editName.trim() });
          break;
        case "laboratorio":
          await updateLaboratorio(id, { nombre: editName.trim() });
          break;
      }

      // Si el elemento editado estaba seleccionado, actualizar la selección
      if (selectedValues.includes(editingItem.nombre)) {
        const newValues = selectedValues.map(v => 
          v === editingItem.nombre ? editName.trim() : v
        );
        onSelectionChange(newValues);
      }

      toast({
        title: `${label} actualizado`,
        description: `"${editingItem.nombre}" → "${editName.trim()}"`,
      });

      if (onRefreshList) onRefreshList();
      setEditingItem(null);
      setEditName("");
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo actualizar el ${label.toLowerCase()}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: ManagementItem) => {
    if (!type) return;

    const id = (item as any).idubicacion || 
               (item as any).idcategoria || 
               (item as any).idlaboratorio || 
               item.id || 0;

    try {
      switch (type) {
        case "ubicacion":
          await deleteUbicacion(id);
          break;
        case "categoria":
          await deleteCategoria(id);
          break;
        case "laboratorio":
          await deleteLaboratorio(id);
          break;
      }

      // Si el elemento eliminado estaba seleccionado, removerlo
      if (selectedValues.includes(item.nombre)) {
        onSelectionChange(selectedValues.filter(v => v !== item.nombre));
      }

      toast({
        title: `${label} eliminado`,
        description: `"${item.nombre}" ha sido eliminado`,
        variant: "destructive",
      });

      if (onRefreshList) onRefreshList();
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo eliminar el ${label.toLowerCase()}`,
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditName("");
  };

  const isSelected = (name: string) => selectedValues.includes(name);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {onAddNew && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
            onClick={onAddNew}
            title={`Agregar ${label.toLowerCase()}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Buscador con dropdown */}
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
        
        {/* Dropdown de resultados */}
        {isOpen && searchTerm.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((item) => {
                const selected = isSelected(item.nombre);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-3 py-1.5 hover:bg-accent group ${
                      selected ? "bg-primary/5" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={`flex-1 text-left text-sm ${
                        selected ? "text-primary font-medium" : ""
                      }`}
                      onMouseDown={() => addSelection(item.nombre)}
                    >
                      {item.nombre}
                      {selected && (
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
                          handleEdit(item);
                        }}
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar {label.toLowerCase()}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de eliminar "{item.nombre}"?
                              {selected && (
                                <span className="block mt-2 text-destructive font-medium">
                                  ⚠️ Este elemento está seleccionado y será removido.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                  onMouseDown={() => {
                    if (onAddNew) onAddNew();
                    setIsOpen(false);
                  }}
                >
                  Agregar nuevo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Elementos seleccionados */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="text-sm px-2 py-1 h-6"
            >
              {value}
              <button
                type="button"
                onClick={() => removeSelection(value)}
                className="ml-1.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-4 max-w-sm w-full mx-4 shadow-lg">
            <h4 className="text-sm font-medium mb-3">Editar {label.toLowerCase()}</h4>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-9 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
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
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                className="h-8 bg-primary hover:bg-primary/90"
                disabled={!editName.trim()}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ProductoSelect {
  idproducto: number;
  nombre: string;
}

const ProductoSimilarSelect = ({
  productosDisponibles,
  selectedValues,
  onSelectionChange,
  currentProductId,
}: {
  productosDisponibles: ProductoSelect[];
  selectedValues: number[];
  onSelectionChange: (values: number[]) => void;
  currentProductId?: number;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = productosDisponibles.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
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
    const producto = productosDisponibles.find((p) => p.idproducto === id);
    return producto ? producto.nombre : `Producto ${id}`;
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Productos Similares</Label>
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Buscar productos similares..."
          className="h-9 text-sm pl-9"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-32 overflow-y-auto">
            {filteredOptions.map((producto) => (
              <button
                key={producto.idproducto}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => addSelection(producto)}
              >
                {producto.nombre}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="text-sm px-2 py-1 h-6"
            >
              {getProductoNombre(id)}
              <button
                type="button"
                onClick={() => removeSelection(id)}
                className="ml-1.5 hover:text-destructive"
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

// Función mejorada para convertir base64 a File
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

// Función para obtener la URL de la imagen
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

export function FormularioProductos({
  product,
  ubicaciones,
  categorias,
  laboratorios,
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
        nombre: product.nombre || '',
        categorias: product.categorias || [],
        descripcion: product.descripcion || '',
        ubicacion: product.ubicacion || '',
        laboratorio: product.laboratorio || '',
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
      nombre: "",
      categorias: [],
      descripcion: "",
      ubicacion: "",
      laboratorio: "",
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

  const [todosProductos, setTodosProductos] = useState<ProductoSelect[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lotesForm, setLotesForm] = useState<LoteForm[]>([
    { stock: 0, fechaVencimiento: "" }
  ]);

  const [localLists, setLocalLists] = useState({
    ubicaciones: ubicaciones,
    categorias: categorias,
    laboratorios: laboratorios,
  });

  const [managementItems, setManagementItems] = useState<{
    ubicaciones: ManagementItem[];
    categorias: ManagementItem[];
    laboratorios: ManagementItem[];
  }>({
    ubicaciones: [],
    categorias: [],
    laboratorios: [],
  });

  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isAddingElement, setIsAddingElement] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Manejar historial del navegador para el escáner
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
      const [ubicacionesData, categoriasData, laboratoriosData] = await Promise.all([
        getUbicaciones(),
        getCategorias(),
        getLaboratorios(),
      ]);

      const ubicacionesMapped = ubicacionesData.map(item => ({
        ...item,
        id: item.idubicacion
      }));
      
      const categoriasMapped = categoriasData.map(item => ({
        ...item,
        id: item.idcategoria
      }));
      
      const laboratoriosMapped = laboratoriosData.map(item => ({
        ...item,
        id: item.idlaboratorio
      }));

      setManagementItems({
        ubicaciones: ubicacionesMapped,
        categorias: categoriasMapped,
        laboratorios: laboratoriosMapped,
      });

      setLocalLists({
        ubicaciones: ubicacionesData.map((item) => item.nombre),
        categorias: categoriasData.map((item) => item.nombre),
        laboratorios: laboratoriosData.map((item) => item.nombre),
      });
    } catch (error) {
      console.error("Error cargando elementos de gestión:", error);
    }
  };

  useEffect(() => {
    const loadTodosProductos = async () => {
      setLoadingProductos(true);
      try {
        const productos = await getTodosProductosParaSelect();
        setTodosProductos(productos);
      } catch (error) {
        console.error("Error cargando productos para similares:", error);
      } finally {
        setLoadingProductos(false);
      }
    };
    loadTodosProductos();
    loadManagementItems();
  }, []);

  useEffect(() => {
    setLocalLists({
      ubicaciones: ubicaciones,
      categorias: categorias,
      laboratorios: laboratorios,
    });
  }, [ubicaciones, categorias, laboratorios]);

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
      return (item as any).idubicacion || (item as any).idcategoria || (item as any).idlaboratorio || item.id || 0;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingProduct) return;

    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.ubicacion) {
      toast({
        title: "Error",
        description: "La ubicación es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!formData.laboratorio) {
      toast({
        title: "Error",
        description: "El laboratorio es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (formData.categorias.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una categoría",
        variant: "destructive",
      });
      return;
    }

    if (!formData.precioVenta || formData.precioVenta === "") {
      toast({
        title: "Error",
        description: "El precio de venta es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.descripcion.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria",
        variant: "destructive",
      });
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
      const idubicacion = getItemIdByName(
        managementItems.ubicaciones,
        formData.ubicacion,
      );

      const idlaboratorio = getItemIdByName(
        managementItems.laboratorios,
        formData.laboratorio,
      );

      if (idubicacion === 0) {
        toast({
          title: "Error",
          description: "La ubicación seleccionada no es válida",
          variant: "destructive",
        });
        setIsSubmittingProduct(false);
        return;
      }

      if (idlaboratorio === 0) {
        toast({
          title: "Error",
          description: "El laboratorio seleccionado no es válido",
          variant: "destructive",
        });
        setIsSubmittingProduct(false);
        return;
      }

      const descripcionFormateada = formatDescriptionForProduction(
        formData.descripcion,
      );

      const formDataToSend = new FormData();

      formDataToSend.append("nombre", formData.nombre);
      formDataToSend.append("descripcion", descripcionFormateada);
      formDataToSend.append("idubicacion", idubicacion.toString());
      formDataToSend.append("idlaboratorio", idlaboratorio.toString());
      formDataToSend.append(
        "categorias",
        JSON.stringify(
          formData.categorias.map((cat) =>
            getItemIdByName(managementItems.categorias, cat),
          ),
        ),
      );
      
      const precioVentaValue = formData.precioVenta === "" || formData.precioVenta === null || formData.precioVenta === undefined 
        ? 0 
        : Number(formData.precioVenta);
      formDataToSend.append("precio_venta", precioVentaValue.toString());
      
      const precioCompraValue = formData.precioCompra === "" || formData.precioCompra === null || formData.precioCompra === undefined 
        ? 0 
        : Number(formData.precioCompra);
      formDataToSend.append("precio_compra", precioCompraValue.toString());
      
      const stockMinimoValue = formData.stockMinimo === "" || formData.stockMinimo === null || formData.stockMinimo === undefined 
        ? 0 
        : Number(formData.stockMinimo);
      formDataToSend.append("stock_minimo", stockMinimoValue.toString());

      if (formData.codigoBarras && formData.codigoBarras.trim()) {
        formDataToSend.append("codigo_barras", formData.codigoBarras.trim());
      }

      if (
        formData.productosSimilares &&
        formData.productosSimilares.length > 0
      ) {
        formDataToSend.append(
          "productos_similares",
          JSON.stringify(formData.productosSimilares),
        );
      }

      const lotesData = lotesValidos.map(l => ({
        stock: l.stock,
        fecha_vencimiento: l.fechaVencimiento,
      }));
      formDataToSend.append("lotes", JSON.stringify(lotesData));

      if (formData.imagenFile instanceof File) {
        formDataToSend.append("imagen", formData.imagenFile);
      }

      if (product && formData.id) {
        await updateProducto(parseInt(formData.id), formDataToSend);
        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado exitosamente.",
        });
      } else {
        await createProducto(formDataToSend);
        toast({
          title: "Producto creado",
          description: "El producto ha sido creado exitosamente.",
        });
      }

      onSubmit(formData, !!product);
    } catch (error: any) {
      console.error("Error al guardar el producto:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "No se pudo guardar el producto. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const openAddDialog = (type: "categoria" | "ubicacion" | "laboratorio") => {
    setAddDialogState({ open: true, type });
  };

  const handleAddNewElement = async (name: string) => {
    if (isAddingElement) return;

    const type = addDialogState.type;
    if (!type) return;

    setIsAddingElement(true);

    try {
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
      }

      await loadManagementItems();

      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} agregado`,
        description: `"${name}" ha sido agregado exitosamente.`,
      });

      if (onRefreshData) {
        onRefreshData();
      }

      setAddDialogState({ open: false, type: null });
    } catch (error) {
      console.error(`Error agregando ${type}:`, error);
      toast({
        title: "Error",
        description: `No se pudo agregar el ${type}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingElement(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Por favor, selecciona una imagen válida",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen no puede superar los 5MB",
          variant: "destructive",
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      handleInputChange("imagen", previewUrl);
      handleInputChange("imagenFile", file);
      setFormData((prev) => ({
        ...prev,
        imagen: previewUrl,
        imagenFile: file,
      }));
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      imagen: "",
      imagenFile: null,
    }));
  };

  useEffect(() => {
    if (product && product.lotes && product.lotes.length > 0) {
      setLotesForm(product.lotes.map((lote: any) => ({
        stock: lote.stock,
        fechaVencimiento: lote.fechaVencimiento || '',
      })));
    }
  }, [product]);

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
        {/* Nombre del producto */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre" className="text-sm font-medium">
            Nombre <span className="text-red-500">*</span>
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

        {/* Imagen circular centrada */}
        <div className="flex justify-center py-2">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() =>
                document.getElementById("image-upload-input")?.click()
              }
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
            Descripción <span className="text-red-500">*</span>
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

        {/* Ubicación y Categorías lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <SearchSelectWithManagement
            options={localLists.ubicaciones}
            selectedValues={formData.ubicacion ? [formData.ubicacion] : []}
            onSelectionChange={(values) => {
              handleInputChange("ubicacion", values.length > 0 ? values[0] : "");
            }}
            placeholder="Buscar ubicación..."
            label="Ubicación"
            required
            onAddNew={() => openAddDialog("ubicacion")}
            items={managementItems.ubicaciones}
            type="ubicacion"
            onRefreshList={loadManagementItems}
          />

          <SearchSelectWithManagement
            options={localLists.categorias}
            selectedValues={formData.categorias}
            onSelectionChange={(values) => handleInputChange("categorias", values)}
            placeholder="Buscar categorías..."
            label="Categorías"
            required
            onAddNew={() => openAddDialog("categoria")}
            items={managementItems.categorias}
            type="categoria"
            onRefreshList={loadManagementItems}
          />
        </div>

        {/* Laboratorio y Stock Mínimo lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <SearchSelectWithManagement
            options={localLists.laboratorios}
            selectedValues={formData.laboratorio ? [formData.laboratorio] : []}
            onSelectionChange={(values) => {
              handleInputChange("laboratorio", values.length > 0 ? values[0] : "");
            }}
            placeholder="Buscar laboratorio..."
            label="Laboratorio"
            required
            onAddNew={() => openAddDialog("laboratorio")}
            items={managementItems.laboratorios}
            type="laboratorio"
            onRefreshList={loadManagementItems}
          />

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

        {/* Precio Venta y Precio Compra lado a lado */}
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

        {/* Código de Barras con escáner integrado */}
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

        {/* Lotes - Gestión de stock con fechas de vencimiento */}
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
            productosDisponibles={todosProductos}
            selectedValues={formData.productosSimilares || []}
            onSelectionChange={(values) =>
              handleInputChange("productosSimilares", values)
            }
            currentProductId={formData.id ? parseInt(formData.id) : undefined}
          />
          {loadingProductos && (
            <div className="text-sm text-muted-foreground">
              Cargando productos...
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2 pt-3">
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
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
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
                <AlertDialogCancel disabled={isSubmittingProduct}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmit}
                  disabled={isSubmittingProduct}
                >
                  {isSubmittingProduct ? "Procesando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>

      {/* Dialog para agregar nuevo elemento */}
      <AddItemDialog
        open={addDialogState.open}
        onOpenChange={(open) => setAddDialogState({ open, type: null })}
        title={`Agregar ${
          addDialogState.type === "categoria"
            ? "Categoría"
            : addDialogState.type === "ubicacion"
              ? "Ubicación"
              : addDialogState.type === "laboratorio"
                ? "Laboratorio"
                : ""
        }`}
        itemType={
          addDialogState.type === "categoria"
            ? "categorías"
            : addDialogState.type === "ubicacion"
              ? "ubicaciones"
              : addDialogState.type === "laboratorio"
                ? "laboratorios"
                : ""
        }
        onAdd={handleAddNewElement}
      />
    </>
  );
}

export default FormularioProductos;