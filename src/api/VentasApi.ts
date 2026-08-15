// src/api/VentasApi.ts
import axios from "axios";
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
  medico?: string; // Campo opcional para el médico
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
  medico?: string; // Campo opcional para el médico
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

// Mock data
let MOCK_VENTAS: BackendVenta[] = [];
let MOCK_MEDICOS: string[] = [];

// Generar mocks iniciales
const generateMockVentas = () => {
  const now = new Date();
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const anteayer = new Date(hoy);
  anteayer.setDate(anteayer.getDate() - 2);
  
  const medicos = [
    "Dr. Juan Pérez",
    "Dra. María Gómez",
    "Dr. Carlos López",
    "Dra. Ana Martínez",
    "Dr. Luis Rodríguez"
  ];
  
  MOCK_MEDICOS = medicos;

  MOCK_VENTAS = [
    {
      idventa: 1,
      fecha_hora: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 10, 30).toISOString(),
      idusuario: 1,
      descripcion: "Venta de medicamentos recetados",
      sub_total: "150.50",
      descuento: "10.00",
      total: "140.50",
      metodo_pago: "Efectivo",
      usuario_nombre: "Admin",
      usuario_apellidos: "Sistema",
      usuario_usuario: "admin",
      medico: "Dr. Juan Pérez",
      detalle: [
        {
          iddetalle_venta: 1,
          idproducto: 1,
          cantidad: 2,
          precio_unitario: "25.00",
          subtotal_linea: "50.00",
          nombre_producto: "Paracetamol 500mg"
        },
        {
          iddetalle_venta: 2,
          idproducto: 2,
          cantidad: 3,
          precio_unitario: "33.50",
          subtotal_linea: "100.50",
          nombre_producto: "Ibuprofeno 400mg"
        }
      ]
    },
    {
      idventa: 2,
      fecha_hora: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 15).toISOString(),
      idusuario: 2,
      descripcion: "Venta de antibióticos",
      sub_total: "80.00",
      descuento: "0.00",
      total: "80.00",
      metodo_pago: "QR",
      usuario_nombre: "María",
      usuario_apellidos: "Asistente",
      usuario_usuario: "asistente1",
      medico: "Dra. María Gómez",
      detalle: [
        {
          iddetalle_venta: 3,
          idproducto: 3,
          cantidad: 1,
          precio_unitario: "80.00",
          subtotal_linea: "80.00",
          nombre_producto: "Amoxicilina 500mg"
        }
      ]
    },
    {
      idventa: 3,
      fecha_hora: new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 9, 0).toISOString(),
      idusuario: 1,
      descripcion: "Venta de medicamentos para presión",
      sub_total: "200.00",
      descuento: "15.00",
      total: "185.00",
      metodo_pago: "Efectivo",
      usuario_nombre: "Admin",
      usuario_apellidos: "Sistema",
      usuario_usuario: "admin",
      medico: "Dr. Carlos López",
      detalle: [
        {
          iddetalle_venta: 4,
          idproducto: 4,
          cantidad: 2,
          precio_unitario: "45.00",
          subtotal_linea: "90.00",
          nombre_producto: "Losartan 50mg"
        },
        {
          iddetalle_venta: 5,
          idproducto: 5,
          cantidad: 2,
          precio_unitario: "55.00",
          subtotal_linea: "110.00",
          nombre_producto: "Amlodipino 5mg"
        }
      ]
    },
    {
      idventa: 4,
      fecha_hora: new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 16, 30).toISOString(),
      idusuario: 2,
      descripcion: "Venta de antihistamínicos",
      sub_total: "60.00",
      descuento: "5.00",
      total: "55.00",
      metodo_pago: "QR",
      usuario_nombre: "María",
      usuario_apellidos: "Asistente",
      usuario_usuario: "asistente1",
      medico: "", // Sin médico
      detalle: [
        {
          iddetalle_venta: 6,
          idproducto: 6,
          cantidad: 2,
          precio_unitario: "30.00",
          subtotal_linea: "60.00",
          nombre_producto: "Loratadina 10mg"
        }
      ]
    },
    {
      idventa: 5,
      fecha_hora: new Date(anteayer.getFullYear(), anteayer.getMonth(), anteayer.getDate(), 11, 45).toISOString(),
      idusuario: 1,
      descripcion: "Venta de suplementos vitamínicos",
      sub_total: "120.00",
      descuento: "20.00",
      total: "100.00",
      metodo_pago: "Efectivo",
      usuario_nombre: "Admin",
      usuario_apellidos: "Sistema",
      usuario_usuario: "admin",
      medico: "Dra. Ana Martínez",
      detalle: [
        {
          iddetalle_venta: 7,
          idproducto: 7,
          cantidad: 1,
          precio_unitario: "120.00",
          subtotal_linea: "120.00",
          nombre_producto: "Multivitamínico Completo"
        }
      ]
    },
    {
      idventa: 6,
      fecha_hora: new Date(anteayer.getFullYear(), anteayer.getMonth(), anteayer.getDate(), 15, 20).toISOString(),
      idusuario: 2,
      descripcion: "Venta de medicamentos digestivos",
      sub_total: "90.00",
      descuento: "0.00",
      total: "90.00",
      metodo_pago: "QR",
      usuario_nombre: "María",
      usuario_apellidos: "Asistente",
      usuario_usuario: "asistente1",
      medico: "Dr. Luis Rodríguez",
      detalle: [
        {
          iddetalle_venta: 8,
          idproducto: 8,
          cantidad: 3,
          precio_unitario: "30.00",
          subtotal_linea: "90.00",
          nombre_producto: "Omeprazol 20mg"
        }
      ]
    }
  ];
};

