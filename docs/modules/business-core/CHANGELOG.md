# Business Core Changelog

## 2026-04-02

- se crea la documentacion canonica inicial de `business-core`
- se declara como dominio tenant transversal previo a `maintenance`
- se deja explicita su relacion con `projects` e `iot`
- se define la matriz de migracion desde `ieris_app`
- se abre el scaffold inicial del modulo en backend y frontend
- se versiona la primera migracion tenant con `organizations`, `clients`, `contacts` y `sites`
# 2026-04-02
- Se implemento la primera ola backend de `business-core` con CRUD y rutas para `organizations` y `clients`.
- Se agregaron modelos ORM, repositories, services y pruebas de rutas para el primer slice real del dominio compartido.
- Se completo la ola 1 backend con CRUD y rutas para `contacts` y `sites`.
