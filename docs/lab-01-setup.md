# Lab 01 — NestJS: Setup y arquitectura

**Duración estimada:** ~60 minutos

---

## Objetivo de esta sesión

- Entender qué es NestJS y cómo se diferencia de Express
- Conocer los bloques principales: Módulos, Controladores, Servicios
- Crear el proyecto con el CLI de NestJS
- Navegar y entender la estructura generada
- Agregar la primera ruta propia: `GET /api/health`

---

## Conceptos clave

### NestJS vs Express

En el proyecto anterior (express-rest-lab) usamos Express: una librería minimalista donde **vos decidís** cómo organizar el código. NestJS es un framework **opinionado**: ya viene con una estructura definida que debés respetar.

| | Express | NestJS |
|---|---|---|
| Tipo | Librería | Framework |
| Estructura | La definís vos | La impone el framework |
| Lenguaje | JS (TS opcional) | TypeScript nativo |
| Organización | Sin convención fija | Módulos + DI obligatorio |
| Inspirado en | Node.js puro | Angular (frontend) |
| Curva de aprendizaje | Baja | Media |

**¿Cuándo usar cada uno?**
Express es ideal para proyectos pequeños o cuando querés control total. NestJS brilla en proyectos grandes y equipos: la estructura fija hace que el código de un desarrollador sea fácil de leer por otro.

---

### Los 3 bloques fundamentales

```
Request HTTP
     │
     ▼
┌──────────────────────────────────────────────┐
│                   MÓDULO                     │
│                                              │
│  ┌─────────────────┐   ┌──────────────────┐  │
│  │   CONTROLADOR   │──►│     SERVICIO     │  │
│  │                 │   │                  │  │
│  │ Recibe request  │   │ Lógica de        │  │
│  │ Llama servicio  │   │ negocio          │  │
│  │ Devuelve resp.  │   │ Accede a datos   │  │
│  └─────────────────┘   └──────────────────┘  │
└──────────────────────────────────────────────┘
     │
     ▼
Response HTTP
```

- **Módulo** — agrupa todo lo relacionado a un dominio (ej: `ProductsModule`)
- **Controlador** — maneja las rutas HTTP. Solo se ocupa de la capa HTTP: qué llega, qué responde
- **Servicio** — contiene la lógica de negocio. No sabe nada de HTTP

> Esta separación es una aplicación del **Single Responsibility Principle** (SRP): cada clase tiene una sola razón para cambiar.

---

### Decoradores

NestJS usa **decoradores** de TypeScript: funciones que agregan metadatos a clases y métodos. Son fácilmente reconocibles porque empiezan con `@`.

```typescript
@Controller('products')   // ← "esta clase maneja rutas que empiezan con /products"
export class ProductsController {

  @Get()                  // ← "este método responde a GET /products"
  findAll() { ... }

  @Get(':id')             // ← "este método responde a GET /products/:id"
  findOne() { ... }
}
```

Los decoradores no cambian la lógica del código: NestJS los lee al arrancar y construye el mapa de rutas.

---

### Inyección de dependencias (DI)

En NestJS, los servicios no se instancian manualmente. Declarás lo que necesitás en el constructor y el framework lo provee automáticamente:

```typescript
// ❌ Sin DI — instanciación manual
const service = new ProductsService();
service.findAll();

// ✅ Con DI — NestJS lo instancia por vos
constructor(private readonly productsService: ProductsService) {}
// Podés llamar this.productsService.findAll() directamente
```

Ventaja clave: en tests podés inyectar una versión falsa del servicio sin cambiar el controlador.

---

## Prerrequisitos

- Node.js ≥ 18 instalado: `node -v`
- Docker instalado: `docker -v`
- NestJS CLI instalado globalmente:

```bash
npm i -g @nestjs/cli
```

Verificá que quedó instalado:

```bash
nest -v
# → 10.x.x
```

---

## Parte 1 — Crear el proyecto

### 1.1 Crear la aplicación con el CLI

```bash
nest new nestjs-products-lab
```

El CLI va a preguntar qué gestor de paquetes querés usar. Elegí **npm**:

```
? Which package manager would you ❤️ to use? npm
```

Cuando termine:

```bash
cd nestjs-products-lab
```

### 1.2 Levantar el servidor en modo desarrollo

```bash
npm run start:dev
```

Deberías ver algo como:

```
[NestJS] LOG [NestApplication] Nest application successfully started
[NestJS] LOG [RouterExplorer] Mapped {/, GET}
```