// Inicializar mocks
generateMockVentas();

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
    // Simular llamada API
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_MEDICOS;
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
    // Mock data para desarrollo
    return [
      { idusuario: 1, nombres: "Admin", apellidos: "Sistema", usuario: "admin" },
      { idusuario: 2, nombres: "María", apellidos: "Asistente", usuario: "asistente1" }
    ];
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

    console.log("Filtros enviados:", params);

    // Simular llamada API con mocks
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let ventasFiltradas = [...MOCK_VENTAS];
    
    // Aplicar filtros a los mocks
    if (params.empleado) {
      ventasFiltradas = ventasFiltradas.filter(v => v.usuario_usuario === params.empleado);
    }
    
    if (params.metodo) {
      ventasFiltradas = ventasFiltradas.filter(v => v.metodo_pago === params.metodo);
    }
    
    if (params.medico) {
      ventasFiltradas = ventasFiltradas.filter(v => v.medico === params.medico);
    }
    
    if (params.fechaEspecifica) {
      const fechaFilter = new Date(params.fechaEspecifica);
      ventasFiltradas = ventasFiltradas.filter(v => {
        const fechaVenta = new Date(v.fecha_hora);
        return fechaVenta.getFullYear() === fechaFilter.getFullYear() &&
               fechaVenta.getMonth() === fechaFilter.getMonth() &&
               fechaVenta.getDate() === fechaFilter.getDate();
      });
    }
    
    if (params.fechaInicio && params.fechaFin) {
      const inicio = new Date(params.fechaInicio);
      const fin = new Date(params.fechaFin);
      ventasFiltradas = ventasFiltradas.filter(v => {
        const fechaVenta = new Date(v.fecha_hora);
        return fechaVenta >= inicio && fechaVenta <= fin;
      });
    }

    return ventasFiltradas.map((venta) => ({
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

    // Simular llamada API con mocks
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let ventasFiltradas = [...MOCK_VENTAS];
    
    // Aplicar filtros a los mocks
    if (params.empleado) {
      ventasFiltradas = ventasFiltradas.filter(v => v.usuario_usuario === params.empleado);
    }
    
    if (params.metodo) {
      ventasFiltradas = ventasFiltradas.filter(v => v.metodo_pago === params.metodo);
    }
    
    if (params.medico) {
      ventasFiltradas = ventasFiltradas.filter(v => v.medico === params.medico);
    }
    
    if (params.fechaEspecifica) {
      const fechaFilter = new Date(params.fechaEspecifica);
      ventasFiltradas = ventasFiltradas.filter(v => {
        const fechaVenta = new Date(v.fecha_hora);
        return fechaVenta.getFullYear() === fechaFilter.getFullYear() &&
               fechaVenta.getMonth() === fechaFilter.getMonth() &&
               fechaVenta.getDate() === fechaFilter.getDate();
      });
    }
    
    if (params.fechaInicio && params.fechaFin) {
      const inicio = new Date(params.fechaInicio);
      const fin = new Date(params.fechaFin);
      ventasFiltradas = ventasFiltradas.filter(v => {
        const fechaVenta = new Date(v.fecha_hora);
        return fechaVenta >= inicio && fechaVenta <= fin;
      });
    }

    const totalGeneral = ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.total), 0);
    const totalEfectivo = ventasFiltradas
      .filter(v => v.metodo_pago === "Efectivo")
      .reduce((sum, v) => sum + parseFloat(v.total), 0);
    const totalQR = ventasFiltradas
      .filter(v => v.metodo_pago === "QR")
      .reduce((sum, v) => sum + parseFloat(v.total), 0);
    
    return {
      totalGeneral,
      totalEfectivo,
      totalQR
    };
  } catch (error) {
    console.error("Error fetching totales:", error);
    throw new Error("No se pudieron cargar los totales");
  }
};

export const getVentasHoyAsistente = async (username: string): Promise<Venta[]> => {
  try {
    const hoy = new Date();
    const fechaStr = formatDateForAPI(hoy);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const ventasFiltradas = MOCK_VENTAS.filter(v => {
      const fechaVenta = new Date(v.fecha_hora);
      return v.usuario_usuario === username &&
             fechaVenta.getFullYear() === hoy.getFullYear() &&
             fechaVenta.getMonth() === hoy.getMonth() &&
             fechaVenta.getDate() === hoy.getDate();
    });

    return ventasFiltradas.map((venta) => ({
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