import { Injectable } from '@nestjs/common';
import { Product } from './product.interface';

@Injectable()
export class ProductsService {
  private products: Product[] = [];
  private nextId = 1;

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: number): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  create(data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    isActive?: boolean;
  }): Product {
    const now = new Date();
    const product: Product = {
      id: this.nextId++,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      isActive: data.isActive ?? true, // si no viene, default true
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(product);
    return product;
  }

  update(
    id: number,
    data: Partial<
      Pick<Product, 'name' | 'description' | 'price' | 'stock' | 'isActive'>
    >,
  ): Product | undefined {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    // Spread: combinamos el producto existente con los datos nuevos
    this.products[index] = {
      ...this.products[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.products[index];
  }

  remove(id: number): Product | undefined {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    // splice elimina un elemento y devuelve un array con los eliminados
    const [removed] = this.products.splice(index, 1);
    return removed;
  }
}
