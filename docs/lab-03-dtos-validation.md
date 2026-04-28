# Lab 03 — DTOs y validación de datos

**Prerequisito:** Lab 02 completado. CRUD funcionando en memoria.

**Duración estimada:** ~60 minutos

---

## Objetivos

- Entender qué es un DTO y por qué es necesario
- Instalar y configurar `class-validator` y `class-transformer`
- Activar el `ValidationPipe` global
- Crear `CreateProductDto` y `UpdateProductDto`
- Conectar los DTOs al controlador y al servicio
- Verificar que el servidor rechaza datos inválidos con `400`

---

## Conceptos clave

### El problema actual

Enviá esto al `POST /api/products`:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "", "price": "cara", "stock": -100}'
```

El servidor lo acepta sin quejarse. Eso está mal — terminamos con un producto sin nombre, precio como string y stock negativo.

Hay otro problema: el tipo del body está duplicado. Si el producto cambia, hay que actualizar el tipo en `create`, en `update`, en `patch` y en el servicio. Tres lugares.

---

### ¿Qué es un DTO?

**DTO** (Data Transfer Object) es una clase que describe la forma y las reglas de los datos que entran o salen de un endpoint.

```typescript
// Sin DTO — tipo inline repetido en cada método:
create(@Body() body: { name: string; price: number; stock: number; ... }) {}
update(@Body() body: { name: string; price: number; stock: number; ... }) {}

// Con DTO — definido una sola vez:
create(@Body() body: CreateProductDto) {}
update(@Body() body: UpdateProductDto) {}
```

El DTO es el **único lugar** donde defines qué campos acepta un endpoint. Cada regla de validación vive ahí.

---

### class-validator y class-transformer

- **class-validator** — decoradores que agregan reglas de validación a las propiedades de una clase (`@IsString()`, `@IsNumber()`, `@Min()`, etc.)
- **class-transformer** — convierte objetos planos (como el JSON del request) en instancias de clases de TypeScript. Necesario para que `class-validator` pueda leer los decoradores.

NestJS integra ambas librerías a través del `ValidationPipe`.

---

### ValidationPipe

Es un **Pipe** global que intercepta todos los requests antes de que lleguen al controlador. Cuando recibe un `@Body()`, hace dos cosas:

1. **Transforma** el JSON plano en una instancia de la clase DTO (usando `class-transformer`)
2. **Valida** esa instancia contra las reglas del DTO (usando `class-validator`)

Si la validación falla, lanza un `400 Bad Request` automáticamente con el detalle de los errores.

---

### PartialType — la elegancia de NestJS

Para el DTO de actualización parcial (PATCH), NestJS ofrece `PartialType`: genera automáticamente un DTO donde todos los campos del DTO original son opcionales.

```typescript
// Sin PartialType — duplicamos todos los campos como opcionales:
export class UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  // ...
}

// Con PartialType — una sola línea:
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

Además hereda todas las reglas de validación — si `price` debe ser positivo en `CreateProductDto`, también lo es en `UpdateProductDto` cuando se envía.

---

## Parte 1 — Instalar dependencias

```bash
npm install class-validator class-transformer
```

Verificá que el servidor sigue corriendo:

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", ... }
```

---

## Parte 2 — Activar el ValidationPipe global

En `src/main.ts`, importá `ValidationPipe` y activalo globalmente:

```typescript
// src/main.ts — MODIFICADO: agregar las líneas marcadas con ←
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';  // ←
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // ← Activar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // elimina campos no declarados en el DTO
      forbidNonWhitelisted: true, // lanza error si llegan campos extra
      transform: true,          // convierte tipos automáticamente (string → number)
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Servidor corriendo en http://localhost:${port}/api`);
}
bootstrap();
```

**Opciones importantes:**
- `whitelist: true` — si el cliente manda un campo que no existe en el DTO (ej. `"hackerField": "xss"`), se elimina silenciosamente antes de llegar al controller
- `forbidNonWhitelisted: true` — en lugar de eliminar, lanza `400` si hay campos no permitidos. Más estricto y más seguro
- `transform: true` — permite que `ParseIntPipe` funcione automáticamente y que el DTO reciba `number` donde declaraste `number`

---

## Parte 3 — CreateProductDto

Creá la carpeta y los archivos de DTOs:

```bash
mkdir src/products/dto
touch src/products/dto/create-product.dto.ts
touch src/products/dto/update-product.dto.ts
```

```typescript
// src/products/dto/create-product.dto.ts — NUEVO
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsPositive,
  Min,
  MinLength,
  IsInt,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsString()
  @IsOptional()          // si no viene en el body, no valida
  description?: string;

  @IsNumber()
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  price: number;

  @IsInt()               // número entero (sin decimales)
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

> **¿Por qué `@IsInt()` en stock y `@IsNumber()` en price?**
> El stock siempre es un número entero (no puedes tener 1.5 unidades). El precio puede tener decimales (`29.99`). `@IsInt()` rechaza `10.5`; `@IsNumber()` lo acepta.

