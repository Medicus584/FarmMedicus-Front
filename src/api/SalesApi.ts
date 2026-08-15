import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para los lotes
export interface Lote {
  idlote: number;
  idproducto: number;
  stock: number;
  fechaVencimiento: string;
  fechaCreacion: string;
}

export interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  imagen: string;
  precio_venta: string;
  stock: number;
  lotes?: Lote[];
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

interface BackendCashStatus {
  idestado_caja: number;
  estado: string;
  monto_inicial: string;
  monto_final: string;
  idusuario: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
}

export interface Product {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  imagen: string;
  precio_venta: number;
  stock: number;
  lotes?: Lote[];
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

export interface SaleItem {
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  idlote?: number;
}

export interface SaleRequest {
  descripcion: string;
  sub_total: number;
  descuento: number;
  total: number;
  metodo_pago: "Efectivo" | "QR";
  descripcion_descuento: string;
  items: SaleItem[];
  userId?: number;
}

export interface CashStatus {
  idestado_caja: number;
  estado: "abierta" | "cerrada";
  monto_inicial: number;
  monto_final: number;
  idusuario: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
}

// Datos mock para pruebas
const MOCK_LOTES: Record<number, Lote[]> = {
  1: [
    { idlote: 101, idproducto: 1, stock: 10, fechaVencimiento: "2026-12-31", fechaCreacion: "2026-01-15" },
    { idlote: 102, idproducto: 1, stock: 20, fechaVencimiento: "2027-06-30", fechaCreacion: "2026-02-20" }
  ],
  2: [
    { idlote: 201, idproducto: 2, stock: 5, fechaVencimiento: "2026-10-15", fechaCreacion: "2026-01-10" },
    { idlote: 202, idproducto: 2, stock: 15, fechaVencimiento: "2027-01-20", fechaCreacion: "2026-03-05" }
  ],
  3: [
    { idlote: 301, idproducto: 3, stock: 30, fechaVencimiento: "2026-12-01", fechaCreacion: "2026-02-01" }
  ],
  4: [
    { idlote: 401, idproducto: 4, stock: 8, fechaVencimiento: "2026-11-15", fechaCreacion: "2026-01-20" },
    { idlote: 402, idproducto: 4, stock: 12, fechaVencimiento: "2027-02-28", fechaCreacion: "2026-03-10" },
    { idlote: 403, idproducto: 4, stock: 5, fechaVencimiento: "2026-09-01", fechaCreacion: "2025-12-01" }
  ]
};

const MOCK_PRODUCTS: BackendProduct[] = [
  {
    idproducto: 1,
    nombre: "Paracetamol 500mg",
    descripcion: "Analgésico y antipirético",
    estado: 1,
    idubicacion: 1,
    nombre_ubicacion: "Estante A1",
    imagen: "",
    precio_venta: "15.50",
    stock: 30,
    productos_similares: [{ idproducto: 2, nombre: "Ibuprofeno 400mg" }]
  },
  {
    idproducto: 2,
    nombre: "Ibuprofeno 400mg",
    descripcion: "Antiinflamatorio no esteroideo",
    estado: 1,
    idubicacion: 1,
    nombre_ubicacion: "Estante A2",
    imagen: "",
    precio_venta: "18.00",
    stock: 20,
    productos_similares: [{ idproducto: 1, nombre: "Paracetamol 500mg" }]
  },
  {
    idproducto: 3,
    nombre: "Amoxicilina 500mg",
    descripcion: "Antibiótico de amplio espectro",
    estado: 1,
    idubicacion: 2,
    nombre_ubicacion: "Estante B1",
    imagen: "",
    precio_venta: "25.00",
    stock: 30,
    productos_similares: []
  },
  {
    idproducto: 4,
    nombre: "Omeprazol 20mg",
    descripcion: "Inhibidor de la bomba de protones",
    estado: 1,
    idubicacion: 2,
    nombre_ubicacion: "Estante B2",
    imagen: "",
    precio_venta: "12.00",
    stock: 25,
    productos_similares: []
  }
];

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const searchProducts = async (
  query: string,
  withoutStock: boolean = true,
): Promise<Product[]> => {
  try {
    let filteredProducts = MOCK_PRODUCTS;
    
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filteredProducts = MOCK_PRODUCTS.filter(p => 
        p.nombre.toLowerCase().includes(q) || 
        p.descripcion.toLowerCase().includes(q)
      );
    }

    const productsWithLotes = filteredProducts.map(p => ({
      ...p,
      lotes: MOCK_LOTES[p.idproducto] || []
    }));

    return productsWithLotes.map(mapBackendProduct);
  } catch (error) {
    console.error("Error searching products:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

export const getCashStatus = async (): Promise<CashStatus> => {
  try {
    const mockCashStatus: BackendCashStatus = {
      idestado_caja: 1,
      estado: "abierta",
      monto_inicial: "500.00",
      monto_final: "0.00",
      idusuario: 1,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null
    };
    
    return mapBackendCashStatus(mockCashStatus);
  } catch (error) {
    console.error("Error fetching cash status:", error);
    throw new Error("No se pudo obtener el estado de la caja");
  }
};

export const processSale = async (
  sale: SaleRequest,
  userId: number,
): Promise<{ idventa: number }> => {
  try {
    const itemsSinLote = sale.items.filter(item => !item.idlote);
    if (itemsSinLote.length > 0) {
      throw new Error("Todos los items deben tener un lote asignado");
    }

    for (const item of sale.items) {
      const product = MOCK_PRODUCTS.find(p => p.idproducto === item.idproducto);
      if (!product) continue;
      
      const lote = MOCK_LOTES[item.idproducto]?.find(l => l.idlote === item.idlote);
      if (!lote || lote.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto ${product.nombre}`);
      }
    }

    console.log("Venta procesada:", { sale, userId });
    
    return { idventa: Math.floor(Math.random() * 1000) };
  } catch (error) {
    console.error("Error processing sale:", error);
    throw error instanceof Error ? error : new Error("No se pudo procesar la venta");
  }
};

export function mapBackendProduct(product: BackendProduct): Product {
  return {
    idproducto: product.idproducto,
    nombre: product.nombre,
    descripcion: product.descripcion,
    estado: product.estado,
    idubicacion: product.idubicacion,
    nombre_ubicacion: product.nombre_ubicacion,
    imagen: product.imagen,
    precio_venta: parseFloat(product.precio_venta),
    stock: product.stock,
    lotes: product.lotes || [],
    productos_similares: product.productos_similares || [],
  };
}

function mapBackendCashStatus(cashStatus: BackendCashStatus): CashStatus {
  return {
    idestado_caja: cashStatus.idestado_caja,
    estado: cashStatus.estado as "abierta" | "cerrada",
    monto_inicial: parseFloat(cashStatus.monto_inicial),
    monto_final: parseFloat(cashStatus.monto_final),
    idusuario: cashStatus.idusuario,
    fecha_apertura: cashStatus.fecha_apertura,
    fecha_cierre: cashStatus.fecha_cierre,
  };
}