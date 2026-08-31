import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para los lotes
export interface Lote {
  idlote: number;
  stock: number;
  fechaVencimiento: string;
}

// Interface para Doctor - solo nombre
export interface Doctor {
  id: number;
  nombre: string;
}

export interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  ubicacion_nombre: string;
  imagen: string;
  precio_venta: string;
  stock_total: string;
  lotes?: Lote[];
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

interface ProductoListResponse {
  productos: BackendProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Actualizar interfaz para usar la nueva tabla caja
interface BackendCashStatus {
  idcaja: number;
  nombre_caja: string;
  estado: string;
  monto_final: string;
  idusuario: number;
  usuario: string;
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
  lotes: {
    idlote: number;
    cantidad: number;
  }[];
  descuento_monto?: number;
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
  doctorId?: number;
}

// Actualizar interfaz CashStatus
export interface CashStatus {
  idcaja: number;
  nombre_caja: string;
  estado: "abierta" | "cerrada";
  monto_final: number;
  idusuario: number;
  usuario: string;
}

// Funciones para doctores
export const getDoctors = async (): Promise<Doctor[]> => {
  try {
    const response = await api.get<Doctor[]>("/sales/doctores");
    return response.data;
  } catch (error) {
    console.error("Error fetching doctors:", error);
    throw new Error("No se pudieron obtener los doctores");
  }
};

export const createDoctor = async (data: { nombre: string }): Promise<Doctor> => {
  try {
    const response = await api.post<Doctor>("/sales/doctor", data);
    return response.data;
  } catch (error) {
    console.error("Error creating doctor:", error);
    throw new Error("No se pudo crear el doctor");
  }
};

export const updateDoctor = async (id: number, data: { nombre: string }): Promise<Doctor> => {
  try {
    const response = await api.patch<Doctor>(`/sales/doctor/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating doctor:", error);
    throw new Error("No se pudo actualizar el doctor");
  }
};

export const deleteDoctor = async (id: number): Promise<void> => {
  try {
    await api.delete(`/sales/doctor/${id}`);
  } catch (error) {
    console.error("Error deleting doctor:", error);
    throw new Error("No se pudo eliminar el doctor");
  }
};

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
    const params: Record<string, string | number> = {
      page: 1,
      limit: 15,
    };

    if (query && query.trim().length >= 2) {
      params.termino = query.trim();
    }

    const response = await api.get<ProductoListResponse>("/buscar", {
      params,
    });

    return response.data.productos.map(mapBackendProduct);
  } catch (error) {
    console.error("Error searching products:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

// ACTUALIZAR: getCashStatus para usar la nueva tabla caja
export const getCashStatus = async (): Promise<CashStatus> => {
  try {
    const response = await api.get<BackendCashStatus>("/sales/cash-status");
    return mapBackendCashStatus(response.data);
  } catch (error) {
    console.error("Error fetching cash status:", error);
    // Devolver estado por defecto si hay error
    return {
      idcaja: 0,
      nombre_caja: "Caja Principal",
      estado: "cerrada",
      monto_final: 0,
      idusuario: 0,
      usuario: "Sistema",
    };
  }
};

export const processSale = async (
  sale: SaleRequest,
  userId: number,
): Promise<{ idventa: number }> => {
  try {
    const saleWithUser = {
      ...sale,
      userId: userId,
    };

    const response = await api.post<{ idventa: number }>(
      "/sales/process",
      saleWithUser,
    );
    return response.data;
  } catch (error) {
    console.error("Error processing sale:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || "No se pudo procesar la venta");
    }
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
    nombre_ubicacion: product.ubicacion_nombre,
    imagen: product.imagen,
    precio_venta: parseFloat(product.precio_venta),
    stock: parseInt(product.stock_total),
    lotes: product.lotes || [],
    productos_similares: product.productos_similares || [],
  };
}

// ACTUALIZAR: mapBackendCashStatus para usar la nueva estructura
function mapBackendCashStatus(cashStatus: BackendCashStatus): CashStatus {
  return {
    idcaja: cashStatus.idcaja,
    nombre_caja: cashStatus.nombre_caja,
    estado: cashStatus.estado as "abierta" | "cerrada",
    monto_final: parseFloat(cashStatus.monto_final),
    idusuario: cashStatus.idusuario,
    usuario: cashStatus.usuario,
  };
}