// src/components/dashboard/VentasTablaPDF.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc9.ttf',
      fontWeight: 'bold',
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2px solid #2563eb',
  },
  logoContainer: {
    width: 100,
    height: 40,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
  },
  infoColumn: {
    width: '48%',
  },
  infoTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 8,
    color: '#1e293b',
    marginBottom: 3,
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalCard: {
    width: '32%',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  totalTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 3,
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  table: {
    width: '100%',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a8a',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableCell: {
    fontSize: 6.5,
    paddingHorizontal: 1.5,
  },
  tableCellHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#ffffff',
    paddingHorizontal: 1.5,
  },
  metodoBadge: {
    fontSize: 5.5,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    textAlign: 'center',
    fontSize: 6.5,
    color: '#94a3b8',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 6,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 6.5,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 3,
  },
});

interface Venta {
  id: number;
  fecha: string | Date;
  usuario: string;
  descripcion: string;
  medico?: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodo: string;
  detalle?: Array<{
    producto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

interface VentasTablaPDFProps {
  ventas: Venta[];
  filtros: {
    fechaBusqueda?: Date;
    fechaRango?: { from?: Date; to?: Date };
    filtroEmpleado: string;
    filtroMetodo: string;
    filtroMedico: string;
    empleadosOptions: Array<{ value: string; label: string; username: string }>;
    medicosOptions: string[];
    userRole: string;
    currentUserName?: string;
  };
  totales: {
    totalGeneral: number;
    totalEfectivo: number;
    totalQR: number;
  };
}

export const VentasTablaPDF: React.FC<VentasTablaPDFProps> = ({
  ventas,
  filtros,
  totales,
}) => {
  const formatDate = (dateInput: string | Date): string => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const formattedHours = hours < 10 ? `0${hours}` : hours.toString();
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
      
      return `${day}/${month}/${year} ${formattedHours}:${formattedMinutes}`;
    } catch {
      return typeof dateInput === 'string' ? dateInput.substring(0, 10) : 'Fecha inválida';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `Bs ${amount.toFixed(2)}`;
  };

  const currentDate = new Date();
  const fechaGeneracion = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;

  let filtroTexto = '';
  
  if (filtros.fechaBusqueda) {
    const fecha = filtros.fechaBusqueda;
    const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
    filtroTexto = `Fecha: ${fechaStr}`;
  } else if (filtros.fechaRango?.from && filtros.fechaRango?.to) {
    const from = filtros.fechaRango.from;
    const to = filtros.fechaRango.to;
    const fromStr = `${from.getDate()}/${from.getMonth() + 1}/${from.getFullYear()}`;
    const toStr = `${to.getDate()}/${to.getMonth() + 1}/${to.getFullYear()}`;
    filtroTexto = `Rango: ${fromStr} - ${toStr}`;
  }
  
  if (filtros.filtroEmpleado !== "Todos") {
    const empleadoLabel = filtros.empleadosOptions.find(e => e.value === filtros.filtroEmpleado)?.label || filtros.filtroEmpleado;
    filtroTexto += filtroTexto ? ` | Empleado: ${empleadoLabel}` : `Empleado: ${empleadoLabel}`;
  }
  
  if (filtros.filtroMetodo !== "Todos") {
    filtroTexto += filtroTexto ? ` | Método: ${filtros.filtroMetodo}` : `Método: ${filtros.filtroMetodo}`;
  }

  if (filtros.filtroMedico !== "Todos") {
    filtroTexto += filtroTexto ? ` | Médico: ${filtros.filtroMedico}` : `Médico: ${filtros.filtroMedico}`;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png"
              style={styles.logo}
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Reporte de Ventas</Text>
            <Text style={styles.subtitle}>Sistema de Gestión Comercial</Text>
          </View>
          <View style={{ width: 100 }} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoTitle}>FECHA DE GENERACIÓN</Text>
            <Text style={styles.infoText}>{fechaGeneracion}</Text>
            
            <Text style={styles.infoTitle}>FILTROS APLICADOS</Text>
            <Text style={styles.infoText}>
              {filtroTexto || 'Ventas de hoy'}
            </Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoTitle}>TOTAL REGISTROS</Text>
            <Text style={styles.infoText}>{ventas.length} ventas</Text>
            
            <Text style={styles.infoTitle}>GENERADO POR</Text>
            <Text style={styles.infoText}>
              {filtros.userRole === 'Admin' 
                ? 'Administrador' 
                : `Usuario: ${filtros.currentUserName || 'Usuario'}`}
            </Text>
          </View>
        </View>

