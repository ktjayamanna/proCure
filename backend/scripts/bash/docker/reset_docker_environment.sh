#!/bin/bash

# Stop all running containers
echo "Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null

# Remove all containers
echo "Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null

# Remove all images
echo "Removing all images..."
docker rmi $(docker images -q) -f 2>/dev/null

# Remove all volumes
echo "Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null

# Remove all networks
echo "Removing all networks..."
docker network rm $(docker network ls -q) 2>/dev/null

# Prune everything
echo "Pruning system..."
docker system prune -a --volumes -f

# Remove Docker storage directories
echo "Removing Docker storage directories..."
sudo rm -rf /var/lib/docker /var/lib/containerd

# Restart Docker service
echo "Restarting Docker service..."
sudo systemctl restart docker

echo "Docker cleanup complete!"
