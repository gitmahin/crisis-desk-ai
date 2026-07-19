provider "aws" {
  region = var.allowed_regions[0]
}

module "vpc" {
  source                   = "./modules/aws-vpc"
  vpc_id                   = var.vpc_id
  vpc_private_subnets_tags = var.vpc_private_subnets_tags
  vpc_public_subnets_tags  = var.vpc_public_subnets_tags
}

module "aws_crsisai_ssm" {
  source = "./modules/aws-ssm"
  tags   = var.default_service_tags
  database_url = var.database_url
  groq_api_key = var.groq_api_key
  jwt_access_secret_key = var.jwt_access_secret_key
  jwt_refresh_secret_key = var.jwt_refresh_secret_key
  redis_host = var.redis_host
  redis_username = var.redis_username
  redis_password = var.redis_password
  redis_port = var.redis_port
}

# Demonstration of private image repository
# module "ecr_registery" {
#   source               = "./modules/aws-ecr"
#   ecr_repo_name        = var.ecr_repo_name
#   default_service_tags = var.default_service_tags
# }

module "ecs_cluster" {
  source               = "./modules/aws-ecs-cluster"
  default_service_tags = var.default_service_tags
  ecs_cluster_name     = var.ecs_cluster_name
}

module "ecs_service" {
  source                         = "./modules/aws-ecs"
  environment                    = var.environment
  aws_region                     = var.allowed_regions[0]
  vpc_id                         = module.vpc.vpc_id_ouput
  vpc_public_subnets             = module.vpc.vpc_public_subnet_ids
  vpc_private_subnets            = module.vpc.vpc_private_subnet_ids
  ecr_registery_url              = var.public_image_repo_name # module.ecr_registery.repository_url
  ecs_cluster_id                 = module.ecs_cluster.ecs_cluster_id_output
  ecs_cluster_capacity_providers = module.ecs_cluster.capacity_providers
  image_tag                      = var.image_tag
  default_service_tags           = var.default_service_tags
}
