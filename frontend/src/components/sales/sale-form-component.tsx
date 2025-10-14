"use client";

import { useState, useEffect, useRef } from "react";
import { Product } from "@/types/product.types";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { CustomerForm, type CustomerData } from "./customer-form";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

// Información del negocio (deberías mover esto a un archivo de configuración)
const businessInfo = {
  name: "Tecnicentro JR",
  address: "Av. Principal 1234, Local 5",
  phone: "+54 9 1234-5678",
  email: "contacto@tecnicentrojr.com",
  cuit: "30-12345678-9",
  footerText: "Gracias por su compra - No se aceptan devoluciones sin ticket",
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "service" | "custom";
  notes?: string;
};

interface NewItemForm {
  type: "product" | "service" | "";
  name: string;
  price: string;
  quantity: string;
  notes: string;
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

type SaleFormData = {
  items: Array<{
    productId: string;
    quantity: number;
    name?: string;
    price?: number;
    type?: "product" | "service" | "custom";
    notes?: string;
  }>;
  customer: CustomerData;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
};

type SaleFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SaleFormData) => Promise<boolean>;
  products: Product[];
  services: Service[];
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
  const [saleData, setSaleData] = useState<SaleFormData | null>(null);
  const [newItem, setNewItem] = useState<NewItemForm>({
    type: "",
    name: "",
    price: "",
    quantity: "1",
    notes: "",
  });

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
  const inputRef = useRef<HTMLInputElement>(null);
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

