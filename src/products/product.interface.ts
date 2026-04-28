export interface Product {
  id: number;
  name: string;
  description?: string; // opcional: el ? indica que puede ser undefined
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
