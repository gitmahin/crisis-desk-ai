# ==============================================================================
# TERRAFORM SETTINGS & REMOTE BACKEND
# 
# This block configures the Terraform engine, required providers, and the
# Remote State backend via Terraform Cloud.
# ==============================================================================

terraform {

  # Remote Backend Configuration
  # Manages state locking and history in a centralized, secure environment.
  cloud {
    organization = "teambinary"
    workspaces {
      name    = "crisis-desk-ai-workspace"
      project = "Crisis Desk Ai"
    }
  }

  # Version Constraints (The "Contract")
  # Ensures the execution environment is consistent across the team.
  required_version = "1.15.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # Lock to major version 6 for stability
    }
  }
}
