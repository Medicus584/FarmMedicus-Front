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

// Mock data
const MOCK_UBICACIONES: BackendUbicacion[] = [
  { idubicacion: 1, nombre: "Estante A1", estado: 1 },
  { idubicacion: 2, nombre: "Estante B2", estado: 1 },
  { idubicacion: 3, nombre: "Almacén Central", estado: 1 },
];

const MOCK_CATEGORIAS: BackendCategoria[] = [
  { idcategoria: 1, nombre: "Analgésicos", estado: 1 },
  { idcategoria: 2, nombre: "Antibióticos", estado: 1 },
  { idcategoria: 3, nombre: "Vitaminas", estado: 1 },
  { idcategoria: 4, nombre: "Antiinflamatorios", estado: 1 },
];

const MOCK_LABORATORIOS: BackendLaboratorio[] = [
  { idlaboratorio: 1, nombre: "Laboratorio A", estado: 1 },
  { idlaboratorio: 2, nombre: "Laboratorio B", estado: 1 },
  { idlaboratorio: 3, nombre: "Laboratorio C", estado: 1 },
];

let MOCK_PRODUCTOS: any[] = [];
let nextProductId = 1;
let nextLoteId = 1;

// Generar productos mock con productos similares
const generateMockProducts = () => {
  const productos = [];
  const nombres = [
    "Paracetamol 500mg", "Ibuprofeno 400mg", "Amoxicilina 500mg",
    "Vitamina C 1000mg", "Omeprazol 20mg", "Loratadina 10mg",
    "Metformina 850mg", "Losartan 50mg", "Atorvastatina 20mg",
    "Salbutamol Inhalador", "Dexametasona 4mg", "Diclofenaco 50mg",
    "Cetirizina 10mg", "Ranitidina 150mg", "Clonazepam 2mg",
    "Fluoxetina 20mg", "Omeprazol 40mg", "Metronidazol 500mg",
    "Diazepam 5mg", "Amlodipino 5mg",
  ];
  
  const descripciones = [
    "Analgésico y antipirético", "Antiinflamatorio", "Antibiótico de amplio espectro",
    "Suplemento vitamínico", "Inhibidor de bomba de protones", "Antihistamínico",
    "Antidiabético", "Antihipertensivo", "Hipolipemiante",
    "Broncodilatador", "Corticoesteroide", "Antiinflamatorio",
    "Antialérgico", "Antagonista H2", "Ansiolítico",
    "Antidepresivo", "Inhibidor de bomba de protones", "Antibiótico",
    "Ansiolítico", "Antihipertensivo",
  ];

  // Crear productos primero
  for (let i = 0; i < nombres.length; i++) {
    const categoriaIdx = i % MOCK_CATEGORIAS.length;
    const ubicacionIdx = i % MOCK_UBICACIONES.length;
    const laboratorioIdx = i % MOCK_LABORATORIOS.length;
    
    const lotes = [
      {
        idlote: nextLoteId++,
        idproducto: i + 1,
        stock: Math.floor(Math.random() * 50) + 5,
        fecha_vencimiento: new Date(2026 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        estado: 1,
      },
      {
        idlote: nextLoteId++,
        idproducto: i + 1,
        stock: Math.floor(Math.random() * 30) + 3,
        fecha_vencimiento: new Date(2027 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        estado: 1,
      },
    ];
    
    const stockTotal = lotes.reduce((sum, lote) => sum + lote.stock, 0);
    
    productos.push({
      idproducto: i + 1,
      nombre: nombres[i],
      descripcion: descripciones[i],
      idubicacion: MOCK_UBICACIONES[ubicacionIdx].idubicacion,
      ubicacion_nombre: MOCK_UBICACIONES[ubicacionIdx].nombre,
      idlaboratorio: MOCK_LABORATORIOS[laboratorioIdx].idlaboratorio,
      laboratorio_nombre: MOCK_LABORATORIOS[laboratorioIdx].nombre,
      categorias: [MOCK_CATEGORIAS[categoriaIdx].nombre, MOCK_CATEGORIAS[(categoriaIdx + 1) % MOCK_CATEGORIAS.length].nombre],
      estado: 1,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png",
      precio_venta: (Math.random() * 100 + 20).toFixed(2),
      precio_compra: (Math.random() * 60 + 10).toFixed(2),
      stock_total: stockTotal,
      stock_minimo: Math.floor(Math.random() * 10) + 2,
      codigo_barras: `750${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
      lotes: lotes,
      productos_similares: [],
    });
  }
  
  // Asignar productos similares (cada producto tendrá entre 1 y 3 similares)
  for (let i = 0; i < productos.length; i++) {
    const numSimilares = Math.floor(Math.random() * 3) + 1; // 1-3 similares
    const similaresIds = [];
    const availableIds = productos.map(p => p.idproducto).filter(id => id !== i + 1);
    
    for (let j = 0; j < Math.min(numSimilares, availableIds.length); j++) {
      const randomIndex = Math.floor(Math.random() * availableIds.length);
      const selectedId = availableIds[randomIndex];
      similaresIds.push(selectedId);
      availableIds.splice(randomIndex, 1);
    }
    
    productos[i].productos_similares = similaresIds.map(id => {
      const prod = productos.find(p => p.idproducto === id);
      return prod ? { idproducto: prod.idproducto, nombre: prod.nombre } : null;
    }).filter(Boolean);
  }
  
  nextProductId = productos.length + 1;
  return productos;
};

MOCK_PRODUCTOS = generateMockProducts();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============ FUNCIONES PARA UBICACIONES ============

function mapBackendUbicacion (item: BackendItem): BackendUbicacion {
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
    const response = await api.post<BackendItem>("/management/ubicaciones", {nombre: data.nombre});
    return mapBackendUbicacion(response.data);
  } catch (error) {
    console.error("Error creating ubicacion:", error);
    throw new Error("No se pudo crear la ubicación");
  }
};

export const updateUbicacion = async (id: number, data: { nombre: string }): Promise<BackendUbicacion> => {
  try {
    const response = await api.put<BackendItem>(`/management/ubicaciones/${id}`, {nombre: data.nombre});
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

function mapBackendCategorias (item: BackendItem): BackendCategoria {
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
    const response = await api.post<BackendItem>("/management/categorias", {nombre: data.nombre});
    return mapBackendCategorias(response.data);
  } catch (error) {
    console.error("Error creating categoria:", error);
    throw new Error("No se pudo crear la categoría");
  }
};

export const updateCategoria = async (id: number, data: { nombre: string }): Promise<BackendCategoria> => {
  try {
    const response = await api.put<BackendItem>(`/management/categorias/${id}`, {nombre: data.nombre});
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
    const response = await api.post<BackendLaboratorio>("/management/laboratorio", {nombre: data.nombre});
    return response.data;
  } catch (error) {
    console.error("Error creating laboratorio:", error);
    throw new Error("No se pudo crear el laboratorio");
  }
};

export const updateLaboratorio = async (id: number, data: { nombre: string }): Promise<BackendLaboratorio> => {
  try {
    const response = await api.put<BackendLaboratorio>(`/management/laboratorio/${id}`, {nombre: data.nombre});
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
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = MOCK_PRODUCTOS.findIndex(p => p.idproducto === id);
    if (index !== -1) {
      MOCK_PRODUCTOS.splice(index, 1);
    }
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
    }
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

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