---

## Parte 4 — UpdateProductDto con PartialType

```typescript
// src/products/dto/update-product.dto.ts — NUEVO
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// PartialType(CreateProductDto) genera un DTO con todos los campos
// de CreateProductDto pero marcados como opcionales (?).
// Las reglas de validación se mantienen: si mandás price, sigue
// teniendo que ser positivo.
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

`@nestjs/mapped-types` viene incluido en NestJS — no hay que instalar nada extra.

---

## Parte 5 — Conectar los DTOs

### 5.1 Actualizar el controlador

Reemplazá los tipos inline del `body` por los DTOs:

```typescript
// src/products/products.controller.ts — MODIFICADO: cambios en imports y tipos de body

// Agregar imports de los DTOs:
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// Cambiar el tipo del @Body() en los métodos:

@Post()
create(@Body() body: CreateProductDto) {    // ← antes era el tipo inline largo
  return this.productsService.create(body);
}

@Put(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: CreateProductDto,           // ← PUT requiere todos los campos
) {
  const product = this.productsService.update(id, body);
  if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
  return product;
}

@Patch(':id')
patch(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: UpdateProductDto,           // ← PATCH: todos los campos opcionales
) {
  const product = this.productsService.update(id, body);
  if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
  return product;
}
```

Los métodos `findAll`, `findOne` y `remove` no reciben `@Body()`, así que no cambian.

### 5.2 Actualizar el servicio

El servicio ahora puede recibir los DTOs como tipos de los parámetros. Esto no cambia la lógica, solo mejora el tipado:

```typescript
// src/products/products.service.ts — MODIFICADO: tipos de los parámetros

// Agregar imports:
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// Cambiar las firmas de los métodos:
create(data: CreateProductDto): Product {
  // lógica sin cambios
}

update(id: number, data: UpdateProductDto): Product | undefined {
  // lógica sin cambios
}
```

---

## Parte 6 — Probar las validaciones

### Body inválido — campos mal tipados

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "A", "price": "cara", "stock": -5}'
```

Respuesta esperada — `400 Bad Request`:

```json
{
  "statusCode": 400,
  "message": [
    "El nombre debe tener al menos 2 caracteres",
    "price must be a number conforming to the specified constraints",
    "price must be a positive number",
    "El stock no puede ser negativo"
  ],
  "error": "Bad Request"
}
```

NestJS devuelve **todos** los errores a la vez, no solo el primero.

### Body inválido — campos extra no permitidos

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "price": 999, "stock": 5, "campoRaro": "hack"}'
```

Respuesta — `400 Bad Request` (por `forbidNonWhitelisted: true`):

```json
{
  "statusCode": 400,
  "message": ["property campoRaro should not exist"],
  "error": "Bad Request"
}
```

### Body válido

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop Gaming", "price": 1299.99, "stock": 10}'
```

Respuesta — `201 Created` con el producto creado.

### PATCH — actualización parcial válida

```bash
# Solo enviamos el campo que queremos cambiar
curl -X PATCH http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 999.99}'
# → 200 con el producto actualizado solo en el precio

# Precio inválido en PATCH → 400 (hereda las reglas de CreateProductDto)
curl -X PATCH http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price": -50}'
```

---

## Estado del proyecto al finalizar el lab

```
src/
├── main.ts                    ← MODIFICADO: ValidationPipe global
└── products/
    ├── product.interface.ts   ← sin cambios
    ├── products.module.ts     ← sin cambios
    ├── products.controller.ts ← MODIFICADO: usa CreateProductDto / UpdateProductDto
    ├── products.service.ts    ← MODIFICADO: usa DTOs en las firmas
    └── dto/
        ├── create-product.dto.ts  ← NUEVO
        └── update-product.dto.ts  ← NUEVO
```

---

## Referencia: decoradores de class-validator más usados

| Decorador | Qué valida |
|---|---|
| `@IsString()` | string |
| `@IsNumber()` | number (entero o decimal) |
| `@IsInt()` | entero (sin decimales) |
| `@IsBoolean()` | true o false |
| `@IsEmail()` | formato de email válido |
| `@IsPositive()` | número > 0 |
| `@Min(n)` | número >= n |
| `@Max(n)` | número <= n |
| `@MinLength(n)` | string de al menos n caracteres |
| `@MaxLength(n)` | string de máximo n caracteres |
| `@IsOptional()` | el campo puede no venir |
| `@IsEnum(Enum)` | valor dentro de un enum |
| `@IsArray()` | arreglo |

---

## ¿Qué viene en el Lab 04?

Ahora tenemos un CRUD con validaciones, pero los datos se pierden al reiniciar el servidor. En el próximo lab levantaremos MySQL en Docker y configuraremos TypeORM en NestJS para conectarnos a la base de datos.
