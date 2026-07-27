variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Short project identifier used in resource naming"
  type        = string
  default     = "enterprise-mcp-gateway"
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster hosting the gateway"
  type        = string
  default     = "enterprise-mcp-gateway"
}

variable "vpc_cidr" {
  description = "CIDR block for the gateway VPC"
  type        = string
  default     = "10.42.0.0/16"
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "db_allocated_storage_gb" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    ManagedBy = "terraform"
    Project   = "enterprise-mcp-gateway"
  }
}

variable "deploy_helm_release" {
  description = "Whether Terraform should also apply the Helm chart to an existing EKS cluster"
  type        = bool
  default     = false
}

variable "k8s_namespace" {
  description = "Kubernetes namespace to deploy the gateway into"
  type        = string
  default     = "mcp-gateway"
}

variable "image_repository" {
  description = "Container image repository for the gateway"
  type        = string
  default     = "ghcr.io/your-org/enterprise-mcp-gateway"
}

variable "image_tag" {
  description = "Container image tag to deploy"
  type        = string
  default     = "1.0.0"
}
