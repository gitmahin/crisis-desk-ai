
# ==============================================================================
# Container Registry (ECR) Configuration
# 
# NOTE: This resource creates a PRIVATE repository for internal application images.
# For public access requirements, the MCP (Model Context Protocol) container 
# is configured in PUBLIC mode and hosted/accessed externally.
# ==============================================================================

resource "aws_ecr_repository" "app" {
  name = var.ecr_repo_name
  # Protect against tag-overwriting to ensure deployment traceability
  # Exclusions allow 'latest' tags to remain flexible while versioned tags stay locked
  image_tag_mutability = "IMMUTABLE_WITH_EXCLUSION"

  image_tag_mutability_exclusion_filter {
    filter      = "latest*"
    filter_type = "WILDCARD"
  }

  image_scanning_configuration {
    # Automatically scan images for CVEs upon upload
    scan_on_push = true
  }

  tags = var.default_service_tags

  lifecycle {
     # Critical: Prevents accidental deletion of the image registry and historical data (via terraform destroy)
    prevent_destroy = true
  }
}