const handlePrint = useReactToPrint(printOptions as Parameters<typeof useReactToPrint>[0]);
  // Efecto para manejar la impresión después de guardar la venta
  useEffect(() => {
    if (saleData && !isPrinting) {
      // Pequeño retraso para asegurar que el componente se haya renderizado
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
  
  // Filter based on the current type
  const itemsToSearch = newItem.type === "product" 
    ? products 
    : newItem.type === "service" 
      ? services 
      : [];
  
  return itemsToSearch.filter((item) => {
    // Check if item is a Product (has 'stock' property)
    const isProduct = 'stock' in item;
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
  setNewItem(prev => ({
    ...prev,
    name: item.name,
    price: item.price.toString(),
  }));
  setSearchTerm(""); // Clear search term after selection
  setIsDropdownOpen(false);
};

  // Manejar cambios en el formulario
  const handleNewItemChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => {
  const { name, value, type } = e.target;

  setNewItem((prev) => {
    const newState = { ...prev, [name]: value };

    // Update searchTerm when the name changes and it's a product
    if (name === "name" && prev.type === "product") {
      setSearchTerm(value);
    }

    if (name === "type") {
      // Reset other fields when type changes
      newState.name = "";
      newState.price = "";
      newState.quantity = "1";
      newState.notes = "";
      setSearchTerm(""); // Reset search term when type changes
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

    handleAddItem(
      {
        id:
          newItem.type === "product"
            ? `product-${newItem.name.toLowerCase().replace(/\s+/g, "-")}`
            : `custom-${Date.now()}`,
        name: newItem.name,
        price: parseFloat(newItem.price) || 0,
      },
      newItem.type as "product" | "service" | "custom",
      newItem.notes,
      quantity
    );

    // Reiniciar formulario
    setNewItem((prev) => ({
      ...prev,
      name: "",
      price: "",
      quantity: "1",
      notes: "",
    }));
  };

  // Agregar ítem al carrito
  const handleAddItem = (
    item: Pick<CartItem, "id" | "name" | "price">,
    type: CartItem["type"],
    notes: string = "",
    quantity: number = 1
  ): void => {
    setSelectedItems((prev) => {
      const existingItem =
        type === "product"
          ? prev.find((i) => i.id === item.id && i.type === type)
          : prev.find(
              (i) =>
                i.name.toLowerCase() === item.name.toLowerCase() &&
                i.type === type
            );

      const quantityToAdd = Math.max(
        1,
        isNaN(quantity) ? 1 : quantity
      );

      if (existingItem) {
        return prev.map((i) => {
          const isSameItem =
            type === "product"
              ? i.id === item.id && i.type === type
              : i.name.toLowerCase() === item.name.toLowerCase() &&
                i.type === type;

          return isSameItem
            ? {
                ...i,
                quantity: i.quantity + quantityToAdd,
                notes: type === "service" ? notes : i.notes,
              }
            : i;
        });
      }

      return [
        ...prev,
        {
          ...item,
          quantity: quantityToAdd,
          type,
          notes: type === "service" ? notes : "",
        },
      ];
    });
  };

  // Efecto para manejar la impresión después de guardar la venta
  useEffect(() => {
    if (saleData && !isPrinting) {
      // Pequeño retraso para asegurar que el componente se haya renderizado
      const timer = setTimeout(() => {
        handlePrint();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [saleData, isPrinting, handlePrint]);

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (selectedItems.length === 0) return;

    const saleData: SaleFormData = {
      items: selectedItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: item.type,
        notes: item.notes,
      })),
      customer: {
        ...customerData,
        ...(customerData.documentNumber && {
          documentType: customerData.documentType,
          documentNumber: customerData.documentNumber,
        }),
      },
      customerName: customerData.name || "Cliente ocasional",
      customerPhone: customerData.phone || "",
      customerEmail: customerData.email || "",
      total: selectedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    };

    try {
      // Guardar la venta
      const success = await onSubmit(saleData);

      if (success) {
        // Guardar los datos de la venta para la impresión
        setSaleData(saleData);
      } else {
        toast.error("Error al guardar la venta");
      }
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      toast.error("Error al guardar la venta");
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

  const total = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background p-8 rounded-lg w-full max-w-7xl h-[90vh] flex flex-col border shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Nueva Venta</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-grow overflow-hidden h-full">
          {/* Contenedor izquierdo - Formularios */}
          <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-2">
            {/* Búsqueda y Selección */}
            <form onSubmit={handleAddCustomItem}>
              <Card className="p-4 space-y-4">
                <h3 className="font-medium">Agregar ítem</h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="relative col-span-2">
                    <select
                      name="type"
                      value={newItem.type}
                      onChange={handleNewItemChange}
                      className="w-full h-10 pl-3 pr-8 text-sm border rounded-md bg-background transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                      required
                    >
                      <option value="">Tipo</option>
                      <option value="product">Producto</option>
                      <option value="service">Servicio</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>

                  <div className="relative col-span-2" ref={dropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={newItem.name}
                        onChange={handleNewItemChange}
                        onFocus={handleFocus}
                        placeholder={
                          newItem.type === "product"
                            ? "Buscar producto..."
                            : "Nombre del servicio"
                        }
                        className="w-full p-2 border rounded-md"
                        required
                        autoComplete={newItem.type === "product" ? "off" : "on"}
                        ref={inputRef}
                      />
                      {newItem.type === "product" && (
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {isDropdownOpen && newItem.type === "product" && (
                      <div className="absolute z-10 mt-1 w-full bg-popover text-popover-foreground shadow-lg rounded-md border overflow-hidden">
                        <ScrollArea className="max-h-60">
                          {filteredItems().length > 0 ? (
                            <div className="py-1">
                              {filteredItems().map((item) => (
                                <div
                                  key={item.id}
                                  className="px-4 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => handleItemSelect(item)}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                      {item.name}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ${item.price.toFixed(2)}
                                      {"stock" in item &&
                                        ` • ${item.stock} disponibles`}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-2 text-sm text-muted-foreground">
                              No se encontraron productos
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  <input
                    type={newItem.type === "service" ? "text" : "number"}
                    name="price"
                    value={newItem.price}
                    onChange={handleNewItemChange}
                    placeholder="Precio"
                    min={newItem.type === "service" ? undefined : "0"}
                    step={newItem.type === "service" ? undefined : "0.01"}
                    className="p-2 border rounded-md"
                    required
                    disabled={
                      newItem.type === "service" ? false : !newItem.name
                    }
                  />

                  {newItem.type === "service" ? (
                    <input
                      type="text"
                      name="quantity"
                      value={newItem.quantity}
                      onChange={handleNewItemChange}
                      placeholder="Cantidad"
                      className="p-2 border rounded-md"
                      required
                    />
                  ) : (
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-r-none border-r-0"
                        onClick={() => {
                          const newQuantity = Math.max(
                            1,
                            (parseInt(newItem.quantity) || 1) - 1
                          );
                          setNewItem((prev) => ({
                            ...prev,
                            quantity: newQuantity.toString(),
                          }));
                        }}
                        disabled={
                          !newItem.name ||
                          (parseInt(newItem.quantity) || 1) <= 1
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <input
                        type="number"
                        name="quantity"
                        value={newItem.quantity}
                        onChange={handleNewItemChange}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e" || e.key === "E") {
                            e.preventDefault();
                          }
                        }}
                        min="1"
                        step="1"
                        className="h-9 w-16 text-center border-t border-b border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                        disabled={!newItem.name}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-l-none border-l-0"
                        onClick={() => {
                          const newQuantity =
                            (parseInt(newItem.quantity) || 0) + 1;
                          setNewItem((prev) => ({
                            ...prev,
                            quantity: newQuantity.toString(),
                          }));
                        }}
                        disabled={!newItem.name}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!newItem.type || !newItem.name || !newItem.price}
                    className="w-full col-span-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>

                  {newItem.type === "service" && (
                    <div className="col-span-full mt-2">
                      <label
                        htmlFor="notes"
                        className="block text-sm font-medium text-muted-foreground mb-1"
                      >
                        Notas del servicio
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={newItem.notes}
                        onChange={handleNewItemChange}
                        placeholder="Agregar notas sobre el servicio..."
                        rows={3}
                        className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </form>

            {/* Formulario del Cliente */}
            {renderCustomerForm()}
          </div>

          {/* Resumen de la Venta */}
          <div className="w-full lg:w-5/12 xl:w-2/5 2xl:w-1/3 flex flex-col h-full">
            <div className="bg-card rounded-lg shadow-sm border overflow-hidden flex-1 flex flex-col h-full">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold text-foreground">
                  Resumen de Venta
                </h3>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div
                      key={`${item.id}-${item.type}`}
                      className="bg-background p-4 rounded-lg border hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">
                              {item.name}
                              {item.notes && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({item.notes})
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t p-6 bg-muted/5">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full py-6 text-base font-medium transition-all hover:scale-[1.02]"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={selectedItems.length === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Finalizar Venta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Hidden receipt for printing */}
      <div style={{ display: "none" }}>
        <div ref={receiptRef}>
          {saleData && (
            <div className="p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">{businessInfo.name}</h2>
                <p className="text-sm">{businessInfo.address}</p>
                <p className="text-sm">{businessInfo.phone}</p>
                <p className="text-xs mt-2">CUIT: {businessInfo.cuit}</p>
              </div>

              <div className="border-t border-b py-2 my-2">
                <p className="text-center">Ticket de Venta</p>
                <p className="text-center text-sm">
                  {new Date().toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="mb-4">
                {saleData.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <div>
                      <p className="font-medium">
                        {item.quantity}x {item.name}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-gray-500">{item.notes}</p>
                      )}
                    </div>
                    <p>${((item.price || 0) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${saleData.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center mt-6 text-xs">
                <p>Gracias por su compra</p>
                <p>No se aceptan devoluciones sin ticket</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
