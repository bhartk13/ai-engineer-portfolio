/**
 * IBM Agent Stack Deployment Module
 * Handles deploying A2A agents using IBM's open-source infrastructure
 * Supports IBM Cloud Code Engine, OpenShift, and Kubernetes
 */

import { AgentCard } from '../agents/a2a-server';

// ─── IBM Agent Stack Types ────────────────────────────────────────────────────

export interface IBMAgentStackConfig {
  // IBM Cloud configuration
  ibmCloud?: {
    apiKey: string;
    region: string;
    resourceGroup: string;
    codeEngineProjectId?: string;
  };

  // OpenShift configuration
  openShift?: {
    apiServer: string;
    token: string;
    namespace: string;
    projectName: string;
  };

  // Container registry
  registry: {
    server: string;        // e.g., us.icr.io
    namespace: string;
    username?: string;
    password?: string;
  };

  // Watsonx AI configuration
  watsonx?: {
    projectId: string;
    apiKey: string;
    url: string;
    modelId: string;
  };
}

export interface AgentDeploymentSpec {
  agentCard: AgentCard;
  image: string;
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
    ephemeralStorage?: string;
  };
  env: Record<string, string>;
  secrets?: string[];
  autoscaling?: {
    minReplicas: number;
    maxReplicas: number;
    targetCPU: number;
    targetMemory?: number;
  };
  networking?: {
    port: number;
    protocol: 'HTTP' | 'HTTPS' | 'gRPC';
    ingress?: boolean;
    domainMapping?: string;
  };
}

export interface DeploymentResult {
  deploymentId: string;
  agentId: string;
  status: 'deploying' | 'running' | 'failed' | 'stopped';
  endpoint?: string;
  replicas: { desired: number; ready: number };
  createdAt: string;
  updatedAt: string;
  logs?: string[];
}

// ─── IBM Agent Stack Deployer ─────────────────────────────────────────────────

export class IBMAgentStack {
  private config: IBMAgentStackConfig;
  private deployments = new Map<string, DeploymentResult>();

  constructor(config: IBMAgentStackConfig) {
    this.config = config;
  }

  /**
   * Deploy an agent to IBM Cloud Code Engine
   */
  async deployToCodeEngine(spec: AgentDeploymentSpec): Promise<DeploymentResult> {
    console.log(`[IBM] Deploying agent "${spec.agentCard.name}" to Code Engine`);

    const deploymentId = `ce-${spec.agentCard.id}-${Date.now()}`;

    // Build Code Engine application spec
    const ceAppSpec = {
      name: this.sanitizeName(spec.agentCard.name),
      image_reference: spec.image,
      scale_initial_instances: spec.replicas,
      scale_min_instances: spec.autoscaling?.minReplicas || 1,
      scale_max_instances: spec.autoscaling?.maxReplicas || 10,
      scale_cpu_limit: spec.resources.cpu,
      scale_memory_limit: spec.resources.memory,
      run_env_variables: Object.entries(spec.env).map(([name, value]) => ({
        type: 'literal',
        name,
        value,
      })),
      scale_concurrency: 100,
      scale_request_timeout: 300,
    };

    const result: DeploymentResult = {
      deploymentId,
      agentId: spec.agentCard.id,
      status: 'deploying',
      replicas: { desired: spec.replicas, ready: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.deployments.set(deploymentId, result);

    // In production this would call the IBM Cloud Code Engine API
    // Simulating the deployment for the platform
    console.log(`[IBM] Code Engine app spec:`, JSON.stringify(ceAppSpec, null, 2));

    // Simulate async deployment
    setTimeout(() => {
      const updated = {
        ...result,
        status: 'running' as const,
        endpoint: `https://${ceAppSpec.name}.${this.config.ibmCloud?.region || 'us-south'}.codeengine.appdomain.cloud`,
        replicas: { desired: spec.replicas, ready: spec.replicas },
        updatedAt: new Date().toISOString(),
      };
      this.deployments.set(deploymentId, updated);
      console.log(`[IBM] Agent deployed successfully: ${updated.endpoint}`);
    }, 5000);

    return result;
  }

  /**
   * Deploy agent to OpenShift
   */
  async deployToOpenShift(spec: AgentDeploymentSpec): Promise<DeploymentResult> {
    console.log(`[IBM] Deploying agent "${spec.agentCard.name}" to OpenShift`);

    const deploymentId = `os-${spec.agentCard.id}-${Date.now()}`;
    const appName = this.sanitizeName(spec.agentCard.name);

    // Generate OpenShift DeploymentConfig
    const deploymentConfig = {
      apiVersion: 'apps.openshift.io/v1',
      kind: 'DeploymentConfig',
      metadata: {
        name: appName,
        namespace: this.config.openShift?.namespace,
        labels: {
          app: appName,
          'a2a-agent': 'true',
          framework: spec.agentCard.framework,
        },
        annotations: {
          'a2a/agent-id': spec.agentCard.id,
          'a2a/agent-version': spec.agentCard.version,
          'a2a/discovery-endpoint': `/.well-known/agent.json`,
        },
      },
      spec: {
        replicas: spec.replicas,
        selector: { app: appName },
        template: {
          metadata: { labels: { app: appName } },
          spec: {
            containers: [{
              name: appName,
              image: spec.image,
              ports: [{ containerPort: spec.networking?.port || 8080 }],
              env: Object.entries(spec.env).map(([name, value]) => ({ name, value })),
              resources: {
                requests: { cpu: '100m', memory: '256Mi' },
                limits: { cpu: spec.resources.cpu, memory: spec.resources.memory },
              },
              readinessProbe: {
                httpGet: { path: '/health', port: spec.networking?.port || 8080 },
                initialDelaySeconds: 10,
                periodSeconds: 5,
              },
              livenessProbe: {
                httpGet: { path: '/health', port: spec.networking?.port || 8080 },
                initialDelaySeconds: 30,
                periodSeconds: 10,
              },
            }],
          },
        },
      },
    };

    // HPA for autoscaling
    const hpa = spec.autoscaling ? {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: { name: `${appName}-hpa`, namespace: this.config.openShift?.namespace },
      spec: {
        scaleTargetRef: { apiVersion: 'apps.openshift.io/v1', kind: 'DeploymentConfig', name: appName },
        minReplicas: spec.autoscaling.minReplicas,
        maxReplicas: spec.autoscaling.maxReplicas,
        metrics: [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: spec.autoscaling.targetCPU } } }],
      },
    } : null;

