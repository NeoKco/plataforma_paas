# SIGUIENTE_PASO

## Prioridad vigente

- retomar `platform-core hardening + E2E` en `Provisioning/DLQ`, ya con el corte operativo de portabilidad tenant cerrado

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir si se vuelve de inmediato a `Provisioning/DLQ`
  - o si se abre una microfase explícita de endurecimiento adicional sobre `tenant data portability`
- la recomendación actual es:
  - no seguir extendiendo portabilidad en esta iteración
  - volver al roadmap central de `Provisioning/DLQ`

## Próximo paso correcto

- asumir cerrado este corte:
  - hotfix de `tenant_data_portability_service`
  - migración funcional real `empresa-demo -> ieris-ltda`
  - validación backend repo + producción
- mantener `production` estable con el backend ya reiniciado y sano
- abrir el siguiente slice broker-only o de endurecimiento visible en `Provisioning/DLQ`
- validar primero en `staging`
- promocionar a `production` solo después de esa validación

## Si el escenario principal falla

- si aparece una nueva necesidad de copiar datos tenant reales, reutilizar el flujo portable oficial ya corregido
- si se detecta otro fallo solo visible en `apply`, abrir una iteración específica de endurecimiento sobre portabilidad antes de volver a usarlo en otra migración real
- si `staging` pierde el carril broker-only para DLQ, corregir entorno antes de seguir con smokes broker-only

## Condición de cierre de la próxima iteración

- la próxima iteración debe cerrar con uno de estos resultados:
  - un nuevo corte funcional de `Provisioning/DLQ` implementado, validado y documentado
  - o un endurecimiento explícito adicional de portabilidad tenant, si aparece un bug real nuevo, con validación y handoff actualizados
