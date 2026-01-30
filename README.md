# Todo Simple (Multiusuario) - Proyectos y Tareas

Stack:
- Node.js + Express
- SQL Server (mssql)
- Sesiones: express-session
- Front: HTML + Bootstrap 5.3 + JavaScript (sin motor de plantillas)
- Fechas: se guardan en **UTC** (datetimeoffset). La zona horaria se configura en `.env` con `APP_TZ`.

## 1) Base de datos
1. Crea una BD (ej: `TodoSimpleDB`) en SQL Server.
2. Ejecuta el script: `sql/001_schema.sql` en esa BD.

## 2) Configuración
1. Copia `.env.example` a `.env` y ajusta credenciales de BD.
2. Instala dependencias:
   ```bash
   npm install
   ```

## 3) Crear admin inicial
Ejecuta:
```bash
npm run seed:admin
```
Esto crea (si no existe) el usuario ADMIN usando `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env` y le asigna el rol `Admin`.

## 4) Ejecutar
Modo desarrollo:
```bash
npm run dev
```

Luego abre:
- http://localhost:3000/login

## 5) Deploy (web)
- Asegura variables `.env` correctas en el servidor (DB, SESSION_SECRET, COOKIE_SECURE=true si va por HTTPS).
- Para producción, **recomendado** usar un store de sesiones persistente (ej: Redis/SQL) en vez del MemoryStore (este proyecto lo deja simple para partir).
