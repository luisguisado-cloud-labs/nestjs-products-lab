# nestjs-products-lab

API REST de gestión de productos construida con **NestJS**, **TypeORM** y **MySQL**.

API REST con arquitectura moderna y opinionada en TypeScript.

---

## Cómo usar este repositorio

Sigue los laboratorios en orden. Cada uno parte del estado que dejó el anterior.

👉 **[Ver índice general de laboratorios →](./docs/INDEX.md)**

---

## Contexto: arquitectura de microservicios

Este proyecto es uno de los servicios de un ecommerce con arquitectura de microservicios:

```
ecommerce/
├── express-rest-lab/       ← Customers API  (Node.js + Express + PostgreSQL)
├── nestjs-products-lab/    ← Products API   (NestJS + TypeORM + MySQL)     ← estás aquí
└── ...                     ← (próximos servicios)
```

Cada servicio corre de forma independiente y tiene su propia base de datos.
