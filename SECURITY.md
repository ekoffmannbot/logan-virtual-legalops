# Seguridad - Logan Virtual

## Autenticacion

- **JWT Bearer tokens** via OAuth2PasswordBearer
- Access token: 30 minutos de validez
- Refresh token: 7 dias de validez
- Passwords hasheados con bcrypt via passlib
- Endpoints de login retornan ambos tokens

## RBAC (Control de Acceso por Roles)

Cada endpoint sensible valida el rol del usuario mediante `require_role()`:

```python
@router.get("/")
def list_items(user = Depends(require_role(RoleEnum.ABOGADO, RoleEnum.GERENTE_LEGAL))):
    ...
```

### Permisos por Rol

| Accion | SEC | ADM | ABG | ABJ | PRO | GL | JC | AC |
|--------|-----|-----|-----|-----|-----|----|----|----|
| Ver dashboard | x | x | x | x | x | x | x | x |
| Gestionar leads | x | x | x | x | | x | | x |
| Crear propuestas | | | x | x | | x | | |
| Gestionar contratos | | x | x | x | | x | | |
| Documentos notariales | | | x | | x | x | | |
| Revision de causas | | | x | | x | x | | |
| Cobranza | x | | | | | x | x | |
| Email tickets | | | x | x | | x | | |
| Scraper | | x | | | | x | | x |
| Admin (usuarios) | | | | | | x | | |

SEC=Secretaria, ADM=Administracion, ABG=Abogado, ABJ=Abogado Jefe, PRO=Procurador, GL=Gerente Legal, JC=Jefe Cobranza, AC=Agente Comercial

## Aislamiento de Datos

- Todas las tablas tienen `organization_id`
- Todas las queries filtran por `organization_id` del usuario autenticado
- Un usuario solo puede ver datos de su organizacion

## Auditoria

- Tabla `audit_logs` registra: actor, accion, entidad, valores antes/despues
- Incluye IP y user-agent del request
- Las transiciones de estado de workflows generan entradas de auditoria
- Los logs son inmutables (solo insercion, sin updates ni deletes)

## IA y Datos Sensibles

- La IA solo genera borradores y resumenes
- Nunca envia comunicaciones externas automaticamente
- Todo envio requiere confirmacion humana
- Los borradores se marcan claramente como generados por IA
- Cada respuesta incluye nivel de confianza y fuentes

## Recomendaciones para Produccion

1. Cambiar JWT_SECRET_KEY por una clave segura
2. Implementar rate limiting en endpoints publicos
3. Configurar HTTPS (TLS)
4. Usar un bucket S3 para almacenamiento de archivos
5. Implementar backup automatico de la base de datos
6. Configurar CORS para dominios especificos
7. Implementar 2FA para roles administrativos
8. Revisar y restringir permisos RBAC segun necesidad real
