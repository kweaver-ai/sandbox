{{/*
Expand the name of the chart.
*/}}
{{- define "sandbox.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "sandbox.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "sandbox.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Control Plane name
*/}}
{{- define "sandbox.controlPlaneName" -}}
{{- printf "%s-control-plane" (include "sandbox.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Web Console name
*/}}
{{- define "sandbox.webName" -}}
{{- printf "%s-web" (include "sandbox.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
ServiceAccount name
*/}}
{{- define "sandbox.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sandbox.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
RBAC name
*/}}
{{- define "sandbox.rbacName" -}}
{{- if .Values.rbac.create }}
{{- default (include "sandbox.fullname" .) .Values.rbac.name }}
{{- else }}
{{- default "default" .Values.rbac.name }}
{{- end }}
{{- end }}

{{/*
Labels
*/}}
{{- define "sandbox.labels" -}}
helm.sh/chart: {{ include "sandbox.chart" . }}
{{ include "sandbox.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sandbox.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sandbox.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Get the ingress class name from depServices
*/}}
{{- define "sandbox.ingressClass" -}}
{{- $depServices := mergeOverwrite (deepCopy (default dict .Values.depServices)) (default dict .Values.global.depServices) -}}
{{- if and $depServices (index $depServices "class-443") (index $depServices "class-443").ingressClass -}}
{{- (index $depServices "class-443").ingressClass -}}
{{- else -}}
{{- "nginx" -}}
{{- end -}}
{{- end }}


{{/* ========== Universal Global Values Merge Helpers ========== */}}
{{/* All charts use these same helper function names for consistency */}}

{{- define "mergedGlobalValues.imageRegistry" -}}
{{- $globalImage := (.Values.global | default dict).image | default dict -}}
{{- if $globalImage.registry -}}
{{- $globalImage.registry -}}
{{- else -}}
{{- .Values.image.registry -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.replicaCount" -}}
{{- $global := .Values.global | default dict -}}
{{- if hasKey $global "replicaCount" -}}
{{- $global.replicaCount -}}
{{- else -}}
{{- .Values.replicaCount -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.env" -}}
{{- $globalEnv := (.Values.global | default dict).env | default dict -}}
{{- if $globalEnv -}}
{{- toYaml (mergeOverwrite (deepCopy (.Values.env | default dict)) $globalEnv) -}}
{{- else -}}
{{- toYaml .Values.env -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.depServices" -}}
{{- $globalDeps := (.Values.global | default dict).depServices | default dict -}}
{{- if $globalDeps -}}
{{- toYaml (mergeOverwrite (deepCopy (.Values.depServices | default dict)) $globalDeps) -}}
{{- else -}}
{{- toYaml .Values.depServices -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.imagePullSecrets" -}}
{{- $localSecrets := .Values.imagePullSecrets | default (list) -}}
{{- $globalSecrets := (.Values.global | default dict).imagePullSecrets | default (list) -}}
{{- if gt (len $localSecrets) 0 -}}
{{- toYaml $localSecrets -}}
{{- else if gt (len $globalSecrets) 0 -}}
{{- toYaml $globalSecrets -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.namespace" -}}
{{- $global := .Values.global | default dict -}}
{{- if hasKey $global "namespace" -}}
{{- $global.namespace -}}
{{- else -}}
{{- .Values.namespace -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.mode" -}}
{{- $global := .Values.global | default dict -}}
{{- if hasKey $global "mode" -}}
{{- $global.mode -}}
{{- else -}}
{{- .Values.mode | default "Community" -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.accessAddress" -}}
{{- $globalAccess := (.Values.global | default dict).accessAddress | default dict -}}
{{- if $globalAccess -}}
{{- toYaml (mergeOverwrite (deepCopy (.Values.accessAddress | default dict)) $globalAccess) -}}
{{- else -}}
{{- toYaml .Values.accessAddress -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.ingressClassName" -}}
{{- $global := .Values.global | default dict -}}
{{- if hasKey $global "ingressClassName" -}}
{{- $global.ingressClassName -}}
{{- else -}}
{{- .Values.ingressClassName | default "nginx" -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.flowAutomation" -}}
{{- $globalFlow := (.Values.global | default dict).flowAutomation | default dict -}}
{{- if $globalFlow -}}
{{- toYaml (mergeOverwrite (deepCopy (.Values.flowAutomation | default dict)) $globalFlow) -}}
{{- else -}}
{{- toYaml .Values.flowAutomation -}}
{{- end -}}
{{- end -}}

{{- define "mergedGlobalValues.image" -}}
{{- $imageRegistry := include "mergedGlobalValues.imageRegistry" . -}}
{{- if $imageRegistry }}
{{- printf "%s/%s:%s" $imageRegistry .Values.image.repository .Values.image.tag -}}
{{- else -}}
{{- printf "%s:%s" .Values.image.repository .Values.image.tag -}}
{{- end -}}
{{- end -}}
