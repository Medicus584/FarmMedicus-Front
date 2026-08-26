import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Camera,
  Package,
  User,
  Pencil,
  X,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  searchProducts,
  getCashStatus,
  processSale,
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  type Product,
  type SaleRequest,
  type Lote,
  type Doctor,
  SaleItem,
} from "@/api/SalesApi";
import { getUserId, getCurrentUser } from "@/api/AuthApi";
import BarcodeScanner from "./BarcodeScanner";
import { Textarea } from "../ui/textarea";
import {
  DoctorSelect,
  SeleccionarLoteDialog,
  LotesCarritoDialog,
  getImageUrl,
  formatBs,
  useDebounce,
  type SaleItemWithLotes,
} from "./VenderDetalles";

export function VenderView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [ventaItems, setVentaItems] = useState<SaleItemWithLotes[]>([]);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "QR">("Efectivo");
  const [montoPagado, setMontoPagado] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [similarProductsData, setSimilarProductsData] = useState<
    Map<number, Product[]>
  >(new Map());
  const [loadingSimilars, setLoadingSimilars] = useState<Map<number, boolean>>(
    new Map(),
  );
  const [discountReason, setDiscountReason] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Estados para Doctor
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Estados para selección de lotes
  const [showLoteDialog, setShowLoteDialog] = useState(false);
  const [productoParaLote, setProductoParaLote] = useState<Product | null>(null);
  const [cantidadInicialParaLote, setCantidadInicialParaLote] = useState<
    number | undefined
  >(undefined);
  const [esEdicion, setEsEdicion] = useState(false);
  const [itemIndexParaLote, setItemIndexParaLote] = useState<number>(-1);

  // Estado para ver lotes en carrito
  const [showLotesCarrito, setShowLotesCarrito] = useState(false);
  const [productoParaVerLotes, setProductoParaVerLotes] =
    useState<SaleItemWithLotes | null>(null);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cartRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);
  const barcodeBufferRef = useRef<string>("");
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const currentUser = getCurrentUser();
  const username = currentUser?.nombres || "Usuario";
  const userId = getUserId();

  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  useEffect(() => {
    loadCashStatus();
  }, []);

  useEffect(() => {
    if (
      debouncedSearchQuery.trim().length >= 2 &&
      debouncedSearchQuery !== lastSearchQueryRef.current
    ) {
      lastSearchQueryRef.current = debouncedSearchQuery;
      performSearch(debouncedSearchQuery);
    } else if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([]);
      setExpandedProduct(null);
      setSimilarProductsData(new Map());
      lastSearchQueryRef.current = "";
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (expandedProduct !== null) {
      const product = searchResults.find(
        (p) => p.idproducto === expandedProduct,
      );
      if (
        product &&
        product.productos_similares &&
        product.productos_similares.length > 0
      ) {
        loadSimilarProducts(expandedProduct, product.productos_similares);
      }
    }
  }, [expandedProduct, searchResults]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (showScanner) {
        event.preventDefault();
        setShowScanner(false);
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showScanner]);

  const openScanner = () => {
    setShowScanner(true);
    window.history.pushState({ scanner: true }, "");
  };

  const getStockTotal = (product: Product): number => {
    if (!product.lotes || product.lotes.length === 0) return 0;
    return product.lotes.reduce((sum, lote) => sum + lote.stock, 0);
  };

  const getStockDisponible = (productId: number): number => {
    const product = searchResults.find((p) => p.idproducto === productId);
    if (!product) return 0;

    const totalStock = getStockTotal(product);
    const enCarrito = ventaItems
      .filter((item) => item.idproducto === productId)
      .reduce((sum, item) => sum + item.cantidad, 0);

    return totalStock - enCarrito;
  };

  // Función para obtener stock disponible de un producto específico (incluso si no está en searchResults)
  const getStockDisponiblePorProducto = (product: Product): number => {
    const totalStock = getStockTotal(product);
    const enCarrito = ventaItems
      .filter((item) => item.idproducto === product.idproducto)
      .reduce((sum, item) => sum + item.cantidad, 0);
    return totalStock - enCarrito;
  };

  const getLotesProducto = (productId: number): Lote[] => {
    const product = searchResults.find((p) => p.idproducto === productId);
    return product?.lotes || [];
  };

  const getCantidadEnCarrito = (productId: number): number => {
    const item = ventaItems.find((item) => item.idproducto === productId);
    return item ? item.cantidad : 0;
  };

  const tieneLotesDisponibles = (product: Product): boolean => {
    if (!product.lotes || product.lotes.length === 0) return false;
    return product.lotes.some((l) => l.stock > 0);
  };

  const abrirDialogoLotes = (
    product: Product,
    cantidad: number,
    esEdicion: boolean = false,
    index: number = -1,
  ) => {
    const stockDisponible = getStockDisponiblePorProducto(product);

    if (stockDisponible <= 0 && !esEdicion) {
      toast({
        title: "Sin stock",
        description: `${product.nombre} no tiene stock disponible`,
        variant: "destructive",
      });
      return;
    }

    const lotes = product.lotes || [];

    // Si solo hay un lote, no abrir diálogo
    if (lotes.length === 1) {
      const lote = lotes[0];

      // Verificar que el lote tenga suficiente stock
      if (lote.stock < cantidad && !esEdicion) {
        toast({
          title: "Stock insuficiente",
          description: `El lote #${lote.idlote} solo tiene ${lote.stock} unidades disponibles`,
          variant: "destructive",
        });
        return;
      }

      const selecciones = [{ idlote: lote.idlote, cantidad }];
      const lotesInfo = selecciones.map((sel) => ({
        ...sel,
        fechaVencimiento: lote.fechaVencimiento,
      }));

      if (esEdicion && index >= 0) {
        const updatedItems = [...ventaItems];
        updatedItems[index] = {
          ...product,
          cantidad,
          lotesSeleccionados: lotesInfo,
          descuentoProducto: ventaItems[index]?.descuentoProducto || 0,
        };
        setVentaItems(updatedItems);
      } else {
        const nuevoItem: SaleItemWithLotes = {
          ...product,
          cantidad,
          lotesSeleccionados: lotesInfo,
          descuentoProducto: 0,
        };
        setVentaItems([...ventaItems, nuevoItem]);
      }

      toast({
        title: esEdicion ? "Cantidad actualizada" : "Producto agregado",
        description: `${product.nombre} (${cantidad} unidades del lote #${lote.idlote})`,
      });
      return;
    }

    // Si hay múltiples lotes, abrir diálogo
    setProductoParaLote(product);
    setCantidadInicialParaLote(cantidad);
    setEsEdicion(esEdicion);
    setItemIndexParaLote(index);
    setShowLoteDialog(true);
  };

  const confirmarSeleccionLotes = (
    cantidadTotal: number,
    selecciones: { idlote: number; cantidad: number }[],
  ) => {
    if (!productoParaLote) return;

    // Verificar que la suma de las cantidades de los lotes coincida con la cantidad total
    const sumaSelecciones = selecciones.reduce((sum, sel) => sum + sel.cantidad, 0);
    if (sumaSelecciones !== cantidadTotal) {
      toast({
        title: "Error",
        description: `La suma de las cantidades de los lotes (${sumaSelecciones}) no coincide con la cantidad total (${cantidadTotal})`,
        variant: "destructive",
      });
      return;
    }

    const lotesInfo = selecciones.map((sel) => {
      const lote = productoParaLote.lotes?.find(
        (l) => l.idlote === sel.idlote,
      );
      return {
        ...sel,
        fechaVencimiento: lote?.fechaVencimiento || new Date().toISOString(),
      };
    });

    if (esEdicion && itemIndexParaLote >= 0) {
      const updatedItems = [...ventaItems];
      updatedItems[itemIndexParaLote] = {
        ...productoParaLote,
        cantidad: cantidadTotal,
        lotesSeleccionados: lotesInfo,
        descuentoProducto: ventaItems[itemIndexParaLote]?.descuentoProducto || 0,
      };
      setVentaItems(updatedItems);

      toast({
        title: "Cantidad actualizada",
        description: `${productoParaLote.nombre} actualizado a ${cantidadTotal} unidades`,
      });
    } else {
      const nuevoItem: SaleItemWithLotes = {
        ...productoParaLote,
        cantidad: cantidadTotal,
        lotesSeleccionados: lotesInfo,
        descuentoProducto: 0,
      };
      setVentaItems([...ventaItems, nuevoItem]);

      toast({
        title: "Producto agregado",
        description: `${productoParaLote.nombre} agregado al carrito con ${cantidadTotal} unidades`,
      });
    }

    setShowLoteDialog(false);
    setProductoParaLote(null);
    setCantidadInicialParaLote(undefined);
    setEsEdicion(false);
    setItemIndexParaLote(-1);
  };

  const agregarProducto = (product: Product) => {
    const stockDisponible = getStockDisponiblePorProducto(product);

    if (stockDisponible <= 0) {
      toast({
        title: "Sin stock",
        description: `${product.nombre} no tiene stock disponible`,
        variant: "destructive",
      });
      return;
    }

    abrirDialogoLotes(product, 1, false, -1);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);

    try {
      setLoading(true);
      isScanningRef.current = true;

      setSearchQuery(barcode);
      setSearchResults([]);
      setExpandedProduct(null);
      setSimilarProductsData(new Map());
      lastSearchQueryRef.current = barcode;

      const results = await searchProducts(barcode);

      if (results.length > 0) {
        const product = results[0];
        // USAR getStockDisponiblePorProducto en lugar de getStockDisponible
        const stockDisponible = getStockDisponiblePorProducto(product);

        setSearchResults(results);

        if (stockDisponible > 0 && tieneLotesDisponibles(product)) {
          // Tiene stock y lotes disponibles, agregar directamente
          agregarProducto(product);
        } else if (stockDisponible > 0 && !tieneLotesDisponibles(product)) {
          // Tiene stock pero no hay lotes disponibles (caso raro)
          toast({
            title: "Sin lotes disponibles",
            description: `${product.nombre} tiene stock pero no hay lotes disponibles para vender.`,
            variant: "destructive",
            duration: 3000,
          });
        } else {
          // No tiene stock disponible, mostrar similares
          toast({
            title: "Stock agotado",
            description: `${product.nombre} no tiene más stock disponible. Mostrando productos similares...`,
            variant: "destructive",
            duration: 3000,
          });

          setExpandedProduct(product.idproducto);

          if (
            product.productos_similares &&
            product.productos_similares.length > 0
          ) {
            await loadSimilarProducts(
              product.idproducto,
              product.productos_similares,
            );
          }
        }
      } else {
        setSearchResults([]);
        toast({
          title: "Producto no encontrado",
          description: `No se encontró producto con código: ${barcode}`,
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error en escaneo:", error);
      toast({
        title: "Error",
        description: "Error al buscar el producto escaneado",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isScanningRef.current = false;
      }, 100);
    }
  };

  const loadSimilarProducts = async (
    productId: number,
    similares: Array<{ idproducto: number; nombre: string }>,
  ) => {
    if (similarProductsData.has(productId)) return;

    setLoadingSimilars((prev) => new Map(prev).set(productId, true));

    try {
      const similarProducts: Product[] = [];
      for (const similar of similares) {
        try {
          const results = await searchProducts(similar.nombre);
          const found = results.find(
            (p) => p.idproducto === similar.idproducto,
          );
          if (found) {
            similarProducts.push(found);
          }
        } catch (error) {
          console.error(
            `Error loading similar product ${similar.idproducto}:`,
            error,
          );
        }
      }

      setSimilarProductsData((prev) =>
        new Map(prev).set(productId, similarProducts),
      );
    } catch (error) {
      console.error("Error loading similar products:", error);
    } finally {
      setLoadingSimilars((prev) => new Map(prev).set(productId, false));
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (event.key === "Enter") {
      if (barcodeBufferRef.current.length > 0) {
        event.preventDefault();
        const barcode = barcodeBufferRef.current;
        barcodeBufferRef.current = "";

        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
          barcodeTimeoutRef.current = null;
        }

        handleBarcodeScanned(barcode);
      }
      return;
    }

    if (event.key.length === 1 && !isScanningRef.current) {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      barcodeBufferRef.current += event.key;

      barcodeTimeoutRef.current = setTimeout(() => {
        barcodeBufferRef.current = "";
        barcodeTimeoutRef.current = null;
      }, 100);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [ventaItems]);

  const loadCashStatus = async () => {
    try {
      const status = await getCashStatus();
      setCajaAbierta(status.estado === "abierta");
    } catch (error) {
      console.error("Error loading cash status:", error);
      setCajaAbierta(false);
    }
  };

  const performSearch = async (query: string) => {
    if (isSearchingRef.current) return;

    isSearchingRef.current = true;
    setLoading(true);

    try {
      const results = await searchProducts(query);
      setSearchResults(results);
      setSimilarProductsData(new Map());
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {};

  const toggleProductExpansion = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const eliminarItem = (index: number) => {
    const newItems = ventaItems.filter((_, i) => i !== index);
    setVentaItems(newItems);
  };

  // Cálculo de subtotal con descuentos por producto (monto fijo)
  const subtotalSinDescuentos = ventaItems.reduce(
    (total, item) => total + item.precio_venta * item.cantidad,
    0,
  );

  const descuentosProducto = ventaItems.reduce(
    (total, item) => total + (item.descuentoProducto || 0),
    0,
  );

  const subtotalConDescuentosProducto = subtotalSinDescuentos - descuentosProducto;

  // Descuento porcentual sobre el subtotal con descuentos de producto
  const descuentoMonto = (subtotalConDescuentosProducto * (descuentoPorcentaje || 0)) / 100;
  const total = Math.max(0, subtotalConDescuentosProducto - descuentoMonto);

  const cambio =
    metodoPago === "Efectivo" ? Math.max(0, montoPagado - total) : 0;

  const tieneItemsInvalidos = ventaItems.some((item) => item.cantidad < 1);

  // Verificar si hay algún descuento aplicado (producto o porcentaje)
  const tieneDescuentosProducto = ventaItems.some((item) => (item.descuentoProducto || 0) > 0);
  const tieneDescuentoPorcentaje = descuentoPorcentaje > 0;
  const tieneDescuentos = tieneDescuentosProducto || tieneDescuentoPorcentaje;

  const procesarVenta = async () => {
    if (!cajaAbierta) {
      toast({
        title: "Caja Cerrada",
        description: "No se puede procesar la venta. La caja está cerrada.",
        variant: "destructive",
      });
      return;
    }

    if (ventaItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto",
        variant: "destructive",
      });
      return;
    }

    if (tieneItemsInvalidos) {
      toast({
        title: "Error",
        description: "Todos los productos deben tener al menos 1 unidad",
        variant: "destructive",
      });
      return;
    }

    // Validar que la suma de lotes coincida con la cantidad de cada item
    for (const item of ventaItems) {
      if (!item.lotesSeleccionados || item.lotesSeleccionados.length === 0) {
        toast({
          title: "Error",
          description: `El producto "${item.nombre}" no tiene lotes asignados`,
          variant: "destructive",
        });
        return;
      }

      const totalLotes = item.lotesSeleccionados.reduce(
        (sum, lote) => sum + lote.cantidad,
        0,
      );
      if (totalLotes !== item.cantidad) {
        toast({
          title: "Error",
          description: `La cantidad de lotes seleccionados para "${item.nombre}" (${totalLotes}) no coincide con la cantidad solicitada (${item.cantidad})`,
          variant: "destructive",
        });
        return;
      }
    }

    if (metodoPago === "Efectivo" && montoPagado > 0 && montoPagado < total) {
      toast({
        title: "Error",
        description: "El monto pagado es insuficiente",
        variant: "destructive",
      });
      return;
    }

    // Validar justificación si hay descuentos
    if (tieneDescuentos && !discountReason.trim()) {
      toast({
        title: "Error",
        description: "Proporcione una razón para el descuento",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description:
          "No se encontró información del usuario. Por favor, inicie sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const descripcion = ventaItems
        .map(
          (item) =>
            `${item.cantidad} ${item.nombre} - Bs ${formatBs(item.precio_venta)}`,
        )
        .join(", ");

      const items: SaleItem[] = ventaItems.map((item) => ({
        idproducto: item.idproducto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        subtotal_linea: item.precio_venta * item.cantidad,
        lotes: item.lotesSeleccionados.map((lote) => ({
          idlote: lote.idlote,
          cantidad: lote.cantidad,
        })),
        descuento_monto: item.descuentoProducto || 0,
      }));

      // Calcular descuento total (productos + porcentaje)
      const descuentoTotal = descuentosProducto + descuentoMonto;

      const saleRequest: SaleRequest = {
        descripcion:
          descripcion.length > 200
            ? descripcion.substring(0, 200) + "..."
            : descripcion,
        sub_total: subtotalSinDescuentos,
        descuento: descuentoTotal,
        descripcion_descuento: discountReason,
        total: total,
        metodo_pago: metodoPago,
        items: items,
        doctorId: selectedDoctor?.id,
      };

      await processSale(saleRequest, userId);

      setVentaItems([]);
      setDescuentoPorcentaje(0);
      setMontoPagado(0);
      setShowConfirm(false);
      setDiscountReason("");
      setIsDoctorMode(false);
      setSelectedDoctor(null);

      toast({
        title: "¡Venta procesada!",
        description: `Venta completada por Bs. ${formatBs(total)}`,
      });

      await loadCashStatus();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al procesar la venta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            window.history.back();
          }}
        />
      )}

      {productoParaLote && (
        <SeleccionarLoteDialog
          open={showLoteDialog}
          onOpenChange={setShowLoteDialog}
          lotes={productoParaLote.lotes || []}
          productName={productoParaLote.nombre}
          stockDisponible={
            esEdicion && itemIndexParaLote >= 0
              ? getStockDisponiblePorProducto(productoParaLote) +
                ventaItems[itemIndexParaLote]?.cantidad || 0
              : getStockDisponiblePorProducto(productoParaLote)
          }
          cantidadInicial={cantidadInicialParaLote}
          esEdicion={esEdicion}
          onConfirm={confirmarSeleccionLotes}
          onCancel={() => {
            setShowLoteDialog(false);
            setProductoParaLote(null);
            setCantidadInicialParaLote(undefined);
            setEsEdicion(false);
          }}
        />
      )}

      {productoParaVerLotes && (
        <LotesCarritoDialog
          open={showLotesCarrito}
          onOpenChange={setShowLotesCarrito}
          productName={productoParaVerLotes.nombre}
          lotes={productoParaVerLotes.lotesSeleccionados}
        />
      )}

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              ¡Bienvenido, {username}!
            </h2>
            <p className="text-muted-foreground">
              Sistema de Farmacia LUMYRA
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Fecha</p>
            <p className="font-medium">{currentDate}</p>
          </div>
        </div>
        <div className="mt-2">
          <Badge variant={cajaAbierta ? "default" : "destructive"}>
            Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
          </Badge>
          {currentUser && (
            <Badge variant="outline" className="ml-2">
              {currentUser.rol}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Buscar Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nombre o código de barras"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-10"
                disabled={loading}
                autoFocus={true}
              />
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openScanner}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>

            {loading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Buscando productos...</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((product) => {
                  const hasSimilares =
                    product.productos_similares &&
                    product.productos_similares.length > 0;
                  const isExpanded = expandedProduct === product.idproducto;
                  const similarProducts =
                    similarProductsData.get(product.idproducto) || [];
                  const isLoadingSimilars =
                    loadingSimilars.get(product.idproducto) || false;
                  const cantidadEnCarrito = getCantidadEnCarrito(
                    product.idproducto,
                  );
                  const stockDisponible = getStockDisponiblePorProducto(product);
                  const tieneLotes = tieneLotesDisponibles(product);

                  return (
                    <div
                      key={product.idproducto}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {(() => {
                            const imageUrl = getImageUrl(product.imagen);
                            return imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.nombre}
                                className="w-16 h-16 rounded-md object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  Sin imagen
                                </span>
                              </div>
                            );
                          })()}
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-semibold text-sm ${
                                isMobile ? "break-words" : ""
                              }`}
                            >
                              {product.nombre}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {product.descripcion}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {product.nombre_ubicacion}
                              </Badge>
                              {cantidadEnCarrito > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  En carrito: {cantidadEnCarrito} | Stock
                                  disponible: {stockDisponible}
                                </Badge>
                              )}
                              {product.lotes && product.lotes.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {product.lotes.length} lotes
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium">
                              Bs {formatBs(product.precio_venta)} | Stock
                              total: {getStockTotal(product)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarProducto(product);
                          }}
                          disabled={stockDisponible === 0 || !tieneLotes}
                          className="ml-2 flex-shrink-0"
                        >
                          {stockDisponible === 0 || !tieneLotes
                            ? "Sin Stock"
                            : "Agregar"}
                        </Button>
                      </div>

                      {hasSimilares && (
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleProductExpansion(product.idproducto)
                            }
                            className="h-7 px-2 text-xs"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" /> Ver
                                menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" /> Ver
                                similares (
                                {product.productos_similares!.length})
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {hasSimilares && isExpanded && (
                        <div className="pl-4 border-l-2 border-primary/30 space-y-2 mt-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Productos similares:
                          </p>
                          {isLoadingSimilars ? (
                            <div className="text-center py-4">
                              <p className="text-xs text-muted-foreground">
                                Cargando productos similares...
                              </p>
                            </div>
                          ) : similarProducts.length > 0 ? (
                            similarProducts.map((similar) => {
                              const stockDisponibleSimilar =
                                getStockDisponiblePorProducto(similar);
                              const tieneLotesSimilar =
                                tieneLotesDisponibles(similar);
                              return (
                                <div
                                  key={similar.idproducto}
                                  className="bg-muted/30 rounded-lg p-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      {(() => {
                                        const imageUrl = getImageUrl(
                                          similar.imagen,
                                        );
                                        return imageUrl ? (
                                          <img
                                            src={imageUrl}
                                            alt={similar.nombre}
                                            className="w-12 h-12 rounded-md object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display =
                                                "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">
                                              Sin img
                                            </span>
                                          </div>
                                        );
                                      })()}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {similar.nombre}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                          {similar.descripcion?.substring(
                                            0,
                                            60,
                                          )}
                                          ...
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {similar.nombre_ubicacion}
                                          </Badge>
                                          {similar.lotes &&
                                            similar.lotes.length > 0 && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {similar.lotes.length} lotes
                                              </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium mt-1">
                                          Bs {formatBs(similar.precio_venta)} |
                                          Stock: {getStockTotal(similar)}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        agregarProducto(similar);
                                      }}
                                      disabled={
                                        stockDisponibleSimilar === 0 ||
                                        !tieneLotesSimilar
                                      }
                                      className="ml-2 flex-shrink-0 h-8"
                                    >
                                      {stockDisponibleSimilar === 0 ||
                                      !tieneLotesSimilar
                                        ? "Sin Stock"
                                        : "Agregar"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-xs text-muted-foreground">
                                No se pudieron cargar los productos similares
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading &&
              searchQuery.length >= 2 &&
              searchResults.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    No se encontraron productos
                  </p>
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" ref={cartRef}>
          <CardHeader>
            <CardTitle>Detalle de Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Doctor Switch y Selector */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <Label htmlFor="doctor-switch" className="font-medium">
                    Doctor
                  </Label>
                </div>
                <Switch
                  id="doctor-switch"
                  checked={isDoctorMode}
                  onCheckedChange={setIsDoctorMode}
                />
              </div>

              {isDoctorMode && (
                <DoctorSelect
                  selectedDoctor={selectedDoctor}
                  onDoctorChange={setSelectedDoctor}
                  onRefreshList={async () => {}}
                />
              )}
            </div>

            {ventaItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay productos agregados
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {ventaItems.map((item, index) => {
                  const subtotalItem = item.precio_venta * item.cantidad;
                  const descuentoItem = item.descuentoProducto || 0;
                  const totalItem = subtotalItem - descuentoItem;

                  return (
                    <div
                      key={item.idproducto + index}
                      className="border rounded-lg p-3 bg-card"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {(() => {
                          const imageUrl = getImageUrl(item.imagen);
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.nombre}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-muted-foreground">
                                Sin img
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm break-words whitespace-normal leading-tight">
                            {item.nombre}
                          </h5>
                          <p className="text-sm font-medium text-green-600 mt-1">
                            Bs {formatBs(item.precio_venta)} c/u
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProductoParaVerLotes(item);
                              setShowLotesCarrito(true);
                            }}
                            className="h-6 px-2 text-xs mt-1"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            Ver lotes ({item.lotesSeleccionados.length})
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const nuevaCantidad = item.cantidad - 1;
                              if (nuevaCantidad >= 1) {
                                const product = searchResults.find(
                                  (p) => p.idproducto === item.idproducto,
                                );
                                if (product) {
                                  abrirDialogoLotes(
                                    product,
                                    nuevaCantidad,
                                    true,
                                    index,
                                  );
                                } else {
                                  // Si no está en searchResults, usar el item mismo
                                  // Pero necesitamos un producto completo para abrir el diálogo
                                  // Buscar en todos los resultados o usar el item directamente
                                  const productData: Product = {
                                    idproducto: item.idproducto,
                                    nombre: item.nombre,
                                    descripcion: item.descripcion || "",
                                    estado: item.estado || 0,
                                    idubicacion: item.idubicacion || 0,
                                    nombre_ubicacion: item.nombre_ubicacion || "",
                                    imagen: item.imagen || "",
                                    precio_venta: item.precio_venta,
                                    stock: getStockTotal(item),
                                    lotes: item.lotes || [],
                                    productos_similares: item.productos_similares || [],
                                  };
                                  abrirDialogoLotes(
                                    productData,
                                    nuevaCantidad,
                                    true,
                                    index,
                                  );
                                }
                              } else {
                                eliminarItem(index);
                              }
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center text-sm font-medium">
                            {item.cantidad}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const nuevaCantidad = item.cantidad + 1;
                              const stockDisponible =
                                getStockDisponiblePorProducto(item) +
                                item.cantidad;
                              if (nuevaCantidad <= stockDisponible) {
                                const product = searchResults.find(
                                  (p) => p.idproducto === item.idproducto,
                                );
                                if (product) {
                                  abrirDialogoLotes(
                                    product,
                                    nuevaCantidad,
                                    true,
                                    index,
                                  );
                                } else {
                                  // Si no está en searchResults, usar el item mismo
                                  const productData: Product = {
                                    idproducto: item.idproducto,
                                    nombre: item.nombre,
                                    descripcion: item.descripcion || "",
                                    estado: item.estado || 0,
                                    idubicacion: item.idubicacion || 0,
                                    nombre_ubicacion: item.nombre_ubicacion || "",
                                    imagen: item.imagen || "",
                                    precio_venta: item.precio_venta,
                                    stock: getStockTotal(item),
                                    lotes: item.lotes || [],
                                    productos_similares: item.productos_similares || [],
                                  };
                                  abrirDialogoLotes(
                                    productData,
                                    nuevaCantidad,
                                    true,
                                    index,
                                  );
                                }
                              } else {
                                toast({
                                  title: "Stock insuficiente",
                                  description: `Solo hay ${stockDisponible} unidades disponibles en total`,
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={getStockDisponiblePorProducto(item) === 0}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold whitespace-nowrap">
                            Bs {formatBs(totalItem)}
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => eliminarItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Descuento por producto - MONTO FIJO (Bs) */}
                      <div className="flex items-center gap-2 border-t pt-2 mt-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Desc. (Bs):
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.descuentoProducto || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const descuento = isNaN(val)
                              ? 0
                              : Math.max(0, val);
                            const newItems = [...ventaItems];
                            newItems[index].descuentoProducto = descuento;
                            setVentaItems(newItems);
                          }}
                          placeholder="0.00"
                          className="w-20 h-7 text-xs number-input-no-scroll"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        {item.descuentoProducto > 0 && (
                          <span className="text-xs text-green-600 whitespace-nowrap">
                            -Bs {formatBs(descuentoItem)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Bs {formatBs(subtotalSinDescuentos)}</span>
              </div>

              {tieneDescuentosProducto && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuentos por producto:</span>
                    <span>-Bs {formatBs(descuentosProducto)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Subtotal con descuentos por producto:</span>
                    <span>Bs {formatBs(subtotalConDescuentosProducto)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Descuento %:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    id="descuentoPorcentaje"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={descuentoPorcentaje || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val >= 0 && val <= 100) {
                        setDescuentoPorcentaje(val || 0);
                      } else if (e.target.value === "") {
                        setDescuentoPorcentaje(0);
                      }
                    }}
                    placeholder="0"
                    className="w-20 h-8 number-input-no-scroll"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  <span className="whitespace-nowrap">
                    {descuentoPorcentaje > 0 &&
                      `-Bs ${formatBs(descuentoMonto)}`}
                  </span>
                </div>
              </div>

              {isDoctorMode && selectedDoctor && (
                <div className="flex justify-end">
                  <Badge variant="secondary" className="text-xs">
                    Doctor: {selectedDoctor.nombre}
                  </Badge>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>Bs {formatBs(total)}</span>
              </div>

              {/* Campo de justificación de descuento - visible si hay descuentos */}
              {tieneDescuentos && (
                <div className="mt-3">
                  <Label htmlFor="discountReason" className="text-sm font-medium">
                    Justificación del descuento *
                  </Label>
                  <Textarea
                    id="discountReason"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="Explique el motivo del descuento..."
                    rows={2}
                    className="mt-1"
                  />
                  {isDoctorMode && selectedDoctor && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Descuento aplicado por: {selectedDoctor.nombre}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Método de Pago:</Label>
              <RadioGroup
                value={metodoPago}
                onValueChange={(value: "Efectivo" | "QR") =>
                  setMetodoPago(value)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Efectivo" id="efectivo" />
                  <Label htmlFor="efectivo">Efectivo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="QR" id="qr" />
                  <Label htmlFor="qr">QR</Label>
                </div>
              </RadioGroup>

              {metodoPago === "Efectivo" && (
                <div className="space-y-2">
                  <Label htmlFor="montoPagado">
                    Monto Pagado (opcional para calcular cambio):
                  </Label>
                  <Input
                    id="montoPagado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoPagado || ""}
                    onChange={(e) =>
                      setMontoPagado(Number(e.target.value) || 0)
                    }
                    placeholder="Ingrese el monto pagado"
                    className="number-input-no-scroll"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {montoPagado > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">
                        Cambio: Bs {formatBs(cambio)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === "QR" && (
                <div className="text-center">
                  <div className="w-64 h-64 bg-white rounded-lg mx-auto flex items-center justify-center border-2 border-primary/20">
                    <img
                      src="/qr.jpg"
                      alt="Código QR para pago"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Escanea el código QR para pagar
                  </p>
                </div>
              )}
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={
                    ventaItems.length === 0 ||
                    !cajaAbierta ||
                    tieneItemsInvalidos ||
                    (isDoctorMode && !selectedDoctor) ||
                    (tieneDescuentos && !discountReason.trim())
                  }
                >
                  {!cajaAbierta
                    ? "Caja Cerrada"
                    : tieneItemsInvalidos
                    ? "Cantidades inválidas"
                    : isDoctorMode && !selectedDoctor
                    ? "Seleccionar doctor"
                    : tieneDescuentos && !discountReason.trim()
                    ? "Justificar descuento"
                    : "Procesar Venta"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Venta</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de procesar esta venta por Bs {formatBs(total)}
                    ?
                    {isDoctorMode && selectedDoctor && (
                      <span className="block mt-2 text-sm">
                        Doctor asignado:{" "}
                        <strong>{selectedDoctor.nombre}</strong>
                      </span>
                    )}
                    {tieneDescuentos && (
                      <span className="block mt-2 text-sm text-amber-600">
                        Descuento aplicado:{" "}
                        <strong>
                          Bs {formatBs(descuentosProducto + descuentoMonto)}
                        </strong>
                        <br />
                        <span className="text-xs">
                          Motivo: {discountReason}
                        </span>
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={procesarVenta} disabled={loading}>
                    {loading ? "Procesando..." : "Confirmar Venta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { getImageUrl };