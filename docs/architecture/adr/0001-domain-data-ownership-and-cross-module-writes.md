# ADR 0001 - Ownership de datos por dominio y escritura entre modulos

- Estado: `accepted`
- Fecha: `2026-04-20`
- Reemplaza: `n/a`
- Reemplazado por: `n/a`

## Contexto

`platform_paas` ya opera como PaaS multi-tenant con dominios diferenciados:

- `platform-core`
- `business-core`
- `maintenance`
- `finance`
- `agenda`

En iteraciones previas aparecieron problemas típicos de frontera difusa:

- módulos escribiendo datos que no les pertenecen
- defaults inconsistentes entre tenants
- imports y repairs sin ownership explícito
- confusión entre hecho operativo y hecho económico

## Decisión

Se adopta ownership explícito por dominio como regla arquitectónica obligatoria:

- `platform-core` es dueño de tenants, lifecycle, provisioning, billing y políticas transversales
- `business-core` es dueño de organizaciones, clientes, contactos, sitios, grupos, perfiles y tipos de tarea
- `maintenance` es dueño de instalaciones, órdenes de trabajo, schedules, due items, visitas y costeo operativo
- `finance` es dueño del hecho económico: transacciones, cuentas, categorías, monedas, préstamos y presupuestos
- `agenda` es consumidor transversal de eventos; no reemplaza ownership operativo ni económico

Además:

- ningún módulo debe escribir directamente la verdad principal de otro dominio por conveniencia de UI
- los cruces entre módulos deben entrar por servicio, contrato o integración explícita
- la matriz operativa canónica queda en [data-ownership-matrix.md](../data-ownership-matrix.md)

## Consecuencias

- `maintenance` puede disparar sincronización hacia `finance`, pero no se convierte en dueño de `finance_transactions`
- `finance` no se convierte en dueño de clientes, sitios ni instalaciones
- cualquier slice que cruce módulos debe declarar ownership y contrato antes de cerrarse
- seeds, imports, exports y repairs también quedan sujetos a ownership, no solo CRUDs visibles

## Referencias

- [Gobernanza de datos](../data-governance.md)
- [Matriz de ownership de datos](../data-ownership-matrix.md)
- [SRED Driven Development](../sred-development.md)
