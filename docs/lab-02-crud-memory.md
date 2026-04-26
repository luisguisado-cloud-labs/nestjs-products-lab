# Lab 02 — CRUD de productos en memoria

**Prerequisito:** Lab 01 completado. El servidor corre en `http://localhost:3000/api`.

**Duración estimada:** ~60 minutos

---

## Objetivo de esta sesión

- Generar el módulo `Products` con el CLI de NestJS
- Entender cómo el CLI actualiza automáticamente los módulos
- Implementar el CRUD completo de productos **sin base de datos**
- Conocer `ParseIntPipe`: el primer Pipe de NestJS
- Probar todos los endpoints con `curl`

---

## Conceptos clave

### ¿Por qué empezar sin base de datos?

Lo mismo que hicimos en express-rest-lab: primero entendemos el flujo HTTP → Controller → Service sin la complejidad de la DB. Cuando agreguemos MySQL en el Lab 04, solo tendremos que cambiar el servicio — el controlador no se toca.

---

### El CLI de NestJS como generador

El CLI puede generar archivos por vos y además **actualizar automáticamente** los archivos relacionados:

```bash
nest g module products    # genera products.module.ts + actualiza app.module.ts
nest g controller products # genera products.controller.ts + actualiza products.module.ts
nest g service products    # genera products.service.ts + actualiza products.module.ts
```

`g` es el alias de `generate`. El CLI detecta el módulo al que pertenece cada pieza y lo registra automáticamente.

---

### Interfaces de TypeScript vs Entidades

Por ahora usamos una **interfaz** de TypeScript para describir la forma del objeto `Product`. Una interfaz es solo un contrato de tipos — no genera código JavaScript.

En el Lab 05, la reemplazaremos por una **Entidad** de TypeORM, que además de describir la forma mapea la clase a una tabla de base de datos.

---

### ParseIntPipe — el primer Pipe

Los parámetros de URL siempre llegan como `string`. `ParseIntPipe` es un **Pipe** de NestJS que convierte ese string a `number` automáticamente y lanza un error `400` si no es un número válido:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  //                 ↑ convierte "5" → 5, o lanza 400 si recibe "abc"
}
```

Un Pipe es una clase que transforma o valida datos **antes** de que lleguen al método. El `ValidationPipe` que usaremos en el Lab 03 sigue el mismo patrón.

---

## Parte 1 — Generar el módulo Products

### 1.1 Generar con el CLI

Usá `--no-spec` para no generar archivos de test (los mantenemos fuera del alcance por ahora):

```bash
nest g module products --no-spec
nest g controller products --no-spec
nest g service products --no-spec
```

Observá la salida del CLI — verás que cada comando además de crear el archivo nuevo, actualiza un archivo existente:

```
CREATE src/products/products.module.ts
UPDATE src/app.module.ts          ← automáticamente importó ProductsModule

CREATE src/products/products.controller.ts
UPDATE src/products/products.module.ts  ← registró ProductsController

CREATE src/products/products.service.ts
UPDATE src/products/products.module.ts  ← registró ProductsService
```

Verificá que el servidor sigue corriendo sin errores:

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", ... }
```

### 1.2 Revisar `app.module.ts` actualizado

El CLI habrá actualizado `app.module.ts` para importar `ProductsModule`:

