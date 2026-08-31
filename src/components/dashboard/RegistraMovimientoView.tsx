import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Wallet, CheckCircle, XCircle, History, PlusCircle, MinusCircle, Lock, Unlock } from "lucide-react";
import { getCashStatus, createTransaction, openCash, closeCash, getUserTransactions, Transaction } from "@/api/CashApi";

export function RegistraMovimientoView() {
  const [tipo, setTipo] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      setLoading(true);
      const [status, userTransactions] = await Promise.all([
        getCashStatus(),
        getUserTransactions()
      ]);
      
      setCajaAbierta(status.estado === "abierta");
      setSaldoActual(parseFloat(status.monto_final));
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading cash data:", error);
      setCajaAbierta(false);
      setSaldoActual(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCash = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      // Enviar el saldo actual como monto inicial
      await openCash(saldoActual);
      toast({
        title: "Caja abierta",
        description: `Caja abierta correctamente con saldo inicial de ${saldoActual.toFixed(2)} Bs`,
      });
      await loadCashData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo abrir la caja",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseCash = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      await closeCash();
      toast({
        title: "Caja cerrada",
        description: `Caja cerrada con saldo final de ${saldoActual.toFixed(2)} Bs correctamente`,
      });
      await loadCashData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cerrar la caja",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      if (!tipo) {
        toast({
          title: "Error",
          description: "Por favor selecciona el tipo de movimiento",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      if (!monto || !descripcion) {
        toast({
          title: "Error", 
          description: "Por favor completa monto y descripción para ingresos y egresos",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      await createTransaction({
        tipoMovimiento: tipo,
        descripcion,
        monto: parseFloat(monto)
      });

      toast({
        title: "Movimiento registrado",
        description: `${getTipoTexto(tipo)} de ${monto} Bs registrado correctamente`,
      });

      await loadCashData();
      
      setTipo("");
      setMonto("");
      setDescripcion("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTipoTexto = (tipo: string) => {
    const tipoTextos: { [key: string]: string } = {
      "Ingreso": "Ingreso",
      "Egreso": "Egreso"
    };
    return tipoTextos[tipo] || tipo;
  };

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'Ingreso':
        return 'bg-green-100 text-green-800';
      case 'Egreso':
        return 'bg-red-100 text-red-800';
      case 'Apertura':
        return 'bg-blue-100 text-blue-800';
      case 'Cierre':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const day = date.getUTCDate();
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      let hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      const period = hours >= 12 ? 'p. m.' : 'a. m.';
      if (hours === 0) hours = 12;
      else if (hours > 12) hours = hours - 12;
      const formattedHours = hours.toString();
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
      const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds.toString();
      return `${day}/${month}/${year}, ${formattedHours}:${formattedMinutes}:${formattedSeconds} ${period}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return isoDate;
    }
  };

  const formatTodayDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Si la caja está cerrada, mostrar solo el botón de apertura + historial
  if (!cajaAbierta) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">Registrar Movimiento</h1>
        </div>

        {/* Estado de Caja y Saldo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-semibold">Saldo Actual</h2>
                </div>
                <div className="text-3xl font-bold text-primary">Bs {saldoActual.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-semibold">Estado de Caja</h2>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">CERRADA</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Botón de Apertura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-blue-600" />
                Apertura de Caja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-semibold">Caja Cerrada</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Para realizar movimientos, primero debes abrir la caja. 
                  Se abrirá con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={processing}>
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Abriendo Caja...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Abrir Caja
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar apertura de caja?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro de que deseas abrir la caja con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleOpenCash} disabled={processing}>
                      {processing ? "Abriendo..." : "Abrir Caja"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Historial de Movimientos del Usuario - SOLO HOY */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Mis Movimientos de Hoy ({formatTodayDate()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Cargando movimientos...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay movimientos registrados hoy</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div key={transaction.idTransaccion} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoBadgeClass(transaction.tipoMovimiento)}`}>
                          {transaction.tipoMovimiento}
                        </span>
                        <span className={`text-lg font-semibold ${
                          transaction.tipoMovimiento === 'Ingreso' ? 'text-green-600' : 
                          transaction.tipoMovimiento === 'Egreso' ? 'text-red-600' : 
                          'text-blue-600'
                        }`}>
                          Bs {transaction.monto.toFixed(2)}
                        </span>
                      </div>
                      {transaction.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {transaction.descripcion}
                        </p>
                      )}
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatDate(transaction.fecha)}</span>
                        <span>{transaction.nombreUsuario}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Si la caja está abierta, mostrar el formulario completo + historial
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Registrar Movimiento</h1>
      </div>
      
      {/* Estado de Caja y Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold">Saldo Actual</h2>
              </div>
              <div className="text-3xl font-bold text-primary">Bs {saldoActual.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wallet className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold">Estado de Caja</h2>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold text-green-600">ABIERTA</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Movimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Registrar Movimiento de Caja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimiento</Label>
              <Select value={tipo} onValueChange={setTipo} disabled={processing}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ingreso">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4 text-green-600" />
                      Ingreso
                    </div>
                  </SelectItem>
                  <SelectItem value="Egreso">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="h-4 w-4 text-red-600" />
                      Egreso
                    </div>
                  </SelectItem>
                  <SelectItem value="Cierre">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-600" />
                      Cierre de Caja
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo de monto - SOLO para Ingreso y Egreso */}
            {(tipo === "Ingreso" || tipo === "Egreso") && (
              <div className="space-y-2">
                <Label htmlFor="monto">Monto (Bs)</Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  min="0"
                  step="0.01"
                  className="number-input-no-scroll"
                  onWheel={(e) => e.currentTarget.blur()}
                  disabled={processing}
                />
              </div>
            )}

            {/* Campo de descripción - SOLO para Ingreso y Egreso */}
            {(tipo === "Ingreso" || tipo === "Egreso") && (
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción del movimiento..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  disabled={processing}
                />
              </div>
            )}

            {/* Información para Cierre */}
            {tipo === "Cierre" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-800">
                  <Wallet className="h-4 w-4" />
                  <span className="font-semibold">Información de Cierre</span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  La caja se cerrará automáticamente con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  No es necesario ingresar un monto manualmente
                </p>
              </div>
            )}

            {/* Botón de acción según el tipo seleccionado */}
            {tipo === "Cierre" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={loading || processing}
                    variant="destructive"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cerrando Caja...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Cerrar Caja
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar cierre de caja?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro de que deseas cerrar la caja con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCloseCash} disabled={processing}>
                      {processing ? "Cerrando..." : "Cerrar Caja"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={!tipo || !monto || !descripcion || loading || processing}
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registrando...
                      </>
                    ) : (
                      "Registrar Movimiento"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar operación?</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro de que deseas registrar este {tipo.toLowerCase()} de {monto} Bs?
                      {descripcion && `\nDescripción: ${descripcion}`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={processing}>
                      {processing ? "Procesando..." : "Confirmar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>

        {/* Historial de Movimientos del Usuario - SOLO HOY */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Mis Movimientos de Hoy ({formatTodayDate()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Cargando movimientos...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay movimientos registrados hoy</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <div key={transaction.idTransaccion} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoBadgeClass(transaction.tipoMovimiento)}`}>
                        {transaction.tipoMovimiento}
                      </span>
                      <span className={`text-lg font-semibold ${
                        transaction.tipoMovimiento === 'Ingreso' ? 'text-green-600' : 
                        transaction.tipoMovimiento === 'Egreso' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        Bs {transaction.monto.toFixed(2)}
                      </span>
                    </div>
                    {transaction.descripcion && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {transaction.descripcion}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{formatDate(transaction.fecha)}</span>
                      <span>{transaction.nombreUsuario}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}