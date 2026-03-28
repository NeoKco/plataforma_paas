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

Eso no significa que baste con mostrar el selector:

- cada pantalla visible debe consumir el idioma activo
- los helpers compartidos no deben forzar español por defecto cuando el contexto ya conoce el idioma
- `Overview` y `Users` ya quedaron corregidas bajo ese criterio y deben tomarse como referencia para el resto

### 3. `Platform Admin` es la puerta de entrada principal

Hoy el recorrido real empieza por:

- `/install` cuando la plataforma aun no esta instalada
- `platform_admin` cuando la instalacion ya fue completada

No conviene diseñar el producto como si el primer contacto fuera `tenant_portal`.

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

### 6.1. Los codigos internos visibles deben traducirse cuando existe un equivalente natural

Esto ya empezo a estabilizarse con una capa comun de labels para:

- estados de facturacion
- resultados de procesamiento
- modos de mantenimiento
- fuentes de bloqueo
- roles y tipos visibles en `tenant_portal`

La regla correcta ya no es mostrar el codigo crudo primero, sino el label entendible y dejar el codigo tecnico solo cuando de verdad aporta.

Esto aplica tambien a:

- badges de estado
- feedback de acciones
- tablas genericas
- mensajes de acceso o bloqueo

Si un componente compartido rompe ese criterio, el problema ya no es solo de la pantalla que lo consume sino de la base comun del frontend.

### 7. La sesion no debe quedar abierta indefinidamente

La plataforma ya asume este baseline:

- sesion almacenada en `sessionStorage`
- cierre automatico por inactividad
- refresh solo si sigue existiendo uso real

Eso queda como criterio de seguridad base tanto para `platform_admin` como para `tenant_portal`.

## Decisiones pendientes antes de mas frontend

### 1. Refinamiento final de instalador

El instalador visual ya existe y ya cubre:

- redireccion a `/install` cuando `installed=false`
- formulario unico de primera instalacion
- exito, error y redireccion posterior al login

Queda pendiente cerrar solo su refinamiento final:

- validar el tono final de textos de primer arranque
- decidir si necesita una captura visual final para onboarding
- revisar si el post-instalacion requiere mas guia operativa o ya basta con el CTA al login

Referencia:

- [Flujo visual del instalador](../install/installer-visual-flow.md)

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

Ya existe una primera base comun y ahora conviene consolidarla, no inventarla desde cero.

La regla ya encaminada es:

- usar un bloque visual dedicado cuando no hay datos
- distinguir vacio operativo de error real
- evitar texto suelto perdido dentro de tarjetas

Todavia conviene seguir afinando los subcasos:

- vacio sin datos
- vacio esperando primera carga real
- vacio por tenant nuevo
- vacio por falta de permisos

### 5. Patron final de errores operativos

Conviene terminar de fijar de forma consistente:

- mensaje corto
- detalle tecnico
- `request_id`
- cuando mostrar CTA de recuperacion

Avance ya visible:

- `ErrorState` ya se usa de forma bastante consistente en `platform_admin` y `tenant_portal`
- los vacios mas visibles ya empezaron a usar un bloque comun en vez de texto suelto
- el objetivo ahora es cerrar el mismo tono entre vacio, warning y error recuperable

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
- mejorar textos de exito para que suenen operativos
- evaluar si `plans`, `billing statuses` y `maintenance modes` necesitan nombres visibles separados del codigo tecnico

Avance ya cerrado en esta area:

- estados como `past_due`, `retry_pending`, `reconciled` y `trialing` ya se muestran con labels legibles
- `write_block` y `full_block` ya se presentan como modos de acceso entendibles
- la fuente de bloqueo ya no depende del codigo crudo cuando existe una explicacion visible razonable

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

### 9. Consistencia de lenguaje entre `platform_admin` y `tenant_portal`

Esto ya mejoro y conviene mantenerlo como regla:

- `Billing` y `Tenants` usan labels de negocio mas comprensibles para estados y resultados
- `tenant_portal` ya refleja ese mismo tono en uso por modulo, roles y mensajes de bloqueo
- los mensajes de enforcement ya deben explicar el motivo con lenguaje de cupo o plan, no con claves tecnicas
- `Dashboard` y `Settings` ya empezaron a usar un tono mas ejecutivo y operativo, menos cercano a catalogo tecnico crudo

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

1. refinamiento final de instalador
2. UX final del login tenant
3. vocabulario final compartido
4. refinamiento final de estados vacios y errores operativos
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
