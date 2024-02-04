# Use the official Python image from DockerHub
FROM python:3.9

# Set the working directory in the Docker image
WORKDIR /app

# Copy the local files into the working directory
COPY . /app

# Install the dependencies
RUN pip install --no-cache-dir fastapi uvicorn

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app using uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3000"]
