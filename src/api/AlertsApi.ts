// api/AlertsApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces
interface BackendAlert {
  idproducto: number;
  nombre: string;
  descripcion: string | null;
  nombre_ubicacion: string;
  laboratorio: string;
  stock: number;
  stock_minimo: number;
  imagen: string;
}

export interface AlertStockBajo {
  id: number;
  producto: string;
  descripcion: string | null;
  ubicacion: string;
  laboratorio: string;
  cantidad: number;
  stockMinimo: number;
  imagen: string;
}

export interface AlertVencimiento {
  id: number;
  idproducto: number;
  producto: string;
  descripcion: string | null;
  ubicacion: string;
  laboratorio: string;
  idlote: number;
  stock: number;
  fechaVencimiento: string;
  diasRestantes: number;
  imagen: string;
}

export interface AlertasPaginadas {
  items: AlertStockBajo[] | AlertVencimiento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const getDefaultImage = (productName: string): string => {
  return "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
};

export const getLowStockAlerts = async (filters: {
  search?: string;
  prioridad?: string;
  page?: number;
  limit?: number;
} = {}): Promise<AlertasPaginadas> => {
  try {
    const params: any = {};
    if (filters.search) params.search = filters.search;
    if (filters.prioridad && filters.prioridad !== 'todas') params.prioridad = filters.prioridad;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const response = await api.get<{
      items: BackendAlert[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/alerts/low-stock", { params });
    
    return {
      items: response.data.items.map(producto => ({
        id: producto.idproducto,
        producto: producto.nombre,
        ubicacion: producto.nombre_ubicacion,
        descripcion: producto.descripcion,
        cantidad: producto.stock,
        laboratorio: producto.laboratorio,
        stockMinimo: producto.stock_minimo,
        imagen: producto.imagen ? producto.imagen : getDefaultImage(producto.nombre)
      })),
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages
    };
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    throw new Error("No se pudieron cargar las alertas de stock bajo");
  }
};

export const getExpirationAlerts = async (filters: {
  search?: string;
  prioridad?: string;
  page?: number;
  limit?: number;
} = {}): Promise<AlertasPaginadas> => {
  try {
    const params: any = {};
    if (filters.search) params.search = filters.search;
    if (filters.prioridad && filters.prioridad !== 'todas') params.prioridad = filters.prioridad;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const response = await api.get<{
      items: AlertVencimiento[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/alerts/expiring-soon", { params });
    
    return response.data;
  } catch (error) {
    console.error("Error fetching expiration alerts:", error);
    throw new Error("No se pudieron cargar las alertas de vencimiento");
  }
};