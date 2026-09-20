data "aws_secretsmanager_secret" "gemini" {
  name = "devops-portfolio/gemini"
}

resource "aws_ecs_cluster" "this" {
  name = "devops-portfolio-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_security_group" "ecs" {
  name        = "devops-portfolio-ecs-sg"
  description = "Security group for DevOps Portfolio ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Application traffic from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "devops-portfolio-ecs-sg"
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_lb" "this" {
  name               = "devops-portfolio-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name        = "devops-portfolio-alb"
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_lb_target_group" "this" {
  name        = "devops-portfolio-tg"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    port                = "3000"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "devops-portfolio-tg"
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# ------------------------------------------------------------
# ECS EXECUTION ROLE
# ------------------------------------------------------------

resource "aws_iam_role" "ecs_execution" {
  name = "DevOpsPortfolioECSTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_secrets" {
  name = "DevOpsPortfolioECSSecretsPolicy"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "secretsmanager:GetSecretValue"
        ]

        Resource = data.aws_secretsmanager_secret.gemini.arn
      }
    ]
  })
}

# ------------------------------------------------------------
# ECS TASK DEFINITION
# ------------------------------------------------------------

resource "aws_ecs_task_definition" "this" {
  family                   = "devops-portfolio-platform"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "portfolio"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]

      secrets = [
        {
          name      = "GEMINI_API_KEY"
          valueFrom = "${data.aws_secretsmanager_secret.gemini.arn}:GEMINI_API_KEY::"
        }
      ]

      healthCheck = {
        command = [
          "CMD-SHELL",
          "node -e \"require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\""
        ]

        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          "awslogs-group"         = "/ecs/devops-portfolio-platform"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# ------------------------------------------------------------
# CLOUDWATCH LOG GROUP
# ------------------------------------------------------------

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/devops-portfolio-platform"
  retention_in_days = 14

  tags = {
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# ------------------------------------------------------------
# ECS SERVICE
# ------------------------------------------------------------

resource "aws_ecs_service" "this" {
  name             = "devops-portfolio-service"
  cluster          = aws_ecs_cluster.this.id
  task_definition  = aws_ecs_task_definition.this.arn
  desired_count    = 1
  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "portfolio"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_execution,
    aws_iam_role_policy.ecs_secrets
  ]

  tags = {
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

data "aws_iam_role" "github_actions" {
  name = "GitHubActions-DevOpsPortfolio"
}

resource "aws_iam_role_policy" "github_ecs_deploy" {
  name = "GitHubActionsECSDeployPolicy"
  role = data.aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "ECSDeployment"
        Effect = "Allow"

        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeTasks",
          "ecs:ListTasks"
        ]

        Resource = "*"
      },
      {
        Sid    = "PassECSTaskExecutionRole"
        Effect = "Allow"

        Action = [
          "iam:PassRole"
        ]

        Resource = "arn:aws:iam::833822619479:role/DevOpsPortfolioECSTaskExecutionRole"
      }
    ]
  })
}