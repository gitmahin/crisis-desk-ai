

# Create repository in AWS ECR
# Then pass the repository url in the output
resource "aws_ecr_repository" "app" {
  name                 = var.ecr_repo_name
  image_tag_mutability = "IMMUTABLE_WITH_EXCLUSION"

  image_tag_mutability_exclusion_filter {
    filter      = "latest*"
    filter_type = "WILDCARD"
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.default_service_tags

  lifecycle {
    prevent_destroy = true # avoid accidentally deleting the repo (and its images) via terraform destroy
  }
}
