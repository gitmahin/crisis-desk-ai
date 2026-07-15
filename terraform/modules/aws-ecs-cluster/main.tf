


resource "aws_ecs_cluster" "crisis_cluster" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.default_service_tags
}


resource "aws_ecs_cluster_capacity_providers" "cluster_manager" {
  cluster_name = aws_ecs_cluster.crisis_cluster.name

  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
  }
}