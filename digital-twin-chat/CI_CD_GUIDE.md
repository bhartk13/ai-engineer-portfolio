# CI/CD Pipeline Guide

Complete guide for the Digital Twin Chat CI/CD pipeline using GitHub Actions.

## Overview

The CI/CD pipeline automates testing, building, and deploying the Digital Twin Chat application to AWS. It supports:
- Automated testing (unit, property-based, integration)
- Parallel build processes
- Staging and production environments
- Manual approval for production
- Automatic rollback on failure

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Push to Repository                       │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │  Backend │          │ Frontend │
    │  Tests   │          │  Tests   │
    └────┬─────┘          └─────┬────┘
         │                      │
         └───────────┬──────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │  Build   │          │  Build   │
    │  Backend │          │ Frontend │
    └────┬─────┘          └─────┬────┘
         │                      │
         └───────────┬──────────┘
                     │
              ┌──────▼──────┐
              │   Deploy    │
              │   Staging   │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ Integration │
              │    Tests    │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Manual    │
              │  Approval   │ (main branch only)
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Deploy    │
              │ Production  │
              └──────┬──────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │  Smoke   │          │ Rollback │
    │  Tests   │          │(on fail) │
    └──────────┘          └──────────┘
```

## Quick Start

### 1. Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd digital-twin-chat

# Set up GitHub environments and secrets
# Follow: .github/ENVIRONMENT_SETUP.md
```

### 2. Deploy Infrastructure (One-time)

```bash
cd infrastructure

# Deploy staging
./deploy-infrastructure.sh staging

# Deploy production
./deploy-infrastructure.sh production
```

### 3. Push Code to Trigger Pipeline

```bash
# For staging deployment
git checkout develop
git add .
git commit -m "Your changes"
git push origin develop

# For production deployment
git checkout main
git merge develop
git push origin main
```

