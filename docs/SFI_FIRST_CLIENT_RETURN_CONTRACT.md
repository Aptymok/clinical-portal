# Inmunoclinic ↔ System Friction Institute — primer cliente y RETURN

**Estado:** propuesta de contrato institucional y captura local de eventos operativos; NO hay entrega remota autorizada, ni validación de SFI como receptor de datos clínicos.

## Separación de autoridad

Inmunoclinic = controlador de su operación clínica, agendas, pacientes, consentimiento y decisiones profesionales. SFI = observador de fricción sistémica, evidencia de ejecución y retorno operativo; no médico, no encargado clínico por defecto y no autoridad para agendar, modificar expedientes, inferir diagnósticos ni emitir RETURN unilateral en nombre de la clínica.

SFI no necesita identificadores de paciente, texto libre, diagnósticos, nombres, teléfonos, correos, horarios precisos ni credenciales OAuth para estudiar confiabilidad de sincronización. Su beneficio legítimo es contrastar predicciones operativas con resultados observados, con indicadores agregados y anonimizados.

## Flujo recíproco (mínima perturbación)

1. **SOURCE / OBSERVATION**: Inmunoclinic registra internamente la operación auditable (alta, modificación, cancelación, sincronización, conflicto) y su evidencia local.
2. **RECORD**: `AuditLog` y `DomainEvent` persisten observación y correlación en la base de la clínica; la observación `SFI_OBSERVATION_V1` omite identificadores y contenido clínico.
3. **EVIDENCE**: Inmunoclinic mantiene pruebas de proveedor, acuses, estados y errores bajo control local.
4. **INFERENCE / SIMULATION**: SFI puede calcular indicadores agregados (latencia, errores, conflictos, tasa de retorno) únicamente tras autorización específica y contrato firmado.
5. **DECISION / AUTHORITY**: toda acción sobre calendarios, pacientes o sistemas sigue autorizada por el personal de Inmunoclinic. SFI puede proponer, no ejecutar.
6. **EXECUTION**: Inmunoclinic registra qué se intentó y si un proveedor confirmó.
7. **RETURN**: sólo cuando existe resultado externo observable, la clínica valida el retorno operativo y SFI puede vincularlo a su caso institucional, con procedencia y límites. Un HTTP 200, una escritura local o una salida de IA no constituyen RETURN externo suficiente.
8. **CONTRAST**: discrepancias entre expectativa y observación abren incidente o hipótesis, sin alterar registros anteriores.

## Envelope de observación local

```json
{
  "contract":"SFI-EXTERNAL-RETURN-1.0",
  "eventId":"random UUID",
  "client":"inmunoclinic",
  "observedAt":"ISO-8601",
  "action":"APPROVED_OPERATION_TYPE",
  "resourceClass":"Appointment",
  "outcome":"RECORDED",
  "authority":"CLINIC_LOCAL",
  "externalDelivery":"NOT_AUTHORIZED",
  "containsPatientData":false
}
```

**Implementado**: al ejecutar `logAudit`, la clínica guarda `SFI_OBSERVATION_V1` en `DomainEvent`, además de la bitácora clínica. No se envía al SFI. La bitácora clínica conserva su propio alcance y puede contener información reservada; jamás replicarla sin filtrado.

**Pendiente**: política de categorías de evento, instrumentar eventos no auditados, separar transacción principal y outbox con reintentos idempotentes, correlación de acuses externos, evaluación de reidentificación por metadatos, autorización del controlador, convenio responsable/encargado cuando proceda, scopes OAuth, receptor MCP autenticado, prueba de entrega y evidencia de RETURN.

## Reglas de integración

- SFI recibe sólo `observe` y métricas desidentificadas por defecto; nada de `lab:write` clínico ni `studio:run` sobre datos personales sin autorización adicional.
- Autenticación OAuth2/mTLS según contrato real; verificar servidor, scopes, rotación, revocación, no reutilizar tokens de calendario.
- Outbox local durable con estados PENDING/DELIVERED/ACKNOWLEDGED/FAILED y TTL; nunca entregar en línea bloqueando una cita.
- Consentimiento, contratos y evaluación de privacidad previos a cualquier transferencia; datos agregados no equivalen automáticamente a anonimización.
- SFI debe devolver **identificador de recepción y estado epistemológico**; Inmunoclinic conserva evidencia del acuse y decide si es retorno válido.
- Mecanismo de desconexión: Inmunoclinic puede suspender envío sin detener la operación clínica; SFI conserva sólo lo pactado y respeta retención/borrado aplicables.
- No se afirma integración MCP funcional hasta completar un ensayo extremo a extremo en entorno de pruebas.

## Criterios de aceptación

Un caso piloto sintético con 1 reserva, 1 conflicto, 1 cambio y 1 confirmación externa debe reconstruirse en ambas partes, con correlación verificable, acuse, autoridad delimitada, ausencia de PHI y falsación de al menos una expectativa. El retorno institucional se acepta **sólo** si la fuente externa lo acredita.
