# Baseline de UX para Frontend

Este documento fija las decisiones UX base que conviene estabilizar antes de seguir abriendo mas frontend.

La idea es simple:

- evitar retrabajo visual
- evitar cambios de vocabulario a mitad de camino
- dejar claro que cosas ya damos por resueltas y cuales siguen abiertas

## Objetivo

No busca definir cada pixel.

Busca cerrar la base para que nuevas pantallas se construyan sobre criterios coherentes.

## Decisiones ya cerradas

### 1. Dos portales separados

La app ya se entiende como dos espacios distintos:

- `platform_admin`
- `tenant_portal`

Esto ya no deberia mezclarse visualmente.

### 2. Espanol por defecto

La UI arranca en español y conserva selector de idioma.

Esto ya debe asumirse como baseline.

### 3. `Platform Admin` es la puerta de entrada principal

Hoy el recorrido real empieza por `platform_admin`.

El instalador visual sigue pendiente, asi que no conviene diseñar el producto como si el primer contacto fuera `tenant_portal`.

### 4. El frontend es backend-driven

No conviene inventar reglas visuales que contradigan o sustituyan:

- `GET /platform/capabilities`
- estados reales del backend
- contratos ya cerrados

### 5. El superadmin necesita atajos entre portales

Desde `Tenants`, el superadmin ya puede saltar al `Tenant Portal` con el tenant precargado.

Eso ya queda como comportamiento valido.

### 6. El usuario tenant no debe ver jerga tecnica innecesaria

Por eso ya empezamos a mover cosas como:

- `Slug del tenant` -> `Codigo de tu espacio`
- ayuda contextual mas ligera

La direccion correcta ya esta tomada, aunque todavia falten refinamientos.

## Decisiones pendientes antes de mas frontend

### 1. Flujo visual de instalador

Sigue faltando definir:

- cuando aparece
- que pasos incluye
- como redirige al login cuando termina

Referencia ya cerrada a nivel de especificacion:

- [Flujo visual del instalador](../install/installer-visual-flow.md)

Sin eso, el producto todavia arranca “como sistema ya instalado”.

### 2. UX final del login de `tenant_portal`

Ya mejoro bastante, pero aun falta decidir:

- texto final de los campos
- tono final de ayudas
- si habra recuperacion de acceso
- si el campo del tenant seguira manual o tendra una variante asistida en ciertos contextos

### 3. Vocabulario definitivo entre plataforma y tenant

Conviene estabilizar que palabras vamos a repetir en toda la UI:

- `tenant`
- `espacio`
- `usuario`
- `plataforma`
- `portal`
- `billing` o `facturacion`
- `modulo`
- `limite`

Hoy ya hay una direccion razonable, pero no esta cerrada formalmente.

### 4. Patron final de estados vacios

Hay que decidir una regla estable para:

- vacio sin datos
- vacio esperando primera carga real
- vacio por tenant nuevo
- vacio por falta de permisos

### 5. Patron final de errores operativos

Conviene fijar de forma consistente:

- mensaje corto
- detalle tecnico
- `request_id`
- cuando mostrar CTA de recuperacion

### 6. Confirmaciones de acciones peligrosas

La primera pasada ya esta aplicada en `Tenants`.

Ya cubre:

- cambiar `status`
- mutar billing
- tocar `maintenance`
- tocar plan
- tocar rate limits
- tocar module limits
- sincronizar schema tenant

Sigue pendiente extenderla a:

- reconcile masivo

### 7. Refinamiento final de `Tenants`

La pantalla `Tenants` ya es usable y no bloquea avanzar a otras vistas, pero quedan pendientes de cierre fino:

- simplificar el tono de algunas ayudas contextuales
- revisar si todas las burbujas `?` son necesarias
- traducir o etiquetar mejor codigos internos visibles del backend
- mejorar textos de exito para que suenen operativos
- evaluar si `plans`, `billing statuses` y `maintenance modes` necesitan nombres visibles separados del codigo tecnico

### 8. Refinamiento inicial de `Provisioning`

La pantalla `Provisioning` ya recibio una primera pasada util de UX:

- errores por accion con detalle real del backend
- confirmacion previa para requeue batch
- labels mas legibles para `job_type`, alertas y codigos de error

Queda pendiente revisar con mas calma:

- si todas las ayudas del bloque DLQ son necesarias o si algunas sobran
- si el requeue individual tambien deberia pedir confirmacion
- si el catalogo de jobs debe venir enriquecido desde backend con nombres visibles
- si la tabla principal necesita exponer mejor el tenant visible en vez de depender del `tenant_id`

## Patrones visuales que ya conviene congelar

Antes de abrir mas pantallas, conviene dar por estables estos patrones:

### 1. Tarjetas de metricas

Deben mantener:

- numero dominante
- label corto
- hint breve cuando agrega contexto real

### 2. Layout de split operativo

Cuando una pantalla mezcla lectura y accion, la estructura correcta ya parece ser:

- contexto arriba
- metricas primero
- split de trabajo despues
- tabla o historial al final

### 3. Paneles de detalle

Los paneles con `PanelCard` ya son la base correcta.

No conviene abrir otro sistema de cajas distinto mientras no haya una razon fuerte.

### 4. Tablas operativas

La tabla con contador de filas, headers claros y acciones al final ya es un patron valido.

### 5. Badges de estado

La semantica de color ya debe mantenerse estable por familia:

- positivo
- advertencia
- peligro
- neutro

## Orden recomendado para cerrar pendientes UX

1. flujo visual de instalador
2. UX final del login tenant
3. vocabulario final compartido
4. estados vacios y errores operativos
5. confirmaciones de acciones peligrosas
6. refinamiento final de `Tenants`

## Regla de trabajo para lo que sigue

Antes de abrir una pantalla nueva, conviene preguntar:

1. reutiliza patrones ya existentes?
2. usa vocabulario ya estabilizado?
3. consume capacidades reales del backend?
4. evita introducir una nueva excepcion visual?

Si la respuesta es “no”, probablemente conviene cerrar primero la decision UX base.

## Resultado esperado

Cuando este baseline quede mas cerrado, el resto del frontend deberia poder crecer:

- con menos cambios retroactivos
- con mejor coherencia entre portales
- con menos recapturas de manual visual
