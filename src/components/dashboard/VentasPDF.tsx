import { jsPDF } from "jspdf";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface VentaData {
  codigoVenta: string;
  clientName: string;
  fechaVenta: string;
  total: number;
  montoPagado: number;
  subtotal?: number;
  descuento?: number;
  tiendaNombre?: string;
  registradoPor?: string;
  productos?: ProductoItem[];
}

export interface ProductoItem {
  nombre: string;
  precio: number;
  cantidad: number;
}

export class PrintSalesHistory {
  private static colaImpresion: jsPDF[] = [];
  private static imprimiendo = false;
  private static logoBase64: string | null = null;

  // ========== CARGAR LOGO ==========
  private static async cargarLogo(): Promise<string | null> {
    if (this.logoBase64) return this.logoBase64;
    
    try {
      const response = await fetch('/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png');
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoBase64 = reader.result as string;
          resolve(this.logoBase64);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error cargando logo:', error);
      return null;
    }
  }

  // ========== FUNCIÓN OPTIMIZADA PARA DIVIDIR TEXTO ==========
  private static dividirTextoOptimizado(texto: string, maxWidth: number, doc: jsPDF, fontSize: number = 9): string[] {
    // Guardar el tamaño de fuente original
    const originalFontSize = doc.getFontSize();
    doc.setFontSize(fontSize);
    
    const palabras = texto.split(' ');
    const lineas: string[] = [];
    let lineaActual = '';

    for (const palabra of palabras) {
      const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
      if (doc.getTextWidth(prueba) <= maxWidth) {
        lineaActual = prueba;
      } else {
        if (lineaActual) {
          lineas.push(lineaActual);
        }
        lineaActual = palabra;
      }
    }

    if (lineaActual) {
      lineas.push(lineaActual);
    }

    // Restaurar el tamaño de fuente original
    doc.setFontSize(originalFontSize);
    return lineas;
  }

  // ========== CALCULAR TAMAÑO DE FUENTE ÓPTIMO ==========
  private static calcularTamanoFuente(texto: string, maxWidth: number, doc: jsPDF): number {
    let fontSize = 9; // Tamaño base
    const palabras = texto.split(' ');
    
    // Si el texto es corto, mantener tamaño normal
    if (texto.length <= 20) return fontSize;
    
    // Probar diferentes tamaños de fuente
    const tamaños = [9, 8, 7.5, 7, 6.5, 6];
    
    for (const size of tamaños) {
      doc.setFontSize(size);
      const width = doc.getTextWidth(texto);
      if (width <= maxWidth) {
        fontSize = size;
        break;
      }
    }
    
    return fontSize;
  }

