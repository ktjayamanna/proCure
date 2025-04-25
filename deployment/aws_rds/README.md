# AWS RDS PostgreSQL Setup Guide

This guide will help you set up an AWS RDS PostgreSQL instance for your proCure application's production environment.

## 1. Setting Up AWS RDS PostgreSQL

### Prerequisites
- AWS account with appropriate permissions
- AWS CLI configured (optional, but helpful)
- Basic knowledge of AWS services

### Create an RDS PostgreSQL Instance

1. **Sign in to the AWS Management Console**
   - Go to the RDS service

2. **Create a Database**
   - Click "Create database"
   - Choose "Standard create"
   - Select "PostgreSQL" as the engine type
   - Choose PostgreSQL version 15 (to match your development environment)

3. **Configure Instance Settings**
   - **DB instance identifier**: Choose a name (e.g., `procure-db-prod`)
   - **Credentials**:
     - Set a master username (e.g., `procure_admin`)
     - Set a secure master password

4. **Instance Configuration**
   - Choose an appropriate instance size based on your needs
   - For small to medium applications, `db.t3.small` or `db.t3.medium` is often sufficient

5. **Storage**
   - Allocate sufficient storage (start with 20GB and enable autoscaling)
   - Choose General Purpose SSD (gp2) for most use cases

6. **Connectivity**
   - **VPC**: Choose your VPC
   - **Subnet group**: Choose or create a subnet group
   - **Public access**: Set to "Yes" for initial setup (you can change this later)
   - **VPC security group**: Create a new security group or use an existing one
   - **Availability Zone**: Choose your preferred AZ

7. **Additional Configuration**
   - **Initial database name**: `procure_db` (to match your development environment)
   - **DB parameter group**: Default is fine, or create a custom one if needed
   - **Backup**: Enable automated backups
   - **Monitoring**: Enable enhanced monitoring if needed

8. **Create Database**
   - Review your settings and click "Create database"

### Configure Security Group

1. **Navigate to the Security Group**
   - Go to EC2 > Security Groups
   - Find the security group associated with your RDS instance

2. **Add Inbound Rules**
   - Add a rule for PostgreSQL:
     - Type: PostgreSQL (port 5432)
     - Source: Your application server's IP or security group
     - For development, you might temporarily allow your IP address

3. **Save Rules**
   - Click "Save rules"

## 2. Setting Up Environment Variables

Create two environment files for development and production:

### Development Environment (.env.development)

```
DB_ENVIRONMENT=development
DB_HOST_DEV=localhost
DB_PORT_DEV=5432
DB_USER_DEV=procure_user
DB_PASSWORD_DEV=procure_password
DB_NAME_DEV=procure_db
```

### Production Environment (.env.production)

```
DB_ENVIRONMENT=production
DB_HOST_PROD=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT_PROD=5432
DB_USER_PROD=procure_admin
DB_PASSWORD_PROD=your-secure-password
DB_NAME_PROD=procure_db
DB_SSL_PROD=require
```

Replace the placeholder values with your actual RDS instance details.

## 3. Testing the Connection

After setting up your RDS instance and configuring environment variables, you can test the connection using the provided script:

```bash
# Make sure you're in the project root directory
python deployment/aws_rds/test_connection.py
```

This script will attempt to connect to both your development and production databases to verify your configuration.

## 4. Running Migrations on AWS RDS

To apply your database migrations to the AWS RDS instance:

1. **Set the environment to production**
   ```bash
   export DB_ENVIRONMENT=production
   ```

2. **Run Alembic migrations**
   ```bash
   cd backend
   alembic upgrade head
   ```

## 5. Best Practices for Production

1. **Security**
   - Use strong, unique passwords
   - Restrict security group access to only necessary IPs/security groups
   - Consider using AWS Secrets Manager for credential management
   - Enable SSL connections (included in the configuration)

2. **Backups**
   - Enable automated backups in RDS
   - Consider taking manual snapshots before major changes

3. **Monitoring**
   - Set up CloudWatch alarms for database metrics
   - Monitor disk usage, CPU utilization, and connection count

4. **Scaling**
   - Start with an appropriate instance size
   - Enable storage autoscaling
   - Monitor performance and scale up if needed

5. **Migration Management**
   - Always test migrations on a staging environment before production
   - Use Git for version control of migration files
   - Create feature branches for testing new migrations
   - Merge finalized migrations to the main branch

## 6. Troubleshooting

### Connection Issues
- Verify security group settings
- Check that the database endpoint is correct
- Ensure credentials are correct
- Verify that the database exists

### Migration Issues
- Make sure all dependencies are installed
- Verify that the DATABASE_URL is correctly set
- Check Alembic version table for current state

## 7. Additional Resources

- [AWS RDS PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/index.html)
- [Alembic Documentation](https://alembic.sqlalchemy.org/en/latest/)
