// src/components/dashboard/VentasView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Download, Calendar as CalendarRangeIcon, Printer, Loader2, Check, X, Eye, ChevronLeft, ChevronRight, Filter, SlidersHorizontal, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  getVentas, 
  getTotalesVentas, 
  getUsuariosVentas, 
  getVentasHoyAsistente, 
  getMedicos, 
  Venta, 
  VentasFiltros, 
  TotalesVentas, 
  BackendUsuario, 
  anularVenta,
  getTotalesInversionGanancia,
  TotalesInversionGanancia
} from "@/api/VentasApi";
import { getUserRole, getCurrentUser } from "@/api/AuthApi";
import { PrintSalesHistory } from "./VentasPDF";
import { VentasTablaPDF } from "./VentasTablaPDF";
import { pdf } from "@react-pdf/renderer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UsuarioOption {
  value: string;
  label: string;
  username: string;
}

// ============================================
// FUNCIONES DE FORMATEO - USAR STRING DIRECTAMENTE
// Para evitar la conversión automática de zona horaria
// ============================================

// Función para obtener la fecha actual (sin conversión)
const getFechaActual = () => {
  const now = new Date();
  // Usar UTC para evitar problemas
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

// Función para formatear fecha para mostrar (usando string directamente)
const formatDateForDisplay = (dateInput: string | Date) => {
  try {
    // Si es string, usarlo directamente sin crear Date
    if (typeof dateInput === 'string') {
      // Extraer fecha del string ISO: "2026-09-04T09:46:06.474Z" -> "2026-09-04"
      const dateMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${day}/${month}/${year}`;
      }
      // Si no coincide con ISO, intentar con Date pero sin conversión
      const date = new Date(dateInput);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // Si es Date, usar UTC para evitar conversión
    const date = dateInput;
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Fecha inválida";
  }
};

// Función para formatear hora para mostrar (usando string directamente)
const formatTimeForDisplay = (dateInput: string | Date) => {
  try {
    // Si es string, extraer la hora directamente
    if (typeof dateInput === 'string') {
      // Buscar hora en formato ISO: "2026-09-04T09:46:06.474Z" -> "09:46"
      const timeMatch = dateInput.match(/T(\d{2}):(\d{2})/);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        return `${hours}:${minutes}`;
      }
      // Si no tiene formato ISO, intentar con Date pero usando UTC
      const date = new Date(dateInput);
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Si es Date, usar UTC para evitar conversión
    const date = dateInput;
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

// Función auxiliar para descargar archivo
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

export function VentasView() {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const userRole = getUserRole() || "admin";
  const username = currentUser?.usuario || "";
  const isAssistant = userRole === "Asistente";
  const isAdmin = userRole === "Admin";

  const [fechaActual] = useState(() => getFechaActual());

  const [empleadosOptions, setEmpleadosOptions] = useState<UsuarioOption[]>([{ value: "Todos", label: "Todos", username: "" }]);
  const [medicosOptions, setMedicosOptions] = useState<string[]>(["Todos"]);
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([]);
  const [totales, setTotales] = useState<TotalesVentas>({ totalGeneral: 0, totalEfectivo: 0, totalQR: 0 });
  const [totalesInversionGanancia, setTotalesInversionGanancia] = useState<TotalesInversionGanancia>({
    total_invertido: 0,
    total_ganado: 0
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados para filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [filtroMetodo, setFiltroMetodo] = useState("Todos");
  const [filtroMedico, setFiltroMedico] = useState("Todos");

  // Estados para fecha específica
  const [fechaBusqueda, setFechaBusqueda] = useState<Date | undefined>(fechaActual);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  // Estados para rango de fechas
  const [fechaRangoTemp, setFechaRangoTemp] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [fechaRangoAplicado, setFechaRangoAplicado] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [mostrarRango, setMostrarRango] = useState(false);

  // Estados para detalle de venta
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Estados para anulación de venta
  const [ventaToAnular, setVentaToAnular] = useState<Venta | null>(null);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [anulando, setAnulando] = useState(false);

  // Estado para paginación móvil
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);
  const [esMovil, setEsMovil] = useState(false);

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const detectarMovil = () => {
      setEsMovil(window.innerWidth < 768);
      if (window.innerWidth < 640) {
        setItemsPorPagina(5);
      } else if (window.innerWidth < 768) {
        setItemsPorPagina(8);
      } else {
        setItemsPorPagina(10);
      }
    };

    detectarMovil();
    window.addEventListener('resize', detectarMovil);
    return () => window.removeEventListener('resize', detectarMovil);
  }, []);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEmpleado, filtroMetodo, filtroMedico, fechaBusqueda, fechaRangoAplicado]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Efecto para buscar datos cuando cambian los filtros
  useEffect(() => {
    if (datosCargados) {
      buscarDatos();
    }
  }, [filtroEmpleado, filtroMetodo, filtroMedico, fechaBusqueda, fechaRangoAplicado, datosCargados]);

  const cargarDatosIniciales = async () => {
    try {
      setInitialLoading(true);
      setDatosCargados(false);
      setError(null);

      const medicos = await getMedicos();
      setMedicosOptions(["Todos", ...medicos]);

      // Para asistentes, solo mostrar su propio usuario
      if (isAssistant) {
        setEmpleadosOptions([{
          value: currentUser.usuario,
          label: `${currentUser.nombres} ${currentUser.apellidos}`,
          username: currentUser.usuario
        }]);
        setFiltroEmpleado(currentUser.usuario);
      } else {
        const usuariosBackend: BackendUsuario[] = await getUsuariosVentas();
        const opcionesUsuarios: UsuarioOption[] = usuariosBackend.map(user => ({
          value: user.usuario,
          label: `${user.nombres} ${user.apellidos}`,
          username: user.usuario
        }));
        setEmpleadosOptions([{ value: "Todos", label: "Todos", username: "" }, ...opcionesUsuarios]);
      }

      setDatosCargados(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos");
      console.error("Error cargando datos:", err);
      setInitialLoading(false);
    }
  };

  const buscarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      let ventas: Venta[] = [];
      let totalesData: TotalesVentas = { totalGeneral: 0, totalEfectivo: 0, totalQR: 0 };
      let totalesInversionGananciaData: TotalesInversionGanancia = { total_invertido: 0, total_ganado: 0 };

      // Construir filtros comunes
      const filtros: VentasFiltros = {
        metodo: filtroMetodo !== "Todos" ? filtroMetodo : undefined,
        medico: filtroMedico !== "Todos" ? filtroMedico : undefined,
        fechaEspecifica: fechaBusqueda,
        fechaInicio: fechaRangoAplicado.from,
        fechaFin: fechaRangoAplicado.to
      };

      if (isAssistant) {
        // Asistente: siempre filtra por su propio usuario
        filtros.empleado = currentUser.usuario;
        ventas = await getVentas(filtros);
      } else {
        // Admin: puede filtrar por cualquier usuario
        filtros.empleado = filtroEmpleado !== "Todos" ? filtroEmpleado : undefined;
        ventas = await getVentas(filtros);
      }

      // Calcular totales de ventas
      const totalGeneral = ventas.reduce((sum, venta) => sum + venta.total, 0);
      const totalEfectivo = ventas.filter(v => v.metodo === "Efectivo").reduce((sum, venta) => sum + venta.total, 0);
      const totalQR = ventas.filter(v => v.metodo === "QR").reduce((sum, venta) => sum + venta.total, 0);
      totalesData = { totalGeneral, totalEfectivo, totalQR };

      // Obtener totales de inversión y ganancia (solo para Admin)
      if (isAdmin) {
        totalesInversionGananciaData = await getTotalesInversionGanancia(filtros);
      }

      setVentasFiltradas(ventas);
      setTotales(totalesData);
      setTotalesInversionGanancia(totalesInversionGananciaData);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las ventas");
      console.error("Error cargando ventas:", err);
      setVentasFiltradas([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleExportarPDF = async () => {
    try {
      setGenerandoPDF(true);

      let nombreArchivo = "reporte_ventas";

      if (fechaBusqueda) {
        const fechaStr = format(fechaBusqueda, "dd-MM-yyyy");
        nombreArchivo = `reporte_ventas_${fechaStr}`;
      } else if (fechaRangoAplicado.from && fechaRangoAplicado.to) {
        const fromStr = format(fechaRangoAplicado.from, "dd-MM-yyyy");
        const toStr = format(fechaRangoAplicado.to, "dd-MM-yyyy");
        nombreArchivo = `reporte_ventas_${fromStr}_a_${toStr}`;
      }

      if (filtroEmpleado !== "Todos") {
        const empleadoLabel = empleadosOptions.find(e => e.value === filtroEmpleado)?.label || filtroEmpleado;
        nombreArchivo += `_${empleadoLabel.replace(/\s+/g, '_')}`;
      }

      if (filtroMetodo !== "Todos") {
        nombreArchivo += `_${filtroMetodo}`;
      }

      if (filtroMedico !== "Todos") {
        nombreArchivo += `_medico_${filtroMedico.replace(/\s+/g, '_')}`;
      }

      nombreArchivo += ".pdf";

      const pdfDocument = (
        <VentasTablaPDF
          ventas={ventasFiltradas}
          filtros={{
            fechaBusqueda,
            fechaRango: fechaRangoAplicado,
            filtroEmpleado,
            filtroMetodo,
            filtroMedico,
            empleadosOptions,
            medicosOptions,
            userRole,
            currentUserName: currentUser ? `${currentUser.nombres} ${currentUser.apellidos}` : "Usuario",
          }}
          totales={totales}
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

  const limpiarFiltros = () => {
    const hoy = getFechaActual();
    setFechaBusqueda(hoy);
    setFechaRangoTemp({ from: undefined, to: undefined });
    setFechaRangoAplicado({ from: undefined, to: undefined });

    if (isAssistant) {
      setFiltroEmpleado(currentUser.usuario);
    } else {
      setFiltroEmpleado("Todos");
    }

    setFiltroMetodo("Todos");
    setFiltroMedico("Todos");
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

  const contarFiltrosActivos = () => {
    let count = 0;
    if (filtroEmpleado !== "Todos" && !isAssistant) count++;
    if (filtroMetodo !== "Todos") count++;
    if (filtroMedico !== "Todos") count++;
    if (fechaBusqueda && format(fechaBusqueda, "yyyy-MM-dd") !== format(fechaActual, "yyyy-MM-dd")) count++;
    if (fechaRangoAplicado.from || fechaRangoAplicado.to) count++;
    return count;
  };

  // Función para imprimir directamente usando PrintSalesHistory
  const imprimirVenta = (venta: Venta) => {
    const ventaData = {
      codigoVenta: String(venta.id),
      clientName: "",
      fechaVenta: typeof venta.fecha === 'string' ? venta.fecha : venta.fecha.toISOString(),
      sistemaLente: "",
      materialName: "",
      frameName: "",
      total: venta.total,
      montoPagado: venta.total,
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      tiendaNombre: "LUMYLA",
      registradoPor: venta.usuario,
      productos: venta.detalle.map(item => ({
        nombre: item.producto,
        precio: item.precio_unitario,
        cantidad: item.cantidad
      }))
    };

    PrintSalesHistory.imprimir(ventaData);
  };

  // Función para anular venta
  const handleAnularVenta = (venta: Venta) => {
    setVentaToAnular(venta);
    setIsAnularModalOpen(true);
  };

  // Función para confirmar anulación
  const confirmarAnularVenta = async () => {
    if (!ventaToAnular) return;

    try {
      setAnulando(true);
      const result = await anularVenta(ventaToAnular.id);
      
      toast({
        title: "✅ Venta anulada",
        description: result.message || `La venta #${ventaToAnular.id} fue anulada correctamente`,
      });
      
      setIsAnularModalOpen(false);
      setVentaToAnular(null);
      
      // Recargar datos
      await buscarDatos();
      
    } catch (error: any) {
      console.error("Error al anular venta:", error);
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo anular la venta",
        variant: "destructive",
      });
    } finally {
      setAnulando(false);
    }
  };

  // Calcular paginación
  const totalPaginas = Math.ceil(ventasFiltradas.length / itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const ventasPaginadas = ventasFiltradas.slice(inicio, fin);

  // Renderizar vista móvil con tarjetas
  const renderMobileCard = (venta: Venta) => {
    return (
      <div key={venta.id} className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatDateForDisplay(venta.fecha)}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimeForDisplay(venta.fecha)}
            </div>
          </div>
          <Badge variant={venta.metodo === "Efectivo" ? "default" : "secondary"} className="text-xs">
            {venta.metodo}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-1 text-sm">
          <div className="text-gray-500">Usuario:</div>
          <div className="font-medium truncate">{venta.usuario}</div>

          <div className="text-gray-500">Descripción:</div>
          <div className="font-medium truncate">{venta.descripcion}</div>

          {venta.medico && (
            <>
              <div className="text-gray-500">Médico:</div>
              <div className="font-medium truncate">{venta.medico}</div>
            </>
          )}

          <div className="text-gray-500">Total:</div>
          <div className="font-bold text-primary">Bs {venta.total.toFixed(2)}</div>
        </div>

        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => imprimirVenta(venta)}
            className="flex-1 text-xs h-8"
          >
            <Printer className="h-3 w-3 mr-1" />
            Imprimir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setVentaSeleccionada(venta);
              setMostrarDetalle(true);
            }}
            className="flex-1 text-xs h-8"
          >
            <Eye className="h-3 w-3 mr-1" />
            Detalle
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAnularVenta(venta)}
              className="flex-1 text-xs h-8"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Anular
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos de ventas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con título y botones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Historial de Ventas</h1>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button
            onClick={handleExportarPDF}
            disabled={ventasFiltradas.length === 0 || generandoPDF}
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
      {mostrarFiltros && (
        <Card className="border-2">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Empleado - Solo visible para Admin */}
              {!isAssistant && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Empleado</Label>
                  <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {empleadosOptions.map(empleado => (
                        <SelectItem key={empleado.value} value={empleado.value} className="text-sm">
                          {empleado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Para Asistentes: mostrar su nombre fijo */}
              {isAssistant && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Empleado</Label>
                  <div className="h-9 px-3 py-1.5 text-sm border rounded-md bg-muted/50 flex items-center">
                    {empleadosOptions[0]?.label || currentUser?.nombres}
                  </div>
                </div>
              )}

              {/* Método de Pago */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Método</Label>
                <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="QR">QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Médico */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Médico</Label>
                <Select value={filtroMedico} onValueChange={setFiltroMedico}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicosOptions.map(medico => (
                      <SelectItem key={medico} value={medico} className="text-sm">
                        {medico}
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
            </div>

            {/* Filtros activos */}
            {contarFiltrosActivos() > 0 && (
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Filtros activos:</span>
                {filtroEmpleado !== "Todos" && !isAssistant && (
                  <Badge variant="secondary" className="text-xs">
                    {empleadosOptions.find(e => e.value === filtroEmpleado)?.label}
                  </Badge>
                )}
                {filtroMetodo !== "Todos" && (
                  <Badge variant="secondary" className="text-xs">
                    {filtroMetodo}
                  </Badge>
                )}
                {filtroMedico !== "Todos" && (
                  <Badge variant="secondary" className="text-xs">
                    {filtroMedico}
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

      {/* Información para asistentes */}
      {isAssistant && !mostrarFiltros && (
        <div className="bg-muted/30 px-4 py-2 rounded-lg border text-center text-sm">
          <p className="font-medium">Mostrando tus ventas</p>
          <p className="text-xs text-muted-foreground">Usuario: {currentUser?.nombres} {currentUser?.apellidos}</p>
        </div>
      )}

      {/* Cards de totales - 4 cards para Admin, 3 para Asistente */}
      {isAdmin ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total General</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl font-bold text-primary">Bs {totales.totalGeneral.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Efectivo</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl font-bold text-green-600">Bs {totales.totalEfectivo.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total QR</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl font-bold text-blue-600">Bs {totales.totalQR.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <div className="text-xs font-medium text-muted-foreground">Inversión</div>
                  <div className="text-lg font-bold text-orange-600">
                    Bs {totalesInversionGanancia.total_invertido.toFixed(2)}
                  </div>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div className="flex-1 text-center">
                  <div className="text-xs font-medium text-muted-foreground">Ganancia</div>
                  <div className="text-lg font-bold text-purple-600">
                    Bs {totalesInversionGanancia.total_ganado.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total General</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl font-bold text-primary">Bs {totales.totalGeneral.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Efectivo</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl font-bold text-green-600">Bs {totales.totalEfectivo.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total QR</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl font-bold text-blue-600">Bs {totales.totalQR.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de ventas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex flex-wrap items-center gap-1 sm:gap-2">
            Registro de Ventas
            <span className="text-xs font-normal text-muted-foreground">
              ({ventasFiltradas.length} registros)
            </span>
            {esMovil && ventasFiltradas.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {inicio + 1}-{Math.min(fin, ventasFiltradas.length)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Cargando ventas...</span>
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">No se encontraron ventas</p>
            </div>
          ) : (
            <>
              {esMovil ? (
                <div className="space-y-2">
                  {ventasPaginadas.map(renderMobileCard)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[130px] text-xs">Fecha y Hora</TableHead>
                        <TableHead className="w-[120px] text-xs">Usuario</TableHead>
                        <TableHead className="min-w-[180px] text-xs">Descripción</TableHead>
                        <TableHead className="w-[130px] text-xs">Médico</TableHead>
                        <TableHead className="w-[90px] text-right text-xs">Subtotal</TableHead>
                        <TableHead className="w-[90px] text-right text-xs">Descuento</TableHead>
                        <TableHead className="w-[110px] text-right text-xs">Total</TableHead>
                        <TableHead className="w-[100px] text-xs">Método</TableHead>
                        <TableHead className="w-[100px] text-xs">Impresión</TableHead>
                        <TableHead className="w-[50px] text-xs">Detalle</TableHead>
                        {isAdmin && (
                          <TableHead className="w-[80px] text-xs">Anular</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventasPaginadas.map((venta) => (
                        <TableRow key={venta.id}>
                          <TableCell className="py-2">
                            <div className="text-sm font-medium">
                              {formatDateForDisplay(venta.fecha)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimeForDisplay(venta.fecha)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-2">{venta.usuario}</TableCell>
                          <TableCell className="text-sm py-2">
                            <div className="text-sm leading-relaxed line-clamp-2">
                              {venta.descripcion}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            {venta.medico ? (
                              <Badge variant="outline" className="text-xs">
                                {venta.medico}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm py-2">Bs {venta.subtotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm py-2">Bs {venta.descuento.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium py-2">
                            <span className="text-sm font-bold text-primary">Bs {venta.total.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant={venta.metodo === "Efectivo" ? "default" : "secondary"} className="text-xs">
                              {venta.metodo}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => imprimirVenta(venta)}
                              className="flex items-center gap-1 h-7 text-xs px-2"
                            >
                              <Printer className="h-3 w-3" />
                              <span className="hidden sm:inline">Imprimir</span>
                            </Button>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setVentaSeleccionada(venta);
                                setMostrarDetalle(true);
                              }}
                              className="flex items-center gap-1 h-7 w-7 sm:w-auto px-2"
                            >
                              <Eye className="h-3 w-3" />
                              <span className="hidden sm:inline">Detalle</span>
                            </Button>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAnularVenta(venta)}
                                className="flex items-center gap-1 h-7 w-7 sm:w-auto px-2"
                                title="Anular venta"
                              >
                                <XCircle className="h-3 w-3" />
                                <span className="hidden sm:inline">Anular</span>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {ventasFiltradas.length > itemsPorPagina && (
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    {esMovil ? (
                      <span>{inicio + 1}-{Math.min(fin, ventasFiltradas.length)} de {ventasFiltradas.length}</span>
                    ) : (
                      <span>Mostrando {inicio + 1} a {Math.min(fin, ventasFiltradas.length)} de {ventasFiltradas.length} registros</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="h-7 w-7 sm:w-auto px-1 sm:px-3"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">Anterior</span>
                    </Button>
                    <span className="text-xs px-2">
                      {paginaActual} / {totalPaginas}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="h-7 w-7 sm:w-auto px-1 sm:px-3"
                    >
                      <span className="hidden sm:inline text-xs">Siguiente</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para detalle de venta */}
      <Dialog open={mostrarDetalle} onOpenChange={setMostrarDetalle}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Detalle de Venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <p><strong>Fecha:</strong> {ventaSeleccionada ? `${formatDateForDisplay(ventaSeleccionada.fecha)} ${formatTimeForDisplay(ventaSeleccionada.fecha)}` : ""}</p>
              <p><strong>Dirección:</strong> Av. Heroinas esq. Hamiraya #316</p>
              <p><strong>Números:</strong> 77950297 - 77918672</p>
              {ventaSeleccionada?.medico && (
                <p><strong>Médico:</strong> {ventaSeleccionada.medico}</p>
              )}
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <h3 className="font-semibold mb-1 text-sm">Descripción de la Venta:</h3>
              <p className="text-sm">{ventaSeleccionada?.descripcion}</p>
            </div>
            {ventaSeleccionada?.descripcion_descuento && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <h3 className="font-semibold mb-1 text-sm">Descripción del descuento:</h3>
                <p className="text-sm">{ventaSeleccionada?.descripcion_descuento}</p>
              </div>
            )}

            {ventaSeleccionada?.detalle && ventaSeleccionada.detalle.length > 0 && (
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 overflow-x-auto">
                  <h3 className="font-semibold mb-2 text-sm">Productos:</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs text-right">Precio</TableHead>
                        <TableHead className="text-xs text-center">Cantidad</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventaSeleccionada.detalle.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-sm">{item.producto}</TableCell>
                          <TableCell className="text-sm text-right">Bs {item.precio_unitario.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-center">{item.cantidad}</TableCell>
                          <TableCell className="text-sm text-right">Bs {(item.precio_unitario * item.cantidad).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="w-full lg:w-48">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-sm">Subtotal:</TableCell>
                        <TableCell className="text-sm text-right">Bs {ventaSeleccionada?.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-sm">Descuento:</TableCell>
                        <TableCell className="text-sm text-right">Bs {ventaSeleccionada?.descuento.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-sm">Total:</TableCell>
                        <TableCell className="font-bold text-sm text-right">Bs {ventaSeleccionada?.total.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => {
              if (ventaSeleccionada) imprimirVenta(ventaSeleccionada);
            }} className="flex items-center gap-2 text-sm">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para anular venta */}
      <Dialog open={isAnularModalOpen} onOpenChange={(open) => {
        setIsAnularModalOpen(open);
        if (!open) setVentaToAnular(null);
      }}>
        <DialogContent className="w-[95vw] max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl">⚠️ Anular Venta</DialogTitle>
            </div>
          </DialogHeader>

          <DialogDescription className="sr-only">
            Confirmación de anulación de venta
          </DialogDescription>

          {ventaToAnular && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que deseas <span className="font-bold text-red-600">ANULAR</span> la venta?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">ID:</span>
                  <span className="text-sm font-bold text-gray-900">#{ventaToAnular.id}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-gray-500">Fecha:</span>
                  <span className="text-sm text-gray-700">{formatDateForDisplay(ventaToAnular.fecha)} {formatTimeForDisplay(ventaToAnular.fecha)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-gray-500">Descripción:</span>
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">{ventaToAnular.descripcion}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-gray-500">Total:</span>
                  <span className="text-sm font-bold text-red-600">Bs. {ventaToAnular.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-gray-500">Método:</span>
                  <span className="text-sm">{ventaToAnular.metodo}</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">Esta acción realizará:</p>
                <div className="text-xs text-red-600 mt-2 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Reingresará el stock de los productos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Eliminará la venta y sus detalles</span>
                  </div>
                  {ventaToAnular.metodo === "Efectivo" && (
                    <div className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>Revertirá el movimiento de caja (devolución del efectivo)</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold text-red-700 mt-2">⚠️ Esta acción NO SE PUEDE DESHACER</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAnularModalOpen(false);
                setVentaToAnular(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarAnularVenta}
              disabled={anulando}
              className="gap-2"
            >
              {anulando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Sí, Anular Venta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}