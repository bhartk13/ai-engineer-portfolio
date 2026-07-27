# Deployment

## Local (docker-compose)

```bash
docker compose -f docker/docker-compose.yml up --build
```

Brings up the full stack: gateway, Postgres, Redis, Kafka+Zookeeper,
Prometheus (scraping `/actuator/prometheus`), and Grafana (`localhost:3000`,
`admin`/`admin`).

## Kubernetes (Helm)

1. Build and push an image:
   ```bash
   docker build -f docker/Dockerfile -t ghcr.io/your-org/enterprise-mcp-gateway:1.0.0 .
   docker push ghcr.io/your-org/enterprise-mcp-gateway:1.0.0
   ```
2. Create the secret referenced by `envFromSecretRefs` in `values.yaml`:
   ```bash
   kubectl create secret generic enterprise-mcp-gateway-secrets \
     --from-literal=DB_URL=jdbc:postgresql://your-rds-endpoint:5432/mcp_gateway \
     --from-literal=DB_USERNAME=mcp_gateway \
     --from-literal=DB_PASSWORD=... \
     --from-literal=REDIS_HOST=your-elasticache-endpoint \
     --from-literal=KAFKA_BOOTSTRAP_SERVERS=your-msk-bootstrap:9092 \
     --from-literal=MCP_JWK_SET_URI=https://your-idp/.well-known/jwks.json \
     --from-literal=GITHUB_TOKEN=... \
     -n mcp-gateway
   ```
3. Install:
   ```bash
   helm install gateway helm/enterprise-mcp-gateway \
     --set image.repository=ghcr.io/your-org/enterprise-mcp-gateway \
     --set image.tag=1.0.0 \
     -n mcp-gateway --create-namespace
   ```

The chart ships with a `HorizontalPodAutoscaler` (CPU-based, 3–10 replicas)
and a `PodDisruptionBudget` (min 2 available) suitable as a starting point —
tune both for your actual traffic profile before relying on them in
production.

## AWS infrastructure (Terraform)

`terraform/` provisions a VPC, RDS PostgreSQL (for audit logs), and
ElastiCache Redis (for tool-result caching). It does **not** provision an EKS
cluster or MSK/Kafka — most platform teams already have a shared cluster and
Kafka backbone, so point `var.eks_cluster_name` at your existing cluster
instead of standing up a new one per application.

```bash
cd terraform
terraform init
terraform plan -var environment=prod -var aws_region=us-east-1
terraform apply
```

Set `deploy_helm_release = true` to also have Terraform apply the Helm chart
against `var.eks_cluster_name` in the same run, or keep infra and app
deploys separate (recommended) and drive Helm from CI/CD instead.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:
1. `mvn test` against a real Postgres service container
2. Jacoco coverage report + JUnit test report published as artifacts
3. `mvn package` → jar artifact upload
4. Docker image build (not pushed by default — wire in a registry push step
   with your registry credentials once you're ready)
5. `helm lint` against the chart
6. `terraform fmt -check` / `terraform validate` against the infra config

Extend the Docker job with a `docker/login-action` + push step, and consider
adding a separate `deploy.yml` workflow gated on tags/environments once
you're ready to automate releases.
