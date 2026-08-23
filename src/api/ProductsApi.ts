// api/ProductsApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces
export interface BackendUbicacion {
  idubicacion: number;
  nombre: string;
  estado: number;
}

export interface BackendCategoria {
  idcategoria: number;
  nombre: string;
  estado: number;
}

export interface BackendLaboratorio {
  idlaboratorio: number;
  nombre: string;
  estado: number;
}

export interface BackendLote {
  idlote: number;
  idproducto: number;
  stock: number;
  fecha_vencimiento: string;
  estado: number;
}

interface BackendItem {
  id: number;
  nombre: string;
  estado: number;
}

export interface ProductoLote {
  idlote: number;
  stock: number;
  fechaVencimiento: string;
}

export interface Producto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  idubicacion: number;
  ubicacion_nombre: string;
  ubicacion: string;
  idlaboratorio: number;
  laboratorio_nombre: string;
  laboratorio: string;
  categorias: string[];
  estado: number;
  imagen: string;
  precio_venta: string;
  precio_compra: string;
  stock_total: number;
  stock_minimo: number;
  codigo_barras: string | null;
  lotes: ProductoLote[];
  productos_similares: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  idubicacion: number;
  idlaboratorio: number;
  categorias: number[];
  imagen?: File | string | null;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo?: number;
  codigo_barras?: string | null;
  productos_similares?: number[];
  lotes?: Array<{
    stock: number;
    fecha_vencimiento: string;
  }>;
}

