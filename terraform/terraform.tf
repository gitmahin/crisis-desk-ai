terraform {

  cloud {
    organization = "teambinary"
    workspaces {
      name    = "crisis-desk-ai-workspace"
      project = "Crisis Desk Ai"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  required_version = "1.15.8"
}
