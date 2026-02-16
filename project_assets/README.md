# Project Assets - Logan Virtual

Esta carpeta contiene insumos del proyecto: diagramas de procesos, capturas, documentacion adicional, muestras de plantillas y branding.

## Estructura

```
project_assets/
  processes/       # Diagramas BPMN, Bizagi exports, flujos de trabajo
  screenshots/     # Capturas de pantalla y referencias visuales
  docs/            # PDFs, minutas, requisitos adicionales
  templates_samples/ # Ejemplos de contratos, propuestas, correos
  branding/        # Logos, paleta de colores, guia de estilo
```

## Convencion de Nombres

Formato: `YYYYMMDD__<tipo>__<descripcion_corta>.<ext>`

Ejemplos:
- `20260211__bpmn__contrato_y_mandato.png`
- `20260211__pdf__minuta_reunion_kickoff.pdf`
- `20260211__template__propuesta_servicios.docx`

## Tipos Comunes

- `bpmn` - Diagramas de proceso
- `pdf` - Documentos PDF
- `template` - Plantillas de documentos
- `screenshot` - Capturas de pantalla
- `logo` - Logos e identidad visual

## Uso en el Sistema

El backend incluye un "Project Assets Registry" basico que permite:
- Registrar un asset (ruta relativa, tipo, descripcion)
- Listar assets registrados

Esto es solo para trazabilidad. No hay ingesta automatica en el MVP.

## Notas

- Esta carpeta NO contiene datos sensibles en produccion
- En produccion se usaria un bucket (S3, GCS) o drive compartido
- Todas las rutas son relativas al repositorio
- Los insumos originales del proyecto estan en `/insumos/`
