# FaceTrack PHP REST API - Docker Image for Render / Production
FROM php:8.2-apache

# Install PostgreSQL PDO driver dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && apt-get clean \
    && rm -rf /var/lib/apt-lists/*

# Enable Apache mod_rewrite for REST API routing
RUN a2enmod rewrite

# Configure Apache document root and allow htaccess overrides
RUN sed -i 's|/var/www/html|/var/www/html|g' /etc/apache2/sites-available/000-default.conf \
    && echo '<Directory /var/www/html>\n\tOptions Indexes FollowSymLinks\n\tAllowOverride All\n\tRequire all granted\n</Directory>' >> /etc/apache2/apache2.conf

# Copy backend code into Apache root
COPY backend/ /var/www/html/

# Set working directory
WORKDIR /var/www/html

# Expose HTTP port
EXPOSE 80

# Start Apache server
CMD ["apache2-foreground"]
