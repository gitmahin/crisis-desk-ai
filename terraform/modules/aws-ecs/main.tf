
# ==============================================================================
# NETWORK SECURITY
# ==============================================================================

# Public-facing Security Group for the Load Balancer
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

# Private Security Group for ECS Tasks (Backend)
# Implements "Principle of Least Privilege" by only allowing traffic from the ALB
resource "aws_security_group" "ecs_task_security_group" {
  name_prefix = "${var.prefix}-task-sg-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
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



# ==============================================================================
# TRAFFIC DISTRIBUTION (ALB)
# ==============================================================================
resource "aws_lb" "app_lb" {
  name               = "${var.prefix}-alb"
  internal           = false # Publicly accessible (true if only accessed inside the VPC/VPN)
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_security_group.id]
  subnets            = var.vpc_public_subnets


  # Recommended: Set to true for Production environments to prevent accidental deletion
  enable_deletion_protection = false

  depends_on = [aws_security_group.alb_security_group]

  lifecycle {
    create_before_destroy = true
  }
}

# Route all traffic to the task
resource "aws_lb_target_group" "app_lb_tg" {
  name        = "${var.prefix}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip" # Required for AWS Fargate 'awsvpc' network mode

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

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_lb_tg.arn
  }

  depends_on = [aws_lb_target_group.app_lb_tg, aws_lb.app_lb]
}

# ==============================================================================
# IDENTITY AND ACCESS MANAGEMENT (IAM)
# ==============================================================================

# Task Execution Role: Allows ECS Agent to pull images and fetch secrets
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

# Standard AWS managed policy for ECS execution
resource "aws_iam_role_policy_attachment" "attach_policy" {
  role       = aws_iam_role.task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Inline policy to grant access to SSM Parameter Store for environment secrets
resource "aws_iam_role_policy" "execution_role_ssm_access" {
  name = "${var.ecs_service_name}-ssm-access"
  role = aws_iam_role.task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = "${var.aws_ssm_arn}/*"
    }]
  })
}

# ==============================================================================
# OBSERVABILITY & COMPUTE
# ==============================================================================

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

      # Secure Injection: Maps SSM Parameter Store values to Environment Variables
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${var.aws_ssm_arn}/database_url"
        },
        {
          name      = "MONGO_URI"
          valueFrom = "${var.aws_ssm_arn}/mongo_url"
        },
        {
          name      = "GROQ_AI_API_KEY"
          valueFrom = "${var.aws_ssm_arn}/groq_api_key"
        },
        {
          name      = "VOYAGE_AI_API_KEY"
          valueFrom = "${var.aws_ssm_arn}/voyage_ai_api_key"
        },
        {
          name      = "REDIS_USERNAME"
          valueFrom = "${var.aws_ssm_arn}/redis_username"
        },
        {
          name      = "REDIS_PASSWORD"
          valueFrom = "${var.aws_ssm_arn}/redis_password"
        },
        {
          name      = "REDIS_HOST"
          valueFrom = "${var.aws_ssm_arn}/redis_host"
        },
        {
          name      = "REDIS_PORT"
          valueFrom = "${var.aws_ssm_arn}/redis_port"
        },

      ]
      environment = [
        { name = "NODE_ENV", value = var.environment }
      ]

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

# ==============================================================================
# SERVICE ORCHESTRATION
# ==============================================================================

resource "aws_ecs_service" "ecs_service" {
  name            = var.ecs_service_name
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.task_def.arn
  desired_count   = var.desired_task_count
  launch_type     = "FARGATE"

  # Deploy tasks into private subnets for enhanced security
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

  # Strategy: Rolling update - keep at least 100% capacity while adding new tasks
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  depends_on = [
    var.ecs_cluster_capacity_providers,
    aws_lb_listener.http, # ensures the listener exists before ECS tries to attach
    aws_ecs_task_definition.task_def
  ]

  tags = var.default_service_tags



  lifecycle {
    create_before_destroy = true
  }
}
