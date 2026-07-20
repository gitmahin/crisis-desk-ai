
# Create Load balancer security group
resource "aws_security_group" "alb_security_group" {
  name_prefix = "${var.prefix}-alb-sg-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

}

# Create Service task security groups
# And attach alb security group as source
resource "aws_security_group" "ecs_task_security_group" {
  name_prefix = "${var.prefix}-task-sg-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    security_groups = [aws_security_group.alb_security_group.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}



# Create application load balancer
resource "aws_lb" "app_lb" {
  name        = "${var.prefix}-alb"
  internal           = false # true if only accessed inside the VPC/VPN
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_security_group.id]
  subnets            = var.vpc_public_subnets
  

  enable_deletion_protection = false # set true in production once stable

  depends_on = [ aws_security_group.alb_security_group ]

  lifecycle {
    create_before_destroy = true
  }
}

# Route all traffic to the task
resource "aws_lb_target_group" "app_lb_tg" {
  name = "${var.prefix}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip" # required for Fargate awsvpc mode

  health_check {
    path                = var.container_health_check_path
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  lifecycle {
    create_before_destroy = true
  }
}


# http listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_lb_tg.arn
  }

  depends_on = [ aws_lb_target_group.app_lb_tg, aws_lb.app_lb ]
}

# Role creation
resource "aws_iam_role" "task_execution_role" {
  name_prefix = "${var.ecs_service_name}-texec-role-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Attach policy to the role
resource "aws_iam_role_policy_attachment" "attach_policy" {
  role       = aws_iam_role.task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}



resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.ecs_service_name}"
  retention_in_days = 14
}


resource "aws_ecs_task_definition" "task_def" {
  family                   = var.ecs_service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution_role.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64" # or "ARM64" for Graviton — cheaper if your image supports it
  }

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = "${var.ecr_registery_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment }
      ]

      # healthCheck = {
      #   command = [
      #     "CMD-SHELL",
      #     "curl -f http://localhost:${var.container_port}${var.container_health_check_path} || exit 1"
      #   ]
      #   interval    = 30 # seconds between checks
      #   timeout     = 5  # seconds before a check counts as failed
      #   retries     = 3  # consecutive failures before marking unhealthy
      #   startPeriod = 60 # grace period on container startup before checks count
      # }


      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = var.default_service_tags

  lifecycle {
    create_before_destroy = true
  }
}


resource "aws_ecs_service" "ecs_service" {
  name            = var.ecs_service_name
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.task_def.arn
  desired_count   = var.desired_task_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.vpc_private_subnets
    security_groups  = [aws_security_group.ecs_task_security_group.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app_lb_tg.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  depends_on = [
    var.ecs_cluster_capacity_providers,
    aws_lb_listener.http, # ensures the listener exists before ECS tries to attach
    aws_ecs_task_definition.task_def
  ]

  tags = var.default_service_tags



  lifecycle {
    ignore_changes = [task_definition]
    create_before_destroy = true
  }
}