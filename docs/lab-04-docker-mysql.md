# Lab 04 — MySQL en Docker y configuración de TypeORM

**Prerequisito:** Lab 03 completado. CRUD con validaciones funcionando.

**Duración estimada:** ~60 minutos

---

## Objetivos

- Levantar MySQL 8 en Docker con `docker-compose`
- Gestionar las credenciales con variables de entorno (`@nestjs/config`)
- Instalar y configurar TypeORM en NestJS
- Verificar que NestJS se conecta exitosamente a la base de datos

> **Nota:** En este lab solo conectamos la DB. El código del servicio todavía usa el array en memoria — eso lo migramos en el Lab 05.

---

## Conceptos clave

### TypeORM en NestJS

TypeORM es el ORM (Object-Relational Mapper) oficial que NestJS recomienda. Permite trabajar con la base de datos usando clases de TypeScript en lugar de escribir SQL manual.

NestJS integra TypeORM como un **módulo** (`TypeOrmModule`). Esto significa que la conexión se gestiona a través del sistema de DI del framework — la configurás una vez en `AppModule` y todos los demás módulos pueden usarla.

---

### `synchronize: true` vs migraciones

TypeORM tiene una opción `synchronize: true` que compara la estructura de las entidades con la DB y la actualiza automáticamente al arrancar.

**Solo usarla en desarrollo.** En producción, los cambios de esquema se gestionan con **migraciones**: scripts SQL versionados y controlados. `synchronize: true` en producción puede borrar columnas o tablas sin aviso.

Por ahora: `synchronize: true`. En un proyecto real: migraciones.

---

### `@nestjs/config` — variables de entorno en NestJS

En el express-rest-lab usamos `dotenv` directamente. NestJS tiene su propio módulo: `@nestjs/config`. Hace lo mismo que `dotenv` pero integrado como módulo de NestJS, lo que permite:
- Inyectar `ConfigService` donde se necesite
- Configurar TypeORM de forma asíncrona, leyendo las variables después de que `ConfigModule` las cargó

---

## Parte 1 — `docker-compose.yml`

En la raíz del proyecto (al mismo nivel que `package.json`), crea el archivo:

```yaml
# docker-compose.yml — NUEVO
version: "3"

services:
  db:
    image: mysql:8.4
    container_name: mysql_products
    restart: on-failure
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"             # host:contenedor
    volumes:
      # Los datos persisten en el host aunque el contenedor se detenga
      - /home/lagm/volumes/mysql-products:/var/lib/mysql
```

> Si el directorio del volumen no existe, Docker lo crea automáticamente al primer `up`.

---

## Parte 2 — Variables de entorno

### 2.1 Crear `.env`

```bash
touch .env
```

```ini
# .env — NUEVO
PORT=3000

# ── Base de datos ─────────────────
DB_HOST=localhost
DB_PORT=3306
DB_NAME=products_db
DB_USER=products_user
DB_PASSWORD=products123
DB_ROOT_PASSWORD=root123
```

### 2.2 Crear `.env.example`

```bash
touch .env.example
```

```ini
# .env.example — NUEVO
# Copiá este archivo a ".env" y completá los valores
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=products_db
DB_USER=products_user
DB_PASSWORD=
DB_ROOT_PASSWORD=
```

### 2.3 Proteger `.env` con `.gitignore`

El proyecto ya tiene un `.gitignore` generado por NestJS. Verificá que `.env` está incluido:

```bash
grep ".env" .gitignore
# Debería mostrar: .env
```

Si no está, agregalo:

```bash
echo ".env" >> .gitignore
```

---

## Parte 3 — Instalar dependencias

```bash
npm install @nestjs/typeorm typeorm mysql2 @nestjs/config
```

- **`@nestjs/typeorm`** — módulo que integra TypeORM con NestJS
- **`typeorm`** — el ORM en sí
- **`mysql2`** — driver de MySQL para Node.js (TypeORM lo requiere para MySQL)
- **`@nestjs/config`** — manejo de variables de entorno en NestJS

Verificá que el servidor sigue arrancando:

```bash
npm run start:dev
```

---

## Parte 4 — Levantar la base de datos

```bash
docker compose up -d
```

Verificá que el contenedor está corriendo:

```bash
docker compose ps
# NOMBRE              ESTADO
# mysql_products      running
```

Revisá los logs para confirmar que MySQL arrancó correctamente:

```bash
docker logs mysql_products
# Al final debería verse: ready for connections. port: 3306
```

> MySQL tarda unos segundos en estar listo. Si los logs aún muestran "initializing", esperá 10-15 segundos y volvé a correr `docker logs`.

---

## Parte 5 — Configurar `@nestjs/config`

`ConfigModule` carga el `.env` y lo hace disponible en toda la app. Actualizá `app.module.ts`:

```typescript
// src/app.module.ts — MODIFICADO: agregar ConfigModule en imports

import { ConfigModule } from '@nestjs/config';  // ←

@Module({
  imports: [
    // isGlobal: true hace que ConfigService esté disponible en todos
    // los módulos sin tener que importar ConfigModule en cada uno
    ConfigModule.forRoot({ isGlobal: true }),   // ←

    ProductsModule,
  ],
  // controllers y providers sin cambios
})
```

---

## Parte 6 — Configurar TypeORM

Agregá `TypeOrmModule` en `app.module.ts`. Usamos `forRootAsync` para poder leer la config **después** de que `ConfigModule` cargó el `.env`:

```typescript
// src/app.module.ts — MODIFICADO: agregar TypeOrmModule

import { TypeOrmModule } from '@nestjs/typeorm';  // ←
import { ConfigModule, ConfigService } from '@nestjs/config';  // ← agregar ConfigService

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ← agregar TypeOrmModule
    TypeOrmModule.forRootAsync({
      // inject nos permite recibir ConfigService para leer las variables de entorno
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],  // busca todos los archivos *.entity.ts
        synchronize: true,  // solo en desarrollo: sincroniza el esquema automáticamente
        logging: true,      // muestra los SQL generados en la consola (útil para aprender)
      }),
    }),

    ProductsModule,
  ],
})
```

> `forRootAsync` recibe una función factory (`useFactory`) que se ejecuta **después** de que todos los módulos del array `inject` están listos. Así nos aseguramos de que `ConfigService` ya cargó el `.env` cuando TypeORM necesita las credenciales.

---

## Parte 7 — Verificar la conexión

Guarda el archivo y observa los logs del servidor:

```bash
npm run start:dev
```

Si la conexión fue exitosa, verás en la consola:

```
[NestJS] LOG [TypeOrmModule] DataSource initialized successfully
```

Si hay error de conexión, lo verás claramente:

```
[NestJS] ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
```

En ese caso, verifica:
- que el contenedor Docker está corriendo: `docker compose ps`
- que las credenciales en `.env` coinciden con las del `docker-compose.yml`
- que el puerto 3306 no está ocupado por otra instancia de MySQL: `ss -tlnp | grep 3306`

Probá que la API sigue respondiendo:

```bash
curl http://localhost:3000/api/products
# → [] (el array en memoria, todavía no usamos la DB)
```

---

## Estado del proyecto al finalizar el lab

```
nestjs-products-lab/
├── docker-compose.yml          ← NUEVO
├── .env                        ← NUEVO (no se sube a git)
├── .env.example                ← NUEVO (sí se sube a git)
└── src/
    └── app.module.ts           ← MODIFICADO: ConfigModule + TypeOrmModule
```

El resto de los archivos no cambió. El servicio sigue usando el array en memoria — eso va en el próximo lab.

---

## Referencia rápida de Docker

```bash
# Levantar la base de datos en segundo plano
docker compose up -d

# Ver el estado de los contenedores
docker compose ps

# Ver logs del contenedor
docker logs mysql_products

# Ver logs en tiempo real
docker logs -f mysql_products

# Detener los contenedores (sin borrar datos)
docker compose down

# Detener y borrar volúmenes — ¡BORRA TODOS LOS DATOS!
docker compose down -v
```

---

## ¿Qué viene en el Lab 05?

Con la conexión a MySQL establecida, en el próximo lab creamos la **Entidad** `Product` (la clase TypeORM que mapea a la tabla) e **inyectamos el Repository** en el servicio para reemplazar el array en memoria por operaciones reales a la base de datos.
