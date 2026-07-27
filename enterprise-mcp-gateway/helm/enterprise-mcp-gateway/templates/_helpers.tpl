{{- define "enterprise-mcp-gateway.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "enterprise-mcp-gateway.fullname" -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "enterprise-mcp-gateway.labels" -}}
app.kubernetes.io/name: {{ include "enterprise-mcp-gateway.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
