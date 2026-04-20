# Plantilla Oficial de Spec por Slice

Usar esta plantilla antes de abrir un slice nuevo o endurecer un frente transversal relevante en `platform_paas`.

No es burocracia extra. Es la forma mínima de hacer ejecutable `SRED` en toda la PaaS.

Debe usarse especialmente cuando el cambio:

- toca datos críticos
- cruza módulos
- toca defaults, seeds o portabilidad
- cambia UX visible
- toca staging/production o convergencia multi-tenant

## 1. Identificación

- frente o módulo:
- nombre corto del slice:
- fecha:
- responsable:
- ambiente objetivo:

## 2. Problema real

- qué problema se quiere resolver:
- cómo se reproduce hoy:
- impacto operativo:
- riesgo si no se resuelve:

## 3. Alcance

### Entra

- 

### No entra

- 

## 4. Ownership y dominios afectados

- dominio dueño principal:
- dominios consumidores:
- entidades / tablas afectadas:
- referencia a [Matriz de Ownership de Datos](./data-ownership-matrix.md):

## 5. Reglas de negocio

- estados:
- validaciones:
- precedencias:
- restricciones:
- reglas multi-tenant:

## 6. Contrato técnico

### Backend

- routers:
- services:
- repositories:
- migraciones:
- scripts auxiliares:

### Frontend

- páginas:
- componentes:
- servicios:
- navegación:

### Integraciones

- módulo origen:
- módulo destino:
- momento del sync:
- side effects:

## 7. Datos, defaults y seeds

- defaults afectados:
- seeds o backfills requeridos:
- compatibilidad con tenants existentes:
- estrategia de convergencia:

## 8. UX esperada

- flujo principal:
- estados vacíos:
- errores visibles:
- modales / tablas / formularios afectados:

## 9. Evidencia mínima de cierre

### Tests

- backend:
- frontend build:
- E2E / smoke:

### Runtime

- deploy staging:
- deploy production:
- convergencia tenant:
- auditoría final:

## 10. Documentación a actualizar

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HISTORIAL_ITERACIONES.md`
- `HANDOFF_STATE.json`
- roadmap/changelog del módulo
- runbook si aplica

## 11. Criterio de salida

El slice solo puede declararse cerrado si:

- el comportamiento real quedó bien
- la evidencia es proporcional al riesgo
- la convergencia por ambiente y tenant está explícita
- la documentación viva quedó al día

## 12. Resultado final

Completar al cerrar:

- qué se hizo:
- qué se validó:
- qué quedó fuera:
- qué riesgos residuales quedan:
- cuál es el siguiente paso correcto:
