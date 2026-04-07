import axios from "axios";
import { procesarPago } from "./PagosPendientesApi";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para las tablas maestras
interface BackendUbicacion {
  idubicacion: number;
  nombre: string;
  estado: number;
}

interface BackendCategoria {
  idcategoria: number;
  nombre: string;
  estado: number;
}

interface BackendProducto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  ubicacion_nombre: string;
  idubicacion: number;
  categorias: string[];
  imagen: string;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo: number;
}

export interface Producto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  idubicacion: number;
  ubicacion_nombre: string;
  ubicacion: string;
  categorias: string[];
  estado: number;
  imagen: string;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo: number;
}

export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  idubicacion: number;
  categorias: number[];
  imagen: string;
  precio_venta: string;
  precio_compra: string;
  stock: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getUbicaciones = async (): Promise<BackendUbicacion[]> => {
  try {
    const response = await api.get<BackendUbicacion[]>("/ubicaciones");
    return response.data;
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const getCategorias = async (): Promise<BackendCategoria[]> => {
  try {
    const response = await api.get<BackendCategoria[]>("/categorias");
    return response.data;
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};
export const buscarProductos = async (termino: string): Promise<Producto[]> => {
  try {
    if (!termino || termino.trim().length < 2) {
      return [];
    }
    
    const response = await api.get<BackendProducto[]>(`/buscar?termino=${encodeURIComponent(termino.trim())}`);
    return response.data.map(mapBackendProducto);
  } catch (error) {
    console.error("Error buscando productos:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

// Obtener todos los productos
export const getAllProductos = async (): Promise<Producto[]> => {
  try {
    const response = await api.get<BackendProducto[]>("/todos");
    return response.data.map(mapBackendProducto);
  } catch (error) {
    console.error("Error fetching todos los productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

// Función original getProductos
export const getProductos = async (searchTerm?: string): Promise<Producto[]> => {
  try {
    if (searchTerm && searchTerm.trim().length >= 2) {
      return buscarProductos(searchTerm);
    }
    return getAllProductos();
  } catch (error) {
    console.error("Error fetching productos:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const getProductoById = async (id: number): Promise<Producto> => {
  try {
    const response = await api.get<BackendProducto>(`/productos/${id}`);
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error fetching producto:", error);
    throw new Error("No se pudo cargar el producto");
  }
};

export const createProducto = async (producto: ProductoRequest): Promise<Producto> => {
  try {
    const formData = new FormData();
    
    // Datos básicos del producto
    formData.append('nombre', producto.nombre);
    formData.append('descripcion', producto.descripcion);
    formData.append('idubicacion', producto.idubicacion.toString());
    formData.append('categorias', JSON.stringify(producto.categorias));
    if (producto.imagen) {
      formData.append('imagen', producto.imagen);
    }
    formData.append('precio_compra', producto.precio_compra);
    formData.append('precio_venta', producto.precio_venta);
    formData.append('stock', producto.stock.toString());

    const response = await api.post<BackendProducto>("/productos", formData, {
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

export const updateProducto = async (id: number, producto: ProductoRequest): Promise<Producto> => {
  try {
    const formData = new FormData();
    
    formData.append('nombre', producto.nombre);
    formData.append('descripcion', producto.descripcion);
    formData.append('idubicacion', producto.idubicacion.toString());
    formData.append('categorias', JSON.stringify(producto.categorias));
    if (producto.imagen) {
      formData.append('imagen', producto.imagen);
    }
    formData.append('precio_compra', producto.precio_compra);
    formData.append('precio_venta', producto.precio_venta);
    formData.append('stock', producto.stock.toString());

    const response = await api.put<BackendProducto>(`/productos/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
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

export const updateStockProducto = async (idproducto: number, cantidad: number): Promise<Producto> => {
  try {
    const response = await api.patch<BackendProducto>(`/productos/${idproducto}/stock`, {
      cantidad
    });
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

// Mapeadores
function mapBackendProducto(producto: BackendProducto): Producto {
  return {
    idproducto: producto.idproducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    idubicacion: producto.idubicacion,
    ubicacion: producto.ubicacion_nombre || "Sin ubicación",
    estado: producto.estado,
    categorias: producto.categorias,
    ubicacion_nombre: producto.ubicacion_nombre,
    imagen: producto.imagen,
    precio_venta: producto.precio_venta,
    precio_compra: producto.precio_compra,
    stock: producto.stock,
    stock_minimo: producto.stock_minimo
  };
}