```typescript
// src/app.module.ts — así quedó después del CLI
@Module({
  imports: [ProductsModule],   // ← agregado automáticamente
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

`ProductsModule` agrupa todo lo relacionado a productos. `AppModule` lo importa para que NestJS lo conozca.

---

## Parte 2 — La interfaz Product

Creá el archivo de la interfaz manualmente (el CLI no la genera):

```bash
# La carpeta products/ ya existe, solo creamos el archivo
touch src/products/product.interface.ts
```

```typescript
// src/products/product.interface.ts — NUEVO
export interface Product {
  id: number;
  name: string;
  description?: string;  // opcional: el ? indica que puede ser undefined
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

> En el Lab 05 esta interfaz desaparece: la Entidad de TypeORM cumple el mismo rol y además mapea a la tabla de la DB.

---

## Parte 3 — Implementar el servicio

El servicio es donde vive la lógica de negocio. El controlador lo llama, pero no sabe (ni le importa) cómo está implementado internamente.

Reemplazá el contenido generado de `src/products/products.service.ts`:

```typescript
// src/products/products.service.ts — COMPLETO (primera vez)
import { Injectable } from '@nestjs/common';
import { Product } from './product.interface';

@Injectable()
export class ProductsService {
  // Simulación de base de datos: un array en memoria
  // IMPORTANTE: se resetea al reiniciar el servidor
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
      isActive: data.isActive ?? true,  // si no viene, default true
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(product);
    return product;
  }

  update(
    id: number,
    data: Partial<Pick<Product, 'name' | 'description' | 'price' | 'stock' | 'isActive'>>,
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
```

> **Nota sobre los tipos del `create`:** El tipo del parámetro `data` lo escribimos inline por ahora. Es repetitivo y difícil de mantener. En el Lab 03 lo reemplazamos por un DTO, que es exactamente el problema que los DTOs vienen a resolver.

---

## Parte 4 — Implementar el controlador

El controlador maneja la capa HTTP: extrae datos del request, llama al servicio y arma la respuesta.

Reemplazá el contenido de `src/products/products.controller.ts`:

```typescript
// src/products/products.controller.ts — COMPLETO (primera vez)
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')   // todas las rutas de esta clase empiezan con /api/products
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
  create(@Body() body: { name: string; description?: string; price: number; stock: number; isActive?: boolean }) {
    return this.productsService.create(body);
  }

  // PUT /api/products/:id  — actualización completa
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; description?: string; price: number; stock: number; isActive?: boolean },
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
    @Body() body: Partial<{ name: string; description: string; price: number; stock: number; isActive: boolean }>,
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
```

---

## Parte 5 — Probar todos los endpoints

### GET /api/products — lista vacía

```bash
curl http://localhost:3000/api/products
# → []
```

### POST /api/products — crear producto

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Gaming",
    "description": "Procesador i7, 16GB RAM, RTX 4060",
    "price": 1299.99,
    "stock": 10
  }'
```

Respuesta esperada — `201 Created`:

```json
{
  "id": 1,
  "name": "Laptop Gaming",
  "description": "Procesador i7, 16GB RAM, RTX 4060",
  "price": 1299.99,
  "stock": 10,
  "isActive": true,
  "createdAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

Creá un segundo producto:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Mouse Inalámbrico", "price": 29.99, "stock": 50}'
```

### GET /api/products — ahora con datos

```bash
curl http://localhost:3000/api/products
# → [{...laptop...}, {...mouse...}]
```

### GET /api/products/:id

```bash
# Producto que existe
curl http://localhost:3000/api/products/1
# → { "id": 1, "name": "Laptop Gaming", ... }

# Producto que no existe → 404
curl http://localhost:3000/api/products/999
# → { "statusCode": 404, "message": "Producto con id 999 no encontrado" }

# id inválido → 400 (ParseIntPipe rechaza "abc")
curl http://localhost:3000/api/products/abc
# → { "statusCode": 400, "message": "Validation failed (numeric string is expected)" }
```

### PUT /api/products/:id — actualización completa

```bash
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Gaming Pro",
    "description": "Procesador i9, 32GB RAM, RTX 4070",
    "price": 1599.99,
    "stock": 5,
    "isActive": true
  }'
```

### PATCH /api/products/:id — actualización parcial

```bash
# Solo actualizamos el stock — los demás campos no cambian
curl -X PATCH http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"stock": 8}'
```

### DELETE /api/products/:id

```bash
curl -X DELETE http://localhost:3000/api/products/2
# → devuelve el producto eliminado con 200

# Si ya no existe → 404
curl -X DELETE http://localhost:3000/api/products/2
```

---

## Diferencia entre PUT y PATCH

| | PUT | PATCH |
|---|---|---|
| Semántica | Reemplazo completo | Actualización parcial |
| Body | Todos los campos (obligatorios) | Solo los campos que cambian |
| Ejemplo | Actualizar todo el producto | Solo cambiar el precio |

> En nuestra implementación actual, `update()` del servicio usa `Partial<>` internamente, por lo que tanto PUT como PATCH llaman al mismo método. En proyectos más estrictos, PUT debería requerir todos los campos.

---

## Estado del proyecto al finalizar el lab

```
src/
├── main.ts                      ← sin cambios desde Lab 01
├── app.module.ts                ← actualizado por CLI (imports ProductsModule)
├── app.controller.ts            ← sin cambios
├── app.service.ts               ← sin cambios
└── products/
    ├── product.interface.ts     ← NUEVO: interfaz Product
    ├── products.module.ts       ← generado + actualizado por CLI
    ├── products.controller.ts   ← NUEVO: CRUD completo
    └── products.service.ts      ← NUEVO: CRUD en array[]
```

---

## ¿Qué viene en el Lab 03?

Nuestro controlador tiene los tipos del body escritos inline en cada método. Si el producto tiene 8 campos, duplicamos esa definición en `create`, `update` y `patch`. Además, ahora mismo el servidor acepta cualquier body — enviá `{"price": "cara"}` y lo aceptará. Los DTOs y el `ValidationPipe` resuelven ambos problemas.
