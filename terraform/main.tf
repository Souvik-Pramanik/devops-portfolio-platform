module "ecr" {
  source = "./modules/ecr"

  repository_name = "devops-portfolio-platform"
}

module "vpc" {
  source = "./modules/vpc"

  vpc_cidr = "10.0.0.0/16"
}

module "ecs" {
  source = "./modules/ecs"

  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  ecr_repository_url    = module.ecr.repository_url
  alb_security_group_id = module.vpc.alb_security_group_id
}