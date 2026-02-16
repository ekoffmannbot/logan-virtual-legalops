# Supuestos del MVP - Logan Virtual

Este documento registra todas las decisiones y supuestos tomados durante el desarrollo del MVP.

## Autenticacion y Seguridad

1. **JWT solamente**: No se implementa OAuth/SSO. Access token de 30 minutos, refresh token de 7 dias.
2. **Single-tenant MVP**: La estructura de BD soporta multi-tenant (organization_id en todas las tablas), pero la UI solo opera con una organizacion.
3. **Sin portal de cliente**: El rol CLIENTE_PORTAL esta definido pero no tiene UI dedicada en el MVP.

## Datos y Formato

4. **Idioma**: Toda la UI esta en espanol (Chile). El codigo fuente y nombres de variables estan en ingles.
5. **Moneda**: Pesos chilenos (CLP), almacenados como enteros (sin decimales).
6. **Zona horaria**: America/Santiago. Fechas almacenadas en UTC, mostradas en hora local chilena.
7. **RUT**: Campo opcional con validacion basica de formato. No se implementa verificacion modulo-11 completa.

## Integraciones Externas

8. **Email**: Mailpit captura todos los correos SMTP en desarrollo. No hay envio real de emails.
9. **IA**: Proveedor mock por defecto. Retorna respuestas consistentes sin necesidad de API key. Configurar OPENAI_API_KEY o ANTHROPIC_API_KEY para usar proveedores reales.
10. **Scraper**: Modo mock lee HTML local de fixtures. No se realiza scraping real en desarrollo. En produccion requeriria adaptacion por sitio.
11. **Almacenamiento**: Filesystem local en /storage/. Sin integracion S3. En produccion se usaria un bucket.

## Funcionalidad

12. **Sin tiempo real**: No hay WebSockets. Los datos se actualizan con polling o refresh manual.
13. **Sin calendario externo**: Fechas/horas simples. No hay integracion con Google Calendar o Outlook.
14. **PDF simplificado**: Renderizado de texto plano desde templates. No hay libreria PDF completa en el MVP.
15. **Notificaciones in-app**: Solo almacenadas en BD y mostradas en topbar. Sin push notifications ni SMS.

## Entidades Externas

16. **Notaria**: Entidad externa rastreada por nombre (string). No es un usuario del sistema.
17. **Tribunal**: Referenciado por nombre en el campo court_name del caso. Sin integracion con sistemas judiciales.
18. **Procurador**: Es un rol de usuario del sistema, no una entidad separada.

## Flujos de Negocio

19. **Transiciones de estado**: Validadas en el backend con allowed_transitions. Los estados invalidos retornan 409 Conflict.
20. **Creacion automatica de tareas**: Al enviar propuesta se crea tarea 72h. Al escalar cobranza se crea tarea para jefe_cobranza. Los intentos de contacto notarial se crean diariamente via Celery.
21. **SLA de correos**: Se verifica cada 15 minutos. Breach 24h genera tarea para abogado_jefe. Breach 48h genera tarea urgente.
22. **Cobranza**: Contacto preventivo 5 dias antes del vencimiento. Escalamiento manual via status transitions.
23. **Cheques**: Modelados como metodo de pago (payment_method=cheque), no como entidad separada.
24. **Scraper rate limiting**: 1 request/segundo con user-agent configurable.

## Datos Seed

25. **Organizacion unica**: "Logan & Logan Abogados"
26. **9 usuarios**: Uno por cada rol (excepto dos abogados)
27. **Password universal**: `logan2024` para todas las cuentas demo
28. **Datos realistas**: Leads, clientes, casos, propuestas en distintos estados para demostrar los flujos completos

## Project Assets Registry

29. **Solo CRUD basico**: Permite registrar referencias a archivos en /project_assets/. No hace ingesta automatica ni parsing.
30. **Convencion de nombres**: YYYYMMDD__<tipo>__<descripcion_corta>.<ext>
