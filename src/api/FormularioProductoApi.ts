// api/FormularioProductoApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para productos y variantes
export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  idubicacion: number;
  idlaboratorio: number;
  categorias: number[];
  imagen: string;
  precio_venta: number;
  precio_compra: number;
  stock: number;
  stock_minimo: number;
  codigo_barras?: string;
  productos_similares?: number[];
  lotes?: Array<{
    stock: number;
    fecha_vencimiento: string;
  }>;
}

export interface ProductoResponse {
  idproducto: number;
  nombre: string;
  descripcion: string;
  idubicacion: number;
  ubicacion: string;
  idlaboratorio: number;
  laboratorio: string;
  estado: number;
  categorias: string[];
  imagen: string;
  precio_venta: number;
  precio_compra: number;
  stock_total: number;
  stock_minimo: number;
  codigo_barras?: string;
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
  lotes?: Array<{
    idlote: number;
    stock: number;
    fecha_vencimiento: string;
  }>;
}

export interface LoteResponse {
  idlote: number;
  idproducto: number;
  stock: number;
  fecha_vencimiento: string;
  estado: number;
}

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Función helper para debug de FormData
const debugFormData = (formData: FormData) => {
  console.log("=== DEBUG FORM DATA ===");
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`${key}: File - ${value.name} (${value.type}, ${value.size} bytes)`);
    } else if (key === 'lotes' || key === 'categorias' || key === 'productos_similares') {
      try {
        const parsed = JSON.parse(value as string);
        console.log(`${key}:`, JSON.stringify(parsed, null, 2));
      } catch {
        console.log(`${key}:`, value);
      }
    } else {
      console.log(`${key}:`, value);
    }
  }
  console.log("=== FIN DEBUG FORM DATA ===");
};

// API para productos
export const createProducto = async (formData: FormData): Promise<ProductoResponse> => {
  try {
    console.log("Enviando datos al servidor...");
    
    debugFormData(formData);

    const response = await api.post<ProductoResponse>("/formulario-productos/productos", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });
    
    console.log("Producto creado exitosamente:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error creating producto:", error);
    console.error("Error response:", error.response?.data);
    console.error("Error status:", error.response?.status);
    console.error("Error details:", error.response?.config?.data);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message || 
                        "No se pudo crear el producto";
    
    throw new Error(errorMessage);
  }
};

export const updateProducto = async (id: number, formData: FormData): Promise<ProductoResponse> => {
  try {
    console.log("Actualizando producto ID:", id);
    
    debugFormData(formData);

    const response = await api.put<ProductoResponse>(`/formulario-productos/productos/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });
    
    console.log("Producto actualizado exitosamente:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating producto:", error);
    console.error("Error response:", error.response?.data);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message || 
                        "No se pudo actualizar el producto";
    
    throw new Error(errorMessage);
  }
};

export const getProductoById = async (id: number): Promise<ProductoResponse> => {
  try {
    const response = await api.get<ProductoResponse>(`/formulario-productos/productos/${id}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching producto:", error);
    throw new Error(error.response?.data?.message || "No se pudo cargar el producto");
  }
};

export const deleteProducto = async (id: number): Promise<void> => {
  try {
    await api.patch(`/formulario-productos/productos/${id}/eliminar`);
  } catch (error: any) {
    console.error("Error deleting producto:", error);
    throw new Error(error.response?.data?.message || "No se pudo eliminar el producto");
  }
};

// API para lotes
export const getLotesByProducto = async (idproducto: number): Promise<LoteResponse[]> => {
  try {
    const response = await api.get<LoteResponse[]>(`/formulario-productos/productos/${idproducto}/lotes`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching lotes:", error);
    throw new Error(error.response?.data?.message || "No se pudieron cargar los lotes");
  }
};

export const createLote = async (idproducto: number, data: { stock: number; fecha_vencimiento: string }): Promise<LoteResponse> => {
  try {
    const response = await api.post<LoteResponse>(`/formulario-productos/productos/${idproducto}/lotes`, data);
    return response.data;
  } catch (error: any) {
    console.error("Error creating lote:", error);
    throw new Error(error.response?.data?.message || "No se pudo crear el lote");
  }
};

export const updateLote = async (idlote: number, data: { stock: number; fecha_vencimiento: string }): Promise<LoteResponse> => {
  try {
    const response = await api.put<LoteResponse>(`/formulario-productos/lotes/${idlote}`, data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating lote:", error);
    throw new Error(error.response?.data?.message || "No se pudo actualizar el lote");
  }
};

export const deleteLote = async (idlote: number): Promise<void> => {
  try {
    await api.delete(`/formulario-productos/lotes/${idlote}`);
  } catch (error: any) {
    console.error("Error deleting lote:", error);
    throw new Error(error.response?.data?.message || "No se pudo eliminar el lote");
  }
};

// API para laboratorios (ya que los incluimos en ManagementSectionApi, pero por si acaso)
export const getLaboratorios = async (): Promise<Array<{ idlaboratorio: number; nombre: string; estado: number }>> => {
  try {
    const response = await api.get("/laboratorios");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching laboratorios:", error);
    throw new Error(error.response?.data?.message || "No se pudieron cargar los laboratorios");
  }
};

export const createLaboratorio = async (data: { nombre: string }): Promise<{ idlaboratorio: number; nombre: string; estado: number }> => {
  try {
    const response = await api.post("/laboratorios", data);
    return response.data;
  } catch (error: any) {
    console.error("Error creating laboratorio:", error);
    throw new Error(error.response?.data?.message || "No se pudo crear el laboratorio");
  }
};