    // Service
    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: appName, namespace: this.config.openShift?.namespace },
      spec: {
        selector: { app: appName },
        ports: [{ port: 80, targetPort: spec.networking?.port || 8080 }],
      },
    };

    // Route (OpenShift ingress)
    const route = spec.networking?.ingress ? {
      apiVersion: 'route.openshift.io/v1',
      kind: 'Route',
      metadata: { name: appName, namespace: this.config.openShift?.namespace },
      spec: {
        to: { kind: 'Service', name: appName },
        port: { targetPort: spec.networking?.port || 8080 },
        tls: { termination: 'edge' },
      },
    } : null;

    console.log(`[IBM] OpenShift manifests generated for "${appName}"`);

    const result: DeploymentResult = {
      deploymentId,
      agentId: spec.agentCard.id,
      status: 'deploying',
      replicas: { desired: spec.replicas, ready: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.deployments.set(deploymentId, result);
    return result;
  }

  /**
   * Generate Kubernetes manifests for the agent
   */
  generateKubernetesManifests(spec: AgentDeploymentSpec): {
    deployment: object;
    service: object;
    hpa?: object;
    ingress?: object;
    configMap: object;
    serviceAccount: object;
  } {
    const appName = this.sanitizeName(spec.agentCard.name);
    const port = spec.networking?.port || 8080;

    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: appName,
        labels: { app: appName, 'a2a-agent': 'true', framework: spec.agentCard.framework },
        annotations: { 'a2a/agent-card': JSON.stringify(spec.agentCard) },
      },
      spec: {
        replicas: spec.replicas,
        selector: { matchLabels: { app: appName } },
        strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } },
        template: {
          metadata: { labels: { app: appName } },
          spec: {
            serviceAccountName: `${appName}-sa`,
            containers: [{
              name: appName,
              image: spec.image,
              imagePullPolicy: 'Always',
              ports: [{ containerPort: port, name: 'http' }],
              envFrom: [{ configMapRef: { name: `${appName}-config` } }],
              env: Object.entries(spec.env)
                .filter(([k]) => k.includes('SECRET') || k.includes('KEY'))
                .map(([name]) => ({
                  name,
                  valueFrom: { secretKeyRef: { name: `${appName}-secret`, key: name.toLowerCase() } },
                })),
              resources: {
                requests: { cpu: '100m', memory: '128Mi' },
                limits: { cpu: spec.resources.cpu, memory: spec.resources.memory },
              },
              readinessProbe: { httpGet: { path: '/health', port }, initialDelaySeconds: 5, periodSeconds: 5 },
              livenessProbe: { httpGet: { path: '/health', port }, initialDelaySeconds: 15, periodSeconds: 15 },
              securityContext: { runAsNonRoot: true, runAsUser: 1000, readOnlyRootFilesystem: true },
            }],
            topologySpreadConstraints: [{
              maxSkew: 1,
              topologyKey: 'kubernetes.io/hostname',
              whenUnsatisfiable: 'DoNotSchedule',
              labelSelector: { matchLabels: { app: appName } },
            }],
          },
        },
      },
    };

    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: appName, labels: { app: appName } },
      spec: {
        selector: { app: appName },
        ports: [{ name: 'http', port: 80, targetPort: port }],
        type: 'ClusterIP',
      },
    };

    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: { name: `${appName}-config` },
      data: Object.fromEntries(
        Object.entries(spec.env)
          .filter(([k]) => !k.includes('SECRET') && !k.includes('KEY'))
      ),
    };

    const serviceAccount = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: { name: `${appName}-sa`, labels: { app: appName } },
    };

    const hpa = spec.autoscaling ? {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: { name: `${appName}-hpa` },
      spec: {
        scaleTargetRef: { apiVersion: 'apps/v1', kind: 'Deployment', name: appName },
        minReplicas: spec.autoscaling.minReplicas,
        maxReplicas: spec.autoscaling.maxReplicas,
        metrics: [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: spec.autoscaling.targetCPU } } }],
      },
    } : undefined;

    const ingress = spec.networking?.ingress ? {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: appName,
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
          'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        },
      },
      spec: {
        ingressClassName: 'nginx',
        tls: [{ hosts: [spec.networking?.domainMapping || `${appName}.example.com`], secretName: `${appName}-tls` }],
        rules: [{
          host: spec.networking?.domainMapping || `${appName}.example.com`,
          http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: appName, port: { number: 80 } } } }] },
        }],
      },
    } : undefined;

    return { deployment, service, hpa, ingress, configMap, serviceAccount };
  }

  /**
   * Register agent with IBM Agent Registry for discovery
   */
  async registerAgent(agentCard: AgentCard, endpoint: string): Promise<void> {
    console.log(`[IBM] Registering agent "${agentCard.name}" in IBM Agent Registry`);
    // In production: POST to IBM Agent Registry API
    console.log(`[IBM] Agent registered at: ${endpoint}/.well-known/agent.json`);
  }

  /**
   * Get deployment status
   */
  getDeployment(deploymentId: string): DeploymentResult | undefined {
    return this.deployments.get(deploymentId);
  }

  listDeployments(): DeploymentResult[] {
    return Array.from(this.deployments.values());
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').slice(0, 63);
  }
}

