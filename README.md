# 🚀 DevOps Portfolio Platform

> **A production-oriented, containerized portfolio platform engineered as a real-world DevOps / DevSecOps project.**

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=githubactions)](https://github.com/Souvik-Pramanik/devops-portfolio-platform/actions)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-ECS%20%7C%20ECR%20%7C%20ALB-FF9900?logo=amazonaws)](https://aws.amazon.com/)
[![Security](https://img.shields.io/badge/Security-DevSecOps-red)](#-security--devsecops)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs)](https://nodejs.org/)
[![Terraform](https://img.shields.io/badge/Infrastructure-Terraform-7B42BC?logo=terraform)](https://www.terraform.io/)
[![Render](https://img.shields.io/badge/Demo-Render-46E3B7?logo=render)](https://render.com/)

---

## 📌 Overview

**DevOps Portfolio Platform** is a production-oriented personal portfolio application designed and engineered to demonstrate practical **DevOps, DevSecOps, Cloud, Infrastructure-as-Code, Containerization, CI/CD, Security, Observability, and AI integration**.

Unlike a conventional portfolio website that primarily presents technical skills and projects, this platform is itself an **engineering project**.

The application is:

- Containerized with Docker
- Tested automatically
- Security-scanned during CI
- Built into immutable container images
- Published to Amazon ECR
- Deployed to AWS ECS Fargate
- Exposed through an Application Load Balancer
- Integrated with AWS Secrets Manager
- Logged through Amazon CloudWatch
- Protected by automated source and dependency security checks
- Publicly deployable through Render
- Equipped with an interactive Linux-style terminal
- Integrated with an AI DevOps assistant
- Designed for Infrastructure-as-Code using Terraform

The goal is to demonstrate not only **what technologies are known**, but how those technologies are combined into a repeatable engineering workflow.

---

# 🎯 Project Objectives

The platform was designed around the following engineering objectives:

1. Build a modern interactive developer portfolio.
2. Containerize the entire application.
3. Implement automated testing.
4. Establish a complete CI/CD pipeline.
5. Integrate DevSecOps security gates.
6. Use immutable Docker image versioning.
7. Deploy container workloads to AWS ECS Fargate.
8. Implement application and container health checks.
9. Secure application secrets through AWS Secrets Manager.
10. Centralize application logs with CloudWatch.
11. Manage cloud infrastructure using Terraform.
12. Provide a free public deployment option.
13. Integrate an AI-powered DevOps assistant.
14. Demonstrate real-world operational practices through the portfolio itself.

---

# 🏗️ Architecture

## High-Level Architecture

```text
                                ┌──────────────────────┐
                                │      Developer       │
                                │      Git Push        │
                                └──────────┬───────────┘
                                           │
                                           ▼
                                ┌──────────────────────┐
                                │       GitHub         │
                                │     Repository       │
                                └──────────┬───────────┘
                                           │
                                           ▼
                          ┌────────────────────────────────┐
                          │       GitHub Actions CI/CD     │
                          │                                │
                          │  • Automated Tests             │
                          │  • Gitleaks                    │
                          │  • Semgrep                     │
                          │  • npm audit                   │
                          │  • Docker Build                │
                          │  • Trivy                       │
                          └───────────────┬────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │      Amazon ECR       │
                               │ Immutable Image Tags  │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │    Amazon ECS         │
                               │      Fargate          │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ Application Load      │
                               │       Balancer        │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │   Portfolio App       │
                               │                       │
                               │   Node.js / Express   │
                               │   AI Assistant        │
                               │   Interactive Shell   │
                               └──────────┬───────────┘
                                          │
                         ┌────────────────┼─────────────────┐
                         │                │                 │
                         ▼                ▼                 ▼
                  ┌────────────┐  ┌──────────────┐  ┌─────────────┐
                  │ CloudWatch │  │   Secrets    │  │   Gemini    │
                  │    Logs    │  │   Manager    │  │     AI      │
                  └────────────┘  └──────────────┘  └─────────────┘


                    ┌──────────────────────────────┐
                    │       Free Public Demo       │
                    │            Render            │
                    │        Docker Deployment     │
                    └──────────────────────────────┘
"## Development Workflow" 
