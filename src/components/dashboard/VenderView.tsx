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
  CreditCard,
  DollarSign,
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
import { PrintSalesHistory, type VentaData, type ProductoItem } from "./VentasPDF";

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

  // Estado local para los valores de cantidad en el input
  const [cantidadInputValues, setCantidadInputValues] = useState<Record<number, string>>({});

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

  // Sincronizar los valores del input cuando cambia el carrito
  useEffect(() => {
    const newValues: Record<number, string> = {};
    ventaItems.forEach((item, index) => {
      const key = item.idproducto + index;
      if (!(key in cantidadInputValues) || cantidadInputValues[key] === "") {
        newValues[key] = String(item.cantidad);
      }
    });
    setCantidadInputValues(prev => ({ ...prev, ...newValues }));
  }, [ventaItems]);

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

  // Función para distribuir cantidad entre lotes de manera óptima
  const distribuirCantidadEnLotes = (
    lotes: Lote[],
    cantidad: number,
    existingLotes: { idlote: number; cantidad: number; fechaVencimiento: string }[] = []
  ): { idlote: number; cantidad: number; fechaVencimiento: string }[] => {
    // Crear un mapa de los lotes existentes para preservar la distribución anterior
    const existingMap = new Map<number, number>();
    existingLotes.forEach(l => {
      existingMap.set(l.idlote, l.cantidad);
    });

    // Ordenar lotes por fecha de vencimiento (los que vencen primero primero)
    const sortedLotes = [...lotes].sort((a, b) => 
      new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );

    // Si no hay lotes existentes o la cantidad es 0, distribuir desde cero
    if (existingLotes.length === 0 || cantidad === 0) {
      const result: { idlote: number; cantidad: number; fechaVencimiento: string }[] = [];
      let restante = cantidad;

      for (const lote of sortedLotes) {
        if (restante <= 0) break;
        const tomar = Math.min(lote.stock, restante);
        if (tomar > 0) {
          result.push({
            idlote: lote.idlote,
            cantidad: tomar,
            fechaVencimiento: lote.fechaVencimiento,
          });
          restante -= tomar;
        }
      }

      // Si no se pudo distribuir toda la cantidad, devolver lo que se pudo
      return result;
    }

    // Si hay lotes existentes, intentar mantener la distribución y ajustar
    const result: { idlote: number; cantidad: number; fechaVencimiento: string }[] = [];
    let restante = cantidad;

    // Primero, mantener los lotes existentes
    for (const lote of sortedLotes) {
      const existingCantidad = existingMap.get(lote.idlote) || 0;
      if (existingCantidad > 0 && restante > 0) {
        // Mantener la cantidad existente, pero no exceder el stock
        const mantener = Math.min(existingCantidad, lote.stock, restante);
        if (mantener > 0) {
          result.push({
            idlote: lote.idlote,
            cantidad: mantener,
            fechaVencimiento: lote.fechaVencimiento,
          });
          restante -= mantener;
        }
      }
    }

    // Si aún falta cantidad, distribuir entre lotes con stock disponible
    if (restante > 0) {
      for (const lote of sortedLotes) {
        if (restante <= 0) break;
        // Verificar si este lote ya fue agregado
        const existing = result.find(r => r.idlote === lote.idlote);
        const currentCantidad = existing ? existing.cantidad : 0;
        const disponible = lote.stock - currentCantidad;
        
        if (disponible > 0) {
          const tomar = Math.min(disponible, restante);
          if (existing) {
            existing.cantidad += tomar;
          } else {
            result.push({
              idlote: lote.idlote,
              cantidad: tomar,
              fechaVencimiento: lote.fechaVencimiento,
            });
          }
          restante -= tomar;
        }
      }
    }

    // Si después de todo no se pudo cubrir toda la cantidad, devolver lo que se pudo
    return result;
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
        // Actualizar el valor del input
        const key = product.idproducto + index;
        setCantidadInputValues(prev => ({ ...prev, [key]: String(cantidad) }));
      } else {
        // Verificar si el producto ya está en el carrito
        const existingIndex = ventaItems.findIndex(
          (item) => item.idproducto === product.idproducto
        );

        if (existingIndex >= 0) {
          // Si ya existe, actualizar la cantidad sumando
          const updatedItems = [...ventaItems];
          const nuevaCantidad = updatedItems[existingIndex].cantidad + cantidad;
          // Verificar que no exceda el stock disponible
          if (nuevaCantidad <= getStockDisponiblePorProducto(product) + updatedItems[existingIndex].cantidad) {
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              cantidad: nuevaCantidad,
              lotesSeleccionados: [
                ...updatedItems[existingIndex].lotesSeleccionados,
                ...lotesInfo
              ],
            };
            setVentaItems(updatedItems);
            const key = product.idproducto + existingIndex;
            setCantidadInputValues(prev => ({ ...prev, [key]: String(nuevaCantidad) }));
            toast({
              title: "Producto actualizado",
              description: `${product.nombre} ahora tiene ${nuevaCantidad} unidades en el carrito`,
            });
          } else {
            toast({
              title: "Stock insuficiente",
              description: `No hay suficiente stock para agregar más ${product.nombre}`,
              variant: "destructive",
            });
          }
        } else {
          // Si no existe, agregar nuevo
          const nuevoItem: SaleItemWithLotes = {
            ...product,
            cantidad,
            lotesSeleccionados: lotesInfo,
            descuentoProducto: 0,
          };
          const newIndex = ventaItems.length;
          setVentaItems([...ventaItems, nuevoItem]);
          const key = product.idproducto + newIndex;
          setCantidadInputValues(prev => ({ ...prev, [key]: String(cantidad) }));
          toast({
            title: "Producto agregado",
            description: `${product.nombre} (${cantidad} unidades del lote #${lote.idlote})`,
          });
        }
      }
      return;
    }

    // Si hay múltiples lotes, abrir diálogo
    setProductoParaLote(product);
    setCantidadInicialParaLote(cantidad);
    setEsEdicion(esEdicion);
    setItemIndexParaLote(index);
    setShowLoteDialog(true);
  };

  // Función para actualizar cantidad manualmente desde el input
  const actualizarCantidadManual = (index: number, nuevaCantidad: number) => {
    const item = ventaItems[index];
    if (!item) return;

    // Validar que la cantidad sea válida
    if (nuevaCantidad < 1) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser al menos 1",
        variant: "destructive",
      });
      return;
    }

    // Obtener el producto completo (de searchResults o del item)
    let product = searchResults.find(p => p.idproducto === item.idproducto);
    if (!product) {
      // Si no está en searchResults, construir uno
      product = {
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
    }

    const stockDisponible = getStockDisponiblePorProducto(product) + item.cantidad;

    if (nuevaCantidad > stockDisponible) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${stockDisponible} unidades disponibles en total para ${product.nombre}`,
        variant: "destructive",
      });
      // Restaurar el valor anterior en el input
      const key = item.idproducto + index;
      setCantidadInputValues(prev => ({ ...prev, [key]: String(item.cantidad) }));
      return;
    }

    // Distribuir la nueva cantidad entre los lotes
    const lotesDisponibles = product.lotes || [];
    const nuevosLotes = distribuirCantidadEnLotes(
      lotesDisponibles,
      nuevaCantidad,
      item.lotesSeleccionados
    );

    // Verificar que se haya podido distribuir toda la cantidad
    const totalDistribuido = nuevosLotes.reduce((sum, l) => sum + l.cantidad, 0);
    if (totalDistribuido < nuevaCantidad) {
      toast({
        title: "Stock insuficiente",
        description: `No hay suficiente stock en los lotes para cubrir ${nuevaCantidad} unidades. Disponible: ${totalDistribuido}`,
        variant: "destructive",
      });
      // Restaurar el valor anterior en el input
      const key = item.idproducto + index;
      setCantidadInputValues(prev => ({ ...prev, [key]: String(item.cantidad) }));
      return;
    }

    // Actualizar el item
    const updatedItems = [...ventaItems];
    updatedItems[index] = {
      ...item,
      cantidad: nuevaCantidad,
      lotesSeleccionados: nuevosLotes,
    };
    setVentaItems(updatedItems);
    // Actualizar el valor del input
    const key = item.idproducto + index;
    setCantidadInputValues(prev => ({ ...prev, [key]: String(nuevaCantidad) }));
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
      const key = productoParaLote.idproducto + itemIndexParaLote;
      setCantidadInputValues(prev => ({ ...prev, [key]: String(cantidadTotal) }));

      toast({
        title: "Cantidad actualizada",
        description: `${productoParaLote.nombre} actualizado a ${cantidadTotal} unidades`,
      });
    } else {
      // Verificar si el producto ya está en el carrito
      const existingIndex = ventaItems.findIndex(
        (item) => item.idproducto === productoParaLote.idproducto
      );

      if (existingIndex >= 0) {
        // Si ya existe, actualizar la cantidad sumando
        const updatedItems = [...ventaItems];
        const nuevaCantidad = updatedItems[existingIndex].cantidad + cantidadTotal;
        // Verificar que no exceda el stock disponible
        if (nuevaCantidad <= getStockDisponiblePorProducto(productoParaLote) + updatedItems[existingIndex].cantidad) {
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            cantidad: nuevaCantidad,
            lotesSeleccionados: [
              ...updatedItems[existingIndex].lotesSeleccionados,
              ...lotesInfo
            ],
          };
          setVentaItems(updatedItems);
          const key = productoParaLote.idproducto + existingIndex;
          setCantidadInputValues(prev => ({ ...prev, [key]: String(nuevaCantidad) }));
          toast({
            title: "Producto actualizado",
            description: `${productoParaLote.nombre} ahora tiene ${nuevaCantidad} unidades en el carrito`,
          });
        } else {
          toast({
            title: "Stock insuficiente",
            description: `No hay suficiente stock para agregar más ${productoParaLote.nombre}`,
            variant: "destructive",
          });
        }
      } else {
        // Si no existe, agregar nuevo
        const nuevoItem: SaleItemWithLotes = {
          ...productoParaLote,
          cantidad: cantidadTotal,
          lotesSeleccionados: lotesInfo,
          descuentoProducto: 0,
        };
        const newIndex = ventaItems.length;
        setVentaItems([...ventaItems, nuevoItem]);
        const key = productoParaLote.idproducto + newIndex;
        setCantidadInputValues(prev => ({ ...prev, [key]: String(cantidadTotal) }));

        toast({
          title: "Producto agregado",
          description: `${productoParaLote.nombre} agregado al carrito con ${cantidadTotal} unidades`,
        });
      }
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
    // Limpiar el valor del input para este item
    const item = ventaItems[index];
    if (item) {
      const key = item.idproducto + index;
      setCantidadInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
    }
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

      // ========== IMPRIMIR TICKET ==========
      const productosParaImpresion: ProductoItem[] = ventaItems.map((item) => ({
        nombre: item.nombre,
        precio: item.precio_venta,
        cantidad: item.cantidad,
      }));

      const ventaData: VentaData = {
        codigoVenta: Date.now().toString(),
        clientName: "",
        fechaVenta: new Date().toISOString(),
        total: total,
        montoPagado: metodoPago === "Efectivo" ? montoPagado : total,
        subtotal: subtotalSinDescuentos,
        descuento: descuentoTotal,
        tiendaNombre: "LUMYLA",
        registradoPor: username,
        productos: productosParaImpresion,
      };

      await PrintSalesHistory.imprimir(ventaData);
      // ========== FIN IMPRESIÓN ==========

      setVentaItems([]);
      setDescuentoPorcentaje(0);
      setMontoPagado(0);
      setShowConfirm(false);
      setDiscountReason("");
      setIsDoctorMode(false);
      setSelectedDoctor(null);
      setCantidadInputValues({});

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
    <div className="space-y-4 md:space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between py-3 md:py-4 px-3 md:px-6">
            <CardTitle className="text-base md:text-lg">Buscar Productos</CardTitle>
            <Badge variant={cajaAbierta ? "default" : "destructive"} className="text-[10px] md:text-xs">
              Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
            </Badge>
          </CardHeader>
          <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 md:h-4 md:w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nombre o código"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 md:pl-10 text-sm md:text-base h-9 md:h-10"
                disabled={loading}
                autoFocus={true}
              />
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openScanner}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 md:h-8 md:w-8 p-0"
                >
                  <Camera className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              )}
            </div>

            {loading && (
              <div className="text-center py-3 md:py-4">
                <p className="text-xs md:text-sm text-muted-foreground">Buscando productos...</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-96 overflow-y-auto">
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
                      className="border rounded-lg p-3 md:p-4 space-y-2 md:space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                          {(() => {
                            const imageUrl = getImageUrl(product.imagen);
                            return imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.nombre}
                                className="w-12 h-12 md:w-16 md:h-16 rounded-md object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] md:text-xs text-muted-foreground">
                                  Sin imagen
                                </span>
                              </div>
                            );
                          })()}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-xs md:text-sm break-words">
                              {product.nombre}
                            </h4>
                            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 md:line-clamp-2">
                              {product.descripcion}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1">
                              <Badge variant="outline" className="text-[9px] md:text-xs px-1 md:px-2">
                                {product.nombre_ubicacion}
                              </Badge>
                              {cantidadEnCarrito > 0 && (
                                <Badge variant="secondary" className="text-[9px] md:text-xs px-1 md:px-2">
                                  En carrito: {cantidadEnCarrito}
                                </Badge>
                              )}
                              {product.lotes && product.lotes.length > 0 && (
                                <Badge variant="outline" className="text-[9px] md:text-xs px-1 md:px-2">
                                  {product.lotes.length} lotes
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] md:text-xs font-medium mt-0.5 md:mt-1">
                              Bs {formatBs(product.precio_venta)} | Stock: {getStockTotal(product)}
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
                          className="ml-1 md:ml-2 flex-shrink-0 h-7 md:h-9 text-[10px] md:text-xs px-2 md:px-3"
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
                            className="h-6 md:h-7 px-1.5 md:px-2 text-[10px] md:text-xs"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" /> Ver
                                menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" /> Ver
                                similares ({product.productos_similares!.length})
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {hasSimilares && isExpanded && (
                        <div className="pl-2 md:pl-4 border-l-2 border-primary/30 space-y-2 mt-2">
                          <p className="text-[10px] md:text-xs font-medium text-muted-foreground">
                            Productos similares:
                          </p>
                          {isLoadingSimilars ? (
                            <div className="text-center py-2 md:py-4">
                              <p className="text-[10px] md:text-xs text-muted-foreground">
                                Cargando...
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
                                  className="bg-muted/30 rounded-lg p-2 md:p-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                                      {(() => {
                                        const imageUrl = getImageUrl(
                                          similar.imagen,
                                        );
                                        return imageUrl ? (
                                          <img
                                            src={imageUrl}
                                            alt={similar.nombre}
                                            className="w-8 h-8 md:w-10 md:h-10 rounded-md object-cover flex-shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.style.display =
                                                "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                            <span className="text-[8px] md:text-[10px] text-muted-foreground">
                                              Sin img
                                            </span>
                                          </div>
                                        );
                                      })()}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] md:text-sm font-medium truncate">
                                          {similar.nombre}
                                        </p>
                                        <p className="text-[9px] md:text-xs text-muted-foreground line-clamp-1">
                                          {similar.descripcion?.substring(0, 40)}
                                          ...
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                          <Badge variant="outline" className="text-[8px] md:text-[10px] px-1">
                                            {similar.nombre_ubicacion}
                                          </Badge>
                                          {similar.lotes &&
                                            similar.lotes.length > 0 && (
                                              <Badge variant="outline" className="text-[8px] md:text-[10px] px-1">
                                                {similar.lotes.length} lotes
                                              </Badge>
                                            )}
                                        </div>
                                        <p className="text-[9px] md:text-xs font-medium mt-0.5">
                                          Bs {formatBs(similar.precio_venta)} | Stock: {getStockTotal(similar)}
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
                                      className="ml-1 md:ml-2 flex-shrink-0 h-6 md:h-8 text-[9px] md:text-xs px-1.5 md:px-2"
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
                            <div className="text-center py-2 md:py-4">
                              <p className="text-[10px] md:text-xs text-muted-foreground">
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
                <div className="text-center py-3 md:py-4">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    No se encontraron productos
                  </p>
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" ref={cartRef}>
          <CardHeader className="py-3 md:py-4 px-3 md:px-6">
            <CardTitle className="text-base md:text-lg">Detalle de Venta</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
            {/* Doctor Switch y Selector */}
            <div className="border rounded-lg p-3 md:p-4 space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                  <Label htmlFor="doctor-switch" className="text-xs md:text-sm font-medium">
                    Doctor
                  </Label>
                </div>
                <Switch
                  id="doctor-switch"
                  checked={isDoctorMode}
                  onCheckedChange={setIsDoctorMode}
                  className="scale-75 md:scale-100"
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
              <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">
                No hay productos agregados
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3 max-h-48 md:max-h-64 overflow-y-auto">
                {ventaItems.map((item, index) => {
                  const subtotalItem = item.precio_venta * item.cantidad;
                  const descuentoItem = item.descuentoProducto || 0;
                  const totalItem = subtotalItem - descuentoItem;
                  const key = item.idproducto + index;
                  const inputValue = cantidadInputValues[key] !== undefined ? cantidadInputValues[key] : String(item.cantidad);

                  return (
                    <div
                      key={key}
                      className="border rounded-lg p-2 md:p-3 bg-card"
                    >
                      <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
                        {(() => {
                          const imageUrl = getImageUrl(item.imagen);
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.nombre}
                              className="w-10 h-10 md:w-12 md:h-12 rounded object-cover flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] md:text-xs text-muted-foreground">
                                Sin img
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-xs md:text-sm break-words whitespace-normal leading-tight">
                            {item.nombre}
                          </h5>
                          <p className="text-xs md:text-sm font-medium text-green-600 mt-0.5 md:mt-1">
                            Bs {formatBs(item.precio_venta)} c/u
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProductoParaVerLotes(item);
                              setShowLotesCarrito(true);
                            }}
                            className="h-5 md:h-6 px-1.5 md:px-2 text-[9px] md:text-xs mt-0.5 md:mt-1"
                          >
                            <Package className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                            Ver lotes ({item.lotesSeleccionados.length})
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1 md:mb-2">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
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
                            <Minus className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={inputValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCantidadInputValues(prev => ({ ...prev, [key]: val }));
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setCantidadInputValues(prev => ({ ...prev, [key]: String(item.cantidad) }));
                                return;
                              }
                              const numVal = parseInt(val);
                              if (!isNaN(numVal) && numVal >= 1) {
                                actualizarCantidadManual(index, numVal);
                              } else {
                                setCantidadInputValues(prev => ({ ...prev, [key]: String(item.cantidad) }));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-12 md:w-16 h-7 md:h-8 text-center text-xs md:text-sm number-input-no-scroll"
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
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
                                  description: `Solo hay ${stockDisponible} unidades disponibles`,
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={getStockDisponiblePorProducto(item) === 0}
                          >
                            <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-1 md:gap-2">
                          <p className="text-xs md:text-sm font-bold whitespace-nowrap">
                            Bs {formatBs(totalItem)}
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
                            onClick={() => eliminarItem(index)}
                          >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2 border-t pt-1.5 md:pt-2 mt-1">
                        <span className="text-[9px] md:text-xs text-muted-foreground whitespace-nowrap">
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
                          className="w-16 md:w-20 h-6 md:h-7 text-[10px] md:text-xs number-input-no-scroll"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        {item.descuentoProducto > 0 && (
                          <span className="text-[9px] md:text-xs text-green-600 whitespace-nowrap">
                            -Bs {formatBs(descuentoItem)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-3 md:pt-4 space-y-1.5 md:space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span>Subtotal:</span>
                <span>Bs {formatBs(subtotalSinDescuentos)}</span>
              </div>

              {tieneDescuentosProducto && (
                <>
                  <div className="flex justify-between text-xs md:text-sm text-green-600">
                    <span>Descuentos por producto:</span>
                    <span>-Bs {formatBs(descuentosProducto)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm font-medium">
                    <span>Subtotal con descuentos:</span>
                    <span>Bs {formatBs(subtotalConDescuentosProducto)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-xs md:text-sm">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  Descuento %:
                </span>
                <div className="flex items-center gap-1 md:gap-2">
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
                    className="w-16 md:w-20 h-7 md:h-8 text-xs md:text-sm number-input-no-scroll"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  <span className="text-xs md:text-sm whitespace-nowrap">
                    {descuentoPorcentaje > 0 &&
                      `-Bs ${formatBs(descuentoMonto)}`}
                  </span>
                </div>
              </div>

              {isDoctorMode && selectedDoctor && (
                <div className="flex justify-end">
                  <Badge variant="secondary" className="text-[9px] md:text-xs">
                    Doctor: {selectedDoctor.nombre}
                  </Badge>
                </div>
              )}

              <div className="flex justify-between text-base md:text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>Bs {formatBs(total)}</span>
              </div>

              {tieneDescuentos && (
                <div className="mt-2 md:mt-3">
                  <Label htmlFor="discountReason" className="text-xs md:text-sm font-medium">
                    Justificación del descuento *
                  </Label>
                  <Textarea
                    id="discountReason"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="Explique el motivo del descuento..."
                    rows={2}
                    className="mt-1 text-xs md:text-sm"
                  />
                  {isDoctorMode && selectedDoctor && (
                    <p className="text-[9px] md:text-xs text-muted-foreground mt-1">
                      Descuento aplicado por: {selectedDoctor.nombre}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 md:space-y-4">
              <Label className="text-xs md:text-sm font-medium">Método de Pago:</Label>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <Button
                  type="button"
                  variant={metodoPago === "Efectivo" ? "default" : "outline"}
                  className="h-10 md:h-12 text-sm md:text-base font-semibold flex items-center gap-1.5 md:gap-2"
                  onClick={() => setMetodoPago("Efectivo")}
                >
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                  Efectivo
                </Button>
                <Button
                  type="button"
                  variant={metodoPago === "QR" ? "default" : "outline"}
                  className="h-10 md:h-12 text-sm md:text-base font-semibold flex items-center gap-1.5 md:gap-2"
                  onClick={() => setMetodoPago("QR")}
                >
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                  QR
                </Button>
              </div>

              {metodoPago === "Efectivo" && (
                <div className="space-y-2 pt-1 md:pt-2">
                  <Label htmlFor="montoPagado" className="text-xs md:text-sm font-medium">
                    Monto Pagado (opcional):
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-xs md:text-sm">
                      Bs
                    </span>
                    <Input
                      id="montoPagado"
                      type="number"
                      min="0"
                      step="0.01"
                      value={montoPagado || ""}
                      onChange={(e) =>
                        setMontoPagado(Number(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="pl-8 md:pl-10 text-sm md:text-base h-10 md:h-11 number-input-no-scroll"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  {montoPagado > 0 && (
                    <div className="text-xs md:text-sm bg-muted/50 rounded-lg p-2 md:p-3 flex justify-between items-center">
                      <span className="font-medium">Cambio:</span>
                      <span className="text-base md:text-lg font-bold text-green-600">
                        Bs {formatBs(cambio)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === "QR" && (
                <div className="text-center py-3 md:py-4">
                  <p className="text-xs md:text-sm text-muted-foreground">Pago con QR</p>
                </div>
              )}
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogTrigger asChild>
                <Button
                  className="w-full text-sm md:text-base h-10 md:h-11"
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
              <DialogContent className="max-w-[95vw] md:max-w-lg p-4 md:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base md:text-lg">Confirmar Venta</DialogTitle>
                  <DialogDescription className="text-sm md:text-base">
                    ¿Está seguro de procesar esta venta por Bs {formatBs(total)}
                    ?
                    {isDoctorMode && selectedDoctor && (
                      <span className="block mt-2 text-xs md:text-sm">
                        Doctor asignado:{" "}
                        <strong>{selectedDoctor.nombre}</strong>
                      </span>
                    )}
                    {tieneDescuentos && (
                      <span className="block mt-2 text-xs md:text-sm text-amber-600">
                        Descuento aplicado:{" "}
                        <strong>
                          Bs {formatBs(descuentosProducto + descuentoMonto)}
                        </strong>
                        <br />
                        <span className="text-[10px] md:text-xs">
                          Motivo: {discountReason}
                        </span>
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 justify-end mt-3 md:mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    className="text-sm md:text-base"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={procesarVenta} disabled={loading} className="text-sm md:text-base">
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