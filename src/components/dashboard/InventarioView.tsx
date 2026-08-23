// components/InventarioView.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Filter, RefreshCw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardView } from "@/pages/Dashboard";
import { getInventory, getLowMarginCount, InventoryItem, getCategories, Category } from "@/api/InventoryApi";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

interface InventarioViewProps {
  onViewChange?: (view: DashboardView) => void;
}

// Componente para mostrar descripción con opción de expandir
function DescripcionCell({ descripcion }: { descripcion: string }) {
  const [showFull, setShowFull] = useState(false);

  if (!descripcion) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const maxLength = 60;
  const isLong = descripcion.length > maxLength;
  const displayText = isLong && !showFull 
    ? descripcion.substring(0, maxLength) + '...' 
    : descripcion;

  return (
    <div className="relative">
      <div className="text-xs max-w-[200px] break-words">
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

// Componente para mostrar descripción en móvil
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

const ITEMS_PER_PAGE = 15;

export const InventarioView = ({ onViewChange }: InventarioViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowMarginOnly, setShowLowMarginOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowMarginCount, setLowMarginCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.removeItem('searchProductId');
    sessionStorage.removeItem('searchProductName');
    loadInventoryData();
    loadLowMarginCount();
    loadCategories();
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [searchTerm, showLowMarginOnly, selectedCategories]);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showLowMarginOnly, selectedCategories]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInventory(
        searchTerm || undefined, 
        showLowMarginOnly || undefined,
        selectedCategories.length > 0 ? selectedCategories : undefined
      );
      setInventoryData(response.items);
    } catch (err) {
      console.error("Error loading inventory:", err);
      setError("No se pudieron cargar los datos del inventario");
    } finally {
      setLoading(false);
    }
  };

  const loadLowMarginCount = async () => {
    try {
      const count = await getLowMarginCount();
      setLowMarginCount(count);
    } catch (err) {
      console.error("Error loading low margin count:", err);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleRefresh = () => {
    loadInventoryData();
    loadLowMarginCount();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearCategoryFilters = () => {
    setSelectedCategories([]);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSearchTerm("");
    setShowLowMarginOnly(false);
  };

  // Filtrar por término de búsqueda (nombre, descripción o código)
  const filteredData = inventoryData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      item.nombre.toLowerCase().includes(searchLower) ||
      item.descripcion.toLowerCase().includes(searchLower) ||
      (item.codigo && item.codigo.toLowerCase().includes(searchLower));
    const matchesMargin = showLowMarginOnly ? item.margenPorcentaje < 50 : true;
    return matchesSearch && matchesMargin;
  });

  // Calcular datos paginados
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewProduct = (item: InventoryItem) => {
    sessionStorage.setItem('searchProductId', item.id);
    sessionStorage.setItem('searchProductName', item.nombre);
    
    if (onViewChange) {
      onViewChange('productos');
    } else {
      navigate('/dashboard/productos');
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Inventario</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Inventario</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filtro de Categorías */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Categorías
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Categorías</h4>
                  {selectedCategories.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCategoryFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryChange(category.id)}
                      />
                      <Label htmlFor={`category-${category.id}`} className="flex-1">
                        {category.nombre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant={showLowMarginOnly ? "default" : "outline"}
            onClick={() => setShowLowMarginOnly(!showLowMarginOnly)}
            className="w-full sm:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            Margen Bajo ({lowMarginCount})
          </Button>
          
          {(selectedCategories.length > 0 || searchTerm || showLowMarginOnly) && (
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Indicadores de filtros activos */}
      {(selectedCategories.length > 0 ) && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(categoryId => {
            const category = categories.find(c => c.id === categoryId);
            return category ? (
              <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                Categoría: {category.nombre}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleCategoryChange(categoryId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Tabla de inventario */}
      <Card>
        <CardHeader>
          <CardTitle>
            Productos en Inventario ({filteredData.length})
            {loading && <span className="text-sm font-normal text-muted-foreground ml-2">Cargando...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead className="px-4 py-3">Código</TableHead>
                  <TableHead className="px-4 py-3">N. Comercial</TableHead>
                  <TableHead className="px-4 py-3 min-w-[200px]">N. Genérico</TableHead>
                  <TableHead className="px-4 py-3">P. Compra</TableHead>
                  <TableHead className="px-4 py-3">P. Venta</TableHead>
                  <TableHead className="px-4 py-3">Cantidad</TableHead>
                  <TableHead className="px-4 py-3">Margen (%)</TableHead>
                  <TableHead className="px-4 py-3">Última Edición</TableHead>
                  <TableHead className="px-4 py-3">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {showLowMarginOnly 
                        ? "No hay productos con margen bajo" 
                        : "No se encontraron productos que coincidan con la búsqueda"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="border-b transition-colors hover:bg-muted/50">
                      {/* Desktop View */}
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <span className="text-xs font-mono font-medium text-primary">
                          {item.codigo || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3 font-medium">
                        {item.nombre}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <DescripcionCell descripcion={item.descripcion} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <div className="text-sm">Bs. {item.precioCompra.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <div className="font-medium">Bs. {item.precioVenta.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <span className={`font-medium ${
                          item.cantidad <= item.stockMinimo ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.cantidad}
                          {item.cantidad <= item.stockMinimo && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Mínimo
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <span className={`font-medium ${
                          item.margenPorcentaje < 50 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.margenPorcentaje.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <div className="text-muted-foreground text-sm">{item.ultimaEdicion}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProduct(item)}
                          className="h-8 w-8 p-0"
                          title="Ver producto"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver producto</span>
                        </Button>
                      </TableCell>

                      {/* Mobile View */}
                      <TableCell className="md:hidden px-4 py-3">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{item.nombre}</div>
                              {item.codigo && (
                                <div className="text-xs font-mono text-primary mt-0.5">
                                  Código: {item.codigo}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProduct(item)}
                              className="h-8 w-8 p-0"
                              title="Ver producto"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver producto</span>
                            </Button>
                          </div>
                          
                          {/* Descripción en móvil */}
                          <DescripcionMobile descripcion={item.descripcion} />
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">ÚLTIMA EDICIÓN</div>
                              <div className="text-muted-foreground">{item.ultimaEdicion}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">PRECIO COMPRA</div>
                              <div className="text-sm">Bs. {item.precioCompra.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">PRECIO VENTA</div>
                              <div className="font-medium">Bs. {item.precioVenta.toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">CANTIDAD</div>
                              <span className={`font-medium ${
                                item.cantidad <= item.stockMinimo ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {item.cantidad}
                                {item.cantidad <= item.stockMinimo && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Mínimo
                                  </Badge>
                                )}
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">MARGEN (%)</div>
                              <span className={`font-medium ${
                                item.margenPorcentaje < 50 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {item.margenPorcentaje.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {filteredData.length > 0 && !loading && (
            <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} - {Math.min(endIndex, filteredData.length)} de {filteredData.length} productos
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
};