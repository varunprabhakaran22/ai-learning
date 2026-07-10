# ☁️ Cloud Deployment (6 Days)

### Source: `Cloud_Deployment_Curriculum.pdf` — 6 Chapters · 12 Projects · 18 Tools · 12 Hours

> **Format note:** the source PDF states "12 hours" rather than a day count, unlike the other PDFs. This document scaffolds it as 1 day per chapter (6 days total, matching its 6 chapters and even 2-projects-per-chapter split) — a judgment call, same as the day-budget conversions already used for the other syllabi in `ML/`. No topics added, none dropped. **Depth is not determined by the PDF** — the PDF only supplies the topic list; actual depth per topic is decided when each day's content is written, per `ML/CLAUDE.md`'s shared bar.

**Workflow note:** the day-by-day breakdown below is the topic roadmap only (scope, sequencing, projects) — a skeleton for planning, not the actual lesson. `Theory.md` gets written first per day, then read and questioned, then revised based on what the doubt reveals, before moving to `Recap.md` and the next day — per `ML/CLAUDE.md`.

**Relationship to other syllabi:** the PDF itself states "strong Core NLP & Agentic AI knowledge is a must before this final deployment phase" — this is meant to come after the AI/ML-specific syllabi in `ML/` and after `Applied AI Syllbus/`, since it's about shipping the systems those build, not about AI/ML itself. Also closes a gap flagged earlier: none of the other syllabi build hands-on Docker/CI-CD/cloud-provider deployment mechanics.

---

## Cloud Foundations & Deployment Mindset

Tools: AWS, Azure, GCP, Cloud CLI, IAM

**Day 1 — What Cloud Deployment Is, IaaS/PaaS/SaaS, Regions & Availability Zones**
Topics: What Cloud Deployment Is, IaaS · PaaS · SaaS, Regions & Availability Zones, Compute · Storage · Network, Shared Responsibility Model, Identity & Access (IAM), Cloud Pricing Basics, Free Tier Setup.
Projects: Spin Up Your First Cloud VM, Host a Live Static Website.

---

## Deploying on AWS

Tools: EC2, S3, RDS, Elastic Beanstalk, CloudWatch

**Day 2 — EC2, Security Groups & Keys, S3, RDS, Elastic Beanstalk, Load Balancing, Auto Scaling, CloudWatch**
Topics: EC2 Instances, Security Groups & Keys, S3 Object Storage, RDS Managed Databases, Elastic Beanstalk, Load Balancing, Auto Scaling, CloudWatch Monitoring.
Projects: Deploy a Web App on EC2, Beanstalk App with RDS Database.

---

## Deploying on Azure & GCP

Tools: Azure App Service, Azure VMs, GCP Compute, Cloud Run

**Day 3 — Azure App Service/VMs, Resource Groups, GCP Compute Engine, Cloud Run, Storage Buckets, Multi-Cloud Tradeoffs**
Topics: Azure App Service, Azure VMs & Storage, Resource Groups, GCP Compute Engine, Google Cloud Run, Cloud Storage Buckets, Managed vs Self-Hosted, Multi-Cloud Tradeoffs.
Projects: Deploy an App on Azure App Service, Serverless Deploy on Cloud Run.

---

## Containers with Docker

Tools: Docker, Dockerfile, Docker Hub, Docker Compose

**Day 4 — Images vs Containers, Dockerfile, Docker Hub, Volumes & Networking, Docker Compose**
Topics: Why Containers, Images vs Containers, Writing a Dockerfile, Building & Tagging Images, Docker Hub Registry, Volumes & Networking, Docker Compose, Multi-Container Apps.
Projects: Containerize a Web Application, Multi-Service App with Compose.

---

## CI/CD with Jenkins

Tools: Jenkins, Git, GitHub, Maven, Pipelines

**Day 5 — Jenkins Setup, Jobs & Builds, Git Integration, Declarative Pipelines, Credentials, Plugins & Webhooks**
Topics: What CI/CD Solves, Jenkins Setup, Jobs & Builds, Git Integration, Declarative Pipelines, Build & Test Stages, Credentials & Secrets, Plugins & Webhooks.
Projects: Build Your First Jenkins Pipeline, Automated Test-and-Build Flow.

---

## End-to-End Deployment Pipeline

Tools: Jenkins, Docker, AWS, Azure, Monitoring

**Day 6 — Full Pipeline Design, Containerized Builds, Registry Push, Cloud Deploy, Rollbacks, Monitoring, Secrets**
Topics: Full Pipeline Design, Containerized Builds, Pushing to a Registry, Deploy to Cloud, Rollbacks & Versioning, Monitoring & Logging, Secrets Management, Deployment Best Practices.
Projects: CI/CD Pipeline that Deploys to AWS, Dockerized App Auto-Deploy.

---

## Status

Only this roadmap is written so far. Per-day `Theory.md` / `Recap.md` / `example.py` files get authored one at a time, interactively, following the shared workflow in `ML/CLAUDE.md`.
