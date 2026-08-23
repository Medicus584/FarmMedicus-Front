// components/dashboard/AlertasView.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback } from "react";
import { 
  getLowStockAlerts, 
  getExpirationAlerts, 
  AlertStockBajo, 
  AlertVencimiento 
} from "@/api/AlertsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Building2, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  X,
  Loader2
} from "lucide-react";
import { ImageCarousel } from "./ProductosView";
import { getImageUrl } from "./VenderView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function getMonthsRemaining(fechaVencimiento: string): number {
  const hoy = new Date();
  const parts = fechaVencimiento.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    const fechaVenc = new Date(year, month - 1, day);
    const diffTime = fechaVenc.getTime() - hoy.getTime();
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
    return Math.round(diffMonths);
  }
  const fechaVenc = new Date(fechaVencimiento + 'T00:00:00');
  const diffTime = fechaVenc.getTime() - hoy.getTime();
  const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
  return Math.round(diffMonths);
}

type Prioridad = 'todas' | 'rojo' | 'amarillo' | 'verde';

function Paginacion({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage, 
  loading 
}: { 
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  loading: boolean;
}) {
  if (totalPages <= 1 && !loading) return null;

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
      <div className="text-sm text-muted-foreground">
        {loading ? (
          <span>Cargando...</span>
        ) : (
          <>Mostrando {startIndex} - {endIndex} de {totalItems} productos</>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
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
                onClick={() => onPageChange(pageNumber)}
                disabled={loading}
                className="w-8 h-8"
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AlertasView() {
  const [stockBajo, setStockBajo] = useState<AlertStockBajo[]>([]);
  const [vencimiento, setVencimiento] = useState<AlertVencimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("stock-bajo");
  const [esMovil, setEsMovil] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalStockItems, setTotalStockItems] = useState(0);
  const [totalExpirationItems, setTotalExpirationItems] = useState(0);
  const [totalPagesStock, setTotalPagesStock] = useState(0);
  const [totalPagesExpiration, setTotalPagesExpiration] = useState(0);
  const ITEMS_PER_PAGE = 15;

  const [searchTerm, setSearchTerm] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("todas");

  useEffect(() => {
    const detectarMovil = () => {
      setEsMovil(window.innerWidth < 768);
    };
    detectarMovil();
    window.addEventListener('resize', detectarMovil);
    return () => window.removeEventListener('resize', detectarMovil);
  }, []);

  const loadStockAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { page: currentPage, limit: ITEMS_PER_PAGE };
      if (searchTerm) filters.search = searchTerm;
      if (prioridad !== 'todas') filters.prioridad = prioridad;
      
      const response = await getLowStockAlerts(filters);
      setStockBajo(response.items as AlertStockBajo[]);
      setTotalStockItems(response.total);
      setTotalPagesStock(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las alertas de stock bajo");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, prioridad]);

  const loadExpirationAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { page: currentPage, limit: ITEMS_PER_PAGE };
      if (searchTerm) filters.search = searchTerm;
      if (prioridad !== 'todas') filters.prioridad = prioridad;
      
      const response = await getExpirationAlerts(filters);
      setVencimiento(response.items as AlertVencimiento[]);
      setTotalExpirationItems(response.total);
      setTotalPagesExpiration(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las alertas de vencimiento");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, prioridad]);

  useEffect(() => {
    if (activeTab === "stock-bajo") {
      loadStockAlerts();
    } else {
      loadExpirationAlerts();
    }
  }, [activeTab, loadStockAlerts, loadExpirationAlerts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, prioridad]);

  useEffect(() => {
    if (activeTab === "stock-bajo") {
      loadStockAlerts();
    } else {
      loadExpirationAlerts();
    }
  }, [currentPage]);

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return "critical";
    if (stock < min) return "low";
    return "ok";
  };

  const getMonthsColor = (meses: number) => {
    if (meses <= 6) return "rojo";
    if (meses <= 9) return "amarillo";
    return "verde";
  };

  const getMonthsText = (meses: number) => {
    if (meses <= 0) return "¡VENCIDO!";
    if (meses === 1) return "1 mes";
    return `${meses} meses`;
  };

  const getStockPrioridad = (alert: AlertStockBajo): Prioridad => {
    const status = getStockStatus(alert.cantidad, alert.stockMinimo);
    if (status === "critical") return "rojo";
    if (status === "low") return "amarillo";
    return "verde";
  };

  const getVencimientoPrioridad = (alert: AlertVencimiento): Prioridad => {
    const meses = getMonthsRemaining(alert.fechaVencimiento);
    return getMonthsColor(meses) as Prioridad;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setPrioridad("todas");
    setCurrentPage(1);
  };

  const hasFilters = searchTerm || prioridad !== "todas";

  if (loading && stockBajo.length === 0 && vencimiento.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Alertas</h1>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="space-y-3 sm:space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 sm:space-x-4">
                  <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px] sm:w-[250px]" />
                    <Skeleton className="h-4 w-[150px] sm:w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && stockBajo.length === 0 && vencimiento.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Alertas</h1>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center text-destructive text-sm sm:text-base">
              <p>Error: {error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Alertas</h1>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Badge variant="destructive" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            Stock Bajo: {totalStockItems}
          </Badge>
          <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            Por Vencer: {totalExpirationItems}
          </Badge>
          <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
            Total: {totalStockItems + totalExpirationItems}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={prioridad} onValueChange={(value: Prioridad) => setPrioridad(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="rojo">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  Rojo (Crítico)
                </div>
              </SelectItem>
              <SelectItem value="amarillo">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  Amarillo (Alerta)
                </div>
              </SelectItem>
              <SelectItem value="verde">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Verde (Normal)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="px-3">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Búsqueda: {searchTerm}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm("")} />
            </Badge>
          )}
          {prioridad !== "todas" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${
                prioridad === "rojo" ? "bg-red-600" :
                prioridad === "amarillo" ? "bg-yellow-500" : "bg-green-500"
              }`} />
              Prioridad: {prioridad === "rojo" ? "Crítico" : prioridad === "amarillo" ? "Alerta" : "Normal"}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setPrioridad("todas")} />
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock-bajo" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Stock Bajo</span>
            <span className="xs:hidden">Stock</span>
            {totalStockItems > 0 && (
              <Badge variant="destructive" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
                {totalStockItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vencimiento" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Por Vencer</span>
            <span className="xs:hidden">Vencer</span>
            {totalExpirationItems > 0 && (
              <Badge className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 bg-yellow-500 text-white border-yellow-500">
                {totalExpirationItems}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock-bajo" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                <span>Productos con Stock Bajo</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  ({totalStockItems})
                </span>
                {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalStockItems === 0 && !loading ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/50" />
                  <p className="text-sm sm:text-lg font-medium">
                    {hasFilters ? "No hay productos que coincidan con los filtros" : "No hay productos con stock bajo"}
                  </p>
                </div>
              ) : (
                <>
                  {esMovil ? (
                    <div className="space-y-2">
                      {stockBajo.map((alert) => {
                        const prioridadColor = getStockPrioridad(alert);
                        const borderColor = prioridadColor === "rojo" ? "border-red-400" :
                                          prioridadColor === "amarillo" ? "border-yellow-400" : "border-green-400";
                        const bgColor = prioridadColor === "rojo" ? "bg-red-50" :
                                       prioridadColor === "amarillo" ? "bg-yellow-50" : "bg-green-50";
                        
                        return (
                          <div key={alert.id} className={`bg-white rounded-lg border-2 ${borderColor} p-4 mb-3 shadow-sm ${bgColor}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-16 h-16 flex-shrink-0">
                                <ImageCarousel images={[getImageUrl(alert.imagen)]} productName={alert.producto} className="w-16 h-16 rounded-lg" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-primary text-sm truncate">{alert.producto}</h3>
                                {alert.descripcion && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.descripcion}</p>
                                )}
                                <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{alert.ubicacion}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{alert.laboratorio}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Stock:</span>
                                    <Badge variant="destructive" className="text-xs px-2 py-0.5">{alert.cantidad}</Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Mínimo:</span>
                                    <Badge variant="outline" className="text-xs px-2 py-0.5">{alert.stockMinimo}</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Imagen</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Ubicación</TableHead>
                            <TableHead>Laboratorio</TableHead>
                            <TableHead className="text-center">Stock Actual</TableHead>
                            <TableHead className="text-center">Stock Mínimo</TableHead>
                            <TableHead className="text-center">Prioridad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockBajo.map((alert) => {
                            const prioridadColor = getStockPrioridad(alert);
                            const prioridadBg = prioridadColor === "rojo" ? "bg-red-600" :
                                               prioridadColor === "amarillo" ? "bg-yellow-500" : "bg-green-500";
                            const prioridadText = prioridadColor === "rojo" ? "Crítico" :
                                                 prioridadColor === "amarillo" ? "Alerta" : "Normal";
                            
                            return (
                              <TableRow key={alert.id}>
                                <TableCell>
                                  <div className="w-16 h-16">
                                    <ImageCarousel images={[getImageUrl(alert.imagen)]} productName={alert.producto} className="w-16 h-16" />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-bold text-primary text-sm">{alert.producto}</div>
                                  {alert.descripcion && <div className="text-xs text-muted-foreground">{alert.descripcion}</div>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    {alert.ubicacion}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    {alert.laboratorio}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="destructive" className="text-sm px-3 py-1 font-bold">{alert.cantidad}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-sm px-3 py-1">{alert.stockMinimo}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={`text-white ${prioridadBg}`}>{prioridadText}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  <Paginacion
                    currentPage={currentPage}
                    totalPages={totalPagesStock}
                    onPageChange={handlePageChange}
                    totalItems={totalStockItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    loading={loading}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimiento" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                <span>Productos por Vencer</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  ({totalExpirationItems})
                </span>
                {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalExpirationItems === 0 && !loading ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/50" />
                  <p className="text-sm sm:text-lg font-medium">
                    {hasFilters ? "No hay productos que coincidan con los filtros" : "No hay productos por vencer"}
                  </p>
                </div>
              ) : (
                <>
                  {esMovil ? (
                    <div className="space-y-2">
                      {vencimiento.map((alert) => {
                        const mesesRestantes = getMonthsRemaining(alert.fechaVencimiento);
                        const prioridadColor = getVencimientoPrioridad(alert);
                        const borderColor = prioridadColor === "rojo" ? "border-red-400" :
                                          prioridadColor === "amarillo" ? "border-yellow-400" : "border-green-400";
                        const bgColor = prioridadColor === "rojo" ? "bg-red-50" :
                                       prioridadColor === "amarillo" ? "bg-yellow-50" : "bg-green-50";
                        const badgeColor = prioridadColor === "rojo" ? "bg-red-600" :
                                          prioridadColor === "amarillo" ? "bg-yellow-500" : "bg-green-500";
                        
                        return (
                          <div key={alert.id} className={`bg-white rounded-lg border-2 ${borderColor} p-4 mb-3 shadow-sm ${bgColor}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-16 h-16 flex-shrink-0">
                                <ImageCarousel images={[getImageUrl(alert.imagen)]} productName={alert.producto} className="w-16 h-16 rounded-lg" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-bold text-primary text-sm truncate">{alert.producto}</h3>
                                  <div className={`text-white font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0 ${badgeColor}`}>
                                    <Clock className="h-3 w-3" />
                                    {getMonthsText(mesesRestantes)}
                                  </div>
                                </div>
                                {alert.descripcion && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.descripcion}</p>
                                )}
                                <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{alert.ubicacion}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{alert.laboratorio}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Stock:</span>
                                    <Badge variant="outline" className="text-xs px-2 py-0.5">{alert.stock} u.</Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Vence:</span>
                                    <Badge className={`text-xs px-2 py-0.5 text-white ${badgeColor}`}>
                                      {formatDateToLocal(alert.fechaVencimiento)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Imagen</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Ubicación</TableHead>
                            <TableHead>Laboratorio</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-center">Prioridad</TableHead>
                            <TableHead className="text-center">Meses Restantes</TableHead>
                            <TableHead className="text-center">Fecha Vencimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vencimiento.map((alert) => {
                            const mesesRestantes = getMonthsRemaining(alert.fechaVencimiento);
                            const prioridadColor = getVencimientoPrioridad(alert);
                            const prioridadBg = prioridadColor === "rojo" ? "bg-red-600" :
                                               prioridadColor === "amarillo" ? "bg-yellow-500" : "bg-green-500";
                            const prioridadText = prioridadColor === "rojo" ? "Crítico" :
                                                 prioridadColor === "amarillo" ? "Alerta" : "Normal";
                            
                            return (
                              <TableRow key={alert.id}>
                                <TableCell>
                                  <div className="w-16 h-16">
                                    <ImageCarousel images={[getImageUrl(alert.imagen)]} productName={alert.producto} className="w-16 h-16" />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-bold text-primary text-sm">{alert.producto}</div>
                                  {alert.descripcion && <div className="text-xs text-muted-foreground">{alert.descripcion}</div>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    {alert.ubicacion}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    {alert.laboratorio}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-sm px-3 py-1">{alert.stock} u.</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={`text-white ${prioridadBg}`}>{prioridadText}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className={`text-white font-bold text-sm px-3 py-1 rounded-full inline-flex items-center gap-1 min-w-[80px] justify-center ${prioridadBg}`}>
                                    <Clock className="h-3.5 w-3.5" />
                                    {getMonthsText(mesesRestantes)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={`text-sm px-3 py-1 text-white ${prioridadBg}`}>
                                    {formatDateToLocal(alert.fechaVencimiento)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  <Paginacion
                    currentPage={currentPage}
                    totalPages={totalPagesExpiration}
                    onPageChange={handlePageChange}
                    totalItems={totalExpirationItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    loading={loading}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}