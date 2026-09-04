// src/components/dashboard/CajaView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CalendarRange as CalendarRangeIcon, Loader2, Check, X, Download, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  TransaccionCaja, 
  getTransaccionesCaja,
  getTransaccionesCajaByFecha,
  getTransaccionesCajaByRango,
  getTransaccionesCajaByUsuario,
  getTransaccionesCajaByUsuarioFecha,
  getTransaccionesCajaByUsuarioRango,
  getUsuariosCaja,
  getCurrentUser,
  getSaldoActual
} from "@/api/CajaApi";
import { CajaPDF } from "./CajaPDF";
import { pdf } from "@react-pdf/renderer";

// Función para obtener la fecha actual en Bolivia (GMT-4)
const getFechaBolivia = () => {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const localOffset = now.getTimezoneOffset();
  const diff = boliviaOffset - localOffset;
  const fechaBolivia = new Date(now.getTime() + diff * 60000);
  fechaBolivia.setHours(0, 0, 0, 0);
  return fechaBolivia;
};

// Función auxiliar para descargar archivo sin file-saver
const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function CajaView() {
  const [fechaBoliviaHoy] = useState(() => getFechaBolivia());
  
  const [fechaBusqueda, setFechaBusqueda] = useState<Date | undefined>(fechaBoliviaHoy);
  const [fechaRangoTemp, setFechaRangoTemp] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [fechaRangoAplicado, setFechaRangoAplicado] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarRango, setMostrarRango] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [movimientosCaja, setMovimientosCaja] = useState<TransaccionCaja[]>([]);
  const [empleados, setEmpleados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [estadoCaja, setEstadoCaja] = useState<string>("cerrada");
  const [error, setError] = useState<string>("");
  const [datosCargados, setDatosCargados] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Efecto para buscar datos cuando cambian los filtros
  useEffect(() => {
    if (datosCargados) {
      buscarDatos();
    }
  }, [fechaBusqueda, fechaRangoAplicado, filtroEmpleado, datosCargados]);

  const cargarDatosIniciales = async () => {
    try {
      setInitialLoading(true);
      setDatosCargados(false);
      
      const userInfo = await getCurrentUser();
      setUserRole(userInfo.rol);
      setCurrentUserId(userInfo.idusuario);
      setCurrentUserName(`${userInfo.nombres} ${userInfo.apellidos}`);
      
      const saldoData = await getSaldoActual();
      setSaldoActual(parseFloat(saldoData.monto_final));
      setEstadoCaja(saldoData.estado);
      
      if (userInfo.rol === "Admin") {
        const usuariosList = await getUsuariosCaja();
        setEmpleados(usuariosList);
      } else {
        setEmpleados([`${userInfo.nombres} ${userInfo.apellidos}`]);
        setFiltroEmpleado(`${userInfo.nombres} ${userInfo.apellidos}`);
      }
      
      setDatosCargados(true);
      
    } catch (error) {
      console.error("Error cargando datos de caja:", error);
      setError("Error al cargar datos iniciales");
      setInitialLoading(false);
    }
  };

  const buscarDatos = async () => {
    try {
      setLoading(true);
      setError("");
      
      let datosFiltrados: TransaccionCaja[] = [];
      
      const fechaStr = fechaBusqueda ? format(fechaBusqueda, "yyyy-MM-dd") : "";
      
      if (userRole === "Admin") {
        if (fechaBusqueda) {
          datosFiltrados = await getTransaccionesCajaByFecha(fechaStr);
        } else if (fechaRangoAplicado.from && fechaRangoAplicado.to) {
          const fechaInicioStr = format(fechaRangoAplicado.from, "yyyy-MM-dd");
          const fechaFinStr = format(fechaRangoAplicado.to, "yyyy-MM-dd");
          datosFiltrados = await getTransaccionesCajaByRango(fechaInicioStr, fechaFinStr);
        } else {
          datosFiltrados = await getTransaccionesCaja();
        }
      } else {
        if (fechaBusqueda) {
          datosFiltrados = await getTransaccionesCajaByUsuarioFecha(currentUserId, fechaStr);
        } else if (fechaRangoAplicado.from && fechaRangoAplicado.to) {
          const fechaInicioStr = format(fechaRangoAplicado.from, "yyyy-MM-dd");
          const fechaFinStr = format(fechaRangoAplicado.to, "yyyy-MM-dd");
          datosFiltrados = await getTransaccionesCajaByUsuarioRango(currentUserId, fechaInicioStr, fechaFinStr);
        } else {
          datosFiltrados = await getTransaccionesCajaByUsuario(currentUserId);
        }
      }
      
      if (userRole === "Admin" && filtroEmpleado !== "Todos") {
        datosFiltrados = datosFiltrados.filter(mov => mov.empleado === filtroEmpleado);
      }
      
      setMovimientosCaja(datosFiltrados);
      
    } catch (error) {
      console.error("Error buscando datos:", error);
      setError("Error al cargar los movimientos de caja");
      setMovimientosCaja([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // ✅ FUNCIONES CORREGIDAS - Ajuste de zona horaria Bolivia (GMT-4)
  const formatDateForDisplay = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      // Ajustar a Bolivia (GMT-4) sumando 4 horas
      const boliviaDate = new Date(date.getTime() + 4 * 60 * 60 * 1000);
      const day = boliviaDate.getDate();
      const month = boliviaDate.getMonth() + 1;
      const year = boliviaDate.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return typeof dateInput === 'string' ? dateInput.substring(0, 10) : "Fecha inválida";
    }
  };

  const formatTimeForDisplay = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      // Ajustar a Bolivia (GMT-4) sumando 4 horas
      const boliviaDate = new Date(date.getTime() + 4 * 60 * 60 * 1000);
      const hours = boliviaDate.getHours();
      const minutes = boliviaDate.getMinutes();
      const formattedHours = hours < 10 ? `0${hours}` : hours.toString();
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
      return `${formattedHours}:${formattedMinutes}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  const totalIngresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "ingreso" || mov.tipo_movimiento === "apertura")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const totalEgresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "egreso")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const saldoFiltrado = totalIngresos - totalEgresos;

  const contarFiltrosActivos = () => {
    let count = 0;
    if (filtroEmpleado !== "Todos") count++;
    if (fechaBusqueda && format(fechaBusqueda, "yyyy-MM-dd") !== format(fechaBoliviaHoy, "yyyy-MM-dd")) count++;
    if (fechaRangoAplicado.from || fechaRangoAplicado.to) count++;
    return count;
  };

  const handleDescargarPDF = async () => {
    try {
      setGenerandoPDF(true);
      setError("");
      
      let nombreArchivo = "reporte_caja";
      
      if (fechaBusqueda) {
        const fechaStr = format(fechaBusqueda, "dd-MM-yyyy");
        nombreArchivo = `reporte_caja_${fechaStr}`;
      } else if (fechaRangoAplicado.from && fechaRangoAplicado.to) {
        const fromStr = format(fechaRangoAplicado.from, "dd-MM-yyyy");
        const toStr = format(fechaRangoAplicado.to, "dd-MM-yyyy");
        nombreArchivo = `reporte_caja_${fromStr}_a_${toStr}`;
      }
      
      if (filtroEmpleado !== "Todos") {
        nombreArchivo += `_${filtroEmpleado.replace(/\s+/g, '_')}`;
      }
      
      nombreArchivo += ".pdf";
      
      const pdfDocument = (
        <CajaPDF
          movimientos={movimientosCaja}
          filtros={{
            fechaBusqueda,
            fechaRango: fechaRangoAplicado,
            filtroEmpleado,
            userRole,
            currentUserName,
          }}
          totales={{
            ingresos: totalIngresos,
            egresos: totalEgresos,
            saldoFiltrado,
            saldoActual,
            estadoCaja,
          }}
        />
      );
      
      const pdfBlob = await pdf(pdfDocument).toBlob();
      downloadPDF(pdfBlob, nombreArchivo);
      
    } catch (error) {
      console.error("Error generando PDF:", error);
      setError("Error al generar el PDF. Por favor, intente nuevamente.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const limpiarFiltros = async () => {
    const hoyBolivia = getFechaBolivia();
    setFechaBusqueda(hoyBolivia);
    setFechaRangoTemp({ from: undefined, to: undefined });
    setFechaRangoAplicado({ from: undefined, to: undefined });
    
    if (userRole === "Admin") {
      setFiltroEmpleado("Todos");
    } else {
      setFiltroEmpleado(currentUserName);
    }
  };

  const handleFechaBusquedaChange = async (date: Date | undefined) => {
    if (date) {
      setFechaBusqueda(date);
      setFechaRangoAplicado({ from: undefined, to: undefined });
      setFechaRangoTemp({ from: undefined, to: undefined });
      setMostrarCalendario(false);
    }
  };

  const handleRangoTempChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFechaRangoTemp(range);
  };

  const aplicarRangoFechas = async () => {
    if (fechaRangoTemp.from && fechaRangoTemp.to) {
      setFechaRangoAplicado({
        from: fechaRangoTemp.from,
        to: fechaRangoTemp.to
      });
      setFechaBusqueda(undefined);
      setMostrarRango(false);
    }
  };

  const cancelarRangoFechas = () => {
    setFechaRangoTemp({
      from: fechaRangoAplicado.from,
      to: fechaRangoAplicado.to
    });
    setMostrarRango(false);
  };

  const handleEmpleadoChange = (value: string) => {
    setFiltroEmpleado(value);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos de caja...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con título y botones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Gestión de Caja</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {userRole === "Admin" && (
            <>
              <Button
                variant={mostrarFiltros ? "default" : "outline"}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-1.5 h-8 text-sm"
                size="sm"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filtros</span>
                {contarFiltrosActivos() > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                    {contarFiltrosActivos()}
                  </Badge>
                )}
              </Button>
              {contarFiltrosActivos() > 0 && (
                <Button
                  variant="ghost"
                  onClick={limpiarFiltros}
                  className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </>
          )}
          <Button
            onClick={handleDescargarPDF}
            disabled={movimientosCaja.length === 0 || generandoPDF}
            className="flex items-center gap-2 h-8 text-sm"
            size="sm"
          >
            {generandoPDF ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Exportar PDF</span>
                <span className="xs:hidden">PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Panel de filtros colapsable */}
      {userRole === "Admin" && mostrarFiltros && (
        <Card className="border-2">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Empleado */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Empleado</Label>
                <Select value={filtroEmpleado} onValueChange={handleEmpleadoChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {empleados.map(empleado => (
                      <SelectItem key={empleado} value={empleado} className="text-sm">
                        {empleado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha específica */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Fecha</Label>
                <Popover open={mostrarCalendario} onOpenChange={setMostrarCalendario}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {fechaBusqueda ? format(fechaBusqueda, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaBusqueda}
                      onSelect={handleFechaBusquedaChange}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Rango de fechas */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Rango</Label>
                <Popover open={mostrarRango} onOpenChange={setMostrarRango}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                      <CalendarRangeIcon className="mr-2 h-4 w-4" />
                      <span className="truncate text-sm">
                        {fechaRangoAplicado.from && fechaRangoAplicado.to ? 
                          `${format(fechaRangoAplicado.from, "dd/MM/yy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yy", { locale: es })}` : 
                          "Seleccionar rango"
                        }
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col">
                      <Calendar
                        mode="range"
                        selected={fechaRangoTemp}
                        onSelect={handleRangoTempChange}
                        numberOfMonths={1}
                        className="p-3 pointer-events-auto"
                        disabled={(date) => date > new Date()}
                      />
                      <div className="flex justify-end gap-2 p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelarRangoFechas}
                          disabled={!fechaRangoTemp.from && !fechaRangoTemp.to}
                          className="h-8 text-sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={aplicarRangoFechas}
                          disabled={!fechaRangoTemp.from || !fechaRangoTemp.to}
                          className="h-8 text-sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Botón limpiar */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={limpiarFiltros}
                  className="w-full h-9 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar todo
                </Button>
              </div>
            </div>

            {/* Filtros activos */}
            {contarFiltrosActivos() > 0 && (
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Filtros activos:</span>
                {filtroEmpleado !== "Todos" && (
                  <Badge variant="secondary" className="text-xs">
                    {filtroEmpleado}
                  </Badge>
                )}
                {fechaBusqueda && (
                  <Badge variant="secondary" className="text-xs">
                    📅 {format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}
                  </Badge>
                )}
                {fechaRangoAplicado.from && fechaRangoAplicado.to && (
                  <Badge variant="secondary" className="text-xs">
                    📅 {format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - {format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información para no-Admin */}
      {userRole !== "Admin" && (
        <div className="bg-muted/30 px-4 py-2 rounded-lg border text-center text-sm">
          <p className="font-medium">Mostrando tus movimientos de caja</p>
          <p className="text-xs text-muted-foreground">Usuario: {currentUserName}</p>
        </div>
      )}

      {/* Cards de totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-xl font-bold text-red-600">Bs {totalEgresos.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-xl font-bold text-green-600">Bs {totalIngresos.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Actual</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-xs text-muted-foreground mb-1">
              Estado: <span className={`font-medium ${estadoCaja === 'abierta' ? 'text-green-600' : 'text-red-600'}`}>
                {estadoCaja === 'abierta' ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>
            <div className={`text-xl font-bold ${saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Bs {saldoActual.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Saldo filtrado: <span className={`font-medium ${saldoFiltrado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Bs {saldoFiltrado.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de movimientos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex flex-wrap items-center gap-1 sm:gap-2">
            {userRole === "Admin" ? "Movimientos de Caja" : "Mis Movimientos"}
            <span className="text-xs font-normal text-muted-foreground">
              ({movimientosCaja.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Cargando movimientos...</span>
            </div>
          ) : movimientosCaja.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">No se encontraron movimientos de caja</p>
            </div>
          ) : (
            <div className="block md:overflow-x-auto">
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    {userRole === "Admin" && <TableHead className="text-xs">Empleado</TableHead>}
                    <TableHead className="text-xs text-right">Monto (Bs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosCaja.map((movimiento) => (
                    <TableRow key={movimiento.idtransaccion} className="md:table-row block border-b p-3 md:p-0">
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-1.5 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-0.5">FECHA</div>
                        <div className="font-medium text-sm">
                          {formatDateForDisplay(movimiento.fecha)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeForDisplay(movimiento.fecha)}
                        </div>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-1.5 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-0.5">TIPO</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-block ${
                          movimiento.tipo_movimiento === "ingreso" || movimiento.tipo_movimiento === "apertura"
                            ? "bg-green-100 text-green-800" 
                            : movimiento.tipo_movimiento === "cierre"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {movimiento.tipo_movimiento}
                        </span>
                      </TableCell>
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-1.5 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-0.5">DESCRIPCIÓN</div>
                        <div className="text-sm">{movimiento.descripcion}</div>
                      </TableCell>
                      {userRole === "Admin" && (
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-1.5 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-0.5">EMPLEADO</div>
                          <div className="text-sm">{movimiento.empleado}</div>
                        </TableCell>
                      )}
                      <TableCell className={`md:table-cell block md:border-0 border-0 p-0 font-medium ${
                        movimiento.tipo_movimiento === "ingreso" || movimiento.tipo_movimiento === "apertura" ? "text-green-600" : 
                        movimiento.tipo_movimiento === "cierre" ? "text-blue-600" : "text-red-600"
                      }`}>
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-0.5">MONTO</div>
                        <div className="text-base font-bold text-right md:text-left">
                          {movimiento.tipo_movimiento === "egreso" ? "-" : ""}Bs {movimiento.monto.toFixed(2)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}