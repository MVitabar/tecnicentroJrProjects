import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar fuentes si es necesario
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  receipt: {
    marginBottom: 20,
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 15,
    position: 'relative',
  },
  receiptCopy: {
    fontSize: 10,
    position: 'absolute',
    top: 10,
    right: 15,
    backgroundColor: '#f1f5f9',
    padding: '2px 5px',
    borderRadius: 3,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 10,
    textAlign: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 10,
  },
  col: {
    flex: 1,
  },
  colRight: {
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    fontSize: 9,
  },
  itemName: {
    flex: 3,
  },
  itemQty: {
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 2,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 5,
    borderTop: '1px dashed #cbd5e1',
    fontWeight: 'bold',
    fontSize: 11,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 8,
    textAlign: 'center',
    color: '#64748b',
    paddingTop: 10,
    borderTop: '1px solid #e2e8f0',
  },
  divider: {
    borderTop: '1px dashed #cbd5e1',
    margin: '10px 0',
  },
  halfPage: {
    height: '50%',
    padding: 10,
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

interface ReceiptPDFProps {
  saleData: {
    customerName: string;
    customer: {
      documentNumber?: string;
      documentType?: string;
      phone?: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      notes?: string;
    }>;
    total: number;
  };
  businessInfo: BusinessInfo;
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ saleData, businessInfo }) => {
  const currentDate = new Date();
  const formattedDate = format(currentDate, "dd 'de' MMMM 'de' yyyy HH:mm", { locale: es });

  const renderReceipt = (copy: 'ORIGINAL' | 'DUPLICADO') => (
    <View style={styles.receipt}>
      <Text style={styles.receiptCopy}>{copy}</Text>
      
      <View style={styles.header}>
        <Text style={styles.title}>{businessInfo.name}</Text>
        <Text style={styles.subtitle}>{businessInfo.address}</Text>
        <Text style={styles.subtitle}>Tel: {businessInfo.phone} | {businessInfo.email}</Text>
        <Text style={styles.subtitle}>CUIT: {businessInfo.cuit}</Text>
        <Text style={styles.subtitle}>{formattedDate}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos del Cliente</Text>
        <View style={styles.row}>
          <Text>Nombre: {saleData.customerName || 'Cliente ocasional'}</Text>
          {saleData.customer.documentNumber && (
            <Text>
              {saleData.customer.documentType?.toUpperCase()}: {saleData.customer.documentNumber}
            </Text>
          )}
        </View>
        {saleData.customer.phone && (
          <View style={styles.row}>
            <Text>Teléfono: {saleData.customer.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalle de la Venta</Text>
        <View style={[styles.row, { marginBottom: 5 }]}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Descripción</Text>
          <Text style={[styles.col, { textAlign: 'center', fontWeight: 'bold' }]}>Cant.</Text>
          <Text style={[styles.colRight, { fontWeight: 'bold' }]}>Importe</Text>
        </View>
        
        {saleData.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.name}
              {item.notes && ` (${item.notes})`}
            </Text>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text>TOTAL</Text>
          <Text>${saleData.total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>{businessInfo.footerText}</Text>
        <Text>Gracias por su compra - {copy === 'ORIGINAL' ? 'CLIENTE' : 'COMERCIO'}</Text>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.halfPage}>
          {renderReceipt('ORIGINAL')}
        </View>
        <View style={styles.divider} />
        <View style={styles.halfPage}>
          {renderReceipt('DUPLICADO')}
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
