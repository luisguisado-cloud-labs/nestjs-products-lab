# nestjs-products-lab — Índice general

## ¿Qué construimos?

Una API REST para gestión de productos con los siguientes endpoints:

| Método | Ruta | Descripción | Status |
|---|---|---|---|
| `GET` | `/api/products` | Listar todos los productos | `200` |
| `GET` | `/api/products/:id` | Obtener un producto | `200` |
| `POST` | `/api/products` | Crear un producto | `201` |
| `PUT` | `/api/products/:id` | Actualizar producto completo | `200` |
| `PATCH` | `/api/products/:id` | Actualizar producto parcial | `200` |
| `DELETE` | `/api/products/:id` | Eliminar un producto | `200` |
| `GET` | `/api/health` | Estado del servidor | `200` |

---

## Stack tecnológico

> **Nota:** Las versiones indicadas son referenciales y corresponden a las estables al momento de redactar estos laboratorios. Pueden variar según la fecha en que sigas el lab. Antes de comenzar, verifica las versiones LTS/estables más recientes en [nodejs.org](https://nodejs.org) y [npmjs.com](https://www.npmjs.com).

| Herramienta | Versión referencial | Rol |
|---|---|---|
| **Node.js** | 22.x LTS | Runtime |
| **NestJS** | 11.x | Framework backend |
| **TypeScript** | 5.5+ | Lenguaje |
| **TypeORM** | 0.3.x | ORM |
| **MySQL** | 8.4 LTS | Base de datos |
| **Docker / Docker Compose** | 27.x | Contenedor de la DB |
| **class-validator** | 0.14.x | Validación de DTOs |
| **class-transformer** | 0.5.x | Transformación de datos |
| **@nestjs/config** | - | Variables de entorno |

---

## Prerrequisitos globales

- Node.js 22.x LTS instalado
- Docker y Docker Compose instalados
- NestJS CLI instalado: `npm i -g @nestjs/cli`
- Postman, Thunder Client o `curl` para probar endpoints

---

## Mapa de laboratorios

| Lab | Tema | Duración aprox. | Resultado |
|---|---|---|---|
| [Lab 01](./lab-01-setup.md) | Setup y arquitectura de NestJS | ~60 min | Proyecto creado, primera ruta funcionando |
| [Lab 02](./lab-02-crud-memory.md) | CRUD de productos en memoria | ~60 min | CRUD completo sin base de datos |
| [Lab 03](./lab-03-dtos-validation.md) | DTOs y validación de datos | ~60 min | Validaciones con `class-validator` |
| [Lab 04](./lab-04-docker-mysql.md) | MySQL en Docker + TypeORM config | ~60 min | Base de datos conectada |
| [Lab 05](./lab-05-typeorm-repository.md) | TypeORM: Entity y Repository | ~60 min | CRUD persistido en MySQL |
| [Lab 06](./lab-06-error-handling.md) | Manejo de errores y excepciones | ~60 min | Respuestas de error correctas |

---

## Evolución del proyecto por lab

```
Lab 01 — Scaffolding
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── app.controller.ts    ← añadimos GET /health
    └── app.service.ts

Lab 02 — CRUD en memoria
└── src/
    └── products/
        ├── product.interface.ts   ← interfaz de TypeScript
        ├── products.module.ts     ← generado por CLI
        ├── products.controller.ts ← CRUD HTTP
        └── products.service.ts    ← CRUD en array[]

Lab 03 — DTOs y validación
└── src/
    ├── main.ts                    ← MODIFICADO: ValidationPipe global
    └── products/
        └── dto/
            ├── create-product.dto.ts   ← NUEVO
            └── update-product.dto.ts   ← NUEVO

Lab 04 — Docker + MySQL + Config
├── docker-compose.yml             ← NUEVO
├── .env                           ← NUEVO
└── src/
    └── app.module.ts              ← MODIFICADO: ConfigModule + TypeOrmModule

Lab 05 — TypeORM Entity y Repository
└── src/
    └── products/
        ├── entities/
        │   └── product.entity.ts  ← NUEVO (reemplaza product.interface.ts)
        ├── products.module.ts     ← MODIFICADO: TypeOrmModule.forFeature
        └── products.service.ts    ← REESCRITO: usa Repository<Product>

Lab 06 — Manejo de errores
└── src/
    └── products/
        ├── products.service.ts    ← MODIFICADO: lanza HttpExceptions
        └── products.controller.ts ← MODIFICADO: más limpio
```

---

## Convenciones usadas en los labs

- `# NUEVO` — archivo que se crea en este lab
- `# MODIFICADO` — archivo que cambia respecto al lab anterior
- Los bloques de código muestran **solo lo que cambia**, no el archivo completo (salvo cuando es la primera vez que aparece)
- Cada sección de código indica el archivo al que pertenece en el comentario de la primera línea

---

## Modelo de datos — Product

```typescript
{
  id:          number   // autoincremental, generado por la DB
  name:        string   // requerido, mínimo 2 caracteres
  description: string   // opcional
  price:       number   // requerido, > 0
  stock:       number   // requerido, >= 0, entero
  isActive:    boolean  // default: true
  createdAt:   Date     // automático
  updatedAt:   Date     // automático
}
```
