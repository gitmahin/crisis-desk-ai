# ==============================================================================
# COMPUTE ORCHESTRATION (ECS CLUSTER)
# This serves as the logical grouping for all Fargate tasks and services.
# ==============================================================================

resource "aws_ecs_cluster" "crisis_cluster" {
  name = var.ecs_cluster_name

   # Container Insights provides detailed CloudWatch metrics (CPU/Mem/Network) 
    # at the service and task level. Essential for production monitoring.
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.default_service_tags
}


# ------------------------------------------------------------------------------
# CAPACITY STRATEGY
# Define how the cluster scales and what compute "flavor" it uses.
# ------------------------------------------------------------------------------
resource "aws_ecs_cluster_capacity_providers" "cluster_manager" {
  cluster_name = aws_ecs_cluster.crisis_cluster.name

  # Using FARGATE for fully managed serverless compute. 
  # No EC2 instances to patch or manage.
  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
  }
}