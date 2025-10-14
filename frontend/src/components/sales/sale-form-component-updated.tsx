"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product.types";
import { X, Plus, Minus, Trash2, ShoppingCart, Search, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Item = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'service' | 'custom';
};

type SaleItem = {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
  type: 'product' | 'service' | 'custom';
};

interface NewItemForm {
  type: 'product' | 'service' | '';
  name: string;
  price: string;
  quantity: string;
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

type SaleFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { items: Array<{ productId: string; quantity: number }> }) => Promise<boolean>;
  products: Product[];
  services: Service[];
};

export function SaleForm({ isOpen, onClose, onSubmit, products, services }: SaleFormProps) {
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newItem, setNewItem] = useState<NewItemForm>({
    type: '',
    name: '',
    price: '',
    quantity: '1'
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Filter products and services based on search term and type
  const filteredItems = () => {
    if (newItem.type !== 'product') return [];
    
    return products.filter(item => 
      item.name.toLowerCase().includes(newItem.name.toLowerCase()) ||
      item.id.toLowerCase().includes(newItem.name.toLowerCase())
    ).slice(0, 5); // Limit to 5 results
  };
  
  const handleItemSelect = (item: Product | Service) => {
    setNewItem(prev => ({
      ...prev,
      name: item.name,
      price: item.price.toString(),
    }));
    setIsDropdownOpen(false);
    
    // Auto-focus on price input
    setTimeout(() => {
      const priceInput = document.querySelector('input[name="price"]') as HTMLInputElement;
      priceInput?.select();
    }, 0);
  };
  
  const handleAddItem = (item: Pick<Item, 'id' | 'name' | 'price'>, type: Item['type']): void => {
    setSelectedItems((prev: Item[]) => {
      const existingItem = prev.find(i => i.name.toLowerCase() === item.name.toLowerCase() && i.type === type);
      if (existingItem) {
        return prev.map(i => 
          i.name.toLowerCase() === item.name.toLowerCase() && i.type === type 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, type }];
    });
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.type || !newItem.name || !newItem.price) return;
    
    // For services, ensure quantity is at least 1
    const quantity = newItem.type === 'service' 
      ? Math.max(1, isNaN(parseInt(newItem.quantity)) ? 1 : parseInt(newItem.quantity))
      : parseInt(newItem.quantity);
    
    handleAddItem(
      {
        id: `custom-${Date.now()}`,
        name: newItem.name,
        price: parseFloat(newItem.price) || 0
      },
      newItem.type as 'product' | 'service' | 'custom'
    );
    
    // Reset form but keep the type
    setNewItem({
      type: newItem.type,
      name: '',
      price: '',
      quantity: '1'
    });
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setNewItem(prev => {
      const newState = {
        ...prev,
        [name]: value
      };
      
      // Reset name and price when changing type
      if (name === 'type') {
        newState.name = '';
        newState.price = '';
        newState.quantity = '1';
      }
      
      // Show dropdown when typing in name field and type is product
      if (name === 'name' && newItem.type === 'product') {
        setIsDropdownOpen(!!value);
      }
      
      return newState;
    });
  };
  
  const handleFocus = () => {
    if (newItem.name && newItem.type === 'product') {
      setIsDropdownOpen(true);
    }
  };

  const removeItem = (id: string): void => {
    setSelectedItems((prev: Item[]) => prev.filter((item: Item) => item.id !== id));
  };

  const handleSubmit = async (): Promise<void> => {
    const items: SaleItem[] = selectedItems.map(({ id, quantity, type, name, price }) => ({
      productId: id,
      quantity,
      type,
      ...(type === 'custom' && { name, price })
    }));
    
    const success = await onSubmit({ items } as { items: Array<{ productId: string; quantity: number }> });
    if (success) {
      setSelectedItems([]);
      onClose();
    }
  };

  if (!isOpen) return null;
  
  const total = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-grow overflow-hidden">
          {/* Search and Selection */}
          <div className="xl:col-span-3 space-y-6 overflow-y-auto pr-4">
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
                        placeholder={newItem.type === 'product' ? 'Buscar producto...' : 'Nombre del servicio'}
                        className="w-full p-2 border rounded-md"
                        required
                        autoComplete={newItem.type === 'product' ? 'off' : 'on'}
                        ref={inputRef}
                      />
                      {newItem.type === 'product' && (
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    {isDropdownOpen && newItem.type === 'product' && (
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
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-muted-foreground">
                                      ${item.price.toFixed(2)}
                                      {'stock' in item && ` • ${item.stock} disponibles`}
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
                    type={newItem.type === 'service' ? "text" : "number"}
                    name="price"
                    value={newItem.price}
                    onChange={handleNewItemChange}
                    placeholder="Precio"
                    min={newItem.type === 'service' ? undefined : "0"}
                    step={newItem.type === 'service' ? undefined : "0.01"}
                    className="p-2 border rounded-md"
                    required
                    disabled={newItem.type === 'service' ? false : !newItem.name}
                  />
                  
                  {newItem.type === 'service' ? (
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
                          const newQuantity = Math.max(1, parseInt(newItem.quantity) - 1);
                          setNewItem(prev => ({ ...prev, quantity: newQuantity.toString() }));
                        }}
                        disabled={!newItem.name || parseInt(newItem.quantity) <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <input
                        type="number"
                        name="quantity"
                        value={newItem.quantity}
                        onChange={handleNewItemChange}
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
                          const newQuantity = parseInt(newItem.quantity) + 1;
                          setNewItem(prev => ({ ...prev, quantity: newQuantity.toString() }));
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
                </div>
              </Card>
            </form>
          </div>
          
          {/* Cart Summary */}
          <div className="bg-muted/20 p-6 rounded-lg overflow-y-auto border">
            <h3 className="font-semibold text-xl mb-6">Resumen de Venta</h3>
            
            <ScrollArea className="h-[calc(100%-180px)] pr-2">
              <div className="space-y-4">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-background p-4 rounded-lg shadow-sm hover:shadow transition-shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name} {item.type === 'service' && '(Servicio)'}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <p className="font-medium whitespace-nowrap">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {selectedItems.length === 0 && (
                  <div className="text-center py-8 border rounded-lg bg-background">
                    <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      No hay ítems en la venta
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="border-t pt-6 mt-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-2xl text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
              
              <Button
                className="w-full py-6 text-lg"
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
  );
}