  // ========== GENERAR PDF DE VENTA ==========
  private static async generarPDFVenta(venta: VentaData): Promise<jsPDF> {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 297]
    });

    const pageWidth = 80;
    const margin = 5;
    let yPos = 5;

    const fechaFormateada = venta.fechaVenta ? format(new Date(venta.fechaVenta), 'dd/MM/yyyy HH:mm', { locale: es }) : 'No especificada';

    // ========== LOGO ==========
    const logoData = await this.cargarLogo();
    if (logoData) {
      try {
        const logoWidth = 40;
        const logoHeight = 20;
        doc.addImage(logoData, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 4;
      } catch (error) {
        console.error('Error agregando logo:', error);
        doc.setFontSize(16);
        doc.setTextColor("#000000");
        doc.setFont("helvetica", "bold");
        doc.text("LUMYLA", pageWidth / 2, yPos + 10, { align: "center" });
        yPos += 14;
      }
    } else {
      doc.setFontSize(18);
      doc.setTextColor("#000000");
      doc.setFont("helvetica", "bold");
      doc.text("LUMYLA", pageWidth / 2, yPos + 10, { align: "center" });
      yPos += 14;
    }

    // Línea separadora
    doc.setDrawColor("#000000");
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ========== CAMPOS DEL CLIENTE ==========
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    const nitLabel = "NIT/CI:";
    const nitLine = "________________________";
    doc.text(nitLabel, margin, yPos);
    doc.text(nitLine, margin + doc.getTextWidth(nitLabel) + 2, yPos);
    yPos += 6;

    const nombreLabel = "NOMBRE:";
    const nombreLine = "_____________________";
    doc.text(nombreLabel, margin, yPos);
    doc.text(nombreLine, margin + doc.getTextWidth(nombreLabel) + 2, yPos);
    yPos += 6;

    const numeroLabel = "NÚMERO:";
    const numeroLine = "_____________________";
    doc.text(numeroLabel, margin, yPos);
    doc.text(numeroLine, margin + doc.getTextWidth(numeroLabel) + 2, yPos);
    yPos += 8;

    // Fecha
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const fechaText = `FECHA: ${fechaFormateada}`;
    doc.text(fechaText, margin, yPos);
    yPos += 5;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ========== PRODUCTOS CON TAMAÑO DE FUENTE DINÁMICO ==========
    if (venta.productos && venta.productos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("PRODUCTOS", margin, yPos);
      yPos += 4;
      doc.setFont("helvetica", "normal");
      
      venta.productos.forEach((producto) => {
        const cantidad = producto.cantidad || 1;
        const totalProducto = producto.precio * cantidad;
        const nombreProducto = cantidad > 1 
          ? `${producto.nombre} x${cantidad}`
          : producto.nombre;
        
        // Calcular espacio disponible para el nombre (restar espacio del precio)
        const precioStr = `Bs ${totalProducto.toFixed(2)}`;
        const precioWidth = doc.getTextWidth(precioStr);
        const espacioNombre = pageWidth - margin - margin - precioWidth - 4;
        
        // Calcular el tamaño de fuente óptimo para este producto
        const fontSizeOptimo = this.calcularTamanoFuente(nombreProducto, espacioNombre, doc);
        const lineas = this.dividirTextoOptimizado(nombreProducto, espacioNombre, doc, fontSizeOptimo);
        
        // Aplicar el tamaño de fuente calculado
        doc.setFontSize(fontSizeOptimo);
        
        // Mostrar las líneas con el precio
        if (lineas.length > 0) {
          // Primera línea con el precio a la derecha
          doc.text(lineas[0], margin + 2, yPos);
          doc.setFont("helvetica", "bold");
          doc.text(precioStr, pageWidth - margin - precioWidth, yPos);
          doc.setFont("helvetica", "normal");
          yPos += 4;
          
          // Líneas adicionales sin precio
          for (let i = 1; i < lineas.length; i++) {
            doc.text(lineas[i], margin + 2, yPos);
            yPos += 4;
          }
        }
        
        // Restaurar tamaño de fuente por defecto
        doc.setFontSize(9);
      });
    }

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ========== TOTALES ==========
    const descuento = venta.descuento || 0;
    const subtotal = venta.subtotal || venta.total + descuento;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#000000");

    if (descuento > 0) {
      doc.text(`SUB TOTAL: Bs ${subtotal.toFixed(2)}`, margin, yPos);
      yPos += 4;
      doc.text(`DESCUENTO: Bs ${descuento.toFixed(2)}`, margin, yPos);
      yPos += 4;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: Bs ${venta.total.toFixed(2)}`, margin, yPos);
    yPos += 4;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    doc.setFontSize(8);
    doc.setTextColor("#000000");
    doc.setFont("helvetica", "normal");
    doc.text(`Registrado por: ${venta.registradoPor || 'No registrado'}`, margin, yPos);
    yPos += 6;

    return doc;
  }

  // ========== IMPRIMIR UN PDF CON IFRAME OCULTO ==========
  private static imprimirPDFConIframe(doc: jsPDF): Promise<void> {
    return new Promise((resolve) => {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(url);
            resolve();
          }, 3000);
        }, 500);
      };
    });
  }

  // ========== PROCESAR COLA DE IMPRESIÓN ==========
  private static async procesarCola() {
    if (this.imprimiendo || this.colaImpresion.length === 0) return;
    
    this.imprimiendo = true;
    
    try {
      while (this.colaImpresion.length > 0) {
        const doc = this.colaImpresion.shift();
        if (doc) {
          await this.imprimirPDFConIframe(doc);
          if (this.colaImpresion.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
    } catch (error) {
      console.error('Error en cola de impresión:', error);
    } finally {
      this.imprimiendo = false;
    }
  }

  // ========== MÉTODO PRINCIPAL PARA IMPRIMIR DIRECTAMENTE ==========
  static async imprimir(venta: VentaData) {
    const doc = await this.generarPDFVenta(venta);
    this.colaImpresion.push(doc);
    await this.procesarCola();
  }
}