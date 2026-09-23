variable "enable_blue_green" {
  description = "Create the optional CodeDeploy ECS blue/green deployment foundation."
  type        = bool
  default     = false
}

resource "aws_iam_role" "codedeploy" {
  count = var.enable_blue_green ? 1 : 0
  name  = "DevOpsPortfolioCodeDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  count      = var.enable_blue_green ? 1 : 0
  role       = aws_iam_role.codedeploy[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

resource "aws_codedeploy_app" "ecs" {
  count            = var.enable_blue_green ? 1 : 0
  name             = "devops-portfolio-platform"
  compute_platform = "ECS"
}

resource "aws_lb_target_group" "green" {
  count       = var.enable_blue_green ? 1 : 0
  name        = "devops-portfolio-green"
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
    Name        = "devops-portfolio-green"
    Project     = "DevOps Portfolio Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_lb_listener_rule" "green_validation" {
  count        = var.enable_blue_green ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type = "forward"
    forward {
      target_group {
        arn = aws_lb_target_group.green[0].arn
      }
    }
  }

  condition {
    path_pattern {
      values = ["/__green_validation/*"]
    }
  }
}

resource "aws_codedeploy_deployment_group" "ecs" {
  count = var.enable_blue_green ? 1 : 0

  app_name               = aws_codedeploy_app.ecs[0].name
  deployment_group_name  = "devops-portfolio-platform-blue-green"
  service_role_arn       = aws_iam_role.codedeploy[0].arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  deployment_style {
    deployment_type   = "BLUE_GREEN"
    deployment_option = "WITH_TRAFFIC_CONTROL"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.this.name
    service_name = aws_ecs_service.this.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [aws_lb_listener.http.arn]
      }

      target_group {
        name = aws_lb_target_group.this.name
      }

      target_group {
        name = aws_lb_target_group.green[0].name
      }
    }
  }
}
