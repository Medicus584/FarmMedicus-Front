// components/dashboard/AlertasView.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { 
  getLowStockAlerts, 
  getExpirationAlerts, 
  AlertStockBajo, 
  AlertVencimiento 
} from "@/api/AlertsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, Calendar, Clock, Building2, MapPin, ChevronRight } from "lucide-react";
import { ImageCarousel } from "./ProductosView";
import { getImageUrl } from "./VenderView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AlertasView() {
  const [stockBajo, setStockBajo] = useState<AlertStockBajo[]>([]);
  const [vencimiento, setVencimiento] = useState<AlertVencimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("stock-bajo");
  const [esMovil, setEsMovil] = useState(false);

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const detectarMovil = () => {
      setEsMovil(window.innerWidth < 768);
    };
    
    detectarMovil();
    window.addEventListener('resize', detectarMovil);
    return () => window.removeEventListener('resize', detectarMovil);
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [stockAlerts, expAlerts] = await Promise.all([
          getLowStockAlerts(),
          getExpirationAlerts()
        ]);
        
        setStockBajo(stockAlerts);
        setVencimiento(expAlerts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar las alertas");
        console.error("Error loading alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return "critical";
    if (stock < min) return "low";
    return "ok";
  };

  // Nueva función para calcular meses restantes
  const getMonthsRemaining = (fechaVencimiento: string): number => {
    const hoy = new Date();
    const fechaVenc = new Date(fechaVencimiento);
    const diffTime = fechaVenc.getTime() - hoy.getTime();
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Promedio de días por mes
    return Math.round(diffMonths);
  };

  // Nueva función para determinar el color basado en meses
  const getMonthsColor = (meses: number) => {
    if (meses <= 6) return "bg-red-600"; // Rojo: 6 meses o menos
    if (meses <= 9) return "bg-yellow-500"; // Amarillo: entre 6 y 9 meses
    return "bg-green-500"; // Verde: más de 9 meses
  };

  const getMonthsText = (meses: number) => {
    if (meses <= 0) return "¡VENCIDO!";
    if (meses === 1) return "1 mes";
    return `${meses} meses`;
  };

  // Renderizar tarjeta para stock bajo (móvil)
  const renderStockBajoCard = (alert: AlertStockBajo) => {
    const status = getStockStatus(alert.cantidad, alert.stockMinimo);
    
    return (
      <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 flex-shrink-0">
            <ImageCarousel
              images={[getImageUrl(alert.imagen)]}
              productName={alert.producto}
              className="w-16 h-16 rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-primary text-sm truncate">{alert.producto}</h3>
              <Badge 
                variant={status === "critical" ? "destructive" : "destructive"}
                className="text-xs px-2 py-0.5 flex-shrink-0"
              >
                {status === "critical" ? "¡Crítico!" : "Bajo"}
              </Badge>
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
            
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Stock:</span>
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  {alert.cantidad}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Mínimo:</span>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {alert.stockMinimo}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar tarjeta para vencimiento (móvil)
  const renderVencimientoCard = (alert: AlertVencimiento) => {
    const mesesRestantes = getMonthsRemaining(alert.fechaVencimiento);
    const monthsColor = getMonthsColor(mesesRestantes);
    const isCritical = mesesRestantes <= 6;
    const isWarning = mesesRestantes <= 9 && mesesRestantes > 6;
    const isGood = mesesRestantes > 9;
    
    let badgeVariant: "default" | "destructive" | "outline" = "outline";
    let badgeClassName = "";
    
    if (isCritical) {
      badgeVariant = "destructive";
      badgeClassName = "bg-red-600 hover:bg-red-700 text-white border-red-600";
    } else if (isWarning) {
      badgeVariant = "default";
      badgeClassName = "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500";
    } else if (isGood) {
      badgeVariant = "default";
      badgeClassName = "bg-green-500 hover:bg-green-600 text-white border-green-500";
    }
    
    return (
      <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 flex-shrink-0">
            <ImageCarousel
              images={[getImageUrl(alert.imagen)]}
              productName={alert.producto}
              className="w-16 h-16 rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-primary text-sm truncate">{alert.producto}</h3>
              <div className={`${monthsColor} text-white font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0`}>
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
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {alert.stock} u.
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Vence:</span>
                <Badge 
                  variant={badgeVariant}
                  className={`text-xs px-2 py-0.5 ${badgeClassName}`}
                >
                  {new Date(alert.fechaVencimiento).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Alertas</h1>
        </div>
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

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Alertas</h1>
        </div>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center text-destructive text-sm sm:text-base">
              <p>Error: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStockBajo = stockBajo.length;
  const totalVencimiento = vencimiento.length;
  const totalAlertas = totalStockBajo + totalVencimiento;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Alertas</h1>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Badge variant="destructive" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            Stock Bajo: {totalStockBajo}
          </Badge>
          <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            Por Vencer: {totalVencimiento}
          </Badge>
          <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
            Total: {totalAlertas}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock-bajo" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Stock Bajo</span>
            <span className="xs:hidden">Stock</span>
            {totalStockBajo > 0 && (
              <Badge variant="destructive" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
                {totalStockBajo}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vencimiento" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Por Vencer</span>
            <span className="xs:hidden">Vencer</span>
            {totalVencimiento > 0 && (
              <Badge className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 bg-yellow-500 text-white border-yellow-500">
                {totalVencimiento}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Stock Bajo */}
        <TabsContent value="stock-bajo" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                <span>Productos con Stock Bajo</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  ({stockBajo.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockBajo.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/50" />
                  <p className="text-sm sm:text-lg font-medium">No hay productos con stock bajo</p>
                  <p className="text-xs sm:text-sm">Todos los productos tienen stock suficiente.</p>
                </div>
              ) : (
                <>
                  {/* Vista móvil: Tarjetas */}
                  {esMovil ? (
                    <div className="space-y-2">
                      {stockBajo.map(renderStockBajoCard)}
                    </div>
                  ) : (
                    /* Vista desktop: Tabla */
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
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockBajo.map((alert) => {
                            const status = getStockStatus(alert.cantidad, alert.stockMinimo);
                            return (
                              <TableRow key={alert.id}>
                                <TableCell>
                                  <div className="w-16 h-16">
                                    <ImageCarousel
                                      images={[getImageUrl(alert.imagen)]}
                                      productName={alert.producto}
                                      className="w-16 h-16"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-bold text-primary text-sm">{alert.producto}</div>
                                  {alert.descripcion && (
                                    <div className="text-xs text-muted-foreground">{alert.descripcion}</div>
                                  )}
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
                                  <Badge 
                                    variant="destructive"
                                    className="text-sm px-3 py-1 font-bold"
                                  >
                                    {alert.cantidad}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-sm px-3 py-1">
                                    {alert.stockMinimo}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={status === "critical" ? "destructive" : "destructive"}
                                    className="text-xs px-2 py-1"
                                  >
                                    {status === "critical" ? "¡Crítico!" : "Bajo"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vencimiento */}
        <TabsContent value="vencimiento" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                <span>Productos por Vencer</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  ({vencimiento.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vencimiento.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/50" />
                  <p className="text-sm sm:text-lg font-medium">No hay productos por vencer</p>
                  <p className="text-xs sm:text-sm">Todos los productos tienen fecha de vencimiento vigente.</p>
                </div>
              ) : (
                <>
                  {/* Vista móvil: Tarjetas */}
                  {esMovil ? (
                    <div className="space-y-2">
                      {vencimiento.map(renderVencimientoCard)}
                    </div>
                  ) : (
                    /* Vista desktop: Tabla */
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Imagen</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Ubicación</TableHead>
                            <TableHead>Laboratorio</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-center">Meses Restantes</TableHead>
                            <TableHead className="text-center">Fecha Vencimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vencimiento.map((alert) => {
                            const mesesRestantes = getMonthsRemaining(alert.fechaVencimiento);
                            const monthsColor = getMonthsColor(mesesRestantes);
                            const isCritical = mesesRestantes <= 6;
                            const isWarning = mesesRestantes <= 9 && mesesRestantes > 6;
                            const isGood = mesesRestantes > 9;
                            
                            let badgeVariant: "default" | "destructive" | "outline" = "outline";
                            let badgeClassName = "";
                            
                            if (isCritical) {
                              badgeVariant = "destructive";
                              badgeClassName = "bg-red-600 hover:bg-red-700 text-white border-red-600";
                            } else if (isWarning) {
                              badgeVariant = "default";
                              badgeClassName = "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500";
                            } else if (isGood) {
                              badgeVariant = "default";
                              badgeClassName = "bg-green-500 hover:bg-green-600 text-white border-green-500";
                            }
                            
                            return (
                              <TableRow key={alert.id}>
                                <TableCell>
                                  <div className="w-16 h-16">
                                    <ImageCarousel
                                      images={[getImageUrl(alert.imagen)]}
                                      productName={alert.producto}
                                      className="w-16 h-16"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-bold text-primary text-sm">{alert.producto}</div>
                                  {alert.descripcion && (
                                    <div className="text-xs text-muted-foreground">{alert.descripcion}</div>
                                  )}
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
                                  <Badge variant="outline" className="text-sm px-3 py-1">
                                    {alert.stock} u.
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className={`${monthsColor} text-white font-bold text-sm px-3 py-1 rounded-full inline-flex items-center gap-1 min-w-[80px] justify-center`}>
                                    <Clock className="h-3.5 w-3.5" />
                                    {getMonthsText(mesesRestantes)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={badgeVariant}
                                    className={`text-sm px-3 py-1 ${badgeClassName}`}
                                  >
                                    {new Date(alert.fechaVencimiento).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}