# Deploying ClassroomGuard on AWS

This guide deploys the web platform (API, worker, web app) to AWS, with the AI engine either on
a GPU instance in AWS or on a GPU box on campus. Everything runs from the same images and the
same `docker-compose.yml`, with `docker-compose.aws.yml` layered on top.

## Architecture

```
                     ┌──────────────────────────── AWS VPC ────────────────────────────┐
  Browser / Mobile   │                                                                 │
  ── HTTPS ──────────┼─▶ Application Load Balancer (ACM certificate, port 443)         │
                     │        │ HTTP :80                                               │
                     │        ▼                                                        │
                     │   EC2 host (private subnet)                                     │
                     │   ├─ frontend   nginx: web app, proxies /api and /ws            │
                     │   ├─ backend    FastAPI (migrations run on start)               │
                     │   ├─ celery     background jobs                                 │
                     │   └─ ai         GPU engine (g4dn / g5 only, optional)           │
                     │        │                      │                                │
                     │        ▼                      ▼                                │
                     │   RDS PostgreSQL 16     ElastiCache Redis 7                     │
                     │                                                                 │
                     │   ECR (images) · CloudWatch Logs · SSM (deploys, shell access)  │
                     └─────────────────────────────────────────────────────────────────┘
        ▲
        │ RTSP over Site-to-Site VPN  (or run the AI engine on campus, see "Where to run the AI")
  Campus cameras
```

## Where to run the AI engine

The AI engine reads the classroom cameras (RTSP) and sends detections to the API.

| Option | When to choose it | Notes |
|---|---|---|
| **On campus (edge GPU box)** | Recommended. Cameras stay on the campus network; only small JSON events and evidence frames leave the building. | Run `docker compose --profile ai up -d ai` on the box with `BACKEND_URL=https://<your-domain>` and the same `AI_SERVICE_TOKEN`. |
| **In AWS (GPU instance)** | No hardware on campus, or a central site for many campuses. | Needs a Site-to-Site VPN (or equivalent) so the instance can reach the cameras; video bandwidth is ~4–8 Mbit/s per 1440p camera. |

## Instance sizing

| Role | Instance | GPU | Fits |
|---|---|---|---|
| Web platform only | `t3.large` (2 vCPU, 8 GB) | – | API, worker, frontend |
| Web + AI | `g4dn.xlarge` (4 vCPU, 16 GB) | NVIDIA T4 16 GB | ~4 cameras at 1280 px, FP16 |
| Web + AI, more cameras | `g5.xlarge` (4 vCPU, 16 GB) | NVIDIA A10G 24 GB | ~8–10 cameras |

Use the **AWS Deep Learning Base GPU AMI (Ubuntu 22.04)**: it ships the NVIDIA driver, Docker
and the NVIDIA Container Toolkit, so `--gpus all` works out of the box. Exporting TensorRT
engines on the instance (`python export_tensorrt.py`) adds roughly 2x more throughput.

## One-time setup

### 1. Networking and data stores

1. A VPC with two public subnets (load balancer) and two private subnets (EC2, RDS, Redis).
2. **RDS for PostgreSQL 16**, `db.t4g.medium`, Multi-AZ for production, automated backups on,
   encryption on. Allow port 5432 from the EC2 security group only.
3. **ElastiCache for Redis 7**, `cache.t4g.small`. Allow port 6379 from the EC2 security group only.
4. **ECR** repositories: `classroomguard-backend`, `classroomguard-frontend`, `classroomguard-ai`.

### 2. EC2 host

1. Launch the instance (see sizing) in a private subnet with an IAM instance role that has:
   `AmazonSSMManagedInstanceCore`, `AmazonEC2ContainerRegistryReadOnly`, and
   `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`.
2. Attach a gp3 EBS volume (100 GB+) for evidence frames and recordings, mounted at `/opt/classroomguard/storage`.
3. On the instance (Session Manager shell):

   ```bash
   sudo git clone https://github.com/vishwa-10147/ClassroomGuard.git /opt/classroomguard
   cd /opt/classroomguard
   sudo cp .env.example .env && sudo chmod 600 .env
   sudo nano .env        # fill in the values below
   ```

