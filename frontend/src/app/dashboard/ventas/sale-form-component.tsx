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
  FileText,
  Info,
} from "lucide-react";
import { type CustomerData } from "./customer-form";
import { uploadImages } from "@/lib/api/imageService";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReactToPrint } from "react-to-print";
import Image from "next/image";
import { toast } from "sonner";
import { PDFViewer } from "@react-pdf/renderer";
import ReceiptPDF from "./ReceiptPDF";
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
  // Add these to match ProductOrder
  productId?: string;
  unitPrice?: number;
};

interface NewItemForm {
  id: string;
  type: "product" | "service" | "";
  name: string;
  price: string;
  quantity: string;
  notes: string;
  images: File[];
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
  }>;
  services: Array<{
    name: string;
    description: string;
    price: number;
    type: "REPAIR" | "MAINTENANCE" | "INSTALLATION" | "OTHER";
    photoUrls: string[];
  }>;
};

// Mantenemos el tipo CartItem para el estado del carrito

type SaleFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SaleData) => Promise<boolean>;
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [saleData] = useState<SaleData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
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

  const [newItem, setNewItem] = useState<NewItemForm>({
    id: "",
    type: "",
    name: "",
    price: "",
    quantity: "1",
    notes: "",
    images: [],
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

  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    documentType: "dni",
    documentNumber: "",
    email: "",
    address: "",
    notes: "",
  });

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    if (!customerData.name?.trim()) {
      newErrors.name = "El nombre es obligatorio";
      isValid = false;
    }

    if (!customerData.email?.trim()) {
      newErrors.email = "El correo electrónico es obligatorio";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(customerData.email)) {
      newErrors.email = "El correo electrónico no es válido";
      isValid = false;
    }

    if (!customerData.phone?.trim()) {
      newErrors.phone = "El teléfono es obligatorio";
      isValid = false;
    } else if (!/^[0-9+\-\s]+$/.test(customerData.phone)) {
      newErrors.phone =
        "El teléfono solo puede contener números, guiones y espacios";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Configurar la impresión del PDF
  const printOptions = {
    content: () => receiptRef.current,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      onClose();
    },
    removeAfterPrint: true,
  } as const;

  const handlePrint = useReactToPrint(
    printOptions as Parameters<typeof useReactToPrint>[0]
  );

  // Efecto para manejar la impresión después de guardar la venta
  useEffect(() => {
    if (saleData && !isPrinting) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [saleData, isPrinting, handlePrint]);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

    if (newItem.type === "product") {
      // Para productos, necesitamos el ID del producto
      const product = products.find((p) => p.id === newItem.id);
      if (!product) return;

      handleAddItem(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          productId: product.id,
        },
        "product",
        notes,
        quantity
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
        quantity,
        images
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
        quantity
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
    });
  };

  // Agregar ítem al carrito
  const handleAddItem = (
    item: Pick<CartItem, "id" | "name" | "price"> & { productId?: string },
    type: CartItem["type"],
    notes: string = "",
    quantity: number = 1,
    images: File[] = []
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

      const quantityToAdd = Math.max(1, isNaN(quantity) ? 1 : quantity);

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

          return updatedItem as CartItem;
        });
      }

      const newItem: CartItem = {
        ...item,
        id: item.id || `temp-${Date.now()}`,
        quantity: quantityToAdd,
        type,
        notes: type === "service" ? notes : "",
        ...(type === "product" && { productId: item.productId || item.id }),
        ...(type === "service" && { images }),
      } as CartItem;

      return [...prev, newItem];
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("No hay ítems en la venta");
      return;
    }

    // Verificar si hay servicios en la venta
    const hasServices = selectedItems.some((item) => item.type === "service");

    // Datos por defecto del cliente para ventas solo con productos
    const defaultClientInfo = {
      name: "venta",
      email: "venta_cliente@example.com",
      phone: "999999999",
      address: "Calle Falsa 123",
      dni: "11111111",
    };

    // Si hay servicios, validar los datos del cliente
    if (hasServices) {
      if (!validateForm()) {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          const element = document.getElementById(
            `customer-${firstErrorField}`
          );
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
          element?.focus();
        }
        return;
      }
    }

    try {
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
        .map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        }));

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
              type: "REPAIR" as const,
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

      // Usar los datos del cliente si existen, de lo contrario usar los valores por defecto
      const clientInfo = hasServices
        ? {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            address: customerData.address || "",
            dni:
              customerData.documentType === "dni"
                ? customerData.documentNumber
                : undefined,
          }
        : defaultClientInfo;

      const saleData = {
        clientInfo,
        products: productsData,
        services: servicesData,
      };

      console.log("Enviando datos de venta:", saleData);
      const success = await onSubmit(saleData);

      if (success) {
        // Limpiar el formulario después de una venta exitosa
        setSelectedItems([]);
        setCustomerData({
          name: "",
          phone: "",
          email: "",
          documentType: "dni",
          documentNumber: "",
          address: "",
          notes: "",
        });
        setPaymentMethod("CASH");
        setUploadStatus({
          inProgress: false,
          progress: 0,
          error: null,
          uploadedFiles: [],
          failedFiles: [],
        });
        setShowUploadError(false);
        setForceSubmit(false);
        toast.success("Venta registrada con éxito");
      }
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al registrar la venta"
      );
    } finally {
      setUploadStatus((prev) => ({ ...prev, inProgress: false }));
    }
  };

  // Renderizar formulario de cliente
  const renderCustomerForm = () => (
    <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
      <h3 className="text-xl font-semibold text-foreground">
        Datos del Cliente
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground/90">
            Nombre completo
            {selectedItems.some((item) => item.type === "service") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="name"
            value={customerData.name}
            onChange={(e) => {
              setCustomerData({ ...customerData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            placeholder="Nombre del cliente"
            className={`mt-1 ${errors.name ? "border-destructive" : ""}`}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1.5">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground/90">
            Correo electrónico
            {selectedItems.some((item) => item.type === "service") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="email"
            type="email"
            value={customerData.email}
            onChange={(e) => {
              setCustomerData({ ...customerData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            placeholder="correo@ejemplo.com"
            className={`mt-1 ${errors.email ? "border-destructive" : ""}`}
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1.5">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-foreground/90">
            Teléfono
            {selectedItems.some((item) => item.type === "service") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="phone"
            type="tel"
            value={customerData.phone}
            onChange={(e) => {
              setCustomerData({ ...customerData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            placeholder="+51 999 999 999"
            className={`mt-1 ${errors.phone ? "border-destructive" : ""}`}
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1.5">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-foreground/90">
            Dirección
          </Label>
          <Input
            id="address"
            value={customerData.address}
            onChange={(e) =>
              setCustomerData({ ...customerData, address: e.target.value })
            }
            placeholder="Dirección del cliente"
            className="mt-1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentType" className="text-foreground/90">
            Tipo de documento
          </Label>
          <Select
            value={customerData.documentType}
            onValueChange={(
              value: "dni" | "ruc" | "ce" | "passport" | "other"
            ) => setCustomerData({ ...customerData, documentType: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dni">DNI</SelectItem>
              <SelectItem value="ruc">RUC</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentNumber" className="text-foreground/90">
            Número de documento
          </Label>
          <Input
            id="documentNumber"
            value={customerData.documentNumber}
            onChange={(e) =>
              setCustomerData({
                ...customerData,
                documentNumber: e.target.value,
              })
            }
            placeholder="Número de documento"
            className="mt-1"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes" className="text-foreground/90">
            Notas adicionales
          </Label>
          <textarea
            id="notes"
            value={customerData.notes || ""}
            onChange={(e) =>
              setCustomerData({ ...customerData, notes: e.target.value })
            }
            placeholder="Notas adicionales del cliente"
            className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
          />
        </div>
      </div>

      {selectedItems.some((item) => item.type === "service") && (
        <div className="mt-4 p-3 bg-muted/30 rounded-md border border-muted">
          <p className="text-sm text-muted-foreground flex items-center">
            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              Los campos marcados con{" "}
              <span className="text-destructive">*</span> son obligatorios
              cuando se incluyen servicios.
            </span>
          </p>
        </div>
      )}
    </div>
  );

  // Función para generar los datos del recibo
  const generateReceiptData = () => {
    const items = selectedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || "",
    }));

    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.18; // 18% de IGV (ajustar según sea necesario)
    const total = subtotal + tax;

    return {
      customerName: customerData.name || "Cliente ocasional",
      customer: {
        documentNumber: customerData.documentNumber,
        documentType: customerData.documentType,
        phone: customerData.phone,
      },
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
    };
  };

  // Datos de la empresa (puedes mover esto a un archivo de configuración)
  const businessInfo = {
    name: "Tecnicentro JR",
    address: "Av. Ejemplo 123, Lima, Perú",
    phone: "+51 987 654 321",
    email: "contacto@tecnicentrojr.com",
    ruc: "20123456789",
    cuit: "20-12345678-9", // Agregado el CUIT que faltaba
    footerText: "Gracias por su compra. Vuelva pronto.",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start md:items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
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

        {/* Diálogo de vista previa del PDF */}
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="w-[98vw] max-w-[98vw] h-[98vh] max-h-[98vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-4 pb-2 border-b">
              <DialogTitle className="text-2xl font-bold">
                Vista Previa del Comprobante
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-0">
              <PDFViewer
                width="100%"
                height="100%"
                style={{
                  border: "none",
                  minHeight: "calc(98vh - 120px)",
                }}
              >
                <ReceiptPDF
                  saleData={generateReceiptData()}
                  businessInfo={businessInfo}
                />
              </PDFViewer>
            </div>
            <div className="p-3 border-t flex justify-end bg-gray-50">
              <Button
                onClick={() => setShowPdfPreview(false)}
                className="px-6 py-2 text-base"
              >
                Cerrar
              </Button>
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
                    {newItem.type === "product" ? "Buscar producto" : "Nombre"}
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
                        newItem.type === "product"
                          ? "Buscar producto..."
                          : "Nombre del ítem"
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
                              ${item.price.toFixed(2)}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Precio</label>
                    <input
                      type="number"
                      name="price"
                      value={newItem.price}
                      onChange={handleNewItemChange}
                      className="w-full p-2 border rounded"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

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
                </div>

                {newItem.type === "service" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notas</label>
                      <textarea
                        name="notes"
                        value={newItem.notes}
                        onChange={handleNewItemChange}
                        className="w-full p-2 border rounded"
                        rows={2}
                        placeholder="Detalles del servicio..."
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

              {/* Sección del cliente */}
              {renderCustomerForm()}
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
                      {selectedItems.map((item) => (
                        <div
                          key={`${item.id}-${item.type}`}
                          className="p-3 border rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              ${item.price.toFixed(2)} x {item.quantity} = $
                              {(item.price * item.quantity).toFixed(2)}
                            </div>
                            {item.notes && (
                              <div className="text-xs text-gray-500 mt-1">
                                {item.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>
                        $
                        {selectedItems
                          .reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <div className="flex justify-between w-full gap-4">
                        <span>Total:</span>

                        <span className="font-medium">
                          $
                          {selectedItems
                            .reduce(
                              (sum, item) => sum + item.price * item.quantity,
                              0
                            )
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 items-center justify-between space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setShowPdfPreview(true)}
                        disabled={selectedItems.length === 0}
                        className="gap-1 flex items-center justify-center"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Vista Previa</span>
                      </Button>
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
                        onClick={onClose}
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

export default SaleForm;