Abrí `http://localhost:3000` en el navegador o con curl:

```bash
curl http://localhost:3000
# → "Hello World!"
```

> `start:dev` usa **watch mode**: el servidor se reinicia automáticamente cada vez que guardás un archivo. Equivalente al `nodemon` que usamos con Express.

---

## Parte 2 — Estructura generada

```
nestjs-products-lab/
├── src/
│   ├── main.ts               ← punto de entrada
│   ├── app.module.ts         ← módulo raíz
│   ├── app.controller.ts     ← controlador de ejemplo
│   ├── app.controller.spec.ts← test unitario (lo ignoramos por ahora)
│   └── app.service.ts        ← servicio de ejemplo
├── test/                     ← tests e2e (los ignoramos por ahora)
├── nest-cli.json             ← configuración del CLI
├── tsconfig.json             ← configuración de TypeScript
└── package.json
```

Revisemos cada archivo del `src/`:

### `src/main.ts` — El punto de entrada

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

`NestFactory.create(AppModule)` arranca toda la aplicación leyendo el módulo raíz y construyendo el árbol de dependencias. Es el equivalente al `app.listen()` de Express, pero más poderoso: antes de escuchar, NestJS configura todos los módulos, controladores y servicios.

### `src/app.module.ts` — El módulo raíz

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],       // otros módulos que este módulo usa
  controllers: [AppController],  // controladores de este módulo
  providers: [AppService],       // servicios e inyectables de este módulo
})
export class AppModule {}
```

`@Module()` le dice a NestJS qué pertenece a este módulo. Cada módulo que creemos en el futuro (`ProductsModule`, etc.) se importará aquí en `imports: []`.

### `src/app.controller.ts` — Un controlador de ejemplo

```typescript
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()              // sin prefijo → responde en /
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()                   // GET /
  getHello(): string {
    return this.appService.getHello();
  }
}
```

Nota la inyección de dependencias en el constructor: NestJS instancia `AppService` y lo pasa automáticamente.

### `src/app.service.ts` — Un servicio de ejemplo

```typescript
// src/app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()              // hace la clase inyectable via DI
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

`@Injectable()` registra la clase en el sistema de DI de NestJS.

---

## Parte 3 — Agregar el prefijo global y GET /health

### 3.1 Prefijo global de la API

Toda API REST real usa un prefijo como `/api` para separar el tráfico de la API del resto (archivos estáticos, etc.).

En `src/main.ts`, agregá `app.setGlobalPrefix('api')` y un log de arranque:

```typescript
// src/main.ts — MODIFICADO
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas tendrán el prefijo /api
  // Ej: GET /api/products, GET /api/health
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Servidor corriendo en http://localhost:${port}/api`);
}
```

Guardá y verificá que el servidor no da errores. El endpoint anterior (`GET /`) ahora está en `GET /api`.

### 3.2 Endpoint GET /api/health

El endpoint de health check es una convención: permite saber si el servicio está vivo sin hacer consultas a la base de datos.

En `src/app.service.ts`, reemplazá `getHello` por `getHealth`:

```typescript
// src/app.service.ts — MODIFICADO
getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
```

En `src/app.controller.ts`, actualizá el controlador:

```typescript
// src/app.controller.ts — MODIFICADO
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')        // GET /api/health  (el prefijo /api lo agrega main.ts)
  getHealth() {
    return this.appService.getHealth();
  }
}
```

---

## Parte 4 — Verificación final

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

---

## Estado del proyecto al finalizar el lab

```
src/
├── main.ts          ← setGlobalPrefix('api') + log de arranque
├── app.module.ts    ← sin cambios
├── app.controller.ts← GET /health (reemplaza GET /)
└── app.service.ts   ← getHealth() (reemplaza getHello())
```

---

## Referencia rápida

```bash
# Instalar CLI de NestJS (una sola vez)
npm i -g @nestjs/cli

# Crear un proyecto nuevo
nest new <nombre-proyecto>

# Correr en modo desarrollo (watch)
npm run start:dev

# Correr en modo producción
npm run start:prod

# Ver todos los comandos del CLI
nest --help
```

---

## ¿Qué viene en el Lab 02?

Crearemos el módulo `Products` usando el CLI, definiremos la interfaz del producto e implementaremos el CRUD completo guardando los datos **en memoria** (sin base de datos todavía). El objetivo es entender el flujo Módulo → Controlador → Servicio antes de agregar la complejidad de la DB.
