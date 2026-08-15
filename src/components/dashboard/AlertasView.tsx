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
import { Package, AlertTriangle, Calendar, Clock, Building2, MapPin } from "lucide-react";
import { ImageCarousel } from "./ProductosView";
import { getImageUrl } from "./VenderView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AlertasView() {
  const [stockBajo, setStockBajo] = useState<AlertStockBajo[]>([]);
  const [vencimiento, setVencimiento] = useState<AlertVencimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("stock-bajo");

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Alertas</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Alertas</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Alertas</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Stock Bajo: {totalStockBajo}
          </Badge>
          <Badge className="text-sm px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Por Vencer: {totalVencimiento}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Total: {totalAlertas}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock-bajo" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Stock Bajo
            {totalStockBajo > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {totalStockBajo}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vencimiento" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Por Vencer
            {totalVencimiento > 0 && (
              <Badge className="ml-1 text-xs bg-yellow-500 text-white border-yellow-500">
                {totalVencimiento}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Stock Bajo */}
        <TabsContent value="stock-bajo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Productos con Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockBajo.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No hay productos con stock bajo</p>
                  <p className="text-sm">Todos los productos tienen stock suficiente.</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vencimiento */}
        <TabsContent value="vencimiento" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                Productos por Vencer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vencimiento.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No hay productos por vencer</p>
                  <p className="text-sm">Todos los productos tienen fecha de vencimiento vigente.</p>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}