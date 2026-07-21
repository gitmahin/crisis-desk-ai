# ==============================================================================
# Main Infrastructure Orchestration
# Project: Crisis Desk AI 
# ==============================================================================

provider "aws" {
  region = var.allowed_regions[0]
}

# Network Layer: Fetch existing VPC and Subnet metadata
module "vpc" {
  source                   = "./modules/aws-vpc"
  vpc_id                   = var.vpc_id
  vpc_private_subnets_tags = var.vpc_private_subnets_tags
  vpc_public_subnets_tags  = var.vpc_public_subnets_tags
}

# Security Layer: Store application secrets in Parameter Store
module "aws_crsisai_ssm" {
  source                 = "./modules/aws-ssm"
  tags                   = var.default_service_tags
  database_url           = var.database_url
  groq_api_key           = var.groq_api_key
  jwt_access_secret_key  = var.jwt_access_secret_key
  jwt_refresh_secret_key = var.jwt_refresh_secret_key
  redis_host             = var.redis_host
  redis_username         = var.redis_username
  redis_password         = var.redis_password
  redis_port             = var.redis_port
  voyage_ai_api_key      = var.voyage_ai_api_key
  mongo_url              = var.mongo_url
}

# Demonstration of private image repository
# module "ecr_registery" {
#   source               = "./modules/aws-ecr"
#   ecr_repo_name        = var.ecr_repo_name
#   default_service_tags = var.default_service_tags
# }

# Compute Layer: Logical cluster and capacity providers
module "ecs_cluster" {
  source               = "./modules/aws-ecs-cluster"
  default_service_tags = var.default_service_tags
  ecs_cluster_name     = var.ecs_cluster_name
}

# Application Layer: ECS Fargate Service and Load Balancer
module "ecs_service" {
  source      = "./modules/aws-ecs"
  environment = var.environment
  aws_region  = var.allowed_regions[0]

  # Network dependencies from VPC module
  vpc_id              = module.vpc.vpc_id_ouput
  vpc_public_subnets  = module.vpc.vpc_public_subnet_ids
  vpc_private_subnets = module.vpc.vpc_private_subnet_ids

  # Registry configuration (Using Public Repo as requested)
  ecr_registery_url = var.public_image_repo_name
  image_tag         = var.image_tag

  # Compute dependencies from Cluster module
  ecs_cluster_id                 = module.ecs_cluster.ecs_cluster_id_output
  ecs_cluster_capacity_providers = module.ecs_cluster.capacity_providers

  default_service_tags = var.default_service_tags
}