4. `.env` on the instance:

   ```bash
   AWS_REGION=ap-south-1
   IMAGE_PREFIX=<account-id>.dkr.ecr.ap-south-1.amazonaws.com/classroomguard
   DATABASE_URL=postgresql+asyncpg://<user>:<password>@<rds-endpoint>:5432/classroomguard
   REDIS_URL=redis://<elasticache-endpoint>:6379/0
   JWT_SECRET=<openssl rand -hex 32>
   AI_SERVICE_TOKEN=<openssl rand -hex 32>
   FRONTEND_URL=https://classroomguard.example.edu
   ALLOWED_ORIGINS=["https://classroomguard.example.edu"]
   APP_ENV=production
   ```

   Prefer storing `JWT_SECRET`, `AI_SERVICE_TOKEN` and the database password in **AWS Secrets
   Manager** and rendering `.env` from it at boot.

### 3. Load balancer and TLS

1. Request a certificate in **ACM** for your domain.
2. Create an **Application Load Balancer** (HTTPS :443 with the certificate, HTTP :80 redirecting
   to HTTPS) with a target group pointing at the instance on port 80.
3. Target group health check: path `/healthz`, success code `200`.
4. Set the ALB idle timeout to 3600 s so live-alert WebSockets are not cut off.
5. Point your DNS record (Route 53 or your registrar) at the ALB.

### 4. GitHub Actions deploys

1. Add GitHub as an OIDC identity provider in IAM and create a role that the repository can
   assume, with permissions to push to the three ECR repositories and to run
   `ssm:SendCommand` / `ssm:GetCommandInvocation` on the instance.
2. In the repository settings, add the **variables** `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_REGISTRY`
   (`<account-id>.dkr.ecr.<region>.amazonaws.com`) and `EC2_INSTANCE_ID`, and a `production`
   environment (optionally with required reviewers).

Every push to `main` now builds the images, pushes them to ECR tagged with the commit SHA, and
runs `docker compose pull && up -d` on the instance through SSM. Database migrations run
automatically when the new API container starts.

## First deploy and admin account

```bash
cd /opt/classroomguard
docker compose -f docker-compose.yml -f docker-compose.aws.yml up -d                # web platform
docker compose -f docker-compose.yml -f docker-compose.aws.yml --profile ai up -d   # + AI (GPU instance)
docker compose -f docker-compose.yml -f docker-compose.aws.yml exec backend python -m backend.create_admin   # prompts for email + password
```

Verify:

```bash
curl -s https://classroomguard.example.edu/healthz     # load balancer -> nginx
docker compose -f docker-compose.yml -f docker-compose.aws.yml exec backend   python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health/ready').read().decode())"
docker compose -f docker-compose.yml -f docker-compose.aws.yml exec ai   python -c "import torch; print(torch.cuda.get_device_name(0))"   # GPU visible to the AI engine
```

## Operations

| Task | How |
|---|---|
| Logs | CloudWatch Logs group `/classroomguard`, one stream per service |
| Shell access | Systems Manager → Session Manager (no SSH or bastion needed) |
| Database backups | RDS automated backups + snapshots before major upgrades |
| Evidence storage | EBS volume snapshots via AWS Backup (daily) |
| Roll back | Re-run the Deploy workflow for an earlier commit, or set `IMAGE_TAG=<sha>` and `up -d` |
| Scale cameras | Move to `g5.xlarge`, or run one AI engine per campus pointing at the same API |

## Security checklist

- [ ] RDS, Redis and EC2 are in private subnets; only the ALB is public
- [ ] `APP_ENV=production` (the API refuses to start with a default or short `JWT_SECRET`)
- [ ] Strong unique values for `JWT_SECRET` and `AI_SERVICE_TOKEN`; `.env` is `chmod 600`
- [ ] Default seed accounts are not created in production; the admin password was changed
- [ ] HTTPS only (HTTP redirects); ALB access logs enabled
- [ ] RDS and EBS encryption enabled; backups tested by restoring once
