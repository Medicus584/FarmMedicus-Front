import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddItemDialog } from "./AddItemDialog";
import {
  createUbicacion,
  createCategoria,
  getUbicaciones,
  getCategorias
} from "@/api/ManagementSectionApi";
import {
  createProducto,
  updateProducto
} from "@/api/FormularioProductoApi";

interface ProductFormData {
  id?: string;
  nombre: string;
  categorias: string[];
  descripcion: string;
  ubicacion: string;
  precioVenta: string;
  precioCompra?: string;
  stock: number;
  stockMinimo?: number;
  imagen?: string;
  imagenFile?: File | string | string[];
}

interface FormularioProductosProps {
  product?: any;
  ubicaciones: string[];
  categorias: string[];
  onSubmit: (productData: ProductFormData, isEditing: boolean) => void;
  onCancel: () => void;
  onRefreshData?: () => void;
}

interface AddDialogState {
  open: boolean;
  type: 'categoria' | 'ubicacion' | null;
}

interface ManagementItem {
  id: number;
  nombre: string;
  estado: number;
}

interface SearchSelectProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  label: string;
  required?: boolean;
}

const SearchSelect = ({ options, selectedValues, onSelectionChange, placeholder, label, required }: SearchSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedValues.includes(option)
  );

  const addSelection = (option: string) => {
    onSelectionChange([...selectedValues, option]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeSelection = (option: string) => {
    onSelectionChange(selectedValues.filter(v => v !== option));
  };

  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
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
        />
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredOptions.map(option => (
              <button
                key={option}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => addSelection(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map(value => (
            <Badge key={value} variant="secondary" className="flex items-center gap-1">
              {value}
              <button
                type="button"
                onClick={() => removeSelection(value)}
                className="ml-1 hover:text-destructive"
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

const base64ToFile = (base64String, fileName = 'imagen.jpg') => {
  const [metadata, data] = base64String.split(',');
  const mime = metadata.match(/:(.*?);/)[1];
  
  const byteCharacters = atob(data);
  const byteArrays = [];
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.charCodeAt(i));
  }
  
  const byteArray = new Uint8Array(byteArrays);
  const blob = new Blob([byteArray], { type: mime });
  
  return new File([blob], fileName, { type: mime });
}

export function FormularioProductos({
  product,
  ubicaciones,
  categorias,
  onSubmit,
  onCancel,
  onRefreshData
}: FormularioProductosProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (product) {
      return {
        id: product.idproducto?.toString(),
        nombre: product.nombre,
        categorias: product.categorias || [],
        descripcion: product.descripcion || "",
        ubicacion: product.ubicacion || "",
        precioVenta: product.precio_venta?.toString() || "0",
        precioCompra: product.precio_compra?.toString() || "0",
        stock: product.stock || 0,
        stockMinimo: product.stock_minimo || 0,
        imagen: product.imagen || '',
        imagenFile: product.imagen 
          ? base64ToFile(product.imagen, 'producto.jpg') 
          : null
      };
    }
    return {
      nombre: "",
      categorias: [],
      descripcion: "",
      ubicacion: "",
      precioVenta: "0",
      precioCompra: "0",
      stock: 0,
      stockMinimo: 0,
      imagen: '',
      imagenFile: null,
    };
  });

  const [addDialogState, setAddDialogState] = useState<AddDialogState>({ open: false, type: null });

  const [localLists, setLocalLists] = useState({
    ubicaciones: ubicaciones,
    categorias: categorias
  });

  const [managementItems, setManagementItems] = useState<{
    ubicaciones: ManagementItem[];
    categorias: ManagementItem[];
  }>({
    ubicaciones: [],
    categorias: [],
  });

  // Estados para controlar la carga de los botones
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isAddingElement, setIsAddingElement] = useState(false);

  const { toast } = useToast();

  // Cargar los elementos de gestión al montar el componente
  useEffect(() => {
    const loadManagementItems = async () => {
      try {
        const [
          ubicacionesData,
          categoriasData
        ] = await Promise.all([
          getUbicaciones(),
          getCategorias()
        ]);

        setManagementItems({
          ubicaciones: ubicacionesData,
          categorias: categoriasData
        });

        // Actualizar las listas locales con los datos frescos del backend
        setLocalLists({
          ubicaciones: ubicacionesData.map(item => item.nombre),
          categorias: categoriasData.map(item => item.nombre)
        });

      } catch (error) {
        console.error("Error cargando elementos de gestión:", error);
      }
    };

    loadManagementItems();
  }, []);

  // Actualizar las listas locales cuando cambien las props
  useEffect(() => {
    setLocalLists({
      ubicaciones: ubicaciones,
      categorias: categorias
    });
  }, [ubicaciones, categorias]);

  const handleInputChange = (field: keyof ProductFormData, value: string | string[] | File) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Función MEJORADA para formatear la descripción que funciona en producción
  const formatDescriptionForProduction = (description: string): string => {
    if (!description) return "";
    
    // Para producción: normalizar todos los tipos de saltos de línea
    return description
      .replace(/\r\n/g, '\n')  // Windows a Unix
      .replace(/\r/g, '\n')    // Mac antiguo a Unix
      .replace(/\n+/g, '\n')   // Múltiples saltos a uno solo
      .replace(/[ ]+/g, ' ')   // Múltiples espacios a uno solo
      .trim();
  };

  const getItemIdByName = (items: ManagementItem[], name: string): number => {
    const item = items.find(item => item.nombre === name);
    return item?.id || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmittingProduct) return;
    
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.ubicacion) {
      toast({
        title: "Error",
        description: "La ubicación es obligatoria",
        variant: "destructive"
      });
      return;
    }

    if (formData.categorias.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una categoría",
        variant: "destructive"
      });
      return;
    }

    if (!formData.precioVenta) {
      toast({
        title: "Error",
        description: "El precio de venta es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.descripcion.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingProduct(true);

    try {
      const idubicacion = getItemIdByName(managementItems.ubicaciones, formData.ubicacion);
      
      if (idubicacion === 0) {
        toast({
          title: "Error",
          description: "La ubicación seleccionada no es válida",
          variant: "destructive"
        });
        setIsSubmittingProduct(false);
        return;
      }

      const descripcionFormateada = formatDescriptionForProduction(formData.descripcion);
      // Preparar datos para el backend
      console.log(formData.imagenFile)
      const productoRequest = {
        nombre: formData.nombre,
        descripcion: descripcionFormateada,
        idubicacion: idubicacion,
        categorias: formData.categorias.map(cat => getItemIdByName(managementItems.categorias, cat)),
        precio_venta: parseFloat(formData.precioVenta|| "0") || 0,
        precio_compra: parseFloat(formData.precioCompra || "0") || 0,
        stock: formData.stock || 0,
        stock_minimo: formData.stockMinimo || 0,
        imagen: formData.imagenFile instanceof File ? formData.imagenFile : null
      };

      const formDataToSend = new FormData();
      
      formDataToSend.append('nombre', productoRequest.nombre);
      formDataToSend.append('descripcion', productoRequest.descripcion);
      formDataToSend.append('idubicacion', productoRequest.idubicacion.toString());
      formDataToSend.append('categorias', JSON.stringify(productoRequest.categorias));
      formDataToSend.append('precio_venta', productoRequest.precio_venta.toString());
      formDataToSend.append('precio_compra', productoRequest.precio_compra.toString());
      formDataToSend.append('stock', productoRequest.stock.toString());
      formDataToSend.append('stock_minimo', productoRequest.stock_minimo.toString())
      
      if (productoRequest.imagen) {
        formDataToSend.append('imagen', productoRequest.imagen);
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
        description: error.message || "No se pudo guardar el producto. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const openAddDialog = (type: 'categoria' | 'ubicacion') => {
    setAddDialogState({ open: true, type });
  };

  const updateLocalList = async (type: string) => {
    try {
      let newData: ManagementItem[] = [];
      
      switch (type) {
        case 'ubicacion':
          newData = await getUbicaciones();
          setManagementItems(prev => ({ ...prev, ubicaciones: newData }));
          setLocalLists(prev => ({ ...prev, ubicaciones: newData.map(item => item.nombre) }));
          break;
        case 'categoria':
          newData = await getCategorias();
          setManagementItems(prev => ({ ...prev, categorias: newData }));
          setLocalLists(prev => ({ ...prev, categorias: newData.map(item => item.nombre) }));
          break;
        default:
          return;
      }

    } catch (error) {
      console.error(`Error actualizando lista ${type}:`, error);
    }
  };

  const handleAddNewElement = async (name: string) => {
    if (isAddingElement) return; // Prevenir doble clic
    
    const type = addDialogState.type;
    if (!type) return;

    setIsAddingElement(true);

    try {
      switch (type) {
        case 'categoria':
          await createCategoria({ nombre: name });
          break;
        case 'ubicacion':
          await createUbicacion({ nombre: name });
          break;
      }

      // Actualizar la lista específica desde el backend
      await updateLocalList(type);

      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} agregado`,
        description: `El ${type} "${name}" ha sido agregado exitosamente.`,
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
        variant: "destructive"
      });
    } finally {
      setIsAddingElement(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      if (!file.type.startsWith('image/')) {
          toast({
              title: "Error",
              description: "Por favor, selecciona una imagen válida",
              variant: "destructive"
          });
          return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
          toast({
              title: "Error",
              description: "La imagen no puede superar los 5MB",
              variant: "destructive"
          });
          return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      
      handleInputChange("imagen", previewUrl)
      handleInputChange("imagenFile", file)
      setFormData(prev => ({ 
          ...prev, 
          imagen: previewUrl,
          imagenFile: file
      }));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      imagen: null,
      imagenFile: null,
    }));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleInputChange("nombre", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <select
                value={formData.ubicacion}
                onChange={(e) => handleInputChange("ubicacion", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Seleccionar ubicación</option>
                {localLists.ubicaciones.map(ubicacion => (
                  <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
                ))}
              </select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    className="flex-shrink-0"
                    disabled={isAddingElement}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro de abrir el formulario para agregar una nueva ubicación?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => openAddDialog("ubicacion")}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Categorías */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Categorías <span className="text-red-500">*</span></Label>
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              onClick={() => openAddDialog("categoria")}
              disabled={isAddingElement}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <SearchSelect
            options={localLists.categorias}
            selectedValues={formData.categorias}
            onSelectionChange={(values) => handleInputChange("categorias", values)}
            placeholder="Buscar categorías..."
            label=""
          />
        </div>
        
        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción <span className="text-red-500">*</span></Label>
          <Textarea
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => handleInputChange("descripcion", e.target.value)}
            rows={3}
            placeholder="Escribe la descripción del producto. Puedes usar saltos de línea para mejor formato."
            required
          />
          <div className="text-xs text-muted-foreground">
            Los saltos de línea se mantendrán en la visualización del producto.
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="precioVenta">Precio Venta (Bs) <span className="text-red-500">*</span></Label>
            <Input
              id="precioVenta"
              type="number"
              step="0.01"
              value={formData.precioVenta}
              onChange={(e) => handleInputChange("precioVenta", e.target.value)}
              className="number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precioCompra">Precio Compra (Bs)</Label>
            <Input
              id="precioCompra"
              type="number"
              step="0.01"
              value={formData.precioCompra}
              onChange={(e) => handleInputChange("precioCompra", e.target.value)}
              className="number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
          <div className="space-y-2">
            <Label>Stock <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) => handleInputChange("stock", e.target.value)}
              placeholder="0"
              min="0"
              className="number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Stock Mínimo</Label>
            <Input
              type="number"
              value={formData.stockMinimo}
              onChange={(e) => handleInputChange("stockMinimo", e.target.value)}
              placeholder="0"
              min="0"
              className="number-input-no-scroll"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Imagen del producto</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <div className="text-xs text-muted-foreground">
              {formData.imagen && 
                `Imagen existente. Agregar nueva imagen reemplazará la existente.`
              }
            </div>
          </div>
        </div>

        {formData.imagen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <div className="relative">
              <img 
                src={formData.imagen} 
                className="w-full h-20 object-cover rounded border-2 border-green-500" 
                alt="Vista previa"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            className="w-full sm:w-auto"
            disabled={isSubmittingProduct || isAddingElement}
          >
            Cancelar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                type="button" 
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                disabled={isSubmittingProduct || isAddingElement}
              >
                {isSubmittingProduct ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {product ? "Actualizando..." : "Agregando..."}
                  </>
                ) : (
                  product ? "Actualizar Producto" : "Agregar Producto"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                <AlertDialogDescription>
                  {product 
                    ? `¿Estás seguro de actualizar el producto "${formData.nombre}"?`
                    : `¿Estás seguro de agregar el producto "${formData.nombre}"?`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmittingProduct}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSubmit}
                  disabled={isSubmittingProduct}
                >
                  {isSubmittingProduct ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    "Confirmar"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>

      {/* Diálogo para agregar nuevos elementos */}
      <AddItemDialog
        open={addDialogState.open}
        onOpenChange={(open) => setAddDialogState({ open, type: null })}
        title={`Agregar ${
          addDialogState.type === 'categoria' ? 'Categoría' :
          addDialogState.type === 'ubicacion' ? 'Ubicación' : ''
        }`}
        itemType={
          addDialogState.type === 'categoria' ? 'categorías' :
          addDialogState.type === 'ubicacion' ? 'ubicaciones' : ''
        }
        onAdd={handleAddNewElement}
      />
    </>
  );
}
