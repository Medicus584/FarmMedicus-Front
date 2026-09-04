// src/api/VentasApi.ts
import axios from "axios";
import { Doctor } from "./SalesApi";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface BackendUsuario {
  idusuario: number;
  nombres: string;
  apellidos: string;
  usuario: string;
}

interface BackendDetalleVenta {
  iddetalle_venta: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: string;
  subtotal_linea: string;
  nombre_producto: string;
}

interface BackendVenta {
  idventa: number;
  fecha_hora: string;
  idusuario: number;
  descripcion: string;
  sub_total: string;
  descuento: string;
  descripcion_descuento?: string;
  total: string;
  metodo_pago: string;
  usuario_nombre: string;
  usuario_apellidos: string;
  usuario_usuario: string;
  medico?: string;
  detalle: BackendDetalleVenta[];
}

export interface DetalleVenta {
  iddetalle_venta: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  producto: string;
}

export interface Venta {
  id: number;
  fecha: string | Date;
  usuario: string;
  usuario_completo: string;
  usuario_login: string;
  descripcion: string;
  descripcion_descuento?: string;
  medico?: string;
  detalle: DetalleVenta[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo: string;
}

export interface VentasFiltros {
  empleado?: string;
  metodo?: string;
  medico?: string;
  fechaEspecifica?: Date;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface TotalesVentas {
  totalGeneral: number;
  totalEfectivo: number;
  totalQR: number;
}

// NUEVA INTERFAZ - Total Inversión y Ganancia
export interface TotalesInversionGanancia {
  total_invertido: number;
  total_ganado: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// FUNCIONES PARA OBTENER MÉDICOS
export const getMedicos = async (): Promise<string[]> => {
  try {
    const response = await api.get<Doctor[]>("/sales/doctores");
    return response.data.map((doctor) => doctor.nombre);
  } catch (error) {
    console.error("Error fetching medicos:", error);
    throw new Error("No se pudieron cargar los médicos");
  }
};

export const getUsuariosVentas = async (): Promise<BackendUsuario[]> => {
  try {
    const response = await api.get<BackendUsuario[]>("/ventas/usuarios");
    return response.data;
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    return [];
  }
};

// Función principal para obtener ventas
export const getVentas = async (filtros?: VentasFiltros): Promise<Venta[]> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.medico && filtros.medico !== "Todos") {
      params.medico = filtros.medico;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = formatDateForAPI(filtros.fechaEspecifica);
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = formatDateForAPI(filtros.fechaInicio);
      params.fechaFin = formatDateForAPI(filtros.fechaFin);
    }

    const response = await api.get<BackendVenta[]>("/ventas/ventas", { params });
    
    return response.data.map((venta) => ({
      id: venta.idventa,
      fecha: venta.fecha_hora,
      usuario: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_completo: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_login: venta.usuario_usuario,
      descripcion: venta.descripcion,
      descripcion_descuento: venta.descripcion_descuento,
      medico: venta.medico || "",
      detalle: venta.detalle.map((detalle) => ({
        iddetalle_venta: detalle.iddetalle_venta,
        idproducto: detalle.idproducto,
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal_linea: parseFloat(detalle.subtotal_linea),
        producto: detalle.nombre_producto || "Producto sin nombre"
      })),
      subtotal: parseFloat(venta.sub_total),
      descuento: parseFloat(venta.descuento),
      total: parseFloat(venta.total),
      metodo: venta.metodo_pago
    }));
  } catch (error) {
    console.error("Error fetching ventas:", error);
    throw new Error("No se pudieron cargar las ventas");
  }
};

// Función para obtener totales
export const getTotalesVentas = async (filtros?: VentasFiltros): Promise<TotalesVentas> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.medico && filtros.medico !== "Todos") {
      params.medico = filtros.medico;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = formatDateForAPI(filtros.fechaEspecifica);
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = formatDateForAPI(filtros.fechaInicio);
      params.fechaFin = formatDateForAPI(filtros.fechaFin);
    }

    const response = await api.get<{
      total_general: string;
      total_efectivo: string;
      total_qr: string;
    }>("/ventas/totales", { params });
    
    return {
      totalGeneral: parseFloat(response.data.total_general),
      totalEfectivo: parseFloat(response.data.total_efectivo),
      totalQR: parseFloat(response.data.total_qr)
    };
  } catch (error) {
    console.error("Error fetching totales:", error);
    throw new Error("No se pudieron cargar los totales");
  }
};

// NUEVA FUNCIÓN - Total Inversión y Ganancia
export const getTotalesInversionGanancia = async (filtros?: VentasFiltros): Promise<TotalesInversionGanancia> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.medico && filtros.medico !== "Todos") {
      params.medico = filtros.medico;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = formatDateForAPI(filtros.fechaEspecifica);
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = formatDateForAPI(filtros.fechaInicio);
      params.fechaFin = formatDateForAPI(filtros.fechaFin);
    }

    const response = await api.get<{
      total_invertido: string;
      total_ganado: string;
    }>("/ventas/totales-inversion-ganancia", { params });
    
    return {
      total_invertido: parseFloat(response.data.total_invertido),
      total_ganado: parseFloat(response.data.total_ganado)
    };
  } catch (error) {
    console.error("Error fetching totales inversion ganancia:", error);
    return {
      total_invertido: 0,
      total_ganado: 0
    };
  }
};

export const getVentasHoyAsistente = async (username: string): Promise<Venta[]> => {
  try {
    const response = await api.get<BackendVenta[]>(`/ventas/ventas/hoy/${username}`);
    
    return response.data.map((venta) => ({
      id: venta.idventa,
      fecha: venta.fecha_hora,
      usuario: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_completo: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_login: venta.usuario_usuario,
      descripcion: venta.descripcion,
      descripcion_descuento: venta.descripcion_descuento,
      medico: venta.medico || "",
      detalle: venta.detalle.map((detalle) => ({
        iddetalle_venta: detalle.iddetalle_venta,
        idproducto: detalle.idproducto,
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal_linea: parseFloat(detalle.subtotal_linea),
        producto: detalle.nombre_producto || "Producto sin nombre"
      })),
      subtotal: parseFloat(venta.sub_total),
      descuento: parseFloat(venta.descuento),
      total: parseFloat(venta.total),
      metodo: venta.metodo_pago
    }));
  } catch (error) {
    console.error("Error fetching ventas hoy:", error);
    throw new Error("No se pudieron cargar las ventas de hoy");
  }
};

// Función auxiliar para formatear fechas para la API
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const anularVenta = async (id: number): Promise<{ success: boolean; message: string; data: any }> => {
  try {
    const response = await api.delete(`/ventas/${id}/anular`);
    return response.data;
  } catch (error: any) {
    console.error("Error anulando venta:", error);
    throw new Error(error.response?.data?.message || "No se pudo anular la venta");
  }
};