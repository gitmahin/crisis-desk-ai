# ==============================================================
# ECR Outputs
# ==============================================================
output "repository_url" {
  type = string
  value = aws_ecr_repository.app.repository_url
}