import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Logo import
const logo = '/icons/logo-jr-g.png';

// Register font for better text rendering
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 700 },
  ],
});

// 80mm = 226.77 points (1mm = 2.83465 points)
const PAGE_WIDTH = 226.77; // 80mm in points
const PAGE_HEIGHT = 841.89; // 297mm in points (A4 height, but we'll limit content)
const MARGIN = 10; // 10 points margin
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    padding: 0,
    width: PAGE_WIDTH,
    maxWidth: PAGE_WIDTH,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  section: {
    margin: 0,
    padding: MARGIN,
    width: CONTENT_WIDTH,
  },
  header: {
    marginBottom: 8,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  logo: {
    width: '60px',
    height: 'auto',
  },
  businessName: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  businessInfo: {
    fontSize: 7,
    textAlign: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  colLeft: {
    flex: 3,
  },
  colRight: {
    flex: 1,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 8,
  },
  itemQty: {
    fontSize: 8,
    textAlign: 'center',
    width: 20,
  },
  itemPrice: {
    fontSize: 8,
    textAlign: 'right',
    width: 40,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'dashed',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 8,
    fontSize: 7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  textCenter: {
    textAlign: 'center',
  },
  textBold: {
    fontWeight: 'bold',
  },
  textSmall: {
    fontSize: 6,
  },
});

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  cuit: string;
  footerText: string;
}

interface CustomerInfo {
  documentNumber: string;
  documentType: 'dni' | 'ruc' | 'ci' | 'other';
  phone?: string;
  email?: string;
  address?: string;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  type: 'product' | 'service';
  notes?: string;
}

export interface ReceiptThermalPDFProps {
  saleData: {
    orderId: string;
    orderNumber?: string;
    customerName: string;
    customer: CustomerInfo;
    items: ReceiptItem[];
    subtotal: number;
    total: number;
    paymentMethod?: string;
    paymentReference?: string;
  };
  businessInfo: BusinessInfo;
}

const formatCurrency = (amount: number): string => {
  return `S/${amount.toFixed(2)}`;
};

const formatDate = (date: Date = new Date()): string => {
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
};

const ReceiptThermalPDF: React.FC<ReceiptThermalPDFProps> = ({ saleData, businessInfo }) => {
  const now = new Date();
  const hasServices = saleData.items.some(item => item.type === 'service');

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        <View style={styles.section}>
          {/* Encabezado del negocio */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                src={logo} 
                style={styles.logo}
              />
            </View>
            <Text style={styles.businessName}>{businessInfo.name}</Text>
            <Text style={styles.businessInfo}>{businessInfo.address}</Text>
            <Text style={styles.businessInfo}>Tel: {businessInfo.phone}</Text>
            <Text style={styles.businessInfo}>CUIT: {businessInfo.cuit}</Text>
            <Text style={styles.businessInfo}>{formatDate()}</Text>
            {saleData.orderNumber && (
              <Text style={styles.businessInfo}>Orden N°: {saleData.orderNumber}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Título del comprobante */}
          <Text style={styles.title}>COMPROBANTE DE VENTA</Text>
          <Text style={styles.subtitle}>
            N° {saleData.orderNumber || saleData.orderId.substring(0, 8).toUpperCase()}
          </Text>
          <Text style={styles.businessInfo}>
            {formatDate(now)}
          </Text>

          <View style={styles.divider} />

          {/* Datos del cliente */}
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.textBold}>Cliente: {saleData.customerName}</Text>
            <Text>
              {saleData.customer.documentType.toUpperCase()}: {saleData.customer.documentNumber}
            </Text>
            {saleData.customer.phone && (
              <Text>Teléfono: {saleData.customer.phone}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Lista de productos/servicios */}
          <View style={{ marginBottom: 6 }}>
            <View style={[styles.row, { marginBottom: 2 }]}>
              <Text style={[styles.textBold, { width: 20 }]}>Cant</Text>
              <Text style={[styles.textBold, { flex: 1, marginLeft: 4 }]}>Descripción</Text>
              <Text style={[styles.textBold, { width: 40, textAlign: 'right' }]}>Importe</Text>
            </View>

            {saleData.items.map((item, index) => (
              <View key={index} style={{ marginBottom: 2 }}>
                <View style={styles.row}>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                  <Text style={[styles.itemName, { flex: 1, marginLeft: 4 }]}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
                {item.notes && (
                  <Text style={[styles.textSmall, { marginLeft: 24, marginBottom: 2 }]}>
                    Nota: {item.notes}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Totales */}
          <View>
            <View style={styles.row}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(saleData.subtotal)}</Text>
            </View>
            <View style={[styles.row, styles.textBold, { marginTop: 4 }]}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(saleData.total)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Datos de seguridad (solo para servicios) */}
          {hasServices && (
            <View style={{ marginTop: 6, marginBottom: 6 }}>
              <Text style={[styles.textBold, { marginBottom: 2 }]}>DATOS DE SEGURIDAD</Text>
              <Text style={styles.textSmall}>
                En cumplimiento con la normativa vigente, se informa que los servicios están sujetos a las condiciones generales de contratación.
                Para consultas o reclamos, comuníquese al {businessInfo.phone} o escriba a {businessInfo.email}.
              </Text>
            </View>
          )}

          {/* Pie de página */}
          <View style={styles.footer}>
            <Text>{businessInfo.footerText}</Text>
            <Text style={{ marginTop: 4 }}>¡Gracias por su compra!</Text>
            <Text style={{ fontSize: 6, marginTop: 2 }}>
              Comprobante generado el {format(now, "dd/MM/yyyy HH:mm:ss")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptThermalPDF;
