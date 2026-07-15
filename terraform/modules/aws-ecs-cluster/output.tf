output "ecs_cluster_id_output" {
  type = string
  value = aws_ecs_cluster.crisis_cluster.id
}

output "capacity_providers" {
  value = aws_ecs_cluster_capacity_providers.cluster_manager
}