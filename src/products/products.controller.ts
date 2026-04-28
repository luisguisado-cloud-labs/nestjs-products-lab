import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /api/products
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // GET /api/products/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const product = this.productsService.findOne(id);
    if (!product) {
      // NotFoundException lanza automáticamente { statusCode: 404, message: '...' }
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return product;
  }

  // POST /api/products
  // NestJS retorna 201 por defecto en los métodos @Post — no necesitamos @HttpCode aquí
  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      price: number;
      stock: number;
      isActive?: boolean;
    },
  ) {
    return this.productsService.create(body);
  }

  // PUT /api/products/:id  — actualización completa
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name: string;
      description?: string;
      price: number;
      stock: number;
      isActive?: boolean;
    },
  ) {
    const product = this.productsService.update(id, body);
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return product;
  }

  // PATCH /api/products/:id  — actualización parcial
  @Patch(':id')
  patch(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      name: string;
      description: string;
      price: number;
      stock: number;
      isActive: boolean;
    }>,
  ) {
    const product = this.productsService.update(id, body);
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return product;
  }

  // DELETE /api/products/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const product = this.productsService.remove(id);
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return product;
  }
}