// ─── Docker Compose Generator ─────────────────────────────────────────────────

export function generateDockerCompose(agents: AgentDeploymentSpec[]): string {
  const services: Record<string, object> = {
    nginx: {
      image: 'nginx:alpine',
      ports: ['80:80', '443:443'],
      volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
      depends_on: agents.map(a => a.agentCard.id),
      networks: ['a2a-network'],
    },
    redis: {
      image: 'redis:7-alpine',
      ports: ['6379:6379'],
      volumes: ['redis-data:/data'],
      networks: ['a2a-network'],
    },
    prometheus: {
      image: 'prom/prometheus:latest',
      ports: ['9090:9090'],
      volumes: ['./prometheus.yml:/etc/prometheus/prometheus.yml:ro'],
      networks: ['a2a-network'],
    },
  };

  for (const spec of agents) {
    const name = spec.agentCard.id.replace(/_/g, '-');
    services[name] = {
      image: spec.image,
      environment: spec.env,
      ports: [`${spec.networking?.port || 8080}`],
      networks: ['a2a-network'],
      labels: {
        'a2a.agent.id': spec.agentCard.id,
        'a2a.agent.name': spec.agentCard.name,
        'a2a.agent.framework': spec.agentCard.framework,
      },
      healthcheck: {
        test: [`CMD`, `curl`, `-f`, `http://localhost:${spec.networking?.port || 8080}/health`],
        interval: '30s',
        timeout: '10s',
        retries: 3,
        start_period: '40s',
      },
      deploy: {
        replicas: spec.replicas,
        resources: {
          limits: { cpus: spec.resources.cpu, memory: spec.resources.memory },
        },
        restart_policy: { condition: 'on-failure', max_attempts: 3 },
      },
    };
  }

  const compose = {
    version: '3.9',
    services,
    networks: { 'a2a-network': { driver: 'bridge' } },
    volumes: { 'redis-data': {} },
  };

  const yaml = require('js-yaml');
  return yaml.dump(compose, { indent: 2 });
}
