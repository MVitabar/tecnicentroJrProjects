"use client";

import { useState, useEffect, useRef } from "react";
import type { Product } from "@/types/product.types";
import { Plus, Minus, Trash2, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerForm, type CustomerData } from "./customer-form";
import { useReactToPrint } from "react-to-print";
import Image from "next/image";
import { toast } from "sonner";




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
    type: 'REPAIR' | 'MAINTENANCE' | 'INSTALLATION' | 'OTHER';
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

const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
];

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
  const [newItem, setNewItem] = useState<NewItemForm>({
    id: "",
    type: "",
    name: "",
    price: "",
    quantity: "1",
    notes: "",
    images: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewItem((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...files],
      }));
      // Reset the file input to allow selecting the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setNewItem((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      const product = products.find(p => p.id === newItem.id);
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
      const serviceId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
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
    resetFileInput();
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
          return i.name.toLowerCase() === item.name.toLowerCase() && i.type === type;
        }
        return false;
      });

      const quantityToAdd = Math.max(1, isNaN(quantity) ? 1 : quantity);

      if (existingItem) {
        return prev.map((i: CartItem) => {
          const isSameItem = 
            type === "product" 
              ? i.id === item.id && i.type === type
              : i.name.toLowerCase() === item.name.toLowerCase() && i.type === type;

          if (!isSameItem) return i;
          
          const updatedItem = {
            ...i,
            quantity: i.quantity + quantityToAdd,
            notes: type === "service" ? (notes || i.notes || '') : i.notes,
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
        ...(type === "service" && { images })
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

    // Función para subir imágenes y obtener URLs
    const uploadImages = async (images: File[]): Promise<string[]> => {
      if (!images || images.length === 0) return [];
      
      // En una implementación real, aquí iría la lógica para subir las imágenes
      // a un servicio de almacenamiento como AWS S3, Cloudinary, etc.
      // Por ahora, simulamos la subida con URLs de ejemplo
      console.log("Subiendo imágenes:", images);
      return images.map((_, index) => `url${index + 1}.jpg`);
    };

    try {
      // Procesar productos
      const productsData = selectedItems
        .filter(item => item.type === "product")
        .map(item => ({
          productId: item.id,
          quantity: item.quantity
        }));

      // Procesar servicios
      const servicesData = await Promise.all(
        selectedItems
          .filter(item => item.type === "service")
          .map(async (item) => {
            const photoUrls = await uploadImages(item.images || []);
            return {
              name: item.name,
              description: item.notes || "Sin descripción",
              price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
              type: "REPAIR" as const,
              photoUrls,
            };
          })
      );

      // Validar que haya al menos un producto o servicio
      if (productsData.length === 0 && servicesData.length === 0) {
        toast.error("La venta debe incluir al menos un producto o servicio válido");
        return;
      }

      const saleData = {
        clientInfo: {
          name: customerData.name || "Cliente ocasional",
          email: customerData.email || "",
          phone: customerData.phone || "",
          address: customerData.address || "",
          dni: customerData.documentType === "dni" ? customerData.documentNumber : undefined,
        },
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
        toast.success("Venta registrada con éxito");
      }
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      toast.error(error instanceof Error ? error.message : "Error al registrar la venta");
    }
  };

  // Renderizar formulario de cliente
  const renderCustomerForm = () => (
    <div className="mb-6 p-4 bg-muted/10 rounded-lg border">
      <h3 className="text-lg font-medium mb-4">Datos del Cliente</h3>
      <CustomerForm
        customerData={customerData}
        onCustomerChange={(e) => {
          const { name, value } = e.target;
          setCustomerData((prev) => ({
            ...prev,
            [name]: value,
          }));
        }}
      />
    </div>
  );

  if (!isOpen) return null;

  // Resto del código de renderizado...
  // [Aquí iría el resto del código de renderizado del formulario]

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start md:items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
      <div className="bg-background border border-muted rounded-3xl shadow-xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-3 md:p-4 border-b rounded-t-3xl sticky top-0 bg-background z-10">
          <h2 className="text-lg md:text-xl font-semibold">Nueva Venta</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

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
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredItems().map((item) => (
                          <div
                            key={item.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleItemSelect(item)}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">
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
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden"
                          id="service-images"
                          ref={fileInputRef}
                        />
                        <label
                          htmlFor="service-images"
                          className="cursor-pointer text-sm text-gray-600 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fileInputRef.current) {
                              fileInputRef.current.click();
                            }
                          }}
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Plus className="h-6 w-6" />
                            <span>Agregar imágenes</span>
                            <span className="text-xs text-gray-500">
                              Haz clic o arrastra las imágenes aquí
                            </span>
                          </div>
                        </label>
                      </div>
                      {newItem.images?.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-2">
                            Imágenes seleccionadas ({newItem.images.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {newItem.images.map((file, index) => (
                              <div
                                key={index}
                                className="relative group w-16 h-16 rounded-md overflow-hidden border"
                              >
                                <Image
                                  src={URL.createObjectURL(file)}
                                  alt={`Imagen ${index + 1}`}
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
                      <span>Total:</span>
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
                    {/* Payment Method Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Método de Pago
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-6 space-y-2">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={selectedItems.length === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Finalizar Venta
                      </Button>
                      <Button
                        variant="outline"
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
