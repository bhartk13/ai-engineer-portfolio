# Deploys the gateway's Helm chart onto an already-provisioned EKS cluster.
# Requires the kubeconfig/provider auth for eks_cluster_name to be available
# to the Terraform run (e.g. via `aws eks update-kubeconfig` in CI, or an
# `aws_eks_cluster` data source feeding the kubernetes/helm providers).

data "aws_eks_cluster" "this" {
  count = var.deploy_helm_release ? 1 : 0
  name  = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "this" {
  count = var.deploy_helm_release ? 1 : 0
  name  = var.eks_cluster_name
}

provider "kubernetes" {
  host                   = try(data.aws_eks_cluster.this[0].endpoint, null)
  cluster_ca_certificate  = try(base64decode(data.aws_eks_cluster.this[0].certificate_authority[0].data), null)
  token                   = try(data.aws_eks_cluster_auth.this[0].token, null)
}

provider "helm" {
  kubernetes {
    host                   = try(data.aws_eks_cluster.this[0].endpoint, null)
    cluster_ca_certificate = try(base64decode(data.aws_eks_cluster.this[0].certificate_authority[0].data), null)
    token                  = try(data.aws_eks_cluster_auth.this[0].token, null)
  }
}

resource "helm_release" "gateway" {
  count      = var.deploy_helm_release ? 1 : 0
  name       = var.project_name
  chart      = "../helm/enterprise-mcp-gateway"
  namespace  = var.k8s_namespace
  create_namespace = true

  values = [
    yamlencode({
      image = {
        repository = var.image_repository
        tag        = var.image_tag
      }
    })
  ]
}