export interface ProductoListResponse {
  productos: Producto[];
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

// ============ FUNCIONES PARA UBICACIONES ============

function mapBackendUbicacion(item: BackendItem): BackendUbicacion {
  return {
    idubicacion: item.id,
    nombre: item.nombre,
    estado: item.estado,
  };
}

export const getUbicaciones = async (): Promise<BackendUbicacion[]> => {
  try {
    const response = await api.get<BackendItem[]>("/management/ubicaciones");
    return response.data.map(mapBackendUbicacion);
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const createUbicacion = async (data: { nombre: string }): Promise<BackendUbicacion> => {
  try {
    const response = await api.post<BackendItem>("/management/ubicaciones", { nombre: data.nombre });
    return mapBackendUbicacion(response.data);
  } catch (error) {
    console.error("Error creating ubicacion:", error);
    throw new Error("No se pudo crear la ubicación");
  }
};

export const updateUbicacion = async (id: number, data: { nombre: string }): Promise<BackendUbicacion> => {
  try {
    const response = await api.put<BackendItem>(`/management/ubicaciones/${id}`, { nombre: data.nombre });
    return mapBackendUbicacion(response.data);
  } catch (error) {
    console.error("Error updating ubicacion:", error);
    throw new Error("No se pudo actualizar la ubicación");
  }
};

export const deleteUbicacion = async (id: number): Promise<void> => {
  try {
    await api.delete(`/management/ubicaciones/${id}`);
  } catch (error) {
    console.error("Error deleting ubicacion:", error);
    throw new Error("No se pudo eliminar la ubicación");
  }
};

// ============ FUNCIONES PARA CATEGORÍAS ============

function mapBackendCategorias(item: BackendItem): BackendCategoria {
  return {
    idcategoria: item.id,
    nombre: item.nombre,
    estado: item.estado,
  };
}

export const getCategorias = async (): Promise<BackendCategoria[]> => {
  try {
    const response = await api.get<BackendItem[]>("/management/categorias");
    return response.data.map(mapBackendCategorias);
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

export const createCategoria = async (data: { nombre: string }): Promise<BackendCategoria> => {
  try {
    const response = await api.post<BackendItem>("/management/categorias", { nombre: data.nombre });
    return mapBackendCategorias(response.data);
  } catch (error) {
    console.error("Error creating categoria:", error);
    throw new Error("No se pudo crear la categoría");
  }
};

export const updateCategoria = async (id: number, data: { nombre: string }): Promise<BackendCategoria> => {
  try {
    const response = await api.put<BackendItem>(`/management/categorias/${id}`, { nombre: data.nombre });
    return mapBackendCategorias(response.data);
  } catch (error) {
    console.error("Error updating categoria:", error);
    throw new Error("No se pudo actualizar la categoría");
  }
};

export const deleteCategoria = async (id: number): Promise<void> => {
  try {
    await api.delete(`/management/categorias/${id}`);
  } catch (error) {
    console.error("Error deleting categoria:", error);
    throw new Error("No se pudo eliminar la categoría");
  }
};

// ============ FUNCIONES PARA LABORATORIOS ============

export const getLaboratorios = async (): Promise<BackendLaboratorio[]> => {
  try {
    const response = await api.get<BackendLaboratorio[]>("/management/laboratorios");
    return response.data;
  } catch (error) {
    console.error("Error fetching laboratorios:", error);
    throw new Error("No se pudieron cargar los laboratorios");
  }
};

export const createLaboratorio = async (data: { nombre: string }): Promise<BackendLaboratorio> => {
  try {
    const response = await api.post<BackendLaboratorio>("/management/laboratorio", { nombre: data.nombre });
    return response.data;
  } catch (error) {
    console.error("Error creating laboratorio:", error);
    throw new Error("No se pudo crear el laboratorio");
  }
};

export const updateLaboratorio = async (id: number, data: { nombre: string }): Promise<BackendLaboratorio> => {
  try {
    const response = await api.put<BackendLaboratorio>(`/management/laboratorio/${id}`, { nombre: data.nombre });
    return response.data;
  } catch (error) {
    console.error("Error updating laboratorio:", error);
    throw new Error("No se pudo actualizar el laboratorio");
  }
};

export const deleteLaboratorio = async (id: number): Promise<void> => {
  try {
    await api.delete(`/management/laboratorio/${id}`);
  } catch (error) {
    console.error("Error deleting laboratorio:", error);
    throw new Error("No se pudo eliminar el laboratorio");
  }
};

// ============ FUNCIONES PARA PRODUCTOS ============

export const getTodosProductosParaSelect = async (): Promise<
  { idproducto: number; nombre: string }[]
> => {
  try {
    const response = await api.get("/todos-select");
    return response.data;
  } catch (error) {
    console.error("Error fetching productos para select:", error);
    return [];
  }
};

export const buscarProductos = async (
  termino: string,
  categoria?: string,
  laboratorio?: string,
  page: number = 1,
  limit: number = 15
): Promise<ProductoListResponse> => {
  try {
    const params: Record<string, string | number> = {
      page,
      limit,
    };

    if (termino && termino.trim().length >= 2) {
      params.termino = termino.trim();
    }

    if (categoria) {
      params.categoria = categoria;
    }

    if (laboratorio) {
      params.laboratorio = laboratorio;
    }

    const response = await api.get<ProductoListResponse>("/buscar", {
      params,
    });

    return {
      productos: response.data.productos.map(mapBackendProducto),
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages,
    };
  } catch (error) {
    console.error("Error buscando productos:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

export const getAllProductos = async (
  page: number = 1,
  limit: number = 15
): Promise<ProductoListResponse> => {
  try {
    const params: Record<string, string | number> = {
      page,
      limit,
    };

    const response = await api.get<ProductoListResponse>("/todos", {
      params,
    });
    return {
      productos: response.data.productos.map(mapBackendProducto),
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages,
    };
  } catch (error) {
    console.error("Error fetching todos los productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

export const getProductoById = async (id: number): Promise<Producto> => {
  try {
    const response = await api.get<any>(`/productos/${id}`);
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error fetching producto:", error);
    throw new Error("No se pudo cargar el producto");
  }
};

export const createProducto = async (formData: FormData): Promise<Producto> => {
  try {
    const response = await api.post<any>("/productos", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error creating producto:", error);
    throw new Error("No se pudo crear el producto");
  }
};

export const updateProducto = async (
  id: number,
  formData: FormData
): Promise<Producto> => {
  try {
    const response = await api.put<any>(
      `/productos/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating producto:", error);
    throw new Error("No se pudo actualizar el producto");
  }
};

export const deleteProducto = async (id: number): Promise<void> => {
  try {
    await api.delete(`/productos/${id}`);
  } catch (error) {
    console.error("Error deleting producto:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

export const updateStockProducto = async (
  idproducto: number,
  idlote: number,
  cantidad: number,
  fechaVencimiento?: string
): Promise<Producto> => {
  try {
    let endpoint = `/productos/${idproducto}/stock`;
    let requestBody: any = { cantidad };

    let response;
    if ((idlote === 0 || idlote === null || idlote === undefined) && fechaVencimiento) {
      requestBody = {
        cantidad,
        fecha_vencimiento: fechaVencimiento
      };
      response = await api.post<Producto>(endpoint, requestBody);
    } else if (idlote > 0 && !fechaVencimiento) {
      requestBody = {
        cantidad,
        idlote
      };
      response = await api.put<Producto>(endpoint, requestBody);
    } else {
      throw new Error("Datos inválidos para actualizar stock");
    }
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

// ============ FUNCIÓN DE MAPEO ============

function mapBackendProducto(producto: any): Producto {
  return {
    idproducto: producto.idproducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion || '',
    idubicacion: producto.idubicacion,
    ubicacion: producto.ubicacion_nombre || "Sin ubicación",
    ubicacion_nombre: producto.ubicacion_nombre || "Sin ubicación",
    idlaboratorio: producto.idlaboratorio || 0,
    laboratorio: producto.laboratorio_nombre || "Sin laboratorio",
    laboratorio_nombre: producto.laboratorio_nombre || "Sin laboratorio",
    categorias: producto.categorias || [],
    estado: producto.estado || 1,
    imagen: producto.imagen || "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png",
    precio_venta: producto.precio_venta || "0",
    precio_compra: producto.precio_compra || "0",
    stock_total: producto.stock_total || 0,
    stock_minimo: producto.stock_minimo || 0,
    codigo_barras: producto.codigo_barras || null,
    lotes: (producto.lotes || []).map((lote: any) => ({
      idlote: lote.idlote,
      stock: lote.stock,
      fechaVencimiento: lote.fecha_vencimiento || lote.fechaVencimiento || '',
    })),
    productos_similares: producto.productos_similares || [],
  };
}