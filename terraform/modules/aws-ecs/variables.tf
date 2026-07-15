variable "ecs_service_name" {
  type    = string
  default = "crisis-desk-ai-service"
}

variable "environment" {
  type = string
}

variable "vpc_id" {
 type = string
}

variable "vpc_public_subnets" {
  type = list(string)
}

variable "vpc_private_subnets" {
  type = list(string)
}

variable "ecs_cluster_id" {
  type = string
}

variable "ecs_cluster_capacity_providers" {}

variable "ecr_registery_url" {
  type = string
}

variable "image_tag" {
  type = string
}

variable "container_health_check_path" {
  type = string
  default = "/health"
}

variable "container_name" {
  type    = string
  default = "crisis-desk-ai-mcp"
}

variable "container_port" {
  type    = number
  default = 5000
}

variable "task_cpu" {
  type    = number
  default = 1024
}

variable "task_memory" {
  type    = number
  default = 2048
}

variable "desired_task_count" {
  type = number
  default = 1
}


variable "default_service_tags" {
  type = map(string)
}

variable "aws_region" {
  type = string
}