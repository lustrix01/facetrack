# PHP Hosting Deployment Guide (Backend API)

This guide covers deploying the **FaceTrack PHP REST API** to standard PHP web hosting, Apache servers, Nginx, cPanel, or VPS environments.

---

## 1. PHP Requirements

- **PHP Version**: 8.1 or higher.
- **PHP Extensions**:
  - `pdo_pgsql` (PostgreSQL PDO driver)
  - `openssl` (JWT token signing & verification)
  - `json`
  - `mbstring`

---

## 2. Server Environment Variables (.env)

Create a `.env` file in your `backend/` directory on the server:

```env
DB_HOST=ep-empty-violet-avfujn71.c-11.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=your_neon_db_password
DB_SSLMODE=require

JWT_SECRET=your_secure_production_jwt_secret
ALLOWED_ORIGIN=https://facetrack.vercel.app
```

---

## 3. Apache Configuration (`.htaccess`)

Ensure Apache `mod_rewrite` and `mod_headers` are enabled. The `backend/.htaccess` file contains:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L]
</IfModule>
```

---

## 4. Nginx Configuration

If deploying to Nginx, add the following location block to your server configuration:

```nginx
location /api {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    include fastcgi_params;
    fastcgi_param HTTP_AUTHORIZATION $http_authorization;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
}
```

---

## 5. Verification

Send a `GET` request to your API root endpoint:
```bash
curl -i https://api.yourdomain.com/api/attendance/today-status
```
Verify that the response returns JSON headers and proper status codes.
