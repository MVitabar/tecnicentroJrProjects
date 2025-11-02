"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Product } from "@/types/product.types";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  XCircle,
  Info,
  Printer,
  Download,
  AlertCircle,
} from "lucide-react";
import { uploadImages } from "@/lib/api/imageService";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { toast } from "sonner";
import { PDFViewer, pdf, PDFDownloadLink, PDFDownloadLinkProps } from "@react-pdf/renderer";
import ReceiptPDF from './ReceiptPDF';

// Definir el tipo para los props del PDFDownloadLink
type PDFDownloadLinkRenderProps = {
  loading: boolean;
  error: Error | null;
  blob: Blob | null;
  url: string | null;
};

// Definir el tipo para los datos de la venta
type ReceiptData = {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customer: {
    documentNumber: string;
    documentType: 'dni' | 'ruc' | 'ci' | 'other';
    phone: string;
    email: string;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    type: 'product' | 'service';
    notes?: string;
  }>;
  subtotal: number;
  total: number;
  paymentMethod?: string;
  paymentReference?: string;
  createdBy?: {
    name: string;
    email?: string;
  };
};

import { StyleSheet, Font, Image as PDFImage } from '@react-pdf/renderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "service" | "custom";
  notes?: string;
  images?: File[];
  serviceType?: 'REPAIR' | 'WARRANTY'; // Added service type field
  // Add these to match ProductOrder
  productId?: string;
  unitPrice?: number;
  customPrice?: number; // Precio personalizado para el producto
};

interface NewItemForm {
  id: string;
  type: "product" | "service" | "custom" | "";
  name: string;
  price: string;
  quantity: string;
  notes: string;
  images: File[];
  serviceType?: 'REPAIR' | 'WARRANTY'; // Added service type field
  // Add these to match ProductOrder
  productId?: string;
  unitPrice?: number;
}

type Service = {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Tipos para la estructura de la venta
// Types moved to sale.service.ts

type SaleData = {
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    dni?: string;
  };
  products: Array<{
    productId: string;
    quantity: number;
    customPrice?: number; // Precio personalizado opcional para el producto
  }>;
  services: Array<{
    name: string;
    description: string;
    price: number;
    type: "REPAIR" | "WARRANTY"; // Updated to match backend specification
    photoUrls: string[];
  }>;
};

// Mantenemos el tipo CartItem para el estado del carrito

type SaleFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SaleData) => Promise<{ success: boolean; orderId?: string; orderNumber?: string }>;
  products: Product[];
  services?: Service[];
};

