variable "allowed_regions" {
  type    = list(string)
  default = ["ap-south-1"]
}

variable "environment" {
  type    = string
  default = "production"
}

variable "default_service_tags" {
  type = map(string)
  default = {
    "ManagedBy" = "terraform"
  }
}

# ECR variables
variable "image_tag" {
  type    = string
  default = "latest"
}

variable "ecr_repo_name" {
  type    = string
  default = "crisis-desk-ai-repository"
}


# ECS Cluster variables
variable "ecs_cluster_name" {
  type    = string
  default = "crisis-desk-ai-cluster"
}

# VPC variables
variable "vpc_id" {
  type    = string
  default = "foo"
}

variable "vpc_private_subnets_tags" {
  type = list(string)
  default = [
    "teambinary-private-subnet-1a",
    "teambinary-private-subnet-1b"
  ]
}


variable "vpc_public_subnets_tags" {
  type = list(string)
  default = [
    "teambinary-public-subnet-1a",
    "teambinary-public-subnet-1b"
  ]
}


