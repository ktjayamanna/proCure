# proCure

proCure is a SaaS usage tracker that helps organizations monitor and manage their SaaS usage across different websites. The system consists of a Chrome extension that tracks website visits and a web application that provides analytics and management capabilities.

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Chrome Extension**: Plasmo framework, TypeScript
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Docker
- **Database**: PostgreSQL (local development) / AWS RDS (production)

## Project Structure

The project is organized into three main components:

- **backend/**: FastAPI backend service
- **chrome-extension/**: Plasmo-based Chrome extension
- **web/**: Next.js web application
- **deployment/**: Docker and deployment configurations

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- [Python](https://www.python.org/) 3.11 or later

### Environment Setup

1. Create a `.vscode/.env` file in the `backend` directory with the following variables:

```
# Database Configuration
USE_RDS=false
DATABASE_URL=postgresql://procure_user:procure_password@localhost:5432/procure_db
AWS_DATABASE_URL=your_aws_database_url_if_using_rds
AWS_REGION=us-east-2

# Authentication
JWT_SECRET=your_jwt_secret_key

# Optional: Other services
OPENAI_API_KEY=your_openai_api_key_if_using_ai_features
```

2. For the Chrome extension, create `.env.development` and `.env.production` files in the `chrome-extension` directory:

```
# Development environment (.env.development)
PLASMO_PUBLIC_USE_AWS_API=false
PLASMO_PUBLIC_LOCAL_API_URL=http://localhost:8000/api/v1
PLASMO_PUBLIC_AWS_API_URL=https://your-api-url.amazonaws.com/api/v1
```

3. For the web application, create `.env.local` in the `web` directory:

```
NEXT_PUBLIC_USE_AWS_API=false
NEXT_PUBLIC_LOCAL_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_AWS_API_URL=https://your-api-url.amazonaws.com/api/v1
```

### Backend Setup

1. Start the development environment with Docker:

```bash
# From the project root
./backend/scripts/bash/docker/start_dev_environment.sh
```

This will:
- Start a PostgreSQL database in Docker
- Start the FastAPI backend service
- Run database migrations

Alternatively, you can run:

```bash
# From the project root
./backend/scripts/bash/database/run_migrations.sh
```

This script will automatically start the development environment if needed and run the database migrations.

### Chrome Extension Setup

1. Navigate to the chrome-extension directory:

```bash
cd chrome-extension
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Start the development server:

```bash
npm run dev
# or
pnpm dev
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build/chrome-mv3-dev` directory

### Web Application Setup

1. Navigate to the web directory:

```bash
cd web
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Start the development server:

```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the web application.

## Development Workflow

### Backend Development

- The backend service is automatically reloaded when you make changes to the code
- Database migrations are managed with Alembic:

```bash
# Create a new migration (from the backend directory)
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Chrome Extension Development

- The extension is automatically rebuilt when you make changes to the code
- You need to reload the extension in Chrome to see the changes

### Web Application Development

- The Next.js development server automatically reloads when you make changes to the code

## Production Deployment

### Backend Deployment

To use the production environment with AWS RDS:

```bash
# From the project root
./backend/scripts/bash/docker/start_prod_environment.sh
```

Make sure your `.vscode/.env` file has the correct AWS RDS configuration.

### Chrome Extension Production Build

```bash
# From the chrome-extension directory
npm run build
# or
pnpm build
```

This will create a production bundle in the `build/chrome-mv3-prod` directory, ready to be packaged and published to the Chrome Web Store.

### Web Application Production Build

```bash
# From the web directory
npm run build
# or
pnpm build
```

## Troubleshooting

### Common Issues

#### Backend Issues

- **Database connection errors**: Ensure Docker is running and the PostgreSQL container is healthy
  ```bash
  docker ps  # Check if procure_postgres container is running
  ```

- **Migration errors**: Make sure your database schema is up to date
  ```bash
  cd backend
  alembic upgrade head
  ```

#### Chrome Extension Issues

- **Extension not loading**: Check Chrome's extension page for any errors
  - Make sure you've loaded the correct build directory
  - Try reloading the extension

- **API connection issues**: Verify your environment variables are set correctly
  - Check that the backend is running and accessible
  - Ensure the API URLs in your `.env` files are correct

#### Web Application Issues

- **Build errors**: Check for TypeScript or dependency issues
  ```bash
  cd web
  npm run lint
  ```

- **API connection issues**: Similar to the extension, verify your environment variables and backend connectivity

### Getting Help

If you encounter issues not covered here, please:
1. Check the logs for error messages
2. Review the documentation for the specific component
3. Search for similar issues in the project's issue tracker

## Additional Resources

- [Backend API Documentation](http://localhost:8000/docs) (when the backend is running)
- [Plasmo Framework Documentation](https://docs.plasmo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## License

This project is licensed under the Apache License 2.0.

## Contributing to proCure

### Why Contribute?

proCure tackles a real business problem that affects organizations of all sizes - wasted SaaS spending. By contributing to this project, you'll:

- **Make a tangible impact**: Help organizations save thousands on unused software subscriptions
- **Build with modern tech**: Gain experience with our full-stack TypeScript, React, FastAPI, and PostgreSQL architecture
- **Join a growing community**: Connect with developers passionate about solving practical business problems

### How to Contribute

We welcome contributions of all sizes, from fixing typos to implementing new features:

1. **Find an issue**: Please make an issue if you want to work on something.
2. **Fork and clone**: Fork the repository and clone it locally
3. **Set up your environment**: Follow the setup instructions above
4. **Make your changes**: Implement your feature or fix
5. **Submit a PR**: Push your changes and open a pull request

### Development Roadmap

We're currently focused on:

- Improving the Chrome extension's performance and privacy features
- Enhancing the analytics dashboard with more visualization options
- Adding integration with popular procurement systems
- Expanding test coverage across all components