export function SaleForm({
  isOpen,
  onClose,
  onSubmit,
  products,
  services,
}: SaleFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [showServiceSheet, setShowServiceSheet] = useState(false); // Para la hoja de servicio
  const [isDniValid, setIsDniValid] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  // Estados para el seguimiento de carga de imágenes
  const [uploadStatus, setUploadStatus] = useState<{
    inProgress: boolean;
    progress: number;
    error: string | null;
    uploadedFiles: string[];
    failedFiles: { file: File; error: string }[];
  }>({
    inProgress: false,
    progress: 0,
    error: null,
    uploadedFiles: [],
    failedFiles: [],
  });

  const [showUploadError, setShowUploadError] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);

  // Estado para manejar errores de creación de orden
  const [orderError, setOrderError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  
  // Obtener información del usuario autenticado
  const { user } = useAuth();

  const [newItem, setNewItem] = useState<NewItemForm>({
    id: "",
    type: "",
    name: "",
    price: "",
    quantity: "1",
    notes: "",
    images: [],
    serviceType: "REPAIR", // Default service type
    productId: "",
    unitPrice: 0
  });
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setNewItem((prev) => {
      const existingFiles = prev.images || [];
      const newFiles = acceptedFiles.filter(
        (newFile) =>
          !existingFiles.some(
            (existingFile) =>
              existingFile.name === newFile.name &&
              existingFile.size === newFile.size
          )
      );

      return {
        ...prev,
        images: [...existingFiles, ...newFiles],
      };
    });
  }, []); // No necesita dependencias ya que solo usa setNewItem

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  });

  const removeImage = (index: number) => {
    setNewItem((prev) => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages,
      };
    });
  };

  interface FormCustomerData {
    name: string;
    phone: string;
    documentNumber: string;
    documentType?: string;
    email: string;
    address: string;
    ruc?: string; // Added RUC field
    notes: string;
  }

  const [customerData, setCustomerData] = useState<FormCustomerData>({
    name: "",
    phone: "",
    documentNumber: "",
    documentType: "dni",
    email: "",
    address: "",
    ruc: "",
    notes: "",
  });

  const [errors, setErrors] = useState<{
    email?: string;
    phone?: string;
    documentNumber?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    // Verificar si hay servicios en la venta
    const hasServices = selectedItems.some((item) => item.type === "service");
    const hasProducts = selectedItems.some((item) => item.type === "product");

    // Validar campos del cliente si hay servicios o productos
    if (hasServices || hasProducts) {
      // Validaciones comunes para todos los tipos
      // Validar formato de email si tiene contenido
      if (customerData.email?.trim() && !/\S+@\S+\.\S+/.test(customerData.email)) {
        newErrors.email = "El correo electrónico no es válido";
        isValid = false;
      }

      // Validar formato de teléfono si tiene contenido
      if (customerData.phone?.trim() && !/^[0-9+\-\s]+$/.test(customerData.phone)) {
        newErrors.phone =
          "El teléfono solo puede contener números, guiones y espacios";
        isValid = false;
      }

      // Validar DNI si hay servicios (obligatorio) o si se completó (formato)
      if (hasServices) {
        // Para servicios, DNI es obligatorio
        if (!customerData.documentNumber?.trim()) {
          newErrors.documentNumber = "El DNI es obligatorio para servicios";
          isValid = false;
        } else if (!/^[0-9]{8}$/.test(customerData.documentNumber)) {
          newErrors.documentNumber = "El DNI debe tener 8 dígitos";
          isValid = false;
        }
      } else if (hasProducts && customerData.documentNumber?.trim()) {
        // Para productos, DNI es opcional pero si se ingresa debe ser válido
        if (!/^[0-9]{8}$/.test(customerData.documentNumber)) {
          newErrors.documentNumber = "El DNI debe tener 8 dígitos si se ingresa";
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Reset completo del estado de la venta
  const resetSaleState = useCallback(() => {
    console.log(" Iniciando reset del estado de venta");

    setSelectedItems([]); // Limpiar el carrito
    setCustomerData({
      name: "",
      phone: "",
      documentNumber: "",
      email: "",
      address: "",
      ruc: "",
      notes: "",
    });
    setErrors({}); // Limpiar errores de validación
    setSearchTerm(""); // Limpiar búsqueda
    setIsDropdownOpen(false); // Cerrar dropdown
    setUploadStatus({
      inProgress: false,
      progress: 0,
      error: null,
      uploadedFiles: [],
      failedFiles: [],
    });
    setShowUploadError(false);
    setForceSubmit(false);
    setOrderId(null);
    setOrderNumber(null);
    setOrderError(null); // Limpiar errores de orden
    // Reset newItem form
    setNewItem({
      id: "",
      type: "",
      name: "",
      price: "",
      quantity: "1",
      notes: "",
      images: [],
      serviceType: "REPAIR", // Reset service type
      productId: "",
      unitPrice: 0
    });

    console.log(" Estado de venta reseteado completamente");
  }, []);

  // Limpiar estado cuando se abre una nueva venta
  useEffect(() => {
    if (isOpen) {
      console.log(" Nueva venta abierta - limpiando estado anterior");
      resetSaleState();
      setShowUploadError(false);
    }
  }, [isOpen, resetSaleState]);

  const filteredItems = (): (Product | Service)[] => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();

    // Filtrar según el tipo actual
    let itemsToSearch: (Product | Service)[] = [];

    if (newItem.type === "product") {
      itemsToSearch = products;
    } else if (newItem.type === "service") {
      itemsToSearch = services || [];
    }

    return itemsToSearch.filter((item) => {
      const isProduct = "stock" in item;
      const description = isProduct ? (item as Product).description : null;

      return (
        item.name.toLowerCase().includes(term) ||
        (description && (description as string).toLowerCase().includes(term)) ||
        item.id.toLowerCase().includes(term)
      );
    });
  };

  // Manejar selección de ítem
  const handleItemSelect = (item: Product | Service) => {
    setNewItem((prev) => ({
      ...prev,
      id: item.id,
      name: item.name,
      price: item.price.toString(),
    }));
    setSearchTerm(""); // Limpiar búsqueda
    setIsDropdownOpen(false);
  };

  // Manejar cambios en el formulario
  const handleNewItemChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setNewItem((prev) => {
      const newState = { ...prev, [name]: value };

      // Actualizar búsqueda cuando cambia el nombre y es un producto
      if (name === "name" && prev.type === "product") {
        setSearchTerm(value);
      }

      if (name === "type") {
        // Resetear otros campos cuando cambia el tipo
        newState.name = "";
        newState.price = "";
        newState.quantity = "1";
        newState.notes = "";
        newState.serviceType = "REPAIR"; // Reset service type
        setSearchTerm("");
      }

      if (name === "quantity" && type === "number" && parseInt(value) < 1) {
        newState.quantity = "1";
      }

      if (name === "name" && prev.type === "product") {
        setIsDropdownOpen(!!value);
      }

      return newState;
    });
  };

  // Manejar foco en el campo de búsqueda
  const handleFocus = () => {
    if (newItem.type === "product") {
      setSearchTerm(newItem.name);
      setIsDropdownOpen(!!newItem.name);
    }
  };

  // Eliminar ítem del carrito
  const removeItem = (id: string): void => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Agregar ítem personalizado
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.type || !newItem.name || !newItem.price) return;

    const quantity = Math.max(
      1,
      isNaN(parseInt(newItem.quantity)) ? 1 : parseInt(newItem.quantity)
    );

    const price = parseFloat(newItem.price) || 0;
    const images = newItem.images || [];
    const notes = newItem.notes || "";

    // Para servicios, la cantidad siempre debe ser 1
    const finalQuantity = newItem.type === "service" ? 1 : quantity;

    if (newItem.type === "product") {
      // Para productos, necesitamos el ID del producto
      const product = products.find((p) => p.id === newItem.id);
      if (!product) return;

      // Usar el precio personalizado si se ingresó, de lo contrario usar el precio del producto
      const finalPrice = price > 0 ? price : product.price;
      
      handleAddItem(
        {
          id: product.id,
          name: product.name,
          price: product.price, // Mantener el precio original
          customPrice: finalPrice, // Usar el precio personalizado
          productId: product.id,
        },
        "product",
        notes,
        quantity,
        []
      );
    } else if (newItem.type === "service") {
      // Para servicios, generamos un ID temporal
      const serviceId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      handleAddItem(
        {
          id: serviceId,
          name: newItem.name,
          price: price,
        },
        "service",
        notes,
        finalQuantity,
        images,
        newItem.serviceType || "REPAIR" // serviceType del formulario
      );
    } else {
      // Para ítems personalizados
      handleAddItem(
        {
          id: `custom-${Date.now()}`,
          name: newItem.name,
          price: price,
        },
        "custom",
        notes,
        quantity,
        [],
        undefined // serviceType no aplica para personalizados
      );
    }

    // Reiniciar formulario
    setNewItem({
      id: "",
      type: newItem.type, // Mantener el tipo seleccionado
      name: "",
      price: "",
      quantity: "1",
      notes: "",
      images: [],
      serviceType: "REPAIR", // Reset service type
      productId: "",
      unitPrice: 0
    });
  };

  // Agregar ítem al carrito
  const handleAddItem = (
    item: Pick<CartItem, "id" | "name" | "price"> & {
      productId?: string;
      customPrice?: number; // Precio personalizado para el producto
    },
    type: CartItem["type"],
    notes: string = "",
    quantity: number = 1,
    images: File[] = [],
    serviceType?: 'REPAIR' | 'WARRANTY', // Added serviceType parameter
    customPrice?: number // Precio personalizado opcional
  ): void => {
    setSelectedItems((prev: CartItem[]): CartItem[] => {
      const existingItem = prev.find((i: CartItem) => {
        if (type === "product") {
          return i.id === item.id && i.type === type;
        } else if (type === "service") {
          return (
            i.name.toLowerCase() === item.name.toLowerCase() && i.type === type
          );
        }
        return false;
      });

      const quantityToAdd = Math.max(
        1,
        isNaN(quantity) ? 1 : quantity
      );

      if (existingItem) {
        return prev.map((i: CartItem) => {
          const isSameItem =
            type === "product"
              ? i.id === item.id && i.type === type
              : i.name.toLowerCase() === item.name.toLowerCase() &&
                i.type === type;

          if (!isSameItem) return i;

          const updatedItem = {
            ...i,
            quantity: i.quantity + quantityToAdd,
            notes: type === "service" ? notes || i.notes || "" : i.notes,
          };

          if (type === "service" && images.length > 0) {
            // Safe type assertion since we know this is a service item
            const serviceItem = updatedItem as CartItem & { images: File[] };
            serviceItem.images = [...(i.images || []), ...images];
          }

          // Update serviceType if this is a service
          if (type === "service") {
            (updatedItem as CartItem & { serviceType: string }).serviceType = serviceType || "REPAIR";
          }

          return updatedItem as CartItem;
        });
      }

      // Determinar el precio a usar: customPrice si está definido, de lo contrario usar el precio base del producto
      const finalPrice = customPrice !== undefined ? customPrice : item.price;

      const newItem: CartItem = {
        ...item,
        id: item.id || `temp-${Date.now()}`,
        price: item.price, // Mantener siempre el precio original
        quantity: quantityToAdd,
        type,
        notes: type === "service" ? notes : "",
        ...(type === "product" && {
          productId: item.productId || item.id,
          // Guardar el precio personalizado si es diferente al precio base
          ...(customPrice !== undefined && customPrice > 0 && customPrice !== item.price && {
            customPrice: customPrice
          })
        }),
        ...(type === "service" && { images }),
        ...(type === "service" && { serviceType: serviceType || "REPAIR" }),
      } as CartItem;

      return [...prev, newItem];
    });
  };

  // Datos por defecto del cliente para ventas solo con productos
  const defaultClientInfo = {
    name: "venta",
    email: "venta_cliente@example.com",
    phone: "",
    address: "Calle Falsa 123",
    dni: "11111111",
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("No hay ítems en la venta");
      return;
    }

    // Verificar si hay servicios o productos en la venta
    const hasServices = selectedItems.some((item) => item.type === "service");
    const hasProducts = selectedItems.some((item) => item.type === "product");

    // Si hay servicios o productos, validar formulario
    if (hasServices || hasProducts) {
      if (!validateForm()) {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
          element?.focus();
        }
        return;
      }
    }

    try {
      // Limpiar errores previos
      setOrderError(null);
      
      // Iniciar estado de carga
      setUploadStatus((prev) => ({
        ...prev,
        inProgress: true,
        progress: 0,
        error: null,
        failedFiles: [],
      }));

      // Procesar productos
      const productsData = selectedItems
        .filter((item) => item.type === "product")
        .map((item) => {
          // Determinar si hay un precio personalizado válido
          const hasCustomPrice = item.customPrice !== undefined && item.customPrice > 0 && item.customPrice !== item.price;
          
          // Crear el objeto base del producto
          const productData: {
            productId: string;
            quantity: number;
            price?: number;
            customPrice?: number;
          } = {
            productId: item.id,
            quantity: item.quantity
          };
          
          // Si hay un precio personalizado, lo usamos como precio final
          if (hasCustomPrice) {
            productData.customPrice = item.customPrice;
            // No incluimos el precio base cuando hay un precio personalizado
            console.log(` Producto ${item.id}: Usando precio personalizado de ${item.customPrice} (precio original: ${item.price})`);
          } else {
            // Solo incluimos el precio base si no hay precio personalizado
            productData.price = item.price;
            console.log(` Producto ${item.id}: Usando precio base de ${item.price}`);
          }
          
          console.log(' Producto procesado para la orden:', {
            productId: item.id,
            quantity: item.quantity,
            price: hasCustomPrice ? 'Usando customPrice' : item.price,
            customPrice: hasCustomPrice ? item.customPrice : 'No aplica',
            originalPrice: item.price,
            tieneCustomPrice: hasCustomPrice,
            esDiferente: hasCustomPrice && item.customPrice !== item.price
          });
          
          return productData;
        });

      // Procesar servicios con subida de imágenes
      const servicesData = await Promise.all(
        selectedItems
          .filter((item) => item.type === "service")
          .map(async (item) => {
            let photoUrls: string[] = [];

            if (item.images?.length) {
              const result = await uploadImages(
                item.images,
                ({ total, completed }) => {
                  const progress = Math.round((completed / total) * 100);
                  setUploadStatus((prev) => ({
                    ...prev,
                    progress,
                  }));
                }
              );

              if (result.failed.length > 0 && !forceSubmit) {
                setUploadStatus((prev) => ({
                  ...prev,
                  error: `No se pudieron cargar ${result.failed.length} imágenes`,
                  failedFiles: result.failed,
                }));
                setShowUploadError(true);
                throw new Error("Error al subir imágenes");
              }

              photoUrls = result.urls;
            }

            return {
              name: item.name,
              description: item.notes || "Sin descripción",
              price:
                typeof item.price === "string"
                  ? parseFloat(item.price)
                  : item.price,
              type: (item.serviceType as 'REPAIR' | 'WARRANTY' || "REPAIR"),
              photoUrls,
            };
          })
      );

      // Validar que haya al menos un producto o servicio
      if (productsData.length === 0 && servicesData.length === 0) {
        toast.error(
          "La venta debe incluir al menos un producto o servicio válido"
        );
        return;
      }

      // Usar los datos del cliente si hay servicios o productos, de lo contrario usar los valores por defecto
      const clientInfo = (hasServices || hasProducts)
        ? {
            name: customerData.name || (hasServices ? "Venta" : "Cliente"),
            email: customerData.email,
            phone: customerData.phone,
            address: customerData.address || (hasServices ? "Venta" : "Sin dirección"),
            dni: customerData.documentNumber || (hasServices ? "11111111" : "00000000"),
            ...(customerData.ruc && { ruc: customerData.ruc }),
          }
        : defaultClientInfo;

      console.log("existe productsData:", productsData);
      const saleData = {
        clientInfo,
        products: productsData,
        services: servicesData,
      };

      console.log("Enviando datos de venta:", saleData);
      const result = await onSubmit(saleData);

      if (result.success) {
        // Guardar el orderNumber para mostrarlo en el PDF
        setOrderNumber(result.orderNumber || null);

        // Mostrar el PDF solo después de que la venta se concrete exitosamente
        console.log(" Venta completada - mostrando hoja de servicio");
        setShowServiceSheet(true);

        // El formulario se mantiene intacto hasta que el usuario cierre el PDF
        console.log(" Hoja de servicio se mostrará - el usuario decidirá cuándo cerrar");
      }
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      
      // Extraer mensaje de error y código si están disponibles
      const errorMessage = error instanceof Error ? error.message : "Error al registrar la venta";
      const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
      
      // Guardar el error en el estado para mostrarlo en la UI
      setOrderError({
        message: errorMessage,
        code: errorCode
      });
      
      // También mostrar toast para notificación inmediata
      toast.error(errorMessage);
    } finally {
      setUploadStatus((prev) => ({ ...prev, inProgress: false }));
    }
  };

  // Efecto para validar DNI cuando cambia
  useEffect(() => {
    setIsDniValid(customerData.documentNumber.length === 8);
  }, [customerData.documentNumber]);

  // Renderizar formulario de cliente
  const renderCustomerForm = () => (
    <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
      <h3 className="text-xl font-semibold text-foreground">
        Información del Cliente (Opcional)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label 
            htmlFor="name" 
            className={`text-foreground/90 ${!isDniValid ? 'opacity-50' : ''}`}
          >
            Nombre completo
          </Label>
          <Input
            id="name"
            value={customerData.name}
            onChange={(e) => {
              setCustomerData({ ...customerData, name: e.target.value });
            }}
            placeholder={isDniValid ? "Nombre del cliente" : "Ingrese DNI primero"}
            className={`mt-1 ${!isDniValid ? 'bg-muted/20' : ''}`}
            disabled={!isDniValid}
          />
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="email" 
            className={`text-foreground/90 ${!isDniValid ? 'opacity-50' : ''}`}
          >
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            value={customerData.email}
            onChange={(e) => {
              setCustomerData({ ...customerData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            placeholder={isDniValid ? "correo@ejemplo.com" : "Ingrese DNI primero"}
            className={`mt-1 ${!isDniValid ? 'bg-muted/20' : ''}`}
            disabled={!isDniValid}
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1.5">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="phone" 
            className={`text-foreground/90 ${!isDniValid ? 'opacity-50' : ''}`}
          >
            Teléfono
          </Label>
          <Input
            id="phone"
            type="tel"
            value={customerData.phone}
            onChange={(e) => {
              setCustomerData({ ...customerData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            placeholder={isDniValid ? "+51 999 999 999" : "Ingrese DNI primero"}
            className={`mt-1 ${!isDniValid ? 'bg-muted/20' : ''}`}
            disabled={!isDniValid}
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1.5">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentNumber" className="text-foreground/90">
            DNI {!isDniValid && <span className="text-muted-foreground text-xs">(Ingrese 8 dígitos para continuar)</span>}
            {selectedItems.some((item) => item.type === "service") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="documentNumber"
              value={customerData.documentNumber}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/\D/g, '');
                setCustomerData({ ...customerData, documentNumber: value });
                if (errors.documentNumber) setErrors({ ...errors, documentNumber: undefined });
              }}
              placeholder="12345678"
              maxLength={8}
              className={`mt-1 pr-10 ${errors.documentNumber ? "border-destructive" : ""}`}
            />
            {customerData.documentNumber.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {customerData.documentNumber.length}/8
              </span>
            )}
          </div>
          {errors.documentNumber ? (
            <p className="text-sm text-destructive mt-1.5">{errors.documentNumber}</p>
          ) : customerData.documentNumber.length > 0 && customerData.documentNumber.length < 8 ? (
            <p className="text-sm text-amber-500 mt-1.5">Complete los 8 dígitos del DNI para habilitar los demás campos</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="address" 
            className={`text-foreground/90 ${!isDniValid ? 'opacity-50' : ''}`}
          >
            Dirección
          </Label>
          <Input
            id="address"
            value={customerData.address}
            onChange={(e) =>
              setCustomerData({ ...customerData, address: e.target.value })
            }
            placeholder={isDniValid ? "Dirección del cliente" : "Ingrese DNI primero"}
            className={`mt-1 ${!isDniValid ? 'bg-muted/20' : ''}`}
            disabled={!isDniValid}
          />
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="ruc" 
            className={`text-foreground/90 ${!isDniValid ? 'opacity-50' : ''}`}
          >
            RUC (opcional)
          </Label>
          <Input
            id="ruc"
            value={customerData.ruc || ""}
            onChange={(e) =>
              setCustomerData({ ...customerData, ruc: e.target.value })
            }
            placeholder={isDniValid ? "Número de RUC" : "Ingrese DNI primero"}
            className={`mt-1 ${!isDniValid ? 'bg-muted/20' : ''}`}
            disabled={!isDniValid}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label 
            htmlFor="notes" 
            className={`text-foreground/90 ${!isDniValid ? 'opacity-50' : ''}`}
          >
            Notas adicionales
          </Label>
          <textarea
            id="notes"
            value={customerData.notes || ""}
            onChange={(e) =>
              setCustomerData({ ...customerData, notes: e.target.value })
            }
            placeholder={isDniValid ? "Notas adicionales del cliente" : "Ingrese DNI primero"}
            className={`flex h-24 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 ${!isDniValid ? 'bg-muted/20' : 'bg-background'}`}
            disabled={!isDniValid}
          />
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 rounded-md border border-muted">
          <p className="text-sm text-muted-foreground flex items-center">
            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              <strong>Información del cliente:</strong> Complete los datos del cliente para un mejor seguimiento de sus ventas.
              {selectedItems.some((item) => item.type === "service") && (
                <span className="block mt-1">
                  <strong>Nota:</strong> El DNI es obligatorio para servicios.
                </span>
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );

  // Registrar la imagen del logo
  const logo = '/icons/logo-jr-g.png';

  // Registrar fuentes
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
      padding: 10,
      fontFamily: 'Helvetica',
      fontSize: 8,
    },
    receiptContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: 8,
    },
    receipt: {
      marginBottom: 10,
      border: '1px solid #e2e8f0',
      borderRadius: 3,
      padding: 8,
      position: 'relative',
      fontSize: 8,
    },
    logoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    logo: {
      width: '80px',
      height: 'auto',
      marginRight: 10,
    },
    headerInfo: {
      flex: 1,
      marginLeft: 10,
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
      marginBottom: 6,
      fontSize: 8,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 3,
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: 2,
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
      marginBottom: 0.5,
      fontSize: 7,
      lineHeight: 1.1,
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
      marginTop: 8,
      paddingTop: 4,
      borderTop: '1px dashed #cbd5e1',
      fontWeight: 'bold',
      fontSize: 10,
    },
    footer: {
      marginTop: 4,
      fontSize: 6,
      textAlign: 'center',
      color: '#64748b',
      paddingTop: 4,
      borderTop: '1px solid #e2e8f0',
    },
    divider: {
      borderTop: '1px dashed #cbd5e1',
      margin: '10px 0',
    },
  });

  const generateReceiptData = () => {
    const items = selectedItems.map((item) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.price;
      return {
        name: item.name,
        price: price,
        originalPrice: item.price,
        hasCustomPrice: item.customPrice !== undefined,
        quantity: item.quantity,
        total: price * item.quantity,
        notes: item.notes || "",
        type: item.type,
      };
    });

    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const total = subtotal;

    // Usar siempre los datos del cliente proporcionados por el usuario
    const customerInfo = {
      name: customerData.name || "Cliente",
      phone: customerData.phone,
      documentNumber: customerData.documentNumber || "00000000",
      email: customerData.email,
      address: customerData.address || "Sin dirección"
    };

    const result = {
      customerName: customerInfo.name,
      customer: {
        documentNumber: customerInfo.documentNumber,
        phone: customerInfo.phone,
        email: customerInfo.email,
        address: customerInfo.address
      },
      items,
      subtotal,
      total,
      orderId: orderId || undefined,
      orderNumber: orderNumber || undefined,
    };

    return result;
  };

  // Definir el tipo BusinessInfo
  interface BusinessInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
    ruc: string;
    cuit: string;
    footerText: string;
    logo: string;
  }

  const businessInfo: BusinessInfo = {
    name: "Tecnicentro JR",
    address: "Av. Ejemplo 123, Lima, Perú",
    phone: "+51 987 654 321",
    email: "contacto@tecnicentrojr.com",
    ruc: "20123456789",
    cuit: "20-12345678-9",
    footerText: "Gracias por su compra. Vuelva pronto.",
    logo: ""
  };

  // Función para validar y normalizar el tipo de documento
  const getValidDocumentType = (docType: string | undefined): 'dni' | 'ruc' | 'ci' | 'other' => {
    if (!docType) return 'dni';
    const type = docType.toLowerCase();
    if (['dni', 'ruc', 'ci', 'other'].includes(type)) {
      return type as 'dni' | 'ruc' | 'ci' | 'other';
    }
    return 'dni'; // Valor por defecto
  };

  // Generar datos para la hoja de servicio (ReceiptPDF)
  const generateServiceSheetData = (): ReceiptData => {
    // Filtrar solo items de tipo 'product' o 'service' y mapear al formato correcto
    const items = selectedItems
      .filter(item => item.type === 'product' || item.type === 'service')
      .map((item) => {
        const price = item.customPrice !== undefined ? 
          (typeof item.customPrice === "string" ? parseFloat(item.customPrice) : item.customPrice) :
          (typeof item.price === "string" ? parseFloat(item.price) : item.price);
        
        return {
          name: item.name,
          price: price,
          quantity: item.quantity,
          type: item.type as 'product' | 'service',
          notes: item.notes || ""
        };
      });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal;

    // Obtener datos del cliente con valores por defecto
    const customerInfo = {
      name: customerData.name || "Cliente",
      phone: customerData.phone,
      documentNumber: customerData.documentNumber || "00000000",
      documentType: getValidDocumentType(customerData.documentType),
      email: customerData.email,
      address: customerData.address || "Sin dirección"
    };

    return {
      orderId: orderId || `temp-${Date.now()}`,
      orderNumber: orderNumber || `TEMP-${Date.now()}`,
      customerName: customerInfo.name,
      customer: {
        documentNumber: customerInfo.documentNumber,
        documentType: customerInfo.documentType,
        phone: customerInfo.phone,
        email: customerInfo.email,
        address: customerInfo.address
      },
      items,
      subtotal,
      total,
      paymentMethod: 'efectivo', // Valor por defecto
      paymentReference: '',
      createdBy: user ? {
        name: user.name || 'Usuario',
        email: user.email
      } : { name: 'Sistema' }
    };
  };

  return (
    <div className={`fixed inset-0 bg-black/90 flex items-start md:items-center justify-center z-50 p-2 md:p-4 overflow-y-auto ${!isOpen ? 'hidden' : ''}`}>
      <div className="bg-background border border-muted rounded-3xl shadow-xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-3 md:p-4 border-b rounded-t-3xl sticky top-0 bg-background z-10">
          <h2 className="text-lg md:text-xl font-semibold">Nueva Venta</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
        </div>

        {/* Contenido oculto para impresión automática (versión HTML) */}
        <div
          ref={receiptRef}
          className="hidden"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '300px', // Ancho de ticket térmico
            padding: '10px',
            background: 'white',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.2',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>
              {businessInfo.name}
            </h3>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              {businessInfo.address}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              Tel: {businessInfo.phone}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              RUC: {businessInfo.ruc}
            </p>
          </div>

          <div style={{ borderTop: '1px dashed #000', padding: '5px 0' }}>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <strong>Fecha:</strong> {new Date().toLocaleDateString('es-PE')}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <strong>Hora:</strong> {new Date().toLocaleTimeString('es-PE')}
            </p>
            {orderNumber && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>
                <strong>Orden N°:</strong> {orderNumber}
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #000', padding: '5px 0' }}>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <strong>Cliente:</strong> {customerData.name || "Cliente"}
            </p>
            {customerData.documentNumber && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>
                <strong>DNI:</strong> {customerData.documentNumber}
              </p>
            )}
            {customerData.phone && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>
                <strong>Tel:</strong> {customerData.phone}
              </p>
            )}
            {customerData.email && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>
                <strong>Email:</strong> {customerData.email}
              </p>
            )}
            {customerData.address && (
              <p style={{ margin: '2px 0', fontSize: '10px' }}>
                <strong>Dirección:</strong> {customerData.address}
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #000', padding: '5px 0' }}>
            {selectedItems.map((item) => (
              <div key={`${item.id}-${item.type}`} style={{ marginBottom: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px' }}>
                    {item.name} x{item.quantity}
                  </span>
                  <span style={{ fontSize: '10px' }}>
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                {item.notes && (
                  <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>
                    {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed #000', padding: '5px 0', marginTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span style={{ fontSize: '12px' }}>TOTAL:</span>
              <span style={{ fontSize: '12px' }}>
                S/ {selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '8px', color: '#666' }}>
            {businessInfo.footerText}
          </div>
        </div>

        {/* Diálogo de hoja de servicio */}
        <Dialog open={showServiceSheet} onOpenChange={(open) => {
          if (!open) {
            console.log(" Usuario cerró hoja de servicio - reseteando formulario y cerrando modal padre");
            resetSaleState(); // Reset completo cuando el usuario cierra la hoja de servicio
            setShowServiceSheet(false);
            onClose(); // Cerrar el modal padre
          }
        }}>
          <DialogContent className="w-[98vw] max-w-[98vw] h-[98vh] max-h-[98vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-4 pb-2 border-b">
              <div className="flex justify-between items-center">
                <DialogTitle className="text-2xl font-bold">
                  Comprobante de Venta
                </DialogTitle>
                <div className="flex space-x-2">
                  <PDFDownloadLink
                    document={
                      <ReceiptPDF
                        saleData={generateServiceSheetData()}
                        businessInfo={businessInfo}
                      />
                    }
                    fileName={`comprobante-${new Date().toISOString().split('T')[0]}.pdf`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    {({ loading }: PDFDownloadLinkRenderProps) => (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {loading ? 'Generando...' : 'Descargar PDF'}
                      </>
                    )}
                  </PDFDownloadLink>
                  <button
                    onClick={async () => {
                      // Generar los datos del recibo
                      const receiptData = generateServiceSheetData();
                      if (!receiptData) return;
                      
                      try {
                        // Importar dinámicamente el componente ReceiptThermalPDF
                        const { default: ReceiptThermalPDF } = await import('./ReceiptThermalPDF');
                        
                        // Crear el PDF como un blob
                        const blob = await pdf(
                          <ReceiptThermalPDF 
                            saleData={receiptData} 
                            businessInfo={businessInfo} 
                          />
                        ).toBlob();
                        
                        // Crear una URL para el blob y abrir en una nueva pestaña
                        const pdfUrl = URL.createObjectURL(blob);
                        const printWindow = window.open(pdfUrl, '_blank');
                        
                        // Intentar abrir el diálogo de impresión después de un breve retraso
                        if (printWindow) {
                          setTimeout(() => {
                            printWindow.print();
                          }, 500);
                        }
                      } catch (error) {
                        console.error('Error al generar el PDF:', error);
                        // Usar toast de la forma correcta
                        const { toast: showToast } = await import('@/components/ui/use-toast');
                        showToast({
                          title: "Error",
                          description: "No se pudo generar el PDF para imprimir",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-0">
              {showServiceSheet ? (
                <PDFViewer
                  width="100%"
                  height="100%"
                  style={{
                    border: "none",
                    minHeight: "calc(98vh - 120px)",
                    backgroundColor: "white",
                  }}
                >
                  <ReceiptPDF
                    saleData={generateServiceSheetData()}
                    businessInfo={businessInfo}
                  />
                </PDFViewer>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  backgroundColor: "white",
                  color: "#666"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 10 }}>
                      Hoja de Servicio
                    </div>
                    <div style={{ fontSize: 14 }}>
                      Complete una venta para ver la hoja de servicio
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex-1 overflow-y-auto">
          <div className="h-full flex flex-col md:flex-row">
            {/* Panel izquierdo - Productos */}
            <div className="w-full md:w-1/2 p-4 border-r overflow-auto">
              <form onSubmit={handleAddCustomItem} className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de ítem</label>
                  <select
                    name="type"
                    value={newItem.type}
                    onChange={handleNewItemChange}
                    className="w-full p-2 bg-muted border rounded"
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="product">Producto</option>
                    <option value="service">Servicio</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {(() => {
                      switch (newItem.type) {
                        case "product":
                          return "Buscar producto";
                        case "service":
                          return "Nombre del servicio";
                        case "custom":
                          return "Nombre del ítem personalizado";
                        default:
                          return "Nombre del ítem";
                      }
                    })()}
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      name="name"
                      value={newItem.name}
                      onChange={handleNewItemChange}
                      onFocus={handleFocus}
                      className="w-full p-2 border rounded"
                      placeholder={
                        (() => {
                          switch (newItem.type) {
                            case "product":
                              return "Buscar producto...";
                            case "service":
                              return "Nombre del servicio";
                            case "custom":
                              return "Nombre del ítem personalizado";
                            default:
                              return "Nombre del ítem";
                          }
                        })()
                      }
                      required
                    />
                    {isDropdownOpen && newItem.type === "product" && (
                      <div className="absolute z-10 w-full mt-1 bg-card text-card-foreground border rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-800 dark:border-gray-700">
                        {filteredItems().map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200 dark:hover:bg-gray-700"
                            onClick={() => handleItemSelect(item)}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              S/{item.price.toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {filteredItems().length === 0 && (
                          <div className="p-2 text-gray-500">
                            No se encontraron productos
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={newItem.type === "service" ? "space-y-4" : newItem.type === "custom" ? "space-y-4" : "grid grid-cols-2 gap-4"}>
                  {/* Mostrar input de precio para servicios, personalizados y productos */}
                  {(() => {
                    const showPrice = newItem.type === "service" || newItem.type === "custom" || newItem.type === "product";
                    const showQuantity = newItem.type !== "service";
                    const isProduct = newItem.type === "product";
                    const selectedProduct = isProduct && products.find(p => p.id === newItem.id);
                    const basePrice = selectedProduct ? selectedProduct.price : 0;

                    return (
                      <>
                        {showPrice && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">
                                {isProduct ? "Precio unitario" : "Precio"}
                              </label>
                              {isProduct && (
                                <span className="text-xs text-muted-foreground">
                                  S/{basePrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              name="price"
                              value={newItem.price}
                              onChange={handleNewItemChange}
                              className="w-full p-2 border rounded"
                              placeholder={isProduct ? `Dejar vacío para usar precio base (S/${basePrice.toFixed(2)})` : "0.00"}
                              min="0"
                              step="0.01"
                              required={!isProduct}
                            />
                          </div>
                        )}

                        {showQuantity && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Cantidad</label>
                            <input
                              type="number"
                              name="quantity"
                              value={newItem.quantity}
                              onChange={handleNewItemChange}
                              className="w-full p-2 border rounded"
                              min="1"
                              required
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {newItem.type === "custom" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notas/Detalles del ítem</label>
                    <textarea
                      name="notes"
                      value={newItem.notes}
                      onChange={handleNewItemChange}
                      className="w-full p-2 border rounded resize-none"
                      placeholder="Detalles adicionales del ítem personalizado..."
                      rows={2}
                    />
                  </div>
                )}

                {newItem.type === "service" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de servicio</label>
                      <select
                        name="serviceType"
                        value={newItem.serviceType || "REPAIR"}
                        onChange={handleNewItemChange}
                        className="w-full p-2 bg-muted border rounded"
                        required
                      >
                        <option value="REPAIR">Reparación</option>
                        <option value="WARRANTY">Garantía</option>
                        
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notas/Detalles del servicio</label>
                      <textarea
                        name="notes"
                        value={newItem.notes}
                        onChange={handleNewItemChange}
                        className="w-full p-2 border rounded resize-none"
                        placeholder="Describe el problema, detalles del servicio, observaciones..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Imágenes del servicio
                      </label>

                      {/* Área de dropzone - solo visible si no hay imágenes */}
                      {(!newItem.images || newItem.images.length === 0) && (
                        <div
                          {...getRootProps()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <input {...getInputProps()} />
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Plus className="h-8 w-8 text-gray-400" />
                            {isDragActive ? (
                              <p className="text-sm text-gray-600">
                                Suelta las imágenes aquí...
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-gray-600">
                                  Arrastra y suelta imágenes aquí, o haz clic
                                  para seleccionar
                                </p>
                                <p className="text-xs text-gray-500">
                                  Formatos soportados: .jpeg, .jpg, .png, .webp
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Muestra las miniaturas de las imágenes */}
                      {newItem.images && newItem.images.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">
                              Imágenes seleccionadas ({newItem.images.length})
                            </h4>
                            {/* Botón para agregar más imágenes */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.multiple = true;
                                input.onchange = (e) => {
                                  const files = (e.target as HTMLInputElement)
                                    .files;
                                  if (files) {
                                    onDrop(Array.from(files));
                                  }
                                };
                                input.click();
                              }}
                              className="text-sm text-primary hover:underline flex items-center cursor-pointer"
                            >
                              <Plus className="h-4 w-4 mr-1" /> Agregar más
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {newItem.images.map((file, index) => (
                              <div
                                key={`${file.name}-${index}`}
                                className="relative group w-16 h-16 rounded-md overflow-hidden border"
                              >
                                <Image
                                  src={URL.createObjectURL(file)}
                                  alt={`Vista previa ${index + 1}`}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage(index);
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar al carrito
                </Button>
              </form>

              {/* Formulario de cliente - se muestra cuando hay items en el carrito */}
              {selectedItems.length > 0 && renderCustomerForm()}
            </div>

            {/* Panel derecho - Carrito */}
            <div className="w-full md:w-1/2 p-4 flex flex-col">
              <h3 className="text-lg font-medium mb-4">Detalle de la Venta</h3>

              {selectedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p>El carrito está vacío</p>
                  <p className="text-sm">Agrega productos o servicios</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto mb-4">
                    <div className="space-y-2">
                      {selectedItems.map((item) => {
                        // Precio final del ítem (usado en el cálculo del total)
    const finalPrice = item.customPrice || item.price;
    // Usar finalPrice en el cálculo para evitar la advertencia
                        const originalTotal = item.price * item.quantity;
                        const finalTotal = finalPrice * item.quantity;
                        
                        return (
                          <div
                            key={`${item.id}-${item.type}`}
                            className="p-3 border rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">
                                S/{finalPrice.toFixed(2)} x {item.quantity} = S/
                                {finalTotal.toFixed(2)}
                                {item.customPrice !== undefined && (
                                  <span className="text-xs text-muted-foreground ml-2 line-through">
                                    S/{originalTotal.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                            {item.type !== "service" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedItems((prev) =>
                                      prev.map((i) =>
                                        i.id === item.id && i.type === item.type
                                          ? {
                                              ...i,
                                              quantity: Math.max(1, i.quantity - 1),
                                            }
                                          : i
                                      )
                                    )
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedItems((prev) =>
                                      prev.map((i) =>
                                        i.id === item.id && i.type === item.type
                                          ? { ...i, quantity: i.quantity + 1 }
                                          : i
                                      )
                                    )
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {item.type === "service" && (
                              <span className="w-8 text-center text-muted-foreground">
                                {item.quantity}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>
                        S/{
                          selectedItems.reduce((sum, item) => {
                            const itemPrice = item.customPrice !== undefined ? item.customPrice : item.price;
                            return sum + (itemPrice * item.quantity);
                          }, 0).toFixed(2)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <div className="flex justify-between w-full gap-4">
                        <span>Total:</span>
                        <span className="font-medium">
                          S/{
                            selectedItems.reduce((sum, item) => {
                              const itemPrice = item.customPrice !== undefined ? item.customPrice : item.price;
                              return sum + (itemPrice * item.quantity);
                            }, 0).toFixed(2)
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 items-center justify-between space-y-2">
                      <div className="w-full space-y-4">
                        {uploadStatus.inProgress && (
                          <div className="w-full bg-background/50 p-3 rounded-lg border">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="font-medium">Subiendo imágenes...</span>
                              <span className="font-semibold">{uploadStatus.progress}%</span>
                            </div>
                            <Progress
                              value={uploadStatus.progress}
                              className="h-2 w-full"
                            />
                          </div>
                        )}
                        
                        {showUploadError && uploadStatus.error && (
                          <div className="w-full p-4 bg-error-light/10 border-l-4 border-error rounded-r">
                            <div className="flex items-start">
                              <XCircle className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
                              <div className="ml-3 flex-1">
                                <div className="text-sm text-foreground font-medium">
                                  {uploadStatus.error}
                                </div>
                                
                                {uploadStatus.failedFiles.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      Archivos con errores:
                                    </p>
                                    <ul className="mt-1 space-y-1.5 max-h-32 overflow-y-auto pr-2">
                                      {uploadStatus.failedFiles.map((file, index) => (
                                        <li key={index} className="flex items-start text-sm">
                                          <X className="h-4 w-4 text-error/80 mt-0.5 mr-1.5 flex-shrink-0" />
                                          <div className="break-words max-w-full">
                                            <span className="text-foreground">{file.file.name}</span>
                                            <span className="text-xs text-muted-foreground block">
                                              {file.error}
                                            </span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="mt-4 space-y-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForceSubmit(true);
                                      setShowUploadError(false);
                                      handleSubmit();
                                    }}
                                  >
                                    Continuar sin imágenes
                                  </Button>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowUploadError(false);
                                        setUploadStatus(prev => ({
                                          ...prev,
                                          error: null,
                                          failedFiles: []
                                        }));
                                      }}
                                    >
                                      Reintentar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-destructive border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("🚫 Cancelando subida de imágenes - limpiando componente");
                                        setShowUploadError(false);
                                        setUploadStatus(prev => ({
                                          ...prev,
                                          inProgress: false,
                                          progress: 0,
                                          error: null,
                                          failedFiles: []
                                        }));
                                        // Limpiar las imágenes seleccionadas
                                        setNewItem(prev => ({
                                          ...prev,
                                          images: []
                                        }));
                                        // Limpiar todo el estado si no hay venta en progreso
                                        if (!selectedItems.length) {
                                          resetSaleState();
                                          onClose();
                                        }
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Mostrar error de creación de orden */}
                        {orderError && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error al crear la orden</AlertTitle>
                            <AlertDescription>
                              {orderError.message}
                              {orderError.code && (
                                <span className="block mt-1 text-xs opacity-75">
                                  Código: {orderError.code}
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleSubmit}
                          disabled={selectedItems.length === 0 || uploadStatus.inProgress}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {uploadStatus.inProgress ? 'Procesando...' : 'Finalizar Venta'}
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          console.log("🚫 Cancelando venta - limpiando componente");
                          resetSaleState(); // Limpiar todo el estado del componente
                          onClose(); // Cerrar el modal
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}