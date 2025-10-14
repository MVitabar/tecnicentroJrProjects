"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productService } from "@/services/product.service";
import { serviceService } from "@/services/service.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, FileText, Download } from "lucide-react";

type ItemType = "product" | "service";

type SaleItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  type: ItemType;
  isCustom?: boolean;
};

type SearchableItem = {
  id: string;
  name: string;
  price: number;
  type: ItemType;
  stock?: number;
};

function VentasPage() {
  // Estados para la venta
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentItem, setCurrentItem] = useState<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: ItemType;
    isCustom: boolean;
  }>({
    id: "",
    name: "",
    price: 0,
    quantity: 1,
    type: "service",
    isCustom: false,
  });

  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; price: number; stock: number }>
  >([]);
  const [filteredProducts, setFilteredProducts] = useState<
    Array<{ id: string; name: string; price: number; stock: number }>
  >([]);
  const [showProductList, setShowProductList] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData] = await Promise.all([
          productService.getProducts(1, 100),
          serviceService.getServices(1, 100),
        ]);
        setProducts(productsData.data);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };

    loadData();
  }, []);

  // Filtrar productos según el término de búsqueda
  useEffect(() => {
    if (currentItem.type === "product" && searchTerm.length > 0) {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowProductList(filtered.length > 0);
    } else {
      setShowProductList(false);
    }
  }, [searchTerm, currentItem.type, products]);

  // Manejar selección de producto
  const handleSelectProduct = (product: {
    id: string;
    name: string;
    price: number;
  }) => {
    setCurrentItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: "product",
      isCustom: false,
    });
    setSearchTerm(product.name);
    setShowProductList(false);
  };

  // Manejar cambio en el tipo de ítem
  const handleTypeChange = (type: ItemType) => {
    setCurrentItem({
      id: "",
      name: "",
      price: 0,
      quantity: 1,
      type,
      isCustom: type === "service",
    });
    setSearchTerm("");
  };

  // Manejar cambio en el campo de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentItem((prev) => ({
      ...prev,
      name: value,
      id: prev.type === "service" ? `custom-${Date.now()}` : prev.id,
      isCustom: true,
    }));
  };

  // Agregar ítem a la venta
  const handleAddItem = () => {
    if (!currentItem.name.trim()) {
      return;
    }

    const newItem: SaleItem = {
      id: currentItem.id || `custom-${Date.now()}`,
      name: currentItem.name,
      price: currentItem.price || 0,
      quantity: currentItem.quantity,
      type: currentItem.type,
      subtotal: (currentItem.price || 0) * currentItem.quantity,
      isCustom: currentItem.type === "service" && !currentItem.id,
    };

    setSaleItems((prev) => [...prev, newItem]);
    setCurrentItem({
      id: "",
      name: "",
      price: 0,
      quantity: 1,
      type: "service",
      isCustom: false,
    });
    setSearchTerm("");
  };

  const removeItem = (index: number) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const calculateTotal = () => {
    return saleItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const newItems = [...saleItems];
    newItems[index] = {
      ...newItems[index],
      quantity: newQuantity,
      subtotal: newQuantity * newItems[index].price,
    };
    setSaleItems(newItems);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0) return;

    const newItems = [...saleItems];
    newItems[index] = {
      ...newItems[index],
      price: newPrice,
      subtotal: newPrice * newItems[index].quantity,
    };
    setSaleItems(newItems);
  };

  const handleGenerateInvoice = () => {
    // Lógica para generar factura
    alert("Generando factura...");
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Nueva Venta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de ítems */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Agregar Ítems</CardTitle>
              <CardDescription>
                Selecciona o ingresa los productos o servicios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="item-type">Tipo</Label>
                    <div className="relative">
                      <select
                        id="item-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={currentItem.type}
                        onChange={(e) =>
                          handleTypeChange(e.target.value as ItemType)
                        }
                      >
                        <option value="product">Producto</option>
                        <option value="service">Servicio</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <Label htmlFor="item-name">Nombre</Label>
                    <div className="relative">
                      <div className="relative w-full">
                        <div className="relative">
                          <Input
                            id="item-name"
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() =>
                              currentItem.type === "product" &&
                              searchTerm.length > 0 &&
                              setShowProductList(true)
                            }
                            onBlur={() =>
                              setTimeout(() => setShowProductList(false), 200)
                            }
                            placeholder={`Buscar ${
                              currentItem.type === "product"
                                ? "producto"
                                : "servicio"
                            }...`}
                            className="pr-10 w-full"
                          />
                          {searchTerm && currentItem.type === "product" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm("");
                                setCurrentItem((prev) => ({
                                  ...prev,
                                  id: "",
                                  name: "",
                                  price: 0,
                                }));
                              }}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {showProductList && filteredProducts.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            <div className="py-1">
                              {filteredProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Evita que el onBlur del input se active
                                    handleSelectProduct(product);
                                  }}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-900">
                                      {product.name}
                                    </span>
                                    <span className="text-sm font-medium text-blue-600">
                                      ${product.price.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Stock disponible:{" "}
                                    <span className="font-medium">
                                      {product.stock} unidades
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {showProductList &&
                          filteredProducts.length === 0 &&
                          searchTerm && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                              <div className="px-4 py-3 text-sm text-gray-500">
                                No se encontraron productos
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="w-24">
                    <Label htmlFor="item-quantity">Cantidad</Label>
                    <Input
                      id="item-quantity"
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>

                  <div className="w-32">
                    <Label htmlFor="item-price">Precio</Label>
                    <Input
                      id="item-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentItem.price || ""}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={handleAddItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de ítems */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Ítems de la Venta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {saleItems.length === 0 ? (
                  <p className="text-gray-500">No hay ítems en la venta</p>
                ) : (
                  <div className="space-y-2">
                    {saleItems.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-center p-2 border rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.type === "product" ? "Producto" : "Servicio"}
                          </p>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                index,
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                        <div className="w-32 ml-4">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              handlePriceChange(
                                index,
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div className="w-24 text-right">
                          ${item.subtotal.toFixed(2)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen de la venta */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen de la Venta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment-method">Método de Pago</Label>
                  <div className="relative mt-1">
                    <select
                      id="payment-method"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handleGenerateInvoice}
                    disabled={saleItems.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Factura
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintInvoice}
                    disabled={saleItems.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default VentasPage;