        <View style={styles.totalsSection}>
          <View style={[styles.totalCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
            <Text style={styles.totalTitle}>TOTAL GENERAL</Text>
            <Text style={[styles.totalAmount, { color: '#1e40af' }]}>
              {formatCurrency(totales.totalGeneral)}
            </Text>
          </View>
          
          <View style={[styles.totalCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
            <Text style={styles.totalTitle}>TOTAL EFECTIVO</Text>
            <Text style={[styles.totalAmount, { color: '#059669' }]}>
              {formatCurrency(totales.totalEfectivo)}
            </Text>
          </View>
          
          <View style={[styles.totalCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
            <Text style={styles.totalTitle}>TOTAL QR</Text>
            <Text style={[styles.totalAmount, { color: '#2563eb' }]}>
              {formatCurrency(totales.totalQR)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>
            Detalle de Ventas ({ventas.length} registros)
          </Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={{ width: '6%' }}>
                <Text style={styles.tableCellHeader}>#</Text>
              </View>
              <View style={{ width: '13%' }}>
                <Text style={styles.tableCellHeader}>FECHA</Text>
              </View>
              <View style={{ width: '9%' }}>
                <Text style={styles.tableCellHeader}>HORA</Text>
              </View>
              <View style={{ width: '12%' }}>
                <Text style={styles.tableCellHeader}>USUARIO</Text>
              </View>
              <View style={{ width: '18%' }}>
                <Text style={styles.tableCellHeader}>DESCRIPCIÓN</Text>
              </View>
              <View style={{ width: '12%' }}>
                <Text style={styles.tableCellHeader}>MÉDICO</Text>
              </View>
              <View style={{ width: '8%' }}>
                <Text style={styles.tableCellHeader}>SUBTOTAL</Text>
              </View>
              <View style={{ width: '8%' }}>
                <Text style={styles.tableCellHeader}>DESC.</Text>
              </View>
              <View style={{ width: '8%' }}>
                <Text style={styles.tableCellHeader}>TOTAL</Text>
              </View>
              <View style={{ width: '6%' }}>
                <Text style={styles.tableCellHeader}>MÉTODO</Text>
              </View>
            </View>

            {ventas.map((venta, index) => {
              const fecha = new Date(venta.fecha);
              const horaStr = `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
              const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
              
              return (
                <View key={venta.id} style={styles.tableRow}>
                  <View style={{ width: '6%' }}>
                    <Text style={styles.tableCell}>{index + 1}</Text>
                  </View>
                  
                  <View style={{ width: '13%' }}>
                    <Text style={styles.tableCell}>{fechaStr}</Text>
                  </View>
                  
                  <View style={{ width: '9%' }}>
                    <Text style={styles.tableCell}>{horaStr}</Text>
                  </View>
                  
                  <View style={{ width: '12%' }}>
                    <Text style={styles.tableCell}>{venta.usuario}</Text>
                  </View>
                  
                  <View style={{ width: '18%' }}>
                    <Text style={[styles.tableCell, { fontSize: 6 }]}>{venta.descripcion}</Text>
                  </View>
                  
                  <View style={{ width: '12%' }}>
                    <Text style={[styles.tableCell, { fontSize: 6 }]}>
                      {venta.medico || 'No registrado'}
                    </Text>
                  </View>
                  
                  <View style={{ width: '8%' }}>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                      {formatCurrency(venta.subtotal)}
                    </Text>
                  </View>
                  
                  <View style={{ width: '8%' }}>
                    <Text style={[styles.tableCell, { textAlign: 'right', color: '#dc2626' }]}>
                      {formatCurrency(venta.descuento)}
                    </Text>
                  </View>
                  
                  <View style={{ width: '8%' }}>
                    <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }]}>
                      {formatCurrency(venta.total)}
                    </Text>
                  </View>
                  
                  <View style={{ width: '6%' }}>
                    <View
                      style={[
                        styles.metodoBadge,
                        {
                          backgroundColor: venta.metodo === 'Efectivo' ? '#dcfce7' : '#dbeafe',
                          color: venta.metodo === 'Efectivo' ? '#166534' : '#1e40af',
                        },
                      ]}
                    >
                      <Text>{venta.metodo === 'Efectivo' ? 'EF' : 'QR'}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Sistema de Gestión de Ventas | Reporte generado automáticamente
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};