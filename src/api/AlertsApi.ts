// api/AlertsApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces
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

export interface AlertasResponse {
  stockBajo: AlertStockBajo[];
  vencimiento: AlertVencimiento[];
}

// Mock data
let MOCK_ALERTAS_STOCK_BAJO: AlertStockBajo[] = [];
let MOCK_ALERTAS_VENCIMIENTO: AlertVencimiento[] = [];

// Generar mocks
const generateMockAlerts = () => {
  const productos = [
    { id: 1, nombre: "Paracetamol 500mg", descripcion: "Analgésico y antipirético", ubicacion: "Estante A1", laboratorio: "Laboratorio A", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 2, nombre: "Ibuprofeno 400mg", descripcion: "Antiinflamatorio", ubicacion: "Estante B2", laboratorio: "Laboratorio B", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 3, nombre: "Amoxicilina 500mg", descripcion: "Antibiótico de amplio espectro", ubicacion: "Almacén Central", laboratorio: "Laboratorio C", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 4, nombre: "Vitamina C 1000mg", descripcion: "Suplemento vitamínico", ubicacion: "Estante A2", laboratorio: "Laboratorio A", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 5, nombre: "Omeprazol 20mg", descripcion: "Inhibidor de bomba de protones", ubicacion: "Estante B1", laboratorio: "Laboratorio B", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 6, nombre: "Loratadina 10mg", descripcion: "Antihistamínico", ubicacion: "Estante C1", laboratorio: "Laboratorio C", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 7, nombre: "Metformina 850mg", descripcion: "Antidiabético", ubicacion: "Almacén Central", laboratorio: "Laboratorio A", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 8, nombre: "Losartan 50mg", descripcion: "Antihipertensivo", ubicacion: "Estante D1", laboratorio: "Laboratorio B", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 9, nombre: "Atorvastatina 20mg", descripcion: "Hipolipemiante", ubicacion: "Estante A3", laboratorio: "Laboratorio C", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
    { id: 10, nombre: "Salbutamol Inhalador", descripcion: "Broncodilatador", ubicacion: "Estante B3", laboratorio: "Laboratorio A", imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png" },
  ];

  // Alertas de stock bajo (5 productos)
  MOCK_ALERTAS_STOCK_BAJO = [
    {
      id: 1,
      producto: "Paracetamol 500mg",
      descripcion: "Analgésico y antipirético",
      ubicacion: "Estante A1",
      laboratorio: "Laboratorio A",
      cantidad: 2,
      stockMinimo: 10,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 2,
      producto: "Ibuprofeno 400mg",
      descripcion: "Antiinflamatorio",
      ubicacion: "Estante B2",
      laboratorio: "Laboratorio B",
      cantidad: 3,
      stockMinimo: 8,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 3,
      producto: "Amoxicilina 500mg",
      descripcion: "Antibiótico de amplio espectro",
      ubicacion: "Almacén Central",
      laboratorio: "Laboratorio C",
      cantidad: 1,
      stockMinimo: 15,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 4,
      producto: "Vitamina C 1000mg",
      descripcion: "Suplemento vitamínico",
      ubicacion: "Estante A2",
      laboratorio: "Laboratorio A",
      cantidad: 5,
      stockMinimo: 12,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 5,
      producto: "Omeprazol 20mg",
      descripcion: "Inhibidor de bomba de protones",
      ubicacion: "Estante B1",
      laboratorio: "Laboratorio B",
      cantidad: 4,
      stockMinimo: 10,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    }
  ];

  // Alertas de vencimiento (11 productos con diferentes meses)
  const hoy = new Date();
  
  // Función para crear fecha con meses de diferencia
  const getDateInMonths = (months: number) => {
    const date = new Date(hoy);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  MOCK_ALERTAS_VENCIMIENTO = [
    // ROJO: 6 meses o menos (CRÍTICO)
    {
      id: 1,
      idproducto: 1,
      producto: "Paracetamol 500mg",
      descripcion: "Analgésico y antipirético",
      ubicacion: "Estante A1",
      laboratorio: "Laboratorio A",
      idlote: 101,
      stock: 15,
      fechaVencimiento: getDateInMonths(2), // 2 meses - ROJO
      diasRestantes: 60,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 2,
      idproducto: 2,
      producto: "Ibuprofeno 400mg",
      descripcion: "Antiinflamatorio",
      ubicacion: "Estante B2",
      laboratorio: "Laboratorio B",
      idlote: 102,
      stock: 25,
      fechaVencimiento: getDateInMonths(5), // 5 meses - ROJO
      diasRestantes: 150,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 3,
      idproducto: 3,
      producto: "Amoxicilina 500mg",
      descripcion: "Antibiótico de amplio espectro",
      ubicacion: "Almacén Central",
      laboratorio: "Laboratorio C",
      idlote: 103,
      stock: 30,
      fechaVencimiento: getDateInMonths(6), // 6 meses - ROJO
      diasRestantes: 180,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    
    // AMARILLO: entre 6 y 9 meses (ADVERTENCIA)
    {
      id: 4,
      idproducto: 4,
      producto: "Vitamina C 1000mg",
      descripcion: "Suplemento vitamínico",
      ubicacion: "Estante A2",
      laboratorio: "Laboratorio A",
      idlote: 104,
      stock: 40,
      fechaVencimiento: getDateInMonths(7), // 7 meses - AMARILLO
      diasRestantes: 210,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 5,
      idproducto: 5,
      producto: "Omeprazol 20mg",
      descripcion: "Inhibidor de bomba de protones",
      ubicacion: "Estante B1",
      laboratorio: "Laboratorio B",
      idlote: 105,
      stock: 18,
      fechaVencimiento: getDateInMonths(8), // 8 meses - AMARILLO
      diasRestantes: 240,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 6,
      idproducto: 6,
      producto: "Loratadina 10mg",
      descripcion: "Antihistamínico",
      ubicacion: "Estante C1",
      laboratorio: "Laboratorio C",
      idlote: 106,
      stock: 22,
      fechaVencimiento: getDateInMonths(9), // 9 meses - AMARILLO
      diasRestantes: 270,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    
    // VERDE: entre 9 y 12 meses (BUENO)
    {
      id: 7,
      idproducto: 7,
      producto: "Metformina 850mg",
      descripcion: "Antidiabético",
      ubicacion: "Almacén Central",
      laboratorio: "Laboratorio A",
      idlote: 107,
      stock: 35,
      fechaVencimiento: getDateInMonths(10), // 10 meses - VERDE
      diasRestantes: 300,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 8,
      idproducto: 8,
      producto: "Losartan 50mg",
      descripcion: "Antihipertensivo",
      ubicacion: "Estante D1",
      laboratorio: "Laboratorio B",
      idlote: 108,
      stock: 28,
      fechaVencimiento: getDateInMonths(11), // 11 meses - VERDE
      diasRestantes: 330,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 9,
      idproducto: 9,
      producto: "Atorvastatina 20mg",
      descripcion: "Hipolipemiante",
      ubicacion: "Estante A3",
      laboratorio: "Laboratorio C",
      idlote: 109,
      stock: 20,
      fechaVencimiento: getDateInMonths(12), // 12 meses - VERDE
      diasRestantes: 365,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    
    // VERDE: más de 12 meses (TAMBIÉN VERDE)
    {
      id: 10,
      idproducto: 10,
      producto: "Salbutamol Inhalador",
      descripcion: "Broncodilatador",
      ubicacion: "Estante B3",
      laboratorio: "Laboratorio A",
      idlote: 110,
      stock: 45,
      fechaVencimiento: getDateInMonths(18), // 18 meses - VERDE
      diasRestantes: 540,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    },
    {
      id: 11,
      idproducto: 1,
      producto: "Paracetamol 500mg",
      descripcion: "Analgésico y antipirético",
      ubicacion: "Estante A1",
      laboratorio: "Laboratorio A",
      idlote: 111,
      stock: 10,
      fechaVencimiento: getDateInMonths(24), // 24 meses - VERDE
      diasRestantes: 720,
      imagen: "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png"
    }
  ];
};

// Generar mocks al inicio
generateMockAlerts();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// FUNCIONES PARA ALERTAS DE STOCK BAJO

export const getLowStockAlerts = async (): Promise<AlertStockBajo[]> => {
  try {
    // Simular llamada API
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_ALERTAS_STOCK_BAJO;
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    throw new Error("No se pudieron cargar las alertas de stock bajo");
  }
};

export const getLowStockAlertsCount = async (): Promise<number> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_ALERTAS_STOCK_BAJO.length;
  } catch (error) {
    console.error("Error fetching low stock alerts count:", error);
    return 0;
  }
};

// FUNCIONES PARA ALERTAS DE VENCIMIENTO

export const getExpirationAlerts = async (): Promise<AlertVencimiento[]> => {
  try {
    // Simular llamada API
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_ALERTAS_VENCIMIENTO;
  } catch (error) {
    console.error("Error fetching expiration alerts:", error);
    throw new Error("No se pudieron cargar las alertas de vencimiento");
  }
};

export const getExpirationAlertsCount = async (): Promise<number> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_ALERTAS_VENCIMIENTO.length;
  } catch (error) {
    console.error("Error fetching expiration alerts count:", error);
    return 0;
  }
};

export const getExpiringSoonAlerts = async (days: number = 30): Promise<AlertVencimiento[]> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Filtrar productos que vencen en los próximos X días
    const hoy = new Date();
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + days);
    
    return MOCK_ALERTAS_VENCIMIENTO.filter(alert => {
      const fechaVenc = new Date(alert.fechaVencimiento);
      return fechaVenc <= fechaLimite;
    });
  } catch (error) {
    console.error("Error fetching expiring soon alerts:", error);
    throw new Error("No se pudieron cargar las alertas de vencimiento próximo");
  }
};

// FUNCIONES COMBINADAS

export const getAllAlerts = async (): Promise<AlertasResponse> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      stockBajo: MOCK_ALERTAS_STOCK_BAJO,
      vencimiento: MOCK_ALERTAS_VENCIMIENTO,
    };
  } catch (error) {
    console.error("Error fetching all alerts:", error);
    throw new Error("No se pudieron cargar las alertas");
  }
};

// FUNCIONES PARA ACTUALIZAR MOCKS (para pruebas)

export const addMockLowStockAlert = (alert: AlertStockBajo): void => {
  MOCK_ALERTAS_STOCK_BAJO.push(alert);
};

export const addMockExpirationAlert = (alert: AlertVencimiento): void => {
  MOCK_ALERTAS_VENCIMIENTO.push(alert);
};

export const removeMockLowStockAlert = (id: number): void => {
  MOCK_ALERTAS_STOCK_BAJO = MOCK_ALERTAS_STOCK_BAJO.filter(a => a.id !== id);
};

export const removeMockExpirationAlert = (id: number): void => {
  MOCK_ALERTAS_VENCIMIENTO = MOCK_ALERTAS_VENCIMIENTO.filter(a => a.id !== id);
};