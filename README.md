# nestjs-products-lab

API REST de gestión de productos construida con **NestJS**, **TypeORM** y **MySQL**.

Proyecto de clase sobre arquitecturas backend modernas y opinionadas con TypeScript.

---

## Cómo usar este repositorio

Seguí los laboratorios en orden. Cada uno parte del estado que dejó el anterior.

👉 **[Ver índice general de laboratorios →](./docs/INDEX.md)**

---

## Contexto: arquitectura de microservicios

Este proyecto es uno de los servicios de un ecommerce que iremos construyendo clase a clase:

```
ecommerce/
├── express-rest-lab/       ← Customers API  (Node.js + Express + PostgreSQL)
├── nestjs-products-lab/    ← Products API   (NestJS + TypeORM + MySQL)     ← estás aquí
└── ...                     ← (próximos servicios)
```

Cada servicio corre de forma independiente y tiene su propia base de datos